import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

/**
 * chatJson(system, user, schemaHint?)
 * - Meminta output STRICT JSON lewat prompt; kita parse manual.
 * - Gemini tidak punya "response_format": kita paksa lewat instruksi & validasi.
 */
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

export async function chatJson(system, user, schemaHint) {
  const model = genAI.getGenerativeModel({ model: config.gemini.chatModel });

  // Gunakan "system + user" digabung sebagai prompt; Gemini tidak memakai role terpisah seperti OpenAI Chat.
  const prompt = [
    `SYSTEM:\n${system}`,
    `\nUSER:\n${user}`,
    `\nFORMAT:\nReturn STRICT JSON only. ${schemaHint ? 'Schema: ' + schemaHint : ''}`
  ].join('\n');

  const resp = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    // Safety bisa diatur di sini jika perlu (default aman)
  });

  const text =
    resp?.response?.text?.() ||
    resp?.response?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ||
    '';

  try {
    return JSON.parse(text);
  } catch {
    // Coba ekstrak blok JSON jika model menyisipkan teks lain
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch {}
    }
    return { error: 'invalid-json', raw: text };
  }
}
