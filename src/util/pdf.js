import fs from 'fs';
import pdfParse from 'pdf-parse';

export async function pdfToText(filePath) {
  const dataBuffer = await fs.promises.readFile(filePath);
  const data = await pdfParse(dataBuffer);
  // Normalize whitespace
  return (data.text || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim();
}
