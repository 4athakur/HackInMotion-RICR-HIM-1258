import { Router, Response } from 'express';
import { db } from '../db/index.ts';
import { transactions, categories, budgets, savingsGoals } from '../db/schema.ts';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { AuthRequest } from '../middleware/auth.ts';
import { ensureCategories } from '../lib/categoryManager.ts';
import { parseDateComponents, getMonthRange, formatSafeDate } from '../lib/dateUtils.ts';

const router = Router();

// GET financial summary and health score
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    await ensureCategories();
    const userId = req.user!.uid;
    
    const now = new Date();
    const currentYear = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
    const currentMonth = req.query.month ? parseInt(req.query.month as string, 10) : (now.getMonth() + 1);
    const filterAll = req.query.all === 'true';

    // 1. Fetch all user transactions to compute both current month and all-time stats
    const allTxs = await db.select({
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      date: transactions.date,
      categoryId: transactions.categoryId
    }).from(transactions)
    .where(eq(transactions.userId, userId));

    let currentMonthIncome = 0;
    let currentMonthExpenses = 0;
    let allTimeIncome = 0;
    let allTimeExpenses = 0;
    const currentMonthSpentByCat: Record<number, number> = {};

    allTxs.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      const { year, month } = parseDateComponents(t.date);
      const isCurrentMonth = (year === currentYear && month === currentMonth);

      if (t.type === 'income') {
        allTimeIncome += amt;
        if (isCurrentMonth) currentMonthIncome += amt;
      } else {
        allTimeExpenses += amt;
        if (isCurrentMonth) {
          currentMonthExpenses += amt;
          if (t.categoryId) {
            currentMonthSpentByCat[t.categoryId] = (currentMonthSpentByCat[t.categoryId] || 0) + amt;
          }
        }
      }
    });

    // If current month has 0 transactions, but user has data in other months, provide meaningful totals
    const effectiveIncome = (!filterAll && (currentMonthIncome > 0 || currentMonthExpenses > 0)) ? currentMonthIncome : (allTimeIncome || currentMonthIncome);
    const effectiveExpenses = (!filterAll && (currentMonthIncome > 0 || currentMonthExpenses > 0)) ? currentMonthExpenses : (allTimeExpenses || currentMonthExpenses);
    const effectiveSavings = effectiveIncome - effectiveExpenses;
    const effectiveSavingsRate = effectiveIncome > 0 ? (effectiveSavings / effectiveIncome) * 100 : 0;

    // 2. Fetch Budgets
    const userBudgets = await db.select({
      id: budgets.id,
      categoryId: budgets.categoryId,
      amount: budgets.amount,
      categoryName: categories.name
    }).from(budgets)
    .leftJoin(categories, eq(budgets.categoryId, categories.id))
    .where(and(
      eq(budgets.userId, userId),
      eq(budgets.month, currentMonth),
      eq(budgets.year, currentYear)
    ));

    let exceededCount = 0;
    let totalBudgetedAmount = 0;
    let totalSpentInBudgets = 0;

    userBudgets.forEach(b => {
      const budgetLimit = parseFloat(b.amount) || 0;
      totalBudgetedAmount += budgetLimit;
      const spent = currentMonthSpentByCat[b.categoryId] || 0;
      totalSpentInBudgets += spent;
      if (spent > budgetLimit) {
        exceededCount += 1;
      }
    });

    // 3. Fetch Savings Goals
    const userGoals = await db.select().from(savingsGoals).where(eq(savingsGoals.userId, userId));
    
    let totalGoalTarget = 0;
    let totalGoalCurrent = 0;
    let totalGoalCompletionPercent = 0;

    userGoals.forEach(g => {
      const target = parseFloat(g.targetAmount) || 0;
      const current = parseFloat(g.currentAmount) || 0;
      totalGoalTarget += target;
      totalGoalCurrent += current;
      const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      totalGoalCompletionPercent += pct;
    });

    const avgGoalCompletion = userGoals.length > 0 ? totalGoalCompletionPercent / userGoals.length : 0;

    // 4. Calculate Financial Health Score (Max 100)
    // a. Savings Rate Score (Max 40 points)
    let savingsRateScore = 0;
    if (effectiveIncome > 0) {
      if (effectiveSavingsRate >= 40) {
        savingsRateScore = 40;
      } else if (effectiveSavingsRate >= 20) {
        savingsRateScore = 30 + Math.round(((effectiveSavingsRate - 20) / 20) * 10);
      } else if (effectiveSavingsRate >= 0) {
        savingsRateScore = 15 + Math.round((effectiveSavingsRate / 20) * 15);
      } else {
        savingsRateScore = Math.max(0, Math.round(15 - (Math.abs(effectiveSavingsRate) / 50) * 15));
      }
    } else {
      savingsRateScore = effectiveExpenses === 0 ? 25 : 10;
    }

    // b. Budget Discipline Score (Max 30 points)
    let budgetScore = 0;
    if (userBudgets.length === 0) {
      budgetScore = 20; // neutral default
    } else {
      budgetScore = Math.max(0, 30 - (exceededCount * 10));
    }

    // c. Goals Progress Score (Max 20 points)
    let goalScore = 0;
    if (userGoals.length === 0) {
      goalScore = 10; // neutral default
    } else {
      goalScore = Math.min(20, Math.max(5, Math.round((avgGoalCompletion / 100) * 20)));
    }

    // d. Financial Consistency Score (Max 10 points)
    let consistencyScore = 5;
    if (effectiveIncome > 0 && effectiveSavings >= 0) {
      consistencyScore = 10;
    } else if (effectiveIncome > 0 || effectiveExpenses > 0) {
      consistencyScore = 5;
    }

    const healthScore = Math.min(100, Math.max(0, Math.round(savingsRateScore + budgetScore + goalScore + consistencyScore)));

    // Generate Recommendations
    const recommendations: string[] = [];
    if (effectiveIncome === 0) {
      recommendations.push("Log your monthly salary or income under Transactions to unlock accurate savings analytics.");
    }
    if (effectiveSavingsRate < 20 && effectiveIncome > 0) {
      recommendations.push("Aim to save at least 20% of your income by cutting non-essential expenses.");
    }
    if (exceededCount > 0) {
      recommendations.push(`You exceeded ${exceededCount} category budget(s) this month. Review your budget allocations.`);
    }
    if (userBudgets.length === 0) {
      recommendations.push("Set category budgets to keep spending disciplined and boost your health score.");
    }
    if (userGoals.length === 0) {
      recommendations.push("Create a Savings Goal (e.g. Emergency Fund) to track progress and boost your score.");
    }
    if (healthScore >= 80 && recommendations.length === 0) {
      recommendations.push("Outstanding financial health! Keep up your disciplined saving and budgeting habits.");
    }

    res.json({ 
      income: effectiveIncome, 
      expenses: effectiveExpenses, 
      savings: effectiveSavings, 
      savingsRate: Math.round(effectiveSavingsRate * 10) / 10,
      allTimeIncome,
      allTimeExpenses,
      allTimeSavings: allTimeIncome - allTimeExpenses,
      month: currentMonth,
      year: currentYear,
      healthScore,
      healthBreakdown: {
        savingsRateScore,
        maxSavingsRateScore: 40,
        budgetScore,
        maxBudgetScore: 30,
        goalScore,
        maxGoalScore: 20,
        consistencyScore,
        maxConsistencyScore: 10,
        totalBudgets: userBudgets.length,
        exceededBudgets: exceededCount,
        totalGoals: userGoals.length,
        avgGoalCompletion: Math.round(avgGoalCompletion),
        recommendations
      }
    });
  } catch (error: any) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET categories breakdown for Pie Chart
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    await ensureCategories();
    const userId = req.user!.uid;
    
    const txs = await db.select({
      amount: transactions.amount,
      type: transactions.type,
      date: transactions.date,
      categoryName: categories.name,
      categoryColor: categories.color
    }).from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, userId));

    const expensesByCategory: Record<string, { value: number, color: string }> = {};

    txs.forEach(t => {
      if (t.type === 'expense') {
        const catName = t.categoryName || 'Other Expense';
        const catColor = t.categoryColor || '#64748b';
        if (!expensesByCategory[catName]) {
          expensesByCategory[catName] = { value: 0, color: catColor };
        }
        expensesByCategory[catName].value += (parseFloat(t.amount) || 0);
      }
    });

    const data = Object.keys(expensesByCategory).map(name => ({
      name,
      value: Math.round(expensesByCategory[name].value),
      color: expensesByCategory[name].color
    })).sort((a, b) => b.value - a.value);

    res.json(data);
  } catch (error: any) {
    console.error('Failed to fetch categories data:', error);
    res.status(500).json({ error: 'Failed to fetch categories data' });
  }
});

