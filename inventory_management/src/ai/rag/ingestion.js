const fs = require("fs");
const path = require("path");

const KnowledgeChunk = require("../../models/KnowledgeChunk");
const { chunkDocument } = require("./chunking");
const { embedText, DEFAULT_EMBEDDING_MODEL } = require("./embeddings");

const KNOWLEDGE_DIR = path.join(__dirname, "../../../knowledge");

/**
 * RAG INGESTION PIPELINE
 *
 * Document (.md)
 *   → read text
 *   → chunking
 *   → embedding (Gemini)
 *   → store in MongoDB (KnowledgeChunk collection)
 *
 * Run once after adding/updating policy docs:
 *   npm run rag:ingest
 */
const ingestKnowledgeBase = async ({ clearExisting = true } = {}) => {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    throw new Error(`Knowledge directory not found: ${KNOWLEDGE_DIR}`);
  }

  const files = fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort();

  if (!files.length) {
    throw new Error("No .md files found in knowledge/");
  }

  if (clearExisting) {
    const deleted = await KnowledgeChunk.deleteMany({});
    console.log(`Cleared ${deleted.deletedCount} existing chunks`);
  }

  let totalChunks = 0;

  for (const file of files) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    const rawText = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkDocument(rawText, file);

    console.log(`\n📄 ${file} → ${chunks.length} chunk(s)`);

    console.log(chunks);
    for (const chunk of chunks) {
      const { vector, model } = await embedText(chunk.content);

      await KnowledgeChunk.findOneAndUpdate(
        { sourceFile: chunk.sourceFile, chunkIndex: chunk.chunkIndex },
        {
          sourceFile: chunk.sourceFile,
          section: chunk.section,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          embedding: vector,
          embeddingModel: model || DEFAULT_EMBEDDING_MODEL,
          tokenEstimate: chunk.tokenEstimate,
        },
        { upsert: true, returnDocument: "after" }
      );

      totalChunks += 1;
      process.stdout.write(".");
    }

    console.log(" done");
  }

  return {
    filesProcessed: files.length,
    chunksStored: totalChunks,
    embeddingModel: DEFAULT_EMBEDDING_MODEL,
  };
};

module.exports = { ingestKnowledgeBase, KNOWLEDGE_DIR };
