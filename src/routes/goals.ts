import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { savingsGoals } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const goals = await db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId));
    res.json(goals);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { name, targetAmount, currentAmount, deadline } = req.body;
    
    const result = await db.insert(savingsGoals).values({
      userId,
      name,
      targetAmount,
      currentAmount: currentAmount || 0,
      deadline
    }).returning();
    
    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add goal' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { currentAmount } = req.body;
    
    const result = await db.update(savingsGoals)
      .set({ currentAmount })
      .where(and(eq(savingsGoals.id, parseInt(id)), eq(savingsGoals.userId, userId)))
      .returning();
      
    res.json(result[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    await db.delete(savingsGoals).where(and(eq(savingsGoals.id, parseInt(id)), eq(savingsGoals.userId, userId)));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

export default router;