// GET monthly income vs expenses trends
router.get('/trends', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    
    const txs = await db.select({
      amount: transactions.amount,
      date: transactions.date,
      type: transactions.type
    }).from(transactions)
    .where(eq(transactions.userId, userId));

    const monthlyData: Record<string, { month: string, label: string, year: number, mNum: number, income: number, expenses: number }> = {};

    txs.forEach(t => {
      const { year, month, dateString } = parseDateComponents(t.date);
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        const dummyDate = new Date(year, month - 1, 1);
        const label = dummyDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthlyData[monthKey] = { month: monthKey, label, year, mNum: month, income: 0, expenses: 0 };
      }
      
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'income') {
        monthlyData[monthKey].income += amt;
      } else {
        monthlyData[monthKey].expenses += amt;
      }
    });

    const data = Object.values(monthlyData)
      .sort((a, b) => a.year - b.year || a.mNum - b.mNum)
      .map(item => ({
        month: item.label,
        monthKey: item.month,
        income: Math.round(item.income),
        expenses: Math.round(item.expenses)
      }));

    res.json(data);
  } catch (error: any) {
    console.error('Failed to fetch trends data:', error);
    res.status(500).json({ error: 'Failed to fetch trends data' });
  }
});

// Month-over-Month (MoM) Comparison
router.get('/mom', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const txs = await db.select({
      amount: transactions.amount,
      date: transactions.date,
      type: transactions.type
    }).from(transactions)
    .where(eq(transactions.userId, userId));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    const prevDate = new Date(currentYear, currentMonth - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;

    let currentIncome = 0;
    let currentExpense = 0;
    let prevIncome = 0;
    let prevExpense = 0;

    const monthlyMap: Record<string, { year: number, month: number, label: string, income: number, expense: number, savings: number }> = {};

    txs.forEach(t => {
      const { year: y, month: m } = parseDateComponents(t.date);
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const amt = parseFloat(t.amount) || 0;

      if (!monthlyMap[key]) {
        const dateObj = new Date(y, m - 1, 1);
        const label = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthlyMap[key] = { year: y, month: m, label, income: 0, expense: 0, savings: 0 };
      }

      if (t.type === 'income') {
        monthlyMap[key].income += amt;
        if (y === currentYear && m === currentMonth) currentIncome += amt;
        if (y === prevYear && m === prevMonth) prevIncome += amt;
      } else {
        monthlyMap[key].expense += amt;
        if (y === currentYear && m === currentMonth) currentExpense += amt;
        if (y === prevYear && m === prevMonth) prevExpense += amt;
      }
    });

    Object.values(monthlyMap).forEach(m => {
      m.savings = m.income - m.expense;
    });

    const currentSavings = currentIncome - currentExpense;
    const prevSavings = prevIncome - prevExpense;

    const expenseChangePct = prevExpense > 0 ? ((currentExpense - prevExpense) / prevExpense) * 100 : 0;
    const incomeChangePct = prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0;
    const savingsChangePct = prevSavings !== 0 ? ((currentSavings - prevSavings) / Math.abs(prevSavings)) * 100 : 0;

    const history = Object.values(monthlyMap)
      .sort((a, b) => b.year - a.year || b.month - a.month)
      .slice(0, 6);

    res.json({
      currentMonthLabel: new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      prevMonthLabel: new Date(prevYear, prevMonth - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      currentExpense: Math.round(currentExpense),
      prevExpense: Math.round(prevExpense),
      expenseChangePct: Math.round(expenseChangePct * 10) / 10,
      currentIncome: Math.round(currentIncome),
      prevIncome: Math.round(prevIncome),
      incomeChangePct: Math.round(incomeChangePct * 10) / 10,
      currentSavings: Math.round(currentSavings),
      prevSavings: Math.round(prevSavings),
      savingsChangePct: Math.round(savingsChangePct * 10) / 10,
      history
    });
  } catch (error: any) {
    console.error('MoM Error:', error);
    res.status(500).json({ error: 'Failed to fetch MoM analysis' });
  }
});

