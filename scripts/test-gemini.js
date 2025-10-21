import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

(async () => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_API_KEY is empty');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-flash' });
    const resp = await model.generateContent('Reply with a JSON: {"ok": true}');
    console.log(resp.response.text());
  } catch (e) {
    console.error('Gemini test failed:', e.message);
    process.exit(1);
  }
})();
