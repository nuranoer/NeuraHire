import 'dotenv/config';
import express from 'express';
import { router } from './routes.js';
import { logger } from './logger.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));
app.use(router);

const port = process.env.PORT || 3000;
app.listen(port, () => logger.info(`NeuraHire API running on :${port}`));
