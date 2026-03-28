import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import { verifyToken } from './middleware/auth';
import accountsRouter from './routes/accounts';
import poolsRouter from './routes/pools';
import poolingRouter from './routes/pooling';
import rulesRouter from './routes/rules';
import approvalsRouter from './routes/approvals';
import sweepingRouter from './routes/sweeping';
import executionsRouter from './routes/executions';
import dashboardRouter from './routes/dashboard';
import usersRouter from './routes/users';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(express.json());

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes
app.use('/api/accounts', verifyToken, accountsRouter);
app.use('/api/pools', verifyToken, poolsRouter);
app.use('/api/pooling', verifyToken, poolingRouter);
app.use('/api/rules', verifyToken, rulesRouter);
app.use('/api/approvals', verifyToken, approvalsRouter);
app.use('/api/sweeping', verifyToken, sweepingRouter);
app.use('/api/executions', verifyToken, executionsRouter);
app.use('/api/dashboard', verifyToken, dashboardRouter);
app.use('/api/users', verifyToken, usersRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start HTTP server in local dev — Vercel handles this in production
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Treasury Backend running on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
export default app;
