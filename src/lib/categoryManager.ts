import { db } from '../db/index.ts';
import { categories } from '../db/schema.ts';
import { eq, ilike } from 'drizzle-orm';
import { categorizeTransaction } from './categorization.ts';

export const DEFAULT_CATEGORIES = [
  // Expense Categories
  { name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#0284c7' },
  { name: 'Groceries', type: 'expense', icon: 'ShoppingBag', color: '#16a34a' },
  { name: 'Travel & Transport', type: 'expense', icon: 'Plane', color: '#d97706' },
  { name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#8b5cf6' },
  { name: 'Entertainment', type: 'expense', icon: 'Film', color: '#ec4899' },
  { name: 'Bills & Utilities', type: 'expense', icon: 'Receipt', color: '#dc2626' },
  { name: 'Rent & Housing', type: 'expense', icon: 'Building2', color: '#6366f1' },
  { name: 'Healthcare', type: 'expense', icon: 'HeartPulse', color: '#0d9488' },
  { name: 'Education', type: 'expense', icon: 'GraduationCap', color: '#2563eb' },
  { name: 'Subscriptions', type: 'expense', icon: 'Zap', color: '#a855f7' },
  { name: 'Personal Care', type: 'expense', icon: 'Sparkles', color: '#f59e0b' },
  { name: 'Other Expense', type: 'expense', icon: 'Layers', color: '#64748b' },

  // Income Categories
  { name: 'Salary & Wages', type: 'income', icon: 'Wallet', color: '#059669' },
  { name: 'Freelance & Contract', type: 'income', icon: 'ArrowUpRight', color: '#10b981' },
  { name: 'Investments & Dividends', type: 'income', icon: 'TrendingUp', color: '#047857' },
  { name: 'Business & Sales', type: 'income', icon: 'Building2', color: '#0d9488' },
  { name: 'Other Income', type: 'income', icon: 'Plus', color: '#14b8a6' },
];

/**
 * Ensures default categories exist in DB
 */
export async function ensureCategories() {
  try {
    const existing = await db.select().from(categories);
    if (existing.length === 0) {
      await db.insert(categories).values(DEFAULT_CATEGORIES);
    } else {
      // Check if any major category is missing
      const existingNames = new Set(existing.map(c => c.name.toLowerCase()));
      const missing = DEFAULT_CATEGORIES.filter(c => !existingNames.has(c.name.toLowerCase()));
      if (missing.length > 0) {
        await db.insert(categories).values(missing);
      }
    }
  } catch (error) {
    console.error('Error ensuring categories:', error);
  }
}

/**
 * Find or create a category ID intelligently
 */
export async function resolveCategoryId(
  categoryName?: string | null,
  description?: string,
  merchant?: string,
  type: string = 'expense'
): Promise<number> {
  await ensureCategories();
  const allCats = await db.select().from(categories);

  if (categoryName && categoryName.trim() !== '') {
    const target = categoryName.trim().toLowerCase();

    // 1. Exact match
    const exact = allCats.find(c => c.name.toLowerCase() === target);
    if (exact) return exact.id;

    // 2. Substring or Synonym mapping
    const match = allCats.find(c => {
      const name = c.name.toLowerCase();
      if (target.includes('food') || target.includes('dining') || target.includes('restaurant') || target.includes('zomato') || target.includes('swiggy')) {
        return name.includes('food');
      }
      if (target.includes('groc') || target.includes('mart') || target.includes('supermarket')) {
        return name.includes('groceries');
      }
      if (target.includes('travel') || target.includes('transport') || target.includes('cab') || target.includes('uber') || target.includes('ola') || target.includes('flight') || target.includes('fuel')) {
        return name.includes('travel');
      }
      if (target.includes('shop') || target.includes('amazon') || target.includes('flipkart') || target.includes('myntra')) {
        return name.includes('shopping');
      }
      if (target.includes('entertain') || target.includes('movie') || target.includes('cinema') || target.includes('bookmyshow')) {
        return name.includes('entertainment');
      }
      if (target.includes('bill') || target.includes('utilit') || target.includes('electric') || target.includes('water') || target.includes('recharge') || target.includes('wifi')) {
        return name.includes('bill');
      }
      if (target.includes('rent') || target.includes('house') || target.includes('housing')) {
        return name.includes('rent');
      }
      if (target.includes('health') || target.includes('medic') || target.includes('doctor') || target.includes('pharmacy') || target.includes('hospital')) {
        return name.includes('health');
      }
      if (target.includes('edu') || target.includes('school') || target.includes('college') || target.includes('course') || target.includes('tuition')) {
        return name.includes('education');
      }
      if (target.includes('subscript') || target.includes('netflix') || target.includes('spotify') || target.includes('prime')) {
        return name.includes('subscription');
      }
      if (target.includes('salar') || target.includes('wage') || target.includes('payroll')) {
        return name.includes('salary');
      }
      if (target.includes('freelance') || target.includes('contract') || target.includes('client')) {
        return name.includes('freelance');
      }
      if (target.includes('invest') || target.includes('dividend') || target.includes('stock') || target.includes('trading')) {
        return name.includes('invest');
      }
      return name.includes(target) || target.includes(name);
    });

    if (match) return match.id;

    // 3. Auto-create custom category
    try {
      const cleanName = categoryName.trim();
      const inserted = await db.insert(categories).values({
        name: cleanName,
        type: type === 'income' ? 'income' : 'expense',
        icon: type === 'income' ? 'Wallet' : 'Layers',
        color: type === 'income' ? '#10b981' : '#6366f1'
      }).returning();
      if (inserted.length > 0) return inserted[0].id;
    } catch (e) {
      console.warn('Failed to insert custom category, using fallback', e);
    }
  }

  // 4. Auto-categorize via description/merchant
  if (description || merchant) {
    const predicted = await categorizeTransaction(description || '', merchant || '');
    if (predicted && predicted !== 'Other') {
      const predictedLower = predicted.toLowerCase();
      const match = allCats.find(c => c.name.toLowerCase().includes(predictedLower) || predictedLower.includes(c.name.toLowerCase()));
      if (match) return match.id;
    }
  }

  // 5. Default Fallback
  if (type === 'income') {
    const incomeCat = allCats.find(c => c.type === 'income');
    if (incomeCat) return incomeCat.id;
  }
  const defaultExpense = allCats.find(c => c.name.toLowerCase().includes('other') || c.type === 'expense') || allCats[0];
  return defaultExpense?.id || 1;
}
