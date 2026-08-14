import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { 
  ArrowDownRight, ArrowUpRight, Wallet, Target, Activity, Info, X, 
  CheckCircle, AlertTriangle, ShieldCheck, Sparkles, BarChart3, 
  RefreshCw, Plus, ArrowRight, Layers
} from 'lucide-react';
import clsx from 'clsx';
import { formatSafeDate } from '../lib/dateUtils.ts';

interface HealthBreakdown {
  savingsRateScore: number;
  maxSavingsRateScore: number;
  budgetScore: number;
  maxBudgetScore: number;
  goalScore: number;
  maxGoalScore: number;
  consistencyScore: number;
  maxConsistencyScore: number;
  totalBudgets: number;
  exceededBudgets: number;
  totalGoals: number;
  avgGoalCompletion: number;
  recommendations: string[];
}

interface SummaryData {
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  allTimeIncome?: number;
  allTimeExpenses?: number;
  allTimeSavings?: number;
  healthScore: number;
  healthBreakdown?: HealthBreakdown;
}

export default function Dashboard() {
  const { user } = useAuth();
  const api = useApi();
  const [summary, setSummary] = useState<SummaryData>({
    income: 0,
    expenses: 0,
    savings: 0,
    savingsRate: 0,
    healthScore: 50
  });
  const [categories, setCategories] = useState<{name: string, value: number, color: string}[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  const fetchData = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [sumRes, catRes, trendsRes, txsRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/categories'),
        api.get('/analytics/trends'),
        api.get('/transactions')
      ]);
      setSummary(sumRes.data);
      setCategories(catRes.data);
      setTrends(trendsRes.data);
      setRecentTransactions(txsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData(true);
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  
  const score = summary.healthScore ?? 50;
  let scoreLabel = 'Needs Attention';
  let scoreBadgeClass = 'bg-rose-500/20 text-rose-100 border-rose-300/30';
  
  if (score >= 80) { 
    scoreLabel = 'Excellent'; 
    scoreBadgeClass = 'bg-emerald-500/20 text-emerald-100 border-emerald-300/30'; 
  } else if (score >= 65) { 
    scoreLabel = 'Good'; 
    scoreBadgeClass = 'bg-sky-500/20 text-sky-100 border-sky-300/30'; 
  } else if (score >= 50) { 
    scoreLabel = 'Fair'; 
    scoreBadgeClass = 'bg-amber-500/20 text-amber-100 border-amber-300/30'; 
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3 text-[#005b8e]">
        <RefreshCw size={36} className="animate-spin text-[#005b8e]" />
        <p className="font-bold text-slate-600 text-sm">Loading your financial overview...</p>
      </div>
    );
  }

  const breakdown = summary.healthBreakdown;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header with Greeting & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#002b49] tracking-tight">
            Welcome back{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Here's your live financial health overview and spending summary.</p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button 
            onClick={handleRefresh}
            title="Refresh dashboard data"
            className="p-2.5 bg-white border border-[#e1e8ed] text-slate-700 hover:text-[#002b49] hover:bg-slate-50 rounded-xl font-medium transition-colors shadow-xs"
          >
            <RefreshCw size={18} className={clsx(isRefreshing && "animate-spin text-[#005b8e]")} />
          </button>
          
          <Link 
            to="/analytics" 
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e1e8ed] hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all"
          >
            <BarChart3 size={16} /> Advanced Analytics
          </Link>

          <Link 
            to="/transactions" 
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#005b8e] hover:bg-[#004f7c] text-white font-bold text-xs rounded-xl shadow-xs transition-all"
          >
            <Plus size={16} /> Add / Manage
          </Link>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#e1e8ed] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#e0f2fe] text-[#005b8e] rounded-xl">
              <ArrowUpRight size={24} />
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">Summary</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Income</p>
            <h3 className="text-2xl font-bold text-[#002b49]">{formatCurrency(summary.income)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#e1e8ed] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <ArrowDownRight size={24} />
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">Summary</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Expenses</p>
            <h3 className="text-2xl font-bold text-[#002b49]">{formatCurrency(summary.expenses)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#e1e8ed] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet size={24} />
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">Summary</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Net Savings</p>
            <h3 className={clsx("text-2xl font-bold", summary.savings >= 0 ? "text-[#002b49]" : "text-rose-600")}>
              {formatCurrency(summary.savings)}
            </h3>
          </div>
        </div>

        {/* Financial Health Score Card - Clickable */}
        <div 
          onClick={() => setShowHealthModal(true)}
          className="bg-gradient-to-br from-[#00385d] to-[#005b8e] p-6 rounded-2xl shadow-sm flex flex-col justify-between text-white relative overflow-hidden border border-[#004f7c] cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:opacity-25 transition-opacity">
            <Activity size={100} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <p className="text-slate-200 font-medium text-sm">Financial Health Score</p>
              <Info size={16} className="text-slate-300 opacity-80 group-hover:opacity-100" />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-extrabold tracking-tight">{score}</span>
              <span className="text-slate-300 font-medium">/ 100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={clsx("inline-block px-3 py-0.5 rounded-full text-xs font-extrabold tracking-wider uppercase border backdrop-blur-xs", scoreBadgeClass)}>
                {scoreLabel}
              </span>
              <span className="text-[11px] text-slate-200 font-semibold underline underline-offset-2">View Breakdown →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-xs border border-[#e1e8ed] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#002b49]">Spending by Category</h3>
              <Link to="/analytics" className="text-xs font-bold text-[#005b8e] hover:underline">
                Details →
              </Link>
            </div>
            {categories.length > 0 ? (
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#64748b'} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: any) => formatCurrency(Number(value))} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2">
                <Layers size={28} className="text-slate-300" />
                <p>No expense data recorded yet</p>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2.5 pt-3 border-t border-slate-100">
            {categories.slice(0, 4).map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-slate-600 truncate">{c.name}</span>
                </div>
                <span className="font-bold text-[#002b49] shrink-0">{formatCurrency(c.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trends Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-xs border border-[#e1e8ed]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#002b49]">Income vs Expenses History</h3>
            <span className="text-xs text-slate-400 font-medium">Monthly Comparison</span>
          </div>
          <div className="h-80">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.slice(-6)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-8} tickFormatter={(val) => `₹${val/1000}k`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px' }} />
                  <Bar dataKey="income" name="Income" fill="#005b8e" radius={[6, 6, 0, 0]} barSize={26} />
                  <Bar dataKey="expenses" name="Expenses" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">No historical data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Strip */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-[#e1e8ed]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#002b49]">Recent Transactions</h3>
            <p className="text-xs text-slate-400">Latest activity from your statements and manual entries</p>
          </div>
          <Link 
            to="/transactions" 
            className="inline-flex items-center gap-1 text-xs font-bold text-[#005b8e] hover:underline"
          >
            View All ({recentTransactions.length}+) <ArrowRight size={14} />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No transactions found. <Link to="/transactions" className="text-[#005b8e] font-bold underline">Add your first transaction</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((t) => {
              const isIncome = t.type === 'income';
              return (
                <div key={t.id} className="py-3 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs", isIncome ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                      {isIncome ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{t.merchant || t.description || 'Transaction'}</h4>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {formatSafeDate(t.date, 'MMM dd, yyyy')} • {t.category || 'Other Expense'}
                      </div>
                    </div>
                  </div>
                  <div className={clsx("font-extrabold text-sm text-right", isIncome ? "text-emerald-600" : "text-rose-600")}>
                    {isIncome ? '+' : '-'} ₹{parseFloat(t.amount || '0').toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Financial Health Score Modal */}
      {showHealthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#e1e8ed] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#e1e8ed] bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#00385d] text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#002b49]">Financial Health Score</h2>
                  <p className="text-xs text-slate-500 font-medium">Multi-factor analysis of your spending & savings</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHealthModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Score Header Card */}
              <div className="bg-gradient-to-br from-[#00385d] to-[#005b8e] p-6 rounded-2xl text-white relative overflow-hidden shadow-xs">
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-200 tracking-wider">Overall Rating</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-5xl font-extrabold">{score}</span>
                      <span className="text-slate-300 text-lg font-bold">/ 100</span>
                    </div>
                  </div>
                  <span className={clsx("px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs", scoreBadgeClass)}>
                    {scoreLabel}
                  </span>
                </div>
              </div>

              {/* Factors Breakdown */}
              {breakdown && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#002b49] uppercase tracking-wider">Score Calculation Factors</h3>

                  {/* 1. Savings Rate */}
                  <div className="p-4 rounded-xl border border-[#e1e8ed] bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-[#002b49] flex items-center gap-2">
                        💰 Savings Rate Factor
                      </span>
                      <span className="text-[#005b8e]">
                        {breakdown.savingsRateScore} / {breakdown.maxSavingsRateScore} pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#005b8e] h-full rounded-full transition-all duration-500" 
                        style={{ width: `${(breakdown.savingsRateScore / breakdown.maxSavingsRateScore) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Current savings rate: <strong className="text-[#002b49]">{summary.savingsRate}%</strong> of total income saved.
                    </p>
                  </div>

                  {/* 2. Budget Discipline */}
                  <div className="p-4 rounded-xl border border-[#e1e8ed] bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-[#002b49] flex items-center gap-2">
                        🎯 Budget Compliance Factor
                      </span>
                      <span className="text-[#005b8e]">
                        {breakdown.budgetScore} / {breakdown.maxBudgetScore} pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#005b8e] h-full rounded-full transition-all duration-500" 
                        style={{ width: `${(breakdown.budgetScore / breakdown.maxBudgetScore) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {breakdown.totalBudgets === 0 
                        ? 'No category budgets created yet.' 
                        : `${breakdown.exceededBudgets} out of ${breakdown.totalBudgets} budget(s) exceeded.`}
                    </p>
                  </div>

                  {/* 3. Savings Goals */}
                  <div className="p-4 rounded-xl border border-[#e1e8ed] bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-[#002b49] flex items-center gap-2">
                        🚀 Savings Goals Progress
                      </span>
                      <span className="text-[#005b8e]">
                        {breakdown.goalScore} / {breakdown.maxGoalScore} pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#005b8e] h-full rounded-full transition-all duration-500" 
                        style={{ width: `${(breakdown.goalScore / breakdown.maxGoalScore) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {breakdown.totalGoals === 0 
                        ? 'No active savings goals defined.' 
                        : `Average ${breakdown.avgGoalCompletion}% completion across ${breakdown.totalGoals} goal(s).`}
                    </p>
                  </div>

                  {/* 4. Consistency */}
                  <div className="p-4 rounded-xl border border-[#e1e8ed] bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-[#002b49] flex items-center gap-2">
                        ⚡ Financial Stability
                      </span>
                      <span className="text-[#005b8e]">
                        {breakdown.consistencyScore} / {breakdown.maxConsistencyScore} pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#005b8e] h-full rounded-full transition-all duration-500" 
                        style={{ width: `${(breakdown.consistencyScore / breakdown.maxConsistencyScore) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Actionable Recommendations */}
              {breakdown && breakdown.recommendations.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-600" /> Actionable Recommendations
                  </h4>
                  <ul className="space-y-1.5 text-xs text-amber-800 font-medium pl-1">
                    {breakdown.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#e1e8ed] bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setShowHealthModal(false)}
                className="px-5 py-2 bg-[#005b8e] hover:bg-[#004f7c] text-white rounded-xl text-sm font-bold transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
