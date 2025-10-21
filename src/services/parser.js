import fs from 'fs';
import pdf from 'pdf-parse';

export async function parsePdfToText(filePath) {
  const data = await pdf(fs.readFileSync(filePath));
  return data.text?.trim() || '';
}
