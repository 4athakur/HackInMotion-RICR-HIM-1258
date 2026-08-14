import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { budgets, categories, transactions } from '../db/schema.ts';
import { eq, and, gte, lte } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import { GoogleGenAI } from '@google/genai';
import { ensureCategories } from '../lib/categoryManager.ts';
import { getMonthRange } from '../lib/dateUtils.ts';

const router = Router();

// GET all available expense categories
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    await ensureCategories();
    const allCats = await db.select().from(categories).where(eq(categories.type, 'expense'));
    res.json(allCats);
  } catch (error: any) {
    console.error('Error fetching budget categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET user budgets with smart predictions, percentage used, near-limit alerts & AI recommendations
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysPassed = Math.max(1, now.getDate());
    const daysRemaining = Math.max(0, daysInMonth - daysPassed);

    await ensureCategories();

    const userBudgets = await db.select({
      id: budgets.id,
      amount: budgets.amount,
      month: budgets.month,
      year: budgets.year,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      categoryId: categories.id
    }).from(budgets)
    .leftJoin(categories, eq(budgets.categoryId, categories.id))
    .where(and(
      eq(budgets.userId, userId),
      eq(budgets.month, currentMonth),
      eq(budgets.year, currentYear)
    ));

    // Calculate spent amount for each budget category within the current month
    const { firstDay, lastDay } = getMonthRange(currentYear, currentMonth);

    const txs = await db.select({
      amount: transactions.amount,
      categoryId: transactions.categoryId
    }).from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, 'expense'),
      gte(transactions.date, firstDay),
      lte(transactions.date, lastDay)
    ));

    const spentByCategory: Record<number, number> = {};
    txs.forEach(t => {
      if (t.categoryId) {
        spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] || 0) + parseFloat(t.amount);
      }
    });

    let totalBudget = 0;
    let totalSpent = 0;
    let nearLimitCount = 0;
    let predictedOverrunCount = 0;
    let exceededCount = 0;

    const enrichedBudgets = userBudgets.map(b => {
      const budgetAmount = parseFloat(b.amount);
      const spent = spentByCategory[b.categoryId!] || 0;
      const remaining = budgetAmount - spent;
      const percentageUsed = Math.min(999, Math.round((spent / budgetAmount) * 100));

      totalBudget += budgetAmount;
      totalSpent += spent;

      // Status determination
      let status: 'normal' | 'near_limit' | 'exceeded' = 'normal';
      if (spent > budgetAmount) {
        status = 'exceeded';
        exceededCount++;
      } else if (percentageUsed >= 80) {
        status = 'near_limit';
        nearLimitCount++;
      }

      // Run-rate prediction
      const dailyBurnRate = Math.round(spent / daysPassed);
      const projectedSpend = Math.round(dailyBurnRate * daysInMonth);
      const projectedOverrun = Math.max(0, projectedSpend - budgetAmount);
      const isPredictedOverrun = projectedSpend > budgetAmount && spent <= budgetAmount;

      if (isPredictedOverrun) {
        predictedOverrunCount++;
      }

      // Safe target daily rate for remaining days to stay within budget
      const targetDailyRateForRemaining = daysRemaining > 0 ? Math.max(0, Math.floor(remaining / daysRemaining)) : 0;

      // Generate AI Recommendation
      let aiRecommendation = '';
      if (status === 'exceeded') {
        const excess = spent - budgetAmount;
        aiRecommendation = `Budget exceeded by ₹${excess.toLocaleString('en-IN')}. Pause non-essential ${b.categoryName} expenses for the remaining ${daysRemaining} days or increase budget.`;
      } else if (isPredictedOverrun) {
        aiRecommendation = `Current pace (₹${dailyBurnRate.toLocaleString('en-IN')}/day) projects a ₹${projectedOverrun.toLocaleString('en-IN')} overrun. Cap daily spend at ₹${targetDailyRateForRemaining.toLocaleString('en-IN')}/day to avoid exceeding your limit.`;
      } else if (status === 'near_limit') {
        aiRecommendation = `You've used ${percentageUsed}% of your budget with ${daysRemaining} days remaining. Limit remaining spend to ₹${targetDailyRateForRemaining.toLocaleString('en-IN')}/day.`;
      } else {
        const projectedSavings = budgetAmount - projectedSpend;
        aiRecommendation = `Great job! Burning ₹${dailyBurnRate.toLocaleString('en-IN')}/day. On track to stay within limit and save ~₹${projectedSavings.toLocaleString('en-IN')} this month.`;
      }

      return {
        ...b,
        amount: budgetAmount,
        spent,
        remaining,
        percentageUsed,
        status,
        daysPassed,
        daysInMonth,
        daysRemaining,
        dailyBurnRate,
        projectedSpend,
        projectedOverrun,
        isPredictedOverrun,
        targetDailyRateForRemaining,
        aiRecommendation
      };
    });

    const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    let overallAiAdvice = 'Set category budgets to track monthly spending and get AI optimization tips.';
    if (enrichedBudgets.length > 0) {
      if (exceededCount > 0) {
        overallAiAdvice = `⚠️ Action Required: ${exceededCount} category budget(s) have been exceeded. Review high-spend categories and pause unnecessary purchases.`;
      } else if (predictedOverrunCount > 0) {
        overallAiAdvice = `🚨 Run-rate Alert: ${predictedOverrunCount} category budget(s) are projected to overrun by month-end at your current daily spending pace.`;
      } else if (nearLimitCount > 0) {
        overallAiAdvice = `⚠️ Caution: ${nearLimitCount} category budget(s) are in the near-limit zone (≥80% used). Pace your remaining transactions.`;
      } else {
        overallAiAdvice = `✨ Healthy Budgeting: All your category budgets are well-managed and on track. You are using ${overallPercentage}% of your total allocated monthly budget.`;
      }
    }

    res.json({
      budgets: enrichedBudgets,
      summary: {
        totalBudget,
        totalSpent,
        totalRemaining: totalBudget - totalSpent,
        overallPercentage,
        nearLimitCount,
        predictedOverrunCount,
        exceededCount,
        daysPassed,
        daysInMonth,
        daysRemaining,
        overallAiAdvice
      }
    });
  } catch (error: any) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// POST Add or Update budget for a category
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { categoryName, categoryId, amount } = req.body;
    
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    let targetCatId = categoryId;
    if (!targetCatId && categoryName) {
      const cats = await db.select().from(categories).where(eq(categories.name, categoryName));
      if (cats.length === 0) {
        // Create category if missing
        const newCat = await db.insert(categories).values({
          name: categoryName,
          type: 'expense',
          icon: 'ShoppingBag',
          color: '#005b8e'
        }).returning();
        targetCatId = newCat[0].id;
      } else {
        targetCatId = cats[0].id;
      }
    }

    if (!targetCatId) {
      return res.status(400).json({ error: 'Category ID or Category Name is required' });
    }

    // Check if budget already exists for this category/month/year
    const existing = await db.select().from(budgets).where(and(
      eq(budgets.userId, userId),
      eq(budgets.categoryId, targetCatId),
      eq(budgets.month, month),
      eq(budgets.year, year)
    ));

    let result;
    if (existing.length > 0) {
      // Update
      result = await db.update(budgets)
        .set({ amount })
        .where(eq(budgets.id, existing[0].id))
        .returning();
    } else {
      // Insert
      result = await db.insert(budgets).values({
        userId,
        categoryId: targetCatId,
        amount,
        month,
        year
      }).returning();
    }
    
    res.json(result[0]);
  } catch (error: any) {
    console.error('Error adding budget:', error);
    res.status(500).json({ error: 'Failed to add budget' });
  }
});

