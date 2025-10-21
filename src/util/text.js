export function chunkText(text, size = 1100, overlap = 150) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + size, text.length);
    const chunk = text.slice(i, end);
    chunks.push(chunk);
    if (end === text.length) break;
    i = end - overlap; // overlap
    if (i < 0) i = 0;
  }
  return chunks;
}
