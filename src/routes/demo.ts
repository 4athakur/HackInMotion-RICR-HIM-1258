import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { transactions, categories, budgets, savingsGoals, users } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';

const router = Router();

const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income', icon: 'Wallet', color: '#10b981' },
  { name: 'Freelance', type: 'income', icon: 'Briefcase', color: '#06b6d4' },
  { name: 'Investment', type: 'income', icon: 'TrendingUp', color: '#8b5cf6' },
  { name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#0284c7' },
  { name: 'Groceries', type: 'expense', icon: 'ShoppingBag', color: '#16a34a' },
  { name: 'Rent', type: 'expense', icon: 'Home', color: '#6366f1' },
  { name: 'Bills & Utilities', type: 'expense', icon: 'Receipt', color: '#dc2626' },
  { name: 'Shopping', type: 'expense', icon: 'ShoppingCart', color: '#8b5cf6' },
  { name: 'Travel', type: 'expense', icon: 'Plane', color: '#d97706' },
  { name: 'Entertainment', type: 'expense', icon: 'Film', color: '#ec4899' },
  { name: 'Healthcare', type: 'expense', icon: 'HeartPulse', color: '#0d9488' },
  { name: 'Education', type: 'expense', icon: 'GraduationCap', color: '#2563eb' },
  { name: 'Other', type: 'expense', icon: 'CircleDot', color: '#64748b' },
];