// Top Categories with percentage, transaction count, average, and trend
router.get('/top-categories', async (req: AuthRequest, res: Response) => {
  try {
    await ensureCategories();
    const userId = req.user!.uid;
    const txs = await db.select({
      amount: transactions.amount,
      date: transactions.date,
      type: transactions.type,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon
    }).from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense')));

    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const prevDate = new Date(curY, curM - 2, 1);
    const prevY = prevDate.getFullYear();
    const prevM = prevDate.getMonth() + 1;

    let totalExpenseAll = 0;
    const catMap: Record<string, { 
      name: string, 
      color: string, 
      icon: string, 
      totalAmount: number, 
      count: number, 
      currentM: number, 
      prevM: number 
    }> = {};

    txs.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      const name = t.categoryName || 'Other Expense';
      const color = t.categoryColor || '#64748b';
      const icon = t.categoryIcon || 'ShoppingBag';
      totalExpenseAll += amt;

      if (!catMap[name]) {
        catMap[name] = { name, color, icon, totalAmount: 0, count: 0, currentM: 0, prevM: 0 };
      }

      catMap[name].totalAmount += amt;
      catMap[name].count += 1;

      const { year: y, month: m } = parseDateComponents(t.date);
      if (y === curY && m === curM) catMap[name].currentM += amt;
      if (y === prevY && m === prevM) catMap[name].prevM += amt;
    });

    const result = Object.values(catMap).map(c => {
      const percentage = totalExpenseAll > 0 ? (c.totalAmount / totalExpenseAll) * 100 : 0;
      const avgTransaction = c.count > 0 ? c.totalAmount / c.count : 0;
      const momChangePct = c.prevM > 0 ? ((c.currentM - c.prevM) / c.prevM) * 100 : (c.currentM > 0 ? 100 : 0);

      return {
        name: c.name,
        color: c.color,
        icon: c.icon,
        totalAmount: Math.round(c.totalAmount),
        count: c.count,
        avgTransaction: Math.round(avgTransaction),
        percentage: Math.round(percentage * 10) / 10,
        currentM: Math.round(c.currentM),
        prevM: Math.round(c.prevM),
        momChangePct: Math.round(momChangePct * 10) / 10
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);

    res.json(result);
  } catch (error: any) {
    console.error('Top categories error:', error);
    res.status(500).json({ error: 'Failed to fetch top categories' });
  }
});

