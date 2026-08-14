// Updated Transactions page implementation
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useApi } from '../hooks/useApi.ts';
import { 
  Plus, Search, Trash2, Edit2, Download, Upload, X, Filter, 
  ArrowUpRight, ArrowDownRight, RefreshCw, CheckCircle, AlertCircle, 
  FileUp, Check, AlertTriangle, Layers, Calendar, DollarSign, Tag, Building2
} from 'lucide-react';
import clsx from 'clsx';
import Papa from 'papaparse';
import { formatSafeDate, toSafeISODate } from '../lib/dateUtils.ts';
import { processCSVRows, ParseResult } from '../lib/csvParser.ts';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    date: toSafeISODate(new Date()),
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

  // CSV Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedImportData, setParsedImportData] = useState<ParseResult | null>(null);
  const [selectedImportRows, setSelectedImportRows] = useState<Record<number, boolean>>({});
  const [isImporting, setIsImporting] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchTransactions = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/transactions');
      setTransactions(res.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/transactions/categories');
      setCategoriesList(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, [api]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTransactions(true);
    fetchCategories();
  };

  // Handle Delete
  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/transactions/${deletingId}`);
      setTransactions(prev => prev.filter(t => t.id !== deletingId));
      showToast('Transaction deleted successfully');
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Start Editing
  const handleStartEdit = (t: any) => {
    setEditingTransaction(t);
    setEditForm({
      date: formatSafeDate(t.date, 'yyyy-MM-dd'),
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
      const updated = await api.put(`/transactions/${editingTransaction.id}`, {
        date: toSafeISODate(editForm.date),
        amount: parseFloat(editForm.amount),
        type: editForm.type,
        merchant: editForm.merchant,
        description: editForm.description,
        categoryName: editForm.categoryName
      });
      
      showToast('Transaction updated successfully');
      setEditingTransaction(null);
      await fetchTransactions(true);
      await fetchCategories();
    } catch (error: any) {
      console.error('Failed to update transaction', error);
      alert(error.response?.data?.error || 'Failed to update transaction. Please check inputs.');
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
        date: toSafeISODate(addForm.date),
        amount: parseFloat(addForm.amount),
        type: addForm.type,
        merchant: addForm.merchant,
        description: addForm.description,
        categoryName: addForm.categoryName
      });
      setShowAddModal(false);
      setAddForm({
        date: toSafeISODate(new Date()),
        amount: '',
        type: 'expense',
        merchant: '',
        description: '',
        categoryName: ''
      });
      showToast('Transaction added successfully');
      await fetchTransactions(true);
      await fetchCategories();
    } catch (error: any) {
      console.error('Failed to add transaction:', error);
      alert(error.response?.data?.error || 'Failed to add transaction. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Import handling
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImportFile(e.target.files[0]);
    }
  };

  const handleCSVFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImportFile(e.dataTransfer.files[0]);
    }
  };

  const processImportFile = (file: File) => {
    setImportFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = processCSVRows(results.data as any[], transactions);
        setParsedImportData(parsed);
        const initialSelection: Record<number, boolean> = {};
        parsed.validRows.forEach(r => { initialSelection[r.rowIndex] = true; });
        parsed.duplicateRows.forEach(r => { initialSelection[r.rowIndex] = false; });
        setSelectedImportRows(initialSelection);
      }
    });
  };

  const handleConfirmImport = async () => {
    if (!parsedImportData) return;

    const itemsToImport = [
      ...parsedImportData.validRows,
      ...parsedImportData.duplicateRows
    ].filter(r => selectedImportRows[r.rowIndex])
     .map(r => ({
        date: toSafeISODate(r.date),
        description: r.description,
        merchant: r.merchant,
        amount: r.amount,
        type: r.type,
        categoryName: r.categoryName
     }));

    if (itemsToImport.length === 0) {
      alert('Please select at least one row to import.');
      return;
    }

    setIsImporting(true);
    try {
      const res = await api.post('/transactions/upload', { items: itemsToImport });
      const count = res.data.count || itemsToImport.length;
      showToast(`Successfully imported ${count} transactions!`);
      setShowImportModal(false);
      setImportFile(null);
      setParsedImportData(null);
      setSelectedImportRows({});
      await fetchTransactions(true);
      await fetchCategories();
    } catch (error: any) {
      console.error('Import failed:', error);
      alert(error.response?.data?.error || 'Failed to import transactions.');
    } finally {
      setIsImporting(false);
    }
  };

  // Export CSV
  const handleExport = () => {
    const csv = Papa.unparse(filteredAndSorted.map(t => ({
      Date: formatSafeDate(t.date, 'yyyy-MM-dd'),
      Description: t.description || '',
      Merchant: t.merchant || '',
      Category: t.category || 'Other Expense',
      Type: t.type,
      Amount: t.amount
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transactions_${toSafeISODate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Transactions exported to CSV');
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

  // Unique Categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    categoriesList.forEach(c => set.add(c.name));
    transactions.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [categoriesList, transactions]);

  // Summary Metrics
  const summaryStats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let countIncome = 0;
    let countExpense = 0;

    transactions.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amt;
        countIncome++;
      } else {
        totalExpense += amt;
        countExpense++;
      }
    });

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      countAll: transactions.length,
      countIncome,
      countExpense
    };
  }, [transactions]);

  return (
    <div className="space-y-6 text-[#0f172a] max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#002b49] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="text-emerald-400" size={20} />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#002b49] tracking-tight">Transactions</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage, update, import, and export your financial records.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button 
            onClick={handleRefresh}
            title="Refresh transactions"
            className="p-2.5 bg-white border border-[#e1e8ed] text-slate-700 hover:text-[#002b49] hover:bg-slate-50 rounded-xl font-medium transition-colors shadow-xs"
          >
            <RefreshCw size={18} className={clsx(isRefreshing && "animate-spin text-[#005b8e]")} />
          </button>
          
          <button 
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-xs text-sm"
          >
            <Upload size={16} />
            Import CSV
          </button>

          <button 
            onClick={handleExport}
            className="px-4 py-2.5 bg-white border border-[#e1e8ed] text-slate-700 hover:text-[#002b49] hover:bg-slate-50 rounded-xl font-semibold transition-colors flex items-center gap-2 shadow-xs text-sm"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#005b8e] hover:bg-[#004f7c] text-white rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2 text-sm"
          >
            <Plus size={18} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#e1e8ed] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Income</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              ₹{summaryStats.totalIncome.toLocaleString('en-IN')}
            </div>
            <span className="text-xs text-slate-400 font-medium">{summaryStats.countIncome} transactions</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowUpRight size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e1e8ed] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
            <div className="text-2xl font-black text-rose-600 mt-1">
              ₹{summaryStats.totalExpense.toLocaleString('en-IN')}
            </div>
            <span className="text-xs text-slate-400 font-medium">{summaryStats.countExpense} transactions</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowDownRight size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#e1e8ed] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Balance</span>
            <div className={clsx("text-2xl font-black mt-1", summaryStats.netBalance >= 0 ? "text-[#005b8e]" : "text-amber-600")}>
              ₹{summaryStats.netBalance.toLocaleString('en-IN')}
            </div>
            <span className="text-xs text-slate-400 font-medium">{summaryStats.countAll} total records</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#005b8e] flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Filters & Control Panel */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#e1e8ed] p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Income vs Expense Selector Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto border border-slate-200/60">
            <button
              onClick={() => setTypeFilter('all')}
              className={clsx(
                "flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                typeFilter === 'all' 
                  ? "bg-white text-[#002b49] shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              All
              <span className={clsx("px-1.5 py-0.5 rounded-md text-[10px]", typeFilter === 'all' ? "bg-slate-100 text-slate-700" : "bg-slate-200 text-slate-600")}>
                {summaryStats.countAll}
              </span>
            </button>

            <button
              onClick={() => setTypeFilter('expense')}
              className={clsx(
                "flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                typeFilter === 'expense' 
                  ? "bg-rose-600 text-white shadow-xs" 
                  : "text-slate-600 hover:text-rose-700"
              )}
            >
              <ArrowDownRight size={14} />
              Expense
              <span className={clsx("px-1.5 py-0.5 rounded-md text-[10px]", typeFilter === 'expense' ? "bg-rose-700 text-white" : "bg-slate-200 text-slate-600")}>
                {summaryStats.countExpense}
              </span>
            </button>

            <button
              onClick={() => setTypeFilter('income')}
              className={clsx(
                "flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                typeFilter === 'income' 
                  ? "bg-emerald-600 text-white shadow-xs" 
                  : "text-slate-600 hover:text-emerald-700"
              )}
            >
              <ArrowUpRight size={14} />
              Income
              <span className={clsx("px-1.5 py-0.5 rounded-md text-[10px]", typeFilter === 'income' ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-600")}>
                {summaryStats.countIncome}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search merchant, notes, amount..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e] text-[#0f172a] placeholder-slate-400"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Category & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#f8fafc] border border-[#e1e8ed] text-slate-700 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#005b8e] w-full sm:w-auto"
            >
              <option value="all">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-semibold text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#f8fafc] border border-[#e1e8ed] text-slate-700 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#005b8e]"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction List / Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-[#e1e8ed] overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw size={32} className="animate-spin text-[#005b8e]" />
            <p className="text-sm font-medium">Loading transactions...</p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Search size={28} />
            </div>
            <h3 className="text-lg font-bold text-[#002b49] mb-1">No Transactions Found</h3>
            <p className="text-slate-500 text-sm max-w-md mb-6">
              {searchTerm || categoryFilter !== 'all' || typeFilter !== 'all'
                ? "No transactions match your current filters. Try resetting search or filters."
                : "Get started by importing your bank statement CSV or adding a transaction manually."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-sky-50 text-sky-800 rounded-xl font-bold text-sm border border-sky-200"
              >
                Import CSV File
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#005b8e] text-white rounded-xl font-bold text-sm shadow-xs"
              >
                Add Transaction
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e1e8ed] bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6">Merchant / Payee</th>
                  <th className="py-3.5 px-6">Description / Notes</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                  <th className="py-3.5 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSorted.map((t) => {
                  const isIncome = t.type === 'income';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-6 font-medium text-slate-600 whitespace-nowrap">
                        {formatSafeDate(t.date, 'MMM dd, yyyy')}
                      </td>
                      <td className="py-4 px-6 font-bold text-[#002b49] whitespace-nowrap">
                        {t.merchant || t.description || 'Transaction'}
                      </td>
                      <td className="py-4 px-6 text-slate-500 max-w-xs truncate">
                        {t.description || '-'}
                      </td>
                      <td className="py-4 px-6">
                        <span 
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: `${t.categoryColor || '#64748b'}15`,
                            color: t.categoryColor || '#475569'
                          }}
                        >
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: t.categoryColor || '#64748b' }}
                          />
                          {t.category || 'Other Expense'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold whitespace-nowrap">
                        <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                          {isIncome ? '+' : '-'} ₹{parseFloat(t.amount || '0').toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStartEdit(t)}
                            title="Edit transaction"
                            className="p-1.5 text-slate-400 hover:text-[#005b8e] hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingId(t.id)}
                            title="Delete transaction"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Direct CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#e1e8ed] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#e1e8ed] bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-[#005b8e] flex items-center justify-center">
                  <FileUp size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#002b49]">Import CSV File</h2>
                  <p className="text-xs text-slate-500">Upload bank statement or expense CSV file</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowImportModal(false); setImportFile(null); setParsedImportData(null); }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {!parsedImportData ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleCSVFileDrop}
                  className="border-2 border-dashed border-[#cbd5e1] hover:border-[#005b8e] rounded-2xl p-8 text-center bg-[#f8fafc] hover:bg-sky-50/40 transition-colors relative cursor-pointer"
                >
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center pointer-events-none space-y-2">
                    <div className="w-12 h-12 bg-sky-100 text-[#005b8e] rounded-2xl flex items-center justify-center mb-1">
                      <Upload size={24} />
                    </div>
                    <p className="font-bold text-slate-700 text-sm">Click or drag & drop CSV here</p>
                    <p className="text-xs text-slate-400">Supports Date, Description, Merchant, Category, Type, Amount</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-sky-50 p-4 rounded-xl border border-sky-200 text-sky-900 text-xs">
                    <div>
                      <span className="font-bold">File: {importFile?.name}</span>
                      <p className="text-sky-700 mt-0.5">
                        Found {parsedImportData.validRows.length} valid rows, {parsedImportData.duplicateRows.length} duplicate(s).
                      </p>
                    </div>
                    <button
                      onClick={() => { setImportFile(null); setParsedImportData(null); }}
                      className="px-3 py-1 bg-white text-slate-700 rounded-lg font-bold border border-slate-200 hover:bg-slate-50"
                    >
                      Change File
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                    {parsedImportData.validRows.concat(parsedImportData.duplicateRows).slice(0, 50).map((row) => {
                      const isSelected = !!selectedImportRows[row.rowIndex];
                      const isDuplicate = row.isDuplicate;
                      return (
                        <div 
                          key={row.rowIndex}
                          onClick={() => setSelectedImportRows(prev => ({ ...prev, [row.rowIndex]: !prev[row.rowIndex] }))}
                          className={clsx(
                            "flex items-center justify-between p-3 cursor-pointer transition-colors",
                            isSelected ? "bg-white" : "bg-slate-50/70 opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-[#005b8e]"
                            />
                            <div>
                              <div className="font-bold text-slate-800 flex items-center gap-2">
                                {row.merchant || row.description}
                                {isDuplicate && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                    Possible Duplicate
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-400 text-[11px]">
                                {formatSafeDate(row.date, 'MMM dd, yyyy')} • {row.categoryName}
                              </div>
                            </div>
                          </div>
                          <div className={clsx("font-bold text-sm", row.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>
                            {row.type === 'income' ? '+' : '-'} ₹{Number(row.amount).toLocaleString('en-IN')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-[#e1e8ed] flex justify-end gap-3">
              <button
                onClick={() => { setShowImportModal(false); setImportFile(null); setParsedImportData(null); }}
                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200/60 rounded-xl text-sm"
              >
                Cancel
              </button>
              {parsedImportData && (
                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="px-5 py-2 bg-[#005b8e] hover:bg-[#004f7c] text-white font-bold rounded-xl text-sm shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {isImporting ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  Import Selected
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#e1e8ed] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#e1e8ed] bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-[#005b8e] flex items-center justify-center">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#002b49]">Edit Transaction</h2>
                  <p className="text-xs text-slate-500">Update amount, category, or transaction details</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingTransaction(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, type: 'expense' }))}
                  className={clsx(
                    "py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                    editForm.type === 'expense' ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <ArrowDownRight size={14} /> Expense
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, type: 'income' }))}
                  className={clsx(
                    "py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                    editForm.type === 'income' ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <ArrowUpRight size={14} /> Income
                </button>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editForm.amount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-sm font-bold text-[#002b49] focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                <select
                  value={editForm.categoryName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, categoryName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                >
                  <option value="">Auto-Detect / Select Category</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Merchant & Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Merchant / Vendor</label>
                <input
                  type="text"
                  value={editForm.merchant}
                  onChange={(e) => setEditForm(prev => ({ ...prev, merchant: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                  placeholder="e.g. Swiggy, Amazon, Salary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                  placeholder="Optional notes or details"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#005b8e] hover:bg-[#004f7c] text-white font-bold rounded-xl text-sm shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#e1e8ed] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#e1e8ed] bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#005b8e] text-white flex items-center justify-center">
                  <Plus size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#002b49]">Add Transaction</h2>
                  <p className="text-xs text-slate-500">Record a new expense or income transaction</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddForm(prev => ({ ...prev, type: 'expense' }))}
                  className={clsx(
                    "py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                    addForm.type === 'expense' ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <ArrowDownRight size={14} /> Expense
                </button>
                <button
                  type="button"
                  onClick={() => setAddForm(prev => ({ ...prev, type: 'income' }))}
                  className={clsx(
                    "py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                    addForm.type === 'income' ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <ArrowUpRight size={14} /> Income
                </button>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={addForm.amount}
                    onChange={(e) => setAddForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-sm font-bold text-[#002b49] focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={addForm.date}
                    onChange={(e) => setAddForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                <select
                  value={addForm.categoryName}
                  onChange={(e) => setAddForm(prev => ({ ...prev, categoryName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                >
                  <option value="">Auto-Detect / Select Category</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Merchant & Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Merchant / Vendor</label>
                <input
                  type="text"
                  value={addForm.merchant}
                  onChange={(e) => setAddForm(prev => ({ ...prev, merchant: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                  placeholder="e.g. Swiggy, Amazon, Salary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e]"
                  placeholder="Optional description"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#005b8e] hover:bg-[#004f7c] text-white font-bold rounded-xl text-sm shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#e1e8ed] rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 size={26} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#002b49]">Delete Transaction?</h3>
              <p className="text-xs text-slate-500 mt-1">This action cannot be undone and will update your budget and analytics immediately.</p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm transition-colors shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
