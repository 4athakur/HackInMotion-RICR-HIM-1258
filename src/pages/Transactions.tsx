import { useEffect, useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi.ts';
import { Plus, Search, Trash2, Edit2, Download, X, Filter, ArrowUpRight, ArrowDownRight, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import Papa from 'papaparse';

interface CategoryItem {
  id: number;
  name: string;
  type: string;
  color?: string;
  icon?: string;
}

export default function Transactions() {
  const api = useApi();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    type: 'expense',
    merchant: '',
    description: '',
    categoryName: ''
  });

  // Edit Modal State
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    amount: '',
    type: 'expense',
    merchant: '',
    description: '',
    categoryName: ''
  });

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions');
      setTransactions(res.data);
    } catch (error) {
      console.error('Error fetching transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/transactions/categories');
      setCategoriesList(res.data);
    } catch (error) {
      console.error('Error fetching categories');
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, [api]);

  // Handle Delete
  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/transactions/${deletingId}`);
      setTransactions(prev => prev.filter(t => t.id !== deletingId));
      showToast('Transaction deleted successfully');
    } catch (error) {
      console.error('Failed to delete transaction');
      alert('Failed to delete transaction');
    } finally {
      setDeletingId(null);
    }
  };

  // Start Editing
  const handleStartEdit = (t: any) => {
    setEditingTransaction(t);
    setEditForm({
      date: t.date ? format(new Date(t.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      amount: String(t.amount),
      type: t.type || 'expense',
      merchant: t.merchant || '',
      description: t.description || '',
      categoryName: t.category || ''
    });
  };

  // Handle Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    setIsSubmitting(true);
    try {
      await api.put(`/transactions/${editingTransaction.id}`, {
        ...editForm,
        amount: parseFloat(editForm.amount)
      });
      showToast('Transaction updated successfully');
      setEditingTransaction(null);
      fetchTransactions();
    } catch (error) {
      console.error('Failed to update transaction', error);
      alert('Failed to update transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/transactions', {
        ...addForm,
        amount: parseFloat(addForm.amount)
      });
      setShowAddModal(false);
      setAddForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        type: 'expense',
        merchant: '',
        description: '',
        categoryName: ''
      });
      showToast('Transaction added successfully');
      fetchTransactions();
    } catch (error) {
      console.error('Failed to add transaction');
      alert('Failed to add transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtering & Sorting
  const filteredAndSorted = useMemo(() => {
    return transactions
      .filter(t => {
        // Income vs Expense Filter
        if (typeFilter !== 'all' && t.type !== typeFilter) {
          return false;
        }

        // Category Filter
        if (categoryFilter !== 'all' && t.category?.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }

        // Search Term
        if (searchTerm.trim() !== '') {
          const query = searchTerm.toLowerCase();
          const matchDesc = t.description?.toLowerCase().includes(query);
          const matchMerchant = t.merchant?.toLowerCase().includes(query);
          const matchCategory = t.category?.toLowerCase().includes(query);
          const matchAmount = String(t.amount).includes(query);
          if (!matchDesc && !matchMerchant && !matchCategory && !matchAmount) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        } else if (sortBy === 'date-asc') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortBy === 'amount-desc') {
          return parseFloat(b.amount) - parseFloat(a.amount);
        } else if (sortBy === 'amount-asc') {
          return parseFloat(a.amount) - parseFloat(b.amount);
        }
        return 0;
      });
  }, [transactions, searchTerm, typeFilter, categoryFilter, sortBy]);

  // Export CSV
  const handleExport = () => {
    const csv = Papa.unparse(filteredAndSorted.map(t => ({
      Date: format(new Date(t.date), 'yyyy-MM-dd'),
      Description: t.description || '',
      Merchant: t.merchant || '',
      Category: t.category || 'Uncategorized',
      Type: t.type,
      Amount: t.amount
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'transactions_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unique Categories from transactions + list
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    categoriesList.forEach(c => set.add(c.name));
    transactions.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [categoriesList, transactions]);

  const counts = useMemo(() => {
    const expCount = transactions.filter(t => t.type === 'expense').length;
    const incCount = transactions.filter(t => t.type === 'income').length;
    return { all: transactions.length, expense: expCount, income: incCount };
  }, [transactions]);

  return (
    <div className="space-y-6 text-[#0f172a]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#002b49] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="text-emerald-400" size={20} />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}