// Top Merchants
router.get('/top-merchants', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const txs = await db.select({
      amount: transactions.amount,
      merchant: transactions.merchant,
      description: transactions.description,
      categoryName: categories.name,
      type: transactions.type
    }).from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense')));

    let totalExpense = 0;
    const merchantMap: Record<string, { 
      merchant: string, 
      totalAmount: number, 
      count: number, 
      categories: Record<string, number> 
    }> = {};

    txs.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      totalExpense += amt;
      const rawName = t.merchant || t.description || 'Unknown Merchant';
      const normName = rawName.trim().replace(/\s+/g, ' ');

      if (!merchantMap[normName]) {
        merchantMap[normName] = { merchant: normName, totalAmount: 0, count: 0, categories: {} };
      }

      merchantMap[normName].totalAmount += amt;
      merchantMap[normName].count += 1;

      const catName = t.categoryName || 'General';
      merchantMap[normName].categories[catName] = (merchantMap[normName].categories[catName] || 0) + amt;
    });

    const result = Object.values(merchantMap).map(m => {
      const percentage = totalExpense > 0 ? (m.totalAmount / totalExpense) * 100 : 0;
      const avgSpend = m.count > 0 ? m.totalAmount / m.count : 0;

      let primaryCategory = 'General';
      let maxCatSpend = 0;
      Object.entries(m.categories).forEach(([cat, spend]) => {
        if (spend > maxCatSpend) {
          maxCatSpend = spend;
          primaryCategory = cat;
        }
      });

      return {
        merchant: m.merchant,
        totalAmount: Math.round(m.totalAmount),
        count: m.count,
        avgSpend: Math.round(avgSpend),
        percentage: Math.round(percentage * 10) / 10,
        primaryCategory
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 10);

    res.json(result);
  } catch (error: any) {
    console.error('Top merchants error:', error);
    res.status(500).json({ error: 'Failed to fetch top merchants' });
  }
});