export async function seedDemoDataForUser(userId: string) {
  // 1. Ensure categories exist
  let allCats = await db.select().from(categories);
  if (allCats.length === 0) {
    await db.insert(categories).values(DEFAULT_CATEGORIES);
    allCats = await db.select().from(categories);
  }
  const catMap = new Map(allCats.map(c => [c.name, c.id]));

  // Check if transactions already exist for this user
  const existingTxs = await db.select().from(transactions).where(eq(transactions.userId, userId)).limit(1);
  if (existingTxs.length > 0) {
    return { message: 'Demo data already exists for this user' };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const padDay = (d: number) => String(d).padStart(2, '0');

  // 2. Insert realistic demo transactions for current month
  const demoTransactions = [
    // Incomes
    {
      userId,
      date: `${year}-${month}-${padDay(1)}`,
      amount: '85000.00',
      type: 'income',
      merchant: 'Tech Innovations Corp',
      description: 'Monthly Salary - Engineering',
      categoryId: catMap.get('Salary') || null,
      source: 'manual',
      isRecurring: true,
    },
    {
      userId,
      date: `${year}-${month}-${padDay(10)}`,
      amount: '24000.00',
      type: 'income',
      merchant: 'Fintech Studio Client',
      description: 'Freelance Mobile App UI/UX Design',
      categoryId: catMap.get('Freelance') || null,
      source: 'manual',
      isRecurring: false,
    },
    {
      userId,
      date: `${year}-${month}-${padDay(15)}`,
      amount: '4200.00',
      type: 'income',
      merchant: 'Zerodha / Mutual Funds',
      description: 'Quarterly Dividend Payout',
      categoryId: catMap.get('Investment') || null,
      source: 'manual',
      isRecurring: false,
    },

    // Expenses
    {
      userId,
      date: `${year}-${month}-${padDay(2)}`,
      amount: '26000.00',
      type: 'expense',
      merchant: 'Greenwood Apartments',
      description: 'Monthly Apartment Rent',
      categoryId: catMap.get('Rent') || null,
      source: 'manual',
      isRecurring: true,
    },
    {
      userId,
      date: `${year}-${month}-${padDay(3)}`,
      amount: '1299.00',
      type: 'expense',
      merchant: 'Airtel Broadband',
      description: 'Gigabit Fiber Internet Bill',
      categoryId: catMap.get('Bills & Utilities') || null,
      source: 'manual',
      isRecurring: true,
    },
    {
      userId,
      date: `${year}-${month}-${padDay(4)}`,
      amount: '3850.00',
      type: 'expense',
      merchant: "Nature's Basket",
      description: 'Weekly Organic Grocery Stock',
      categoryId: catMap.get('Groceries') || null,
      source: 'manual',
      isRecurring: false,
    },
    {
      userId,
      date: `${year}-${month}-${padDay(6)}`,
      amount: '1450.00',
      type: 'expense',
      merchant: 'Swiggy Gourmet',
      description: 'Weekend Italian Dinner with Friends',
      categoryId: catMap.get('Food & Dining') || null,
      source: 'manual',
      isRecurring: false,
    },
    {
      userId,
      date: `${year}-${month}-${padDay(8)}`,
      amount: '899.00',
      type: 'expense',
      merchant: 'Netflix Premium 4K',
      description: 'Monthly Family Subscription',
      categoryId: catMap.get('Entertainment') || null,
      source: 'manual',
      isRecurring: true,
    },
    {
      userId,
      date: `${year}-${month}-${padDay(9)}`,
      amount: '1250.00',
      type: 'expense',
      merchant: 'Uber Premier',
      description: 'Airport Transit to Office',
      categoryId: catMap.get('Travel') || null,
      source: 'manual',
      isRecurring: false,
    },
    {
      userId,
      date: `${year}-${month}-${padDay(11)}`,
      amount: '4500.00',
      type: 'expense',
      merchant: 'Zara Fashion',
      description: 'Smart Casual Blazers & Shoes',
      categoryId: catMap.get('Shopping') || null,
      source: 'manual',
      isRecurring: false,
    },
    {
      userId,
      date: `${year}-${month}-${padDay(12)}`,
      amount: '1850.00',
      type: 'expense',
      merchant: 'Blinkit Instant Groceries',
      description: 'Fresh Dairy, Fruits & Pantry Essentials',
      categoryId: catMap.get('Groceries') || null,
      source: 'manual',
      isRecurring: false,
    },
    {
      userId,
      date: `${year}-${month}-${padDay(13)}`,
      amount: '680.00',
      type: 'expense',
      merchant: 'Starbucks Coffee',
      description: 'Cold Brew & Client Meet',
      categoryId: catMap.get('Food & Dining') || null,
      source: 'manual',
      isRecurring: false,
    },
    {
      userId,
      date: `${year}-${month}-${padDay(14)}`,
      amount: '2400.00',
      type: 'expense',
      merchant: 'Adani Electricity',
      description: 'Summer Electricity Utility Bill',
      categoryId: catMap.get('Bills & Utilities') || null,
      source: 'manual',
      isRecurring: false,
    },
    {
      userId,
      date: `${year}-${month}-${padDay(15)}`,
      amount: '950.00',
      type: 'expense',
      merchant: 'Apollo Pharmacy',
      description: 'Multivitamins & First-Aid Refill',
      categoryId: catMap.get('Healthcare') || null,
      source: 'manual',
      isRecurring: false,
    },
  ];

  await db.insert(transactions).values(demoTransactions);

  // 3. Insert Demo Budgets for current month
  const currentMonthNum = now.getMonth() + 1;
  const currentYearNum = now.getFullYear();

  const demoBudgets = [
    {
      userId,
      categoryId: catMap.get('Food & Dining') || 1,
      amount: '8000.00',
      month: currentMonthNum,
      year: currentYearNum,
    },
    {
      userId,
      categoryId: catMap.get('Groceries') || 1,
      amount: '10000.00',
      month: currentMonthNum,
      year: currentYearNum,
    },
    {
      userId,
      categoryId: catMap.get('Bills & Utilities') || 1,
      amount: '7000.00',
      month: currentMonthNum,
      year: currentYearNum,
    },
    {
      userId,
      categoryId: catMap.get('Shopping') || 1,
      amount: '8000.00',
      month: currentMonthNum,
      year: currentYearNum,
    },
    {
      userId,
      categoryId: catMap.get('Travel') || 1,
      amount: '5000.00',
      month: currentMonthNum,
      year: currentYearNum,
    },
    {
      userId,
      categoryId: catMap.get('Entertainment') || 1,
      amount: '3000.00',
      month: currentMonthNum,
      year: currentYearNum,
    },
  ].filter(b => b.categoryId !== null);

  for (const b of demoBudgets) {
    await db.insert(budgets).values(b);
  }

  // 4. Insert Demo Savings Goals
  const demoGoals = [
    {
      userId,
      name: '🛡️ 6-Month Emergency Fund',
      targetAmount: '250000.00',
      currentAmount: '185000.00',
      deadline: `${currentYearNum + 1}-06-30`,
    },
    {
      userId,
      name: '💻 M3 Max MacBook Pro',
      targetAmount: '180000.00',
      currentAmount: '125000.00',
      deadline: `${currentYearNum}-12-31`,
    },
    {
      userId,
      name: '🏖️ Bali Summer Retreat',
      targetAmount: '90000.00',
      currentAmount: '54000.00',
      deadline: `${currentYearNum}-10-15`,
    },
  ];

  await db.insert(savingsGoals).values(demoGoals);

  return { message: 'Demo data seeded successfully with realistic transactions, budgets, and goals!' };
}

// POST /api/demo/seed
router.post('/seed', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const result = await seedDemoDataForUser(userId);
    res.json(result);
  } catch (error: any) {
    console.error('Error seeding demo data:', error);
    res.status(500).json({ error: 'Failed to seed demo data: ' + error.message });
  }
});

export default router;
