// Updated Analytics implementation
import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi.ts';
import { 
  TrendingUp, TrendingDown, AlertTriangle, ShieldAlert,
  ArrowUpRight, ArrowDownRight, RefreshCw,
  Zap, Building2, PieChart as PieChartIcon, Calendar,
  BarChart3, CheckCircle2, ChevronRight, Layers, Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  CartesianGrid, Legend, LineChart, Line, Cell, PieChart, Pie 
} from 'recharts';
import clsx from 'clsx';

interface MoMData {
  currentMonthLabel: string;
  prevMonthLabel: string;
  currentExpense: number;
  prevExpense: number;
  expenseChangePct: number;
  currentIncome: number;
  prevIncome: number;
  incomeChangePct: number;
  currentSavings: number;
  prevSavings: number;
  savingsChangePct: number;
  history: Array<{
    year: number;
    month: number;
    label: string;
    income: number;
    expense: number;
    savings: number;
  }>;
}

interface TopCategory {
  name: string;
  color: string;
  icon: string;
  totalAmount: number;
  count: number;
  avgTransaction: number;
  percentage: number;
  currentM: number;
  prevM: number;
  momChangePct: number;
}

interface TopMerchant {
  merchant: string;
  totalAmount: number;
  count: number;
  avgSpend: number;
  percentage: number;
  primaryCategory: string;
}

interface Anomaly {
  id: string;
  type: 'single_transaction' | 'category_spike';
  title: string;
  description: string;
  amount: number;
  baselineAmount: number;
  date: string;
  merchant?: string;
  category: string;
  severity: 'high' | 'medium';
}

interface RecurringPayment {
  merchant: string;
  category: string;
  averageAmount: number;
  totalLifetimeSpend: number;
  frequency: string;
  paymentCount: number;
  lastBilledDate: string;
  nextDueDate: string;
  confidenceScore: number;
}

interface CategoryTrendData {
  categories: string[];
  colors: Record<string, string>;
  series: Array<Record<string, any>>;
}

