/**
 * Simple text chunking for RAG.
 *
 * WHY CHUNK?
 * - LLMs have context limits — you can't paste entire policy manuals every request.
 * - Smaller chunks improve retrieval precision (you fetch only relevant paragraphs).
 * - Embeddings represent meaning better on focused text than on huge documents.
 *
 * STRATEGY (POC):
 * 1. Split markdown by ## headers into sections
 * 2. If a section is too long, split by paragraphs with overlap
 */

const DEFAULT_MAX_CHARS = 700;
const DEFAULT_OVERLAP_CHARS = 120;

const splitByHeaders = (text) => {
  const lines = text.split("\n");
  const sections = [];
  let currentSection = "";
  let currentTitle = "Introduction";

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)/);

    if (headerMatch) {
      if (currentSection.trim()) {
        sections.push({ title: currentTitle, body: currentSection.trim() });
      }
      currentTitle = headerMatch[1].trim();
      currentSection = `${line}\n`;
    } else {
      currentSection += `${line}\n`;
    }
  }

  if (currentSection.trim()) {
    sections.push({ title: currentTitle, body: currentSection.trim() });
  }

  return sections;
};

const splitLongText = (text, maxChars, overlapChars) => {
  if (text.length <= maxChars) {
    return [text];
  }

  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const chunks = [];
  let current = "";

  const flush = () => {
    if (current.trim()) {
      chunks.push(current.trim());
    }
  };

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    flush();

    if (paragraph.length > maxChars) {
      // Hard split very long paragraphs
      let start = 0;
      while (start < paragraph.length) {
        chunks.push(paragraph.slice(start, start + maxChars));
        start += maxChars - overlapChars;
      }
      current = "";
    } else {
      current = paragraph;
    }
  }

  flush();

  // Add overlap between consecutive chunks for continuity
  if (overlapChars > 0 && chunks.length > 1) {
    return chunks.map((chunk, index) => {
      if (index === 0) return chunk;
      const prevTail = chunks[index - 1].slice(-overlapChars);
      return `${prevTail}\n...\n${chunk}`;
    });
  }

  return chunks;
};

/**
 * @param {string} text - Raw markdown document
 * @param {string} sourceFile - Filename for metadata
 * @returns {{ sourceFile, section, chunkIndex, content }[]}
 */
const chunkDocument = (
  text,
  sourceFile,
  { maxChars = DEFAULT_MAX_CHARS, overlapChars = DEFAULT_OVERLAP_CHARS } = {}
) => {
  const sections = splitByHeaders(text);
  const chunks = [];

  for (const section of sections) {
    const parts = splitLongText(section.body, maxChars, overlapChars);

    for (const part of parts) {
      chunks.push({
        sourceFile,
        section: section.title,
        chunkIndex: chunks.length,
        content: part,
        tokenEstimate: Math.ceil(part.length / 4),
      });
    }
  }

  return chunks;
};

module.exports = {
  chunkDocument,
  DEFAULT_MAX_CHARS,
  DEFAULT_OVERLAP_CHARS,
};
