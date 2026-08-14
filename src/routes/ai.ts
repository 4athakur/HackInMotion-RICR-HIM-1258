import { Router, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { db } from '../db/index.ts';
import { transactions, categories } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';

const router = Router();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

router.post('/chat', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const { message } = req.body;
    
    // Fetch a summary of recent transactions to provide context
    const txs = await db.select({
      date: transactions.date,
      amount: transactions.amount,
      type: transactions.type,
      merchant: transactions.merchant,
      category: categories.name,
    }).from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, userId))
    .limit(50);

    const txSummary = txs.map(t => `${t.date}: ${t.type} of ₹${t.amount} at ${t.merchant || 'Unknown'} (${t.category || 'General'})`).join('\n');

    const totalIncome = txs.filter(t => t.type === 'income').reduce((acc, t) => acc + parseFloat(t.amount || '0'), 0);
    const totalExpenses = txs.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseFloat(t.amount || '0'), 0);
    const netSavings = totalIncome - totalExpenses;

    const client = getGeminiClient();

    if (client) {
      try {
        const prompt = `
          You are SmartSpend, an expert personal financial advisor AI assistant for a fintech application.
          The user asks: "${message}"

          Here is the user's recent transaction history:
          ${txSummary || 'No transactions recorded yet.'}

          Summary:
          - Total Recorded Income: ₹${totalIncome.toLocaleString('en-IN')}
          - Total Recorded Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
          - Net Savings: ₹${netSavings.toLocaleString('en-IN')}

          Provide a concise, helpful, friendly, and actionable answer.
        `;

        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        if (response.text) {
          return res.json({ reply: response.text });
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to smart rule engine:', geminiErr);
      }
    }

    // Smart Fallback for Hackathon Demo / Offline / Missing Key
    const lower = (message || '').toLowerCase();
    let reply = '';

    if (lower.includes('saving') || lower.includes('save') || lower.includes('budget')) {
      reply = `Based on your recent transactions, your total income is ₹${totalIncome.toLocaleString('en-IN')} and total expenses are ₹${totalExpenses.toLocaleString('en-IN')}, giving you a net savings of ₹${netSavings.toLocaleString('en-IN')} (approx ${totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0}% savings rate). Recommendation: Aim to maintain a 20%+ savings buffer and set category-specific spending caps.`;
    } else if (lower.includes('spend') || lower.includes('expense') || lower.includes('highest') || lower.includes('food') || lower.includes('rent')) {
      const topCatCount: Record<string, number> = {};
      txs.filter(t => t.type === 'expense').forEach(t => {
        const cat = t.category || 'Other';
        topCatCount[cat] = (topCatCount[cat] || 0) + parseFloat(t.amount || '0');
      });
      const sorted = Object.entries(topCatCount).sort((a, b) => b[1] - a[1]);
      const topSpending = sorted.slice(0, 3).map(([cat, amt]) => `${cat}: ₹${amt.toLocaleString('en-IN')}`).join(', ');

      reply = `Here is your spending analysis: Total expenses stand at ₹${totalExpenses.toLocaleString('en-IN')}. Your top expense areas are ${topSpending || 'balanced across standard categories'}. Keeping discretionary expenses below 30% will accelerate your financial goals.`;
    } else {
      reply = `Hello! I am your SmartSpend Financial Advisor. You have ${txs.length} recorded transactions with ₹${totalIncome.toLocaleString('en-IN')} in total earnings and ₹${totalExpenses.toLocaleString('en-IN')} in total expenses. How can I assist you with your budgets, savings goals, or spending habits today?`;
    }

    res.json({ reply });
  } catch (error: any) {
    console.error('AI error:', error);
    res.status(500).json({ error: 'Failed to process financial assistant query' });
  }
});

export default router;