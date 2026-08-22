const KnowledgeChunk = require("../../models/KnowledgeChunk");
const { embedText } = require("./embeddings");

const DEFAULT_TOP_K = Number(process.env.RAG_TOP_K) || 3;
const DEFAULT_MIN_SCORE = Number(process.env.RAG_MIN_SCORE) || 0.55;

/**
 * Cosine similarity measures how aligned two vectors are.
 * Score ranges from -1 to 1; higher = more semantically similar.
 *
 * WHY TOP-K?
 * We retrieve the K best-matching chunks (e.g. 3), not the entire knowledge base.
 * This keeps LLM context small and focused on the most relevant policy text.
 */
const cosineSimilarity = (vectorA, vectorB) => {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Embedding dimensions do not match");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i += 1) {
    dot += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dot / denominator;
};

/**
 * Retrieve relevant knowledge chunks for a user query.
 *
 * Query
 *   → embed query
 *   → compare against all stored chunk embeddings
 *   → return top-K above minimum score threshold
 */
const retrieveRelevantChunks = async (
  query,
  { topK = DEFAULT_TOP_K, minScore = DEFAULT_MIN_SCORE } = {}
) => {
  const trimmedQuery = query?.trim();
  if (!trimmedQuery) {
    return {
      success: false,
      error: "Query is required",
      chunks: [],
    };
  }

  const allChunks = await KnowledgeChunk.find({}).lean();

  if (!allChunks.length) {
    return {
      success: false,
      error:
        "Knowledge base is empty. Run `npm run rag:ingest` to index policy documents.",
      chunks: [],
    };
  }

  const { vector: queryVector } = await embedText(trimmedQuery);

  const scored = allChunks
    .map((chunk) => ({
      sourceFile: chunk.sourceFile,
      section: chunk.section,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      score: cosineSimilarity(queryVector, chunk.embedding),
    }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return {
    success: true,
    query: trimmedQuery,
    topK,
    minScore,
    chunks: scored,
    found: scored.length > 0,
  };
};

module.exports = {
  retrieveRelevantChunks,
  cosineSimilarity,
  DEFAULT_TOP_K,
  DEFAULT_MIN_SCORE,
};
