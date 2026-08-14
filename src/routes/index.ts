import { Router } from 'express';
import transactionsRouter from './transactions.ts';
import analyticsRouter from './analytics.ts';
import budgetsRouter from './budgets.ts';
import goalsRouter from './goals.ts';
import aiRouter from './ai.ts';
import demoRouter from './demo.ts';

const router = Router();

router.use('/transactions', transactionsRouter);
router.use('/analytics', analyticsRouter);
router.use('/budgets', budgetsRouter);
router.use('/goals', goalsRouter);
router.use('/ai', aiRouter);
router.use('/demo', demoRouter);

export default router;