// PUT Update budget amount by budget ID
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const { amount } = req.body;

    const result = await db.update(budgets)
      .set({ amount })
      .where(and(
        eq(budgets.id, parseInt(id)),
        eq(budgets.userId, userId)
      ))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json(result[0]);
  } catch (error: any) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// DELETE budget
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    await db.delete(budgets).where(and(eq(budgets.id, parseInt(id)), eq(budgets.userId, userId)));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// POST Deep Gemini AI Optimization for Budgets
router.post('/ai-recommendations', async (req: AuthRequest, res: Response) => {
  try {
    const { budgetsData, summaryData } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        advice: "Gemini API key not configured. Using rule-based intelligence.",
        recommendations: budgetsData?.map((b: any) => ({
          categoryId: b.categoryId,
          categoryName: b.categoryName,
          tip: b.aiRecommendation
        })) || []
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `You are a world-class AI financial planner. Analyze the user's monthly category budgets and current spending burn rate:
Summary: Total Budget ₹${summaryData?.totalBudget || 0}, Total Spent ₹${summaryData?.totalSpent || 0}, ${summaryData?.daysRemaining || 0} days remaining in month.
Budgets Breakdown: ${JSON.stringify(budgetsData || [], null, 2)}

Provide concise, highly actionable, strategic financial advice in clear bullet points on how to re-allocate funds or curb daily burn rate to avoid overruns and maximize savings. Format response with bullet points.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      aiAnalysis: response.text || 'Keep monitoring your daily burn rate and maintain low impulse purchases.'
    });
  } catch (error: any) {
    console.error('AI budget recommendation error:', error);
    res.status(500).json({ error: 'Failed to generate AI budget advice' });
  }
});

export default router;
