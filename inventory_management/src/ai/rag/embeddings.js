const { GoogleGenAI } = require("@google/genai");

const DEFAULT_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

let aiClient = null;

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }

  return aiClient;
};

/**
 * WHAT ARE EMBEDDINGS?
 *
 * An embedding is a list of numbers (a vector) that represents the *meaning*
 * of a piece of text. Similar meanings → vectors that are close together.
 *
 * Example: "refund policy" and "money back guarantee" get similar vectors.
 *
 * We use Gemini's embedding API to convert text → vector.
 */
const embedText = async (text, { model = DEFAULT_EMBEDDING_MODEL } = {}) => {
  const ai = getClient();

  const response = await ai.models.embedContent({
    model,
    contents: text,
  });

  const values =
    response.embeddings?.[0]?.values ||
    response.embedding?.values;

  if (!values?.length) {
    throw new Error("Embedding API returned empty vector");
  }

  return { vector: values, model };
};

/**
 * Batch embed with small delays to avoid rate limits during ingestion.
 */
const embedTexts = async (texts, options = {}) => {
  const results = [];

  for (const text of texts) {
    const { vector, model } = await embedText(text, options);
    results.push({ vector, model });
  }

  return results;
};

module.exports = {
  embedText,
  embedTexts,
  DEFAULT_EMBEDDING_MODEL,
};
