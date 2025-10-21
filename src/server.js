import express from 'express';
import { config } from './config.js';
import { uploadRouter } from './routes/upload.js';
import { evaluateRouter } from './routes/evaluate.js';
import { resultRouter } from './routes/result.js';

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_, res) => res.json({ ok: true }));

app.use('/upload', uploadRouter);
app.use('/evaluate', evaluateRouter);
app.use('/result', resultRouter);

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
