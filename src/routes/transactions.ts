import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { transactions, categories } from '../db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import { ensureCategories, resolveCategoryId } from '../lib/categoryManager.ts';
import { toSafeISODate } from '../lib/dateUtils.ts';

const router = Router();

// GET all categories
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    await ensureCategories();
    const allCategories = await db.select().from(categories);
    res.json(allCategories);
  } catch (error: any) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET all transactions
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    await ensureCategories();
    const userId = req.user!.uid;
    const allTransactions = await db.select({
      id: transactions.id,
      date: transactions.date,
      amount: transactions.amount,
      type: transactions.type,
      merchant: transactions.merchant,
      description: transactions.description,
      isRecurring: transactions.isRecurring,
      category: categories.name,
      categoryType: categories.type,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date), desc(transactions.id));
    
    res.json(allTransactions);
  } catch (error: any) {
    console.error('Failed to fetch transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST single transaction
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { date, amount, type, merchant, description, categoryName, isRecurring } = req.body;
    
    const parsedAmount = Math.abs(parseFloat(amount || '0'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid transaction amount is required' });
    }

    const normalizedDate = toSafeISODate(date);
    const categoryId = await resolveCategoryId(categoryName, description, merchant, type);

    const result = await db.insert(transactions).values({
      userId,
      date: normalizedDate,
      amount: String(parsedAmount),
      type: type === 'income' ? 'income' : 'expense',
      merchant: merchant || description || 'Manual Transaction',
      description: description || merchant || '',
      categoryId,
      isRecurring: isRecurring || false,
      source: 'manual'
    }).returning();
    
    res.json(result[0]);
  } catch (error: any) {
    console.error('Failed to add transaction:', error);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// POST bulk upload (CSV)
router.post('/upload', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { items } = req.body; // array of transactions from frontend
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for import' });
    }

    await ensureCategories();

    const valuesToInsert = [];
    for (const item of items) {
      const parsedAmount = Math.abs(parseFloat(item.amount || '0'));
      if (isNaN(parsedAmount) || parsedAmount <= 0) continue;

      const normalizedDate = toSafeISODate(item.date);
      const catId = await resolveCategoryId(item.categoryName, item.description, item.merchant, item.type);

      valuesToInsert.push({
        userId,
        date: normalizedDate,
        amount: String(parsedAmount),
        type: item.type === 'income' ? 'income' : 'expense',
        merchant: item.merchant || item.description || 'Imported Transaction',
        description: item.description || item.merchant || '',
        categoryId: catId,
        source: 'csv',
        isRecurring: false
      });
    }

    if (valuesToInsert.length > 0) {
      await db.insert(transactions).values(valuesToInsert);
    }
    
    res.json({ success: true, count: valuesToInsert.length });
  } catch (error: any) {
    console.error('Failed to upload CSV transactions:', error);
    res.status(500).json({ error: 'Failed to upload transactions' });
  }
});

// PUT update transaction
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { date, amount, type, merchant, description, categoryName, isRecurring } = req.body;
    
    const parsedAmount = Math.abs(parseFloat(amount || '0'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid transaction amount is required' });
    }

    const normalizedDate = toSafeISODate(date);
    const categoryId = await resolveCategoryId(categoryName, description, merchant, type);

    const updateData: any = {
      date: normalizedDate,
      amount: String(parsedAmount),
      type: type === 'income' ? 'income' : 'expense',
      merchant: merchant || description || '',
      description: description || merchant || '',
      categoryId: categoryId,
      isRecurring: isRecurring || false,
    };

    const result = await db.update(transactions)
      .set(updateData)
      .where(and(eq(transactions.id, parseInt(id)), eq(transactions.userId, userId)))
      .returning();
      
    if (result.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result[0]);
  } catch (error: any) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE transaction
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    
    await db.delete(transactions)
      .where(and(eq(transactions.id, parseInt(id)), eq(transactions.userId, userId)));
      
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;