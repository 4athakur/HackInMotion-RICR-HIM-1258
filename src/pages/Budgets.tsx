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