export default function Analytics() {
  const api = useApi();
  const [loading, setLoading] = useState(true);
  const [mom, setMom] = useState<MoMData | null>(null);
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [topMerchants, setTopMerchants] = useState<TopMerchant[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<CategoryTrendData | null>(null);
  const [selectedTrendCategories, setSelectedTrendCategories] = useState<string[]>([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [momRes, catRes, merchRes, anomalyRes, recurRes, trendRes] = await Promise.all([
        api.get('/analytics/mom'),
        api.get('/analytics/top-categories'),
        api.get('/analytics/top-merchants'),
        api.get('/analytics/anomalies'),
        api.get('/analytics/recurring'),
        api.get('/analytics/category-trends')
      ]);

      setMom(momRes.data);
      setTopCategories(catRes.data);
      setTopMerchants(merchRes.data);
      setAnomalies(anomalyRes.data);
      setRecurring(recurRes.data);
      setCategoryTrends(trendRes.data);

      if (trendRes.data && trendRes.data.categories) {
        setSelectedTrendCategories(trendRes.data.categories.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [api]);

  const toggleTrendCategory = (catName: string) => {
    setSelectedTrendCategories(prev => 
      prev.includes(catName) 
        ? prev.filter(c => c !== catName)
        : [...prev, catName]
    );
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const defaultColors = ['#005b8e', '#0284c7', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-[#005b8e]">
        <RefreshCw size={36} className="animate-spin text-[#005b8e]" />
        <p className="font-bold text-slate-600 text-sm">Analyzing your spending patterns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-[#0f172a] max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e0f2fe] text-[#005b8e] text-xs font-bold mb-2">
            <Sparkles size={14} /> Intelligence Engine
          </div>
          <h1 className="text-3xl font-bold text-[#002b49]">Spending Pattern Analysis</h1>
          <p className="text-slate-500 text-sm mt-1">
            Deep insights into monthly trends, recurring obligations, vendor breakdowns, and spending anomalies.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#e1e8ed] hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-all self-start md:self-auto"
        >
          <RefreshCw size={14} /> Refresh Analysis
        </button>
      </div>

      {/* 1. MONTH-OVER-MONTH (MoM) COMPARISON */}
      {mom && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-[#005b8e]" />
            <h2 className="text-xl font-bold text-[#002b49]">1. Month-over-Month (MoM) Comparison</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Expense MoM Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#e1e8ed] shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Expenses</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#002b49]">{formatCurrency(mom.currentExpense)}</span>
                <span className={clsx(
                  "inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                  mom.expenseChangePct > 0 
                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                  {mom.expenseChangePct > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {Math.abs(mom.expenseChangePct)}% vs {mom.prevMonthLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Previous month: {formatCurrency(mom.prevExpense)}
              </p>
            </div>

            {/* Income MoM Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#e1e8ed] shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Income</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-[#002b49]">{formatCurrency(mom.currentIncome)}</span>
                <span className={clsx(
                  "inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                  mom.incomeChangePct >= 0 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-rose-50 text-rose-700 border-rose-200"
                )}>
                  {mom.incomeChangePct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {Math.abs(mom.incomeChangePct)}% vs {mom.prevMonthLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Previous month: {formatCurrency(mom.prevIncome)}
              </p>
            </div>

            {/* Net Savings MoM Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#e1e8ed] shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Savings</span>
              <div className="flex items-baseline justify-between">
                <span className={clsx("text-2xl font-black", mom.currentSavings >= 0 ? "text-emerald-700" : "text-rose-600")}>
                  {formatCurrency(mom.currentSavings)}
                </span>
                <span className={clsx(
                  "inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                  mom.savingsChangePct >= 0 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-rose-50 text-rose-700 border-rose-200"
                )}>
                  {mom.savingsChangePct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {Math.abs(mom.savingsChangePct)}% vs {mom.prevMonthLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Previous month: {formatCurrency(mom.prevSavings)}
              </p>
            </div>
          </div>

          {/* MoM 6-Month Comparison History Table / Chart */}
          <div className="bg-white p-6 rounded-3xl border border-[#e1e8ed] shadow-xs">
            <h3 className="text-sm font-bold text-[#002b49] mb-4">Income vs Expense Trend (Last 6 Months)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...mom.history].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `₹${val/1000}k`} />
                  <RechartsTooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#002b49" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* 2. SPENDING SPIKE / ANOMALY DETECTION */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-600" />
          <h2 className="text-xl font-bold text-[#002b49]">2. Spending Spike & Anomaly Detection</h2>
        </div>

        {anomalies.length === 0 ? (
          <div className="bg-emerald-50/60 p-6 rounded-3xl border border-emerald-200/80 text-center text-emerald-800 space-y-1">
            <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
            <h4 className="font-bold">No Unusual Spikes Detected</h4>
            <p className="text-xs text-emerald-700 font-medium">
              Your transaction pattern is consistent with historical baselines.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anomalies.map((item) => (
              <div 
                key={item.id}
                className={clsx(
                  "p-5 rounded-3xl border shadow-xs space-y-3 transition-all",
                  item.severity === 'high' 
                    ? "bg-rose-50/50 border-rose-200" 
                    : "bg-amber-50/50 border-amber-200"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={clsx(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs font-bold text-xs",
                      item.severity === 'high' ? "bg-rose-600" : "bg-amber-600"
                    )}>
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <span className={clsx(
                        "text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                        item.severity === 'high' ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-amber-100 text-amber-800 border-amber-300"
                      )}>
                        {item.severity} Severity Spike
                      </span>
                      <h4 className="font-bold text-[#002b49] text-sm mt-0.5">{item.title}</h4>
                    </div>
                  </div>
                  <span className="font-black text-rose-700 text-base">{formatCurrency(item.amount)}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium bg-white/70 p-3 rounded-2xl border border-slate-200/60">
                  {item.description}
                </p>

                <div className="flex justify-between items-center text-[11px] text-slate-500 font-semibold pt-1">
                  <span>Category: <strong>{item.category}</strong></span>
                  <span>Detected Date: {item.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. RECURRING PAYMENT DETECTION */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-[#005b8e]" />
          <h2 className="text-xl font-bold text-[#002b49]">3. Recurring Payment & Subscription Tracker</h2>
        </div>

        {recurring.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-[#e1e8ed] text-center text-slate-500">
            <p className="font-bold">No recurring payments detected yet.</p>
            <p className="text-xs text-slate-400 mt-1">Import or add transactions to identify regular monthly bills and subscriptions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recurring.map((rec, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-[#e1e8ed] shadow-xs space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-[#002b49]">{rec.merchant}</h4>
                    <span className="text-[11px] text-slate-400 font-semibold">{rec.category}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-[#e0f2fe] text-[#005b8e] text-xs font-bold rounded-xl border border-[#b9e6fe]">
                    {rec.frequency}
                  </span>
                </div>

                <div className="border-t border-b border-[#f1f5f9] py-3 flex justify-between items-baseline">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Avg Billing</span>
                    <span className="text-xl font-black text-[#002b49]">{formatCurrency(rec.averageAmount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Spent</span>
                    <span className="text-sm font-bold text-slate-600">{formatCurrency(rec.totalLifetimeSpend)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-slate-400" /> Next Due: <strong className="text-[#002b49]">{rec.nextDueDate}</strong>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    {rec.confidenceScore}% Confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. TOP CATEGORIES & TOP MERCHANTS (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Categories */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <PieChartIcon size={20} className="text-[#005b8e]" />
            <h2 className="text-xl font-bold text-[#002b49]">4. Top Spending Categories</h2>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e1e8ed] shadow-xs space-y-4">
            {topCategories.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No category data available</p>
            ) : (
              topCategories.slice(0, 6).map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-[#002b49]">{cat.name}</span>
                      <span className="text-slate-400 font-normal text-[11px]">({cat.count} txs)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#002b49] font-black">{formatCurrency(cat.totalAmount)}</span>
                      <span className="text-slate-400 font-normal text-[11px] ml-1.5">({cat.percentage}%)</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, cat.percentage)}%`, backgroundColor: cat.color }} 
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium pt-0.5">
                    <span>Avg per tx: {formatCurrency(cat.avgTransaction)}</span>
                    <span className={clsx(cat.momChangePct > 0 ? "text-rose-600" : "text-emerald-600")}>
                      {cat.momChangePct > 0 ? `+${cat.momChangePct}%` : `${cat.momChangePct}%`} vs last month
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Top Merchants */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-[#005b8e]" />
            <h2 className="text-xl font-bold text-[#002b49]">5. Top Vendors & Merchants</h2>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e1e8ed] shadow-xs divide-y divide-[#f1f5f9]">
            {topMerchants.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No merchant data available</p>
            ) : (
              topMerchants.map((merch, idx) => (
                <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 font-black text-[#005b8e] flex items-center justify-center text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#002b49] text-sm">{merch.merchant}</h4>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {merch.count} transactions • {merch.primaryCategory}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-[#002b49] text-sm">{formatCurrency(merch.totalAmount)}</div>
                    <span className="text-[10px] text-slate-400 font-semibold">{merch.percentage}% of wallet</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 6. CATEGORY-WISE TREND TIME SERIES */}
      {categoryTrends && categoryTrends.categories.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={20} className="text-[#005b8e]" />
              <h2 className="text-xl font-bold text-[#002b49]">6. Category-wise Spending Trend</h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e1e8ed] shadow-xs space-y-6">
            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filter Lines:</span>
              {categoryTrends.categories.map((catName) => {
                const isSelected = selectedTrendCategories.includes(catName);
                const color = categoryTrends.colors[catName] || '#005b8e';
                return (
                  <button
                    key={catName}
                    onClick={() => toggleTrendCategory(catName)}
                    className={clsx(
                      "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5",
                      isSelected 
                        ? "bg-[#e0f2fe] text-[#005b8e] border-[#b9e6fe] shadow-xs" 
                        : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {catName}
                  </button>
                );
              })}
            </div>

            {/* Time Series Line Chart */}
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={categoryTrends.series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `₹${val/1000}k`} />
                  <RechartsTooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  <Legend />
                  {selectedTrendCategories.map((catName, idx) => (
                    <Line
                      key={catName}
                      type="monotone"
                      dataKey={catName}
                      name={catName}
                      stroke={categoryTrends.colors[catName] || defaultColors[idx % defaultColors.length]}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
