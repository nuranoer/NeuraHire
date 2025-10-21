import 'dotenv/config';

export const config = {
  port: process.env.PORT || 8080,

  mysql: {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  },

  gemini: {
    apiKey: process.env.GOOGLE_API_KEY,
    chatModel: process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash',
    embedModel: process.env.GEMINI_EMBED_MODEL || 'text-embedding-004'
  },

  chunk: {
    size: Number(process.env.CHUNK_SIZE || 1100),
    overlap: Number(process.env.CHUNK_OVERLAP || 150),
    topK: Number(process.env.TOP_K || 8)
  }
};
