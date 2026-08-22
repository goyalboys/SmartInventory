const { GoogleGenAI } = require("@google/genai");

const { toolDefinitions } = require("../tools/definitions");
const { executeTool } = require("../tools/registry");
const { buildSystemPrompt } = require("./prompts");
const {
  createTrace,
  recordToolCall,
  finalizeTrace,
} = require("../observability/trace");

const MAX_TOOL_ROUNDS = 5;

/**
 * Convert tool definitions into Gemini functionDeclarations.
 */
const toGeminiTools = () => [
  {
    functionDeclarations: toolDefinitions.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
  },
];

/**
 * Core agent loop:
 *
 * User
 *   ↓
 * Gemini
 *   ↓
 * functionCall(s)
 *   ↓
 * execute backend tool(s)
 *   ↓
 * functionResponse(s)
 *   ↓
 * Gemini
 *   ↓
 * final answer
 */
const runAgent = async ({
  message,
  context,
  conversationHistory = [],
}) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const modelName =
    process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const ai = new GoogleGenAI({
    apiKey,
  });

  const trace = createTrace({
    conversationId: context.conversationId,
    userId: context.userId,
    userMessage: message,
    model: modelName,
  });

  // Pass trace into tool context so RAG retrieval can be recorded
  const toolContext = { ...context, trace };

  const systemPrompt = buildSystemPrompt({
    userName: context.userName,
    userRole: context.role,
  });

  /**
   * Build complete Gemini conversation contents.
   *
   * Gemini roles:
   *
   * user
   * model
   *
   * Tool results are NOT:
   *
   * role: "function"
   *
   * They are:
   *
   * role: "user"
   * parts: [
   *   {
   *     functionResponse: ...
   *   }
   * ]
   */
  const contents = conversationHistory.map((turn) => ({
    role:
      turn.role === "assistant"
        ? "model"
        : "user",

    parts: [
      {
        text: turn.content,
      },
    ],
  }));

  // Current user message
  contents.push({
    role: "user",
    parts: [
      {
        text: message,
      },
    ],
  });

  const config = {
    systemInstruction: systemPrompt,

    tools: toGeminiTools(),
  };

  let rounds = 0;

  try {
    while (rounds <= MAX_TOOL_ROUNDS) {
      const response =
        await ai.models.generateContent({
          model: modelName,
          contents,
          config,
        });

      const candidate =
        response.candidates?.[0];

      if (!candidate?.content) {
        finalizeTrace(trace, {
          finalResponse: null,
          error: "Gemini returned no candidate content",
        });

        throw new Error(
          "The AI model returned no candidate content"
        );
      }

      
      const modelContent =
        candidate.content;

        console.log("++++++++++++++++++++++++++++++++");
        console.log(JSON.stringify(response, null, 2));
        console.log("########################")

      /**
       * IMPORTANT:
       *
       * Always append Gemini's response back into
       * the conversation.
       *
       * This includes functionCall parts.
       */
      contents.push(modelContent);

      const functionCalls =
        modelContent.parts
          ?.filter(
            (part) => part.functionCall
          )
          .map(
            (part) => part.functionCall
          ) || [];

      /**
       * No tool call = final response.
       */
      if (functionCalls.length === 0) {
        const reply =
          modelContent.parts
            ?.filter((part) => part.text)
            .map((part) => part.text)
            .join("")
            .trim() || "";

        if (!reply) {
          finalizeTrace(trace, {
            finalResponse: null,
            error: "Empty model response",
          });

          throw new Error(
            "The AI model returned an empty response"
          );
        }

        finalizeTrace(trace, {
          finalResponse: reply,
        });

        return {
          reply,
          trace,
        };
      }

      /**
       * Protect against infinite tool-call loops.
       */
      if (rounds >= MAX_TOOL_ROUNDS) {
        finalizeTrace(trace, {
          finalResponse: null,
          error: "Maximum tool rounds exceeded",
        });

        throw new Error(
          `Maximum tool rounds (${MAX_TOOL_ROUNDS}) exceeded`
        );
      }

      rounds += 1;

      const functionResponseParts = [];

      /**
       * Gemini can request multiple functions
       * in the same response.
       */
      for (const call of functionCalls) {
        let toolResult;

        try {
          toolResult = await executeTool(
            call.name,
            call.args || {},
            toolContext
          );
          console.log("Tool Result: ", JSON.stringify(toolResult, null, 2));

          recordToolCall(trace, {
            name: call.name,
            args: call.args,
            success: toolResult.success,
            status: toolResult.status,
            result: toolResult.success
              ? toolResult.data
              : {
                  error: toolResult.error,
                  ...(toolResult.status === "confirmation_required"
                    ? { confirmationRequired: toolResult.data }
                    : {}),
                },
            durationMs:
              toolResult.meta?.durationMs,
          });
        } catch (error) {
          toolResult = {
            success: false,
            error: error.message,
          };

          recordToolCall(trace, {
            name: call.name,
            args: call.args,
            success: false,
            result: {
              error: error.message,
            },
          });
        }

        const functionResponse = {
          name: call.name,

          response: {
            result: toolResult,
          },
        };

        /**
         * Gemini 3.x may include function-call IDs.
         *
         * Preserve it when provided.
         */
        if (call.id) {
          functionResponse.id = call.id;
        }

        functionResponseParts.push({
          functionResponse,
        });
      }

      /**
       * CRITICAL PART
       *
       * Tool results are returned using role: "user".
       *
       * DO NOT use:
       *
       * role: "function"
       */
      contents.push({
        role: "user",
        parts: functionResponseParts,
      });
    }
  } catch (error) {
    finalizeTrace(trace, {
      finalResponse: null,
      error: error.message,
    });

    throw error;
  }
};

module.exports = {
  runAgent,
};