// Spending Spike / Anomaly Detection
router.get('/anomalies', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const txs = await db.select({
      id: transactions.id,
      amount: transactions.amount,
      date: transactions.date,
      merchant: transactions.merchant,
      description: transactions.description,
      categoryName: categories.name,
      type: transactions.type
    }).from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense')));

    if (txs.length === 0) {
      return res.json([]);
    }

    const amounts = txs.map(t => parseFloat(t.amount) || 0).sort((a, b) => a - b);
    const meanAmount = amounts.reduce((a, b) => a + b, 0) / (amounts.length || 1);
    
    const catMonthly: Record<string, Record<string, number>> = {};
    const catTotal: Record<string, { sum: number, count: number }> = {};

    txs.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      const cat = t.categoryName || 'General';
      const { year, month } = parseDateComponents(t.date);
      const mKey = `${year}-${String(month).padStart(2, '0')}`;

      if (!catMonthly[cat]) catMonthly[cat] = {};
      catMonthly[cat][mKey] = (catMonthly[cat][mKey] || 0) + amt;

      if (!catTotal[cat]) catTotal[cat] = { sum: 0, count: 0 };
      catTotal[cat].sum += amt;
      catTotal[cat].count += 1;
    });

    const anomalies: any[] = [];

    // Check Single Transaction Spikes
    txs.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      const cat = t.categoryName || 'General';
      const catAvg = catTotal[cat] ? catTotal[cat].sum / (catTotal[cat].count || 1) : meanAmount;

      if (amt >= 2000 && (amt > catAvg * 2.5 || amt > meanAmount * 3)) {
        const multiplier = catAvg > 0 ? (amt / catAvg).toFixed(1) : '3.0';
        anomalies.push({
          id: `tx-spike-${t.id}`,
          type: 'single_transaction',
          title: `Unusual High Spend at ${t.merchant || t.description || 'Vendor'}`,
          description: `₹${amt.toLocaleString('en-IN')} is ${multiplier}x higher than your average ${cat} transaction (₹${Math.round(catAvg).toLocaleString('en-IN')}).`,
          amount: amt,
          baselineAmount: Math.round(catAvg),
          date: t.date,
          merchant: t.merchant || t.description || 'Vendor',
          category: cat,
          severity: amt > 5000 || parseFloat(multiplier) > 3.5 ? 'high' : 'medium'
        });
      }
    });

    // Check Category Monthly Spikes
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const curKey = `${curY}-${String(curM).padStart(2, '0')}`;

    const prevDate = new Date(curY, curM - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    Object.keys(catMonthly).forEach(cat => {
      const currentSpend = catMonthly[cat][curKey] || 0;
      const prevSpend = catMonthly[cat][prevKey] || 0;

      if (currentSpend > 1000 && prevSpend > 0 && currentSpend > prevSpend * 1.4) {
        const surgeAmount = currentSpend - prevSpend;
        const pctIncrease = Math.round(((currentSpend - prevSpend) / prevSpend) * 100);

        anomalies.push({
          id: `cat-spike-${cat}`,
          type: 'category_spike',
          title: `${cat} Spending Surge (+${pctIncrease}%)`,
          description: `Spent ₹${currentSpend.toLocaleString('en-IN')} in ${cat} this month compared to ₹${prevSpend.toLocaleString('en-IN')} last month (+₹${surgeAmount.toLocaleString('en-IN')}).`,
          amount: currentSpend,
          baselineAmount: prevSpend,
          date: `${curY}-${String(curM).padStart(2, '0')}-01`,
          category: cat,
          severity: surgeAmount > 5000 || pctIncrease > 100 ? 'high' : 'medium'
        });
      }
    });

    anomalies.sort((a, b) => b.amount - a.amount);
    res.json(anomalies);
  } catch (error: any) {
    console.error('Anomaly error:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

// Recurring Payment Detection
router.get('/recurring', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const txs = await db.select({
      id: transactions.id,
      amount: transactions.amount,
      date: transactions.date,
      merchant: transactions.merchant,
      description: transactions.description,
      categoryName: categories.name,
      isRecurring: transactions.isRecurring,
      type: transactions.type
    }).from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense')));

    const merchantGroups: Record<string, { 
      merchant: string, 
      dates: string[], 
      amounts: number[], 
      category: string, 
      isFlagged: boolean 
    }> = {};

    txs.forEach(t => {
      const name = (t.merchant || t.description || 'Subscription').trim();
      const normKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (!merchantGroups[normKey]) {
        merchantGroups[normKey] = {
          merchant: name,
          dates: [],
          amounts: [],
          category: t.categoryName || 'Bills & Utilities',
          isFlagged: !!t.isRecurring
        };
      }

      merchantGroups[normKey].dates.push(t.date);
      merchantGroups[normKey].amounts.push(parseFloat(t.amount) || 0);
      if (t.isRecurring) merchantGroups[normKey].isFlagged = true;
    });

    const recurringList: any[] = [];

    Object.values(merchantGroups).forEach(group => {
      const count = group.dates.length;
      if (count < 2 && !group.isFlagged) return;

      const sumAmount = group.amounts.reduce((a, b) => a + b, 0);
      const avgAmount = Math.round(sumAmount / (count || 1));

      const sortedDates = [...group.dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      const lastBilledDate = sortedDates[0];

      const lastD = new Date(lastBilledDate);
      const nextDue = new Date(lastD);
      nextDue.setDate(nextDue.getDate() + 30);
      const nextDueDateStr = nextDue.toISOString().split('T')[0];

      recurringList.push({
        merchant: group.merchant,
        category: group.category,
        averageAmount: avgAmount,
        totalLifetimeSpend: Math.round(sumAmount),
        frequency: 'Monthly',
        paymentCount: count,
        lastBilledDate,
        nextDueDate: nextDueDateStr,
        confidenceScore: group.isFlagged ? 100 : Math.min(98, 70 + count * 10)
      });
    });

    recurringList.sort((a, b) => b.averageAmount - a.averageAmount);
    res.json(recurringList);
  } catch (error: any) {
    console.error('Recurring error:', error);
    res.status(500).json({ error: 'Failed to detect recurring payments' });
  }
});

// Category-wise Trend (Time series matrix)
router.get('/category-trends', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.uid;
    const txs = await db.select({
      amount: transactions.amount,
      date: transactions.date,
      categoryName: categories.name,
      categoryColor: categories.color
    }).from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense')));

    const monthCategoryMap: Record<string, Record<string, number>> = {};
    const categoryColors: Record<string, string> = {};
    const allCategories = new Set<string>();

    txs.forEach(t => {
      const { year, month } = parseDateComponents(t.date);
      const dummyDate = new Date(year, month - 1, 1);
      const monthKey = dummyDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const cat = t.categoryName || 'Other Expense';
      const amt = parseFloat(t.amount) || 0;

      allCategories.add(cat);
      if (t.categoryColor) categoryColors[cat] = t.categoryColor;

      if (!monthCategoryMap[monthKey]) {
        monthCategoryMap[monthKey] = {};
      }
      monthCategoryMap[monthKey][cat] = (monthCategoryMap[monthKey][cat] || 0) + amt;
    });

    const categoryList = Array.from(allCategories);
    const series = Object.keys(monthCategoryMap).map(mKey => {
      const row: Record<string, any> = { month: mKey };
      categoryList.forEach(cat => {
        row[cat] = Math.round(monthCategoryMap[mKey][cat] || 0);
      });
      return row;
    });

    res.json({
      categories: categoryList,
      colors: categoryColors,
      series
    });
  } catch (error: any) {
    console.error('Category trends error:', error);
    res.status(500).json({ error: 'Failed to fetch category trends' });
  }
});

export default router;
