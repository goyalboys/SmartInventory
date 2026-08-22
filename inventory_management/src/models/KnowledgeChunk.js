const mongoose = require("mongoose");

/**
 * Each document is split into chunks; each chunk stores its embedding vector.
 * For the POC we use brute-force cosine similarity in Node.js.
 * At scale you'd use a dedicated vector index (Atlas Vector Search, Qdrant, etc.).
 */
const knowledgeChunkSchema = new mongoose.Schema(
  {
    sourceFile: {
      type: String,
      required: true,
      trim: true,
    },

    section: {
      type: String,
      default: "",
      trim: true,
    },

    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    content: {
      type: String,
      required: true,
    },

    embedding: {
      type: [Number],
      required: true,
    },

    embeddingModel: {
      type: String,
      required: true,
    },

    tokenEstimate: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

knowledgeChunkSchema.index({ sourceFile: 1, chunkIndex: 1 }, { unique: true });
knowledgeChunkSchema.index({ sourceFile: 1 });

module.exports = mongoose.model("KnowledgeChunk", knowledgeChunkSchema);
