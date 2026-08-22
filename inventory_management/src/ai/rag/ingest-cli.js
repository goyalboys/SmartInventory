/**
 * CLI: Index all policy documents into MongoDB.
 *
 * Usage: npm run rag:ingest
 */
require("dotenv").config();

const connectDB = require("../../config/db");
const { ingestKnowledgeBase } = require("./ingestion");

const main = async () => {
  console.log("\n🔍 RAG Ingestion — indexing knowledge base...\n");

  await connectDB();

  const result = await ingestKnowledgeBase({ clearExisting: true });

  console.log("\n✅ Ingestion complete");
  console.log(`   Files:  ${result.filesProcessed}`);
  console.log(`   Chunks: ${result.chunksStored}`);
  console.log(`   Model:  ${result.embeddingModel}\n`);

  process.exit(0);
};

main().catch((error) => {
  console.error("\n❌ Ingestion failed:", error.message);
  process.exit(1);
});
