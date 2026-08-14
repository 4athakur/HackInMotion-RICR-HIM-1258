// Budget management page - handles budgets, spending tracking, and AI recommendations
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