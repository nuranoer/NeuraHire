import fs from 'fs';
import { PDFParse } from 'pdf-parse';

export async function pdfToText(filePath) {
  const dataBuffer = await fs.promises.readFile(filePath);
  const result = await new PDFParse({data: dataBuffer}).getText();
  // Normalize whitespace
  return (data.text || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').trim();
}
