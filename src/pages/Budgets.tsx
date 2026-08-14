import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi.ts';
import { 
  Plus, Trash2, Edit3, AlertTriangle, X, Sparkles, 
  TrendingUp, TrendingDown, ShieldAlert, CheckCircle2, 
  Zap, RefreshCw, Target, BrainCircuit, ArrowUpRight,
  Layers, ShoppingBag, Utensils, Plane, Film, Receipt, HeartPulse, GraduationCap
} from 'lucide-react';
import * as Progress from '@radix-ui/react-progress';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';

interface CategoryItem {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface BudgetItem {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  status: 'normal' | 'near_limit' | 'exceeded';
  daysPassed: number;
  daysInMonth: number;
  daysRemaining: number;
  dailyBurnRate: number;
  projectedSpend: number;
  projectedOverrun: number;
  isPredictedOverrun: boolean;
  targetDailyRateForRemaining: number;
  aiRecommendation: string;
}

interface SummaryData {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentage: number;
  nearLimitCount: number;
  predictedOverrunCount: number;
  exceededCount: number;
  daysPassed: number;
  daysInMonth: number;
  daysRemaining: number;
  overallAiAdvice: string;
}

export default function Budgets() {
  const api = useApi();
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | string>('');
  const [customCatName, setCustomCatName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  // AI Deep Insights modal
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const [budgetsRes, catRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/budgets/categories')
      ]);

      setBudgets(budgetsRes.data.budgets || []);
      setSummary(budgetsRes.data.summary || null);
      setCategoriesList(catRes.data || []);
      
      if (catRes.data && catRes.data.length > 0 && !selectedCatId) {
        setSelectedCatId(catRes.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [api]);

  const openAddModal = () => {
    setEditingBudgetId(null);
    if (categoriesList.length > 0) {
      setSelectedCatId(categoriesList[0].id);
    }
    setCustomCatName('');
    setBudgetAmount('');
    setShowModal(true);
  };

  const openEditModal = (b: BudgetItem) => {
    setEditingBudgetId(b.id);
    setSelectedCatId(b.categoryId);
    setCustomCatName(b.categoryName);
    setBudgetAmount(b.amount.toString());
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetAmount || isNaN(Number(budgetAmount))) return;

    try {
      if (editingBudgetId) {
        // Update budget
        await api.put(`/budgets/${editingBudgetId}`, {
          amount: Number(budgetAmount)
        });
      } else {
        // Create budget
        const selectedCat = categoriesList.find(c => c.id === Number(selectedCatId));
        await api.post('/budgets', {
          categoryId: selectedCat ? selectedCat.id : undefined,
          categoryName: selectedCat ? selectedCat.name : customCatName,
          amount: Number(budgetAmount)
        });
      }

      setShowModal(false);
      setBudgetAmount('');
      fetchBudgets();
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category budget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      fetchBudgets();
    } catch (error) {
      console.error('Failed to delete budget:', error);
    }
  };

  const fetchDeepAiRecommendations = async () => {
    setLoadingAi(true);
    try {
      const res = await api.post('/budgets/ai-recommendations', {
        budgetsData: budgets,
        summaryData: summary
      });
      setAiAnalysis(res.data.aiAnalysis || res.data.advice || 'All budgets are well-managed!');
    } catch (err) {
      console.error('Failed to fetch AI insights', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const formatCurrency = (val: number) => `₹${Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Utensils': return <Utensils size={18} />;
      case 'ShoppingBag': return <ShoppingBag size={18} />;
      case 'Plane': return <Plane size={18} />;
      case 'Film': return <Film size={18} />;
      case 'Receipt': return <Receipt size={18} />;
      case 'HeartPulse': return <HeartPulse size={18} />;
      case 'GraduationCap': return <GraduationCap size={18} />;
      default: return <Layers size={18} />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-[#005b8e]">
        <RefreshCw size={36} className="animate-spin text-[#005b8e]" />
        <p className="font-bold text-slate-600 text-sm">Analyzing monthly budget run-rates & limits...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-[#0f172a] max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e0f2fe] text-[#005b8e] text-xs font-bold mb-2">
            <Target size={14} /> Smart Budgeting Engine
          </div>
          <h1 className="text-3xl font-bold text-[#002b49]">Monthly Category Budgets</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track spending limits, monitor percentage usage, receive near-limit alerts & run-rate overrun predictions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDeepAiRecommendations}
            disabled={loadingAi}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2"
          >
            <BrainCircuit size={16} className={loadingAi ? "animate-spin" : ""} />
            {loadingAi ? 'Analyzing...' : 'AI Optimization'}
          </button>

          <button 
            onClick={openAddModal}
            className="px-4 py-2.5 bg-[#005b8e] hover:bg-[#004f7c] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Set Category Budget
          </button>
        </div>
      </div>

      {/* OVERALL BUDGET HEALTH BANNER */}
      {summary && (
        <div className="bg-white p-6 rounded-3xl border border-[#e1e8ed] shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#002b49] text-white flex items-center justify-center font-black text-lg shadow-xs">
                {summary.overallPercentage}%
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Monthly Budget Health</span>
                <h3 className="text-lg font-bold text-[#002b49]">
                  Spent {formatCurrency(summary.totalSpent)} of {formatCurrency(summary.totalBudget)}
                </h3>
              </div>
            </div>

            {/* Quick KPI Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className={clsx(
                "px-3 py-1.5 rounded-xl border flex items-center gap-1.5",
                summary.exceededCount > 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}>
                {summary.exceededCount > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                {summary.exceededCount} Exceeded
              </span>

              <span className={clsx(
                "px-3 py-1.5 rounded-xl border flex items-center gap-1.5",
                summary.predictedOverrunCount > 0 ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"
              )}>
                <Zap size={14} /> {summary.predictedOverrunCount} Overrun Projected
              </span>

              <span className={clsx(
                "px-3 py-1.5 rounded-xl border flex items-center gap-1.5",
                summary.nearLimitCount > 0 ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"
              )}>
                <ShieldAlert size={14} /> {summary.nearLimitCount} Near Limit
              </span>

              <span className="px-3 py-1.5 bg-[#f8fafc] text-slate-500 border border-slate-200 rounded-xl">
                Day {summary.daysPassed}/{summary.daysInMonth} ({summary.daysRemaining} days left)
              </span>
            </div>
          </div>

          {/* AI Strategy Banner */}
          <div className="bg-[#e0f2fe]/60 border border-[#b9e6fe] p-4 rounded-2xl flex items-start gap-3">
            <Sparkles className="text-[#005b8e] shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#002b49] uppercase tracking-wider">AI Financial Recommendation</h4>
              <p className="text-xs text-[#002b49] font-medium leading-relaxed">
                {summary.overallAiAdvice}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GEMINI DEEP AI ANALYSIS RESULT MODAL */}
      {aiAnalysis && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-6 rounded-3xl shadow-sm space-y-3 relative">
          <button 
            onClick={() => setAiAnalysis(null)} 
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
            <BrainCircuit size={20} className="text-purple-600" />
            <span>Deep Gemini AI Budget Optimization Analysis</span>
          </div>
          <div className="text-xs text-slate-700 leading-relaxed font-medium bg-white/80 p-4 rounded-2xl border border-purple-100">
            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* BUDGETS GRID */}
      {budgets.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#e1e8ed] rounded-3xl shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#e0f2fe] text-[#005b8e] flex items-center justify-center mx-auto">
            <Target size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#002b49]">No Category Budgets Set</h3>
            <p className="text-xs text-slate-400 mt-1">
              Create monthly spending limits for categories like Food, Groceries, Travel & Shopping.
            </p>
          </div>
          <button 
            onClick={openAddModal}
            className="px-5 py-2.5 bg-[#005b8e] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#004f7c] transition-colors inline-flex items-center gap-2"
          >
            <Plus size={16} /> Set Your First Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map(b => {
            const isExceeded = b.status === 'exceeded';
            const isNearLimit = b.status === 'near_limit';
            const isPredictedOverrun = b.isPredictedOverrun;

            return (
              <div 
                key={b.id} 
                className={clsx(
                  "bg-white p-6 rounded-3xl border shadow-xs relative transition-all space-y-5",
                  isExceeded 
                    ? "border-rose-300 ring-2 ring-rose-500/10" 
                    : isNearLimit || isPredictedOverrun
                    ? "border-amber-300 ring-2 ring-amber-500/10"
                    : "border-[#e1e8ed]"
                )}
              >
                {/* Header with Category & Actions */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs font-bold"
                      style={{ backgroundColor: b.categoryColor || '#005b8e' }}
                    >
                      {getCategoryIcon(b.categoryIcon)}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#002b49] text-base">{b.categoryName}</h3>
                      <p className="text-xs text-slate-400 font-medium">Monthly Category Limit</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => openEditModal(b)}
                      title="Edit Budget Limit"
                      className="p-2 text-slate-400 hover:text-[#005b8e] hover:bg-slate-50 rounded-xl transition-all"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(b.id)}
                      title="Delete Budget"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Amount Spent vs Total & Percentage Pill */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-2xl font-black text-[#002b49]">{formatCurrency(b.spent)}</span>
                      <span className="text-slate-400 font-semibold text-xs ml-1.5">/ {formatCurrency(b.amount)}</span>
                    </div>

                    <span className={clsx(
                      "px-3 py-1 rounded-full text-xs font-black border",
                      isExceeded 
                        ? "bg-rose-50 text-rose-700 border-rose-200" 
                        : isNearLimit 
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    )}>
                      {b.percentageUsed}% Used
                    </span>
                  </div>

                  {/* Dynamic Color Progress Bar */}
                  <Progress.Root className="relative overflow-hidden bg-slate-100 rounded-full w-full h-3 border border-slate-200">
                    <Progress.Indicator
                      className={clsx(
                        "w-full h-full transition-transform duration-500 ease-out rounded-full",
                        isExceeded 
                          ? "bg-rose-600" 
                          : isNearLimit || isPredictedOverrun
                          ? "bg-amber-500" 
                          : "bg-[#005b8e]"
                      )}
                      style={{ transform: `translateX(-${Math.max(0, 100 - b.percentageUsed)}%)` }}
                    />
                  </Progress.Root>

                  <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400 pt-0.5">
                    <span>
                      {b.remaining >= 0 ? `${formatCurrency(b.remaining)} remaining` : `${formatCurrency(Math.abs(b.remaining))} over budget`}
                    </span>
                    <span>Daily Burn Rate: {formatCurrency(b.dailyBurnRate)}/day</span>
                  </div>
                </div>

                {/* 1. NEAR-LIMIT WARNING CALLOUT */}
                {isNearLimit && !isExceeded && (
                  <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-amber-900">
                    <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800">⚠️ Near-Limit Warning</h4>
                      <p className="text-xs font-medium mt-0.5 leading-relaxed">
                        You have consumed <strong>{b.percentageUsed}%</strong> of your {b.categoryName} budget with <strong>{b.daysRemaining} days remaining</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. EXCEEDED BUDGET WARNING CALLOUT */}
                {isExceeded && (
                  <div className="bg-rose-50/80 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-rose-900">
                    <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-rose-800">🚫 Budget Exceeded</h4>
                      <p className="text-xs font-medium mt-0.5 leading-relaxed">
                        Limit exceeded by <strong>{formatCurrency(Math.abs(b.remaining))}</strong>. Pause non-essential purchases in {b.categoryName}.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. PREDICTED BUDGET OVERRUN CALLOUT */}
                {isPredictedOverrun && !isExceeded && (
                  <div className="bg-amber-50/60 border border-amber-200/80 p-3.5 rounded-2xl flex items-start gap-2.5 text-amber-900">
                    <Zap size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800">🚨 Predicted Budget Overrun</h4>
                      <p className="text-xs font-medium mt-0.5 leading-relaxed">
                        At your pace of <strong>{formatCurrency(b.dailyBurnRate)}/day</strong>, you are projected to spend <strong>{formatCurrency(b.projectedSpend)}</strong> (+{formatCurrency(b.projectedOverrun)} overrun) by month-end.
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. PER-CATEGORY AI RECOMMENDATION */}
                <div className="bg-[#f8fafc] border border-slate-200/80 p-3.5 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#005b8e] uppercase tracking-wider">
                    <Sparkles size={13} />
                    <span>AI Recommendation</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {b.aiRecommendation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT BUDGET MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-100 p-6 space-y-5 relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-bold text-lg text-[#002b49]">
                {editingBudgetId ? 'Update Category Budget' : 'Set Category Budget'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {!editingBudgetId && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Select Category</label>
                  <select
                    value={selectedCatId}
                    onChange={(e) => setSelectedCatId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-xs font-bold text-[#0f172a] focus:ring-2 focus:ring-[#005b8e]/20 outline-none"
                  >
                    {categoriesList.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                    <option value="custom">+ Custom Category Name</option>
                  </select>
                </div>
              )}

              {selectedCatId === 'custom' && !editingBudgetId && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Custom Category Name</label>
                  <input
                    type="text"
                    required
                    value={customCatName}
                    onChange={(e) => setCustomCatName(e.target.value)}
                    placeholder="e.g. Subscriptions, Fitness"
                    className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-xs font-semibold text-[#0f172a] focus:ring-2 focus:ring-[#005b8e]/20 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Monthly Spending Limit (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-sm font-bold text-[#0f172a] focus:ring-2 focus:ring-[#005b8e]/20 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#005b8e] hover:bg-[#004f7c] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
