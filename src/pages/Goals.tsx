import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi.ts';
import { Target, Plus, Trash2, X, Trophy, Wallet } from 'lucide-react';
import * as Progress from '@radix-ui/react-progress';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function Goals() {
  const api = useApi();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryDate, setSalaryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmittingSalary, setIsSubmittingSalary] = useState(false);

  const fetchGoals = async () => {
    try {
      const res = await api.get('/goals');
      setGoals(res.data);
    } catch (error) {
      console.error('Error fetching goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [api]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newTarget || isNaN(Number(newTarget))) return;
    
    try {
      await api.post('/goals', {
        name: newName,
        targetAmount: Number(newTarget),
        targetDate: newDeadline ? new Date(newDeadline).toISOString() : null
      });
      setShowAdd(false);
      setNewName('');
      setNewTarget('');
      setNewDeadline('');
      fetchGoals();
    } catch (error) {
      console.error('Failed to add goal');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      setGoals(goals.filter(g => g.id !== id));
    } catch (error) {
      console.error('Failed to delete goal');
    }
  };

  const handleContribute = async (id: number, currentCurrent: string) => {
    const amountStr = prompt('How much to add to this goal?');
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    try {
      const newAmount = parseFloat(currentCurrent) + amount;
      await api.put(`/goals/${id}`, { currentAmount: newAmount });
      fetchGoals();
    } catch (error) {
      console.error('Failed to update goal');
    }
  };
  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSalary(true);
    try {
      await api.post('/transactions', {
        amount: parseFloat(salaryAmount),
        date: salaryDate,
        type: 'income',
        merchant: 'Employer',
        description: 'Monthly Salary',
        categoryName: 'Salary'
      });
      setShowSalaryModal(false);
      setSalaryAmount('');
      alert('Monthly salary added successfully as income!');
    } catch (error) {
      alert('Failed to add salary');
    } finally {
      setIsSubmittingSalary(false);
    }
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6 text-[#0f172a] max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#002b49] mb-1">Savings Goals</h1>
          <p className="text-slate-500">Track your progress towards big purchases or financial milestones.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowSalaryModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <Wallet size={18} />
            Add Monthly Salary
          </button>
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#005b8e] hover:bg-[#004f7c] text-white rounded-xl font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            {showAdd ? <X size={18} /> : <Plus size={18} />}
            {showAdd ? 'Cancel' : 'New Goal'}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-3xl border border-[#e1e8ed] shadow-sm mb-6 relative z-10 overflow-hidden">
          <h3 className="text-lg font-bold text-[#002b49] mb-4 relative z-10">Create a New Goal</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Goal Name</label>
              <input 
                type="text" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. New Car, Emergency Fund"
                className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-[#0f172a] focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Amount (₹)</label>
              <input 
                type="number" 
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-[#0f172a] focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Date (Optional)</label>
              <input 
                type="date" 
                value={newDeadline}
                onChange={e => setNewDeadline(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#f8fafc] border border-[#e1e8ed] rounded-xl text-[#0f172a] focus:ring-2 focus:ring-[#005b8e]/20 focus:border-[#005b8e] outline-none"
              />
            </div>
            <div className="md:col-span-3 flex justify-end mt-2">
              <button type="submit" className="px-6 py-2.5 bg-[#005b8e] text-white hover:bg-[#004f7c] rounded-xl font-bold transition-colors shadow-xs">
                Create Goal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Monthly Salary Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#e1e8ed] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-[#e1e8ed] bg-slate-50/50">
              <h2 className="text-xl font-bold text-[#002b49]">Add Monthly Salary</h2>
              <button onClick={() => setShowSalaryModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form id="salary-form" onSubmit={handleAddSalary} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Salary Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={salaryAmount}
                    onChange={e => setSalaryAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full bg-[#f8fafc] border border-[#e1e8ed] rounded-xl py-2.5 px-3 text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Received Date</label>
                  <input
                    type="date"
                    required
                    value={salaryDate}
                    onChange={e => setSalaryDate(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e1e8ed] rounded-xl py-2.5 px-3 text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-[#e1e8ed] bg-slate-50/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSalaryModal(false)}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:text-[#0f172a] hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="salary-form"
                disabled={isSubmittingSalary || !salaryAmount}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                {isSubmittingSalary ? 'Saving...' : 'Save Income'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-[#005b8e] font-medium">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#e1e8ed] rounded-3xl shadow-xs">
          <Trophy className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500 mb-4 text-lg">No savings goals yet.</p>
          <button 
            onClick={() => setShowAdd(true)}
            className="text-[#005b8e] hover:underline font-bold"
          >
            Start saving today
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map(g => {
            const target = parseFloat(g.targetAmount);
            const current = parseFloat(g.currentAmount);
            const percentage = Math.min(100, (current / target) * 100);
            const isComplete = current >= target;
            
            return (
              <div key={g.id} className={clsx(
                "p-6 rounded-3xl border shadow-xs relative group overflow-hidden transition-all",
                isComplete ? "bg-emerald-50/60 border-emerald-200" : "bg-white border-[#e1e8ed]"
              )}>
                <button 
                  onClick={() => handleDelete(g.id)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Trash2 size={16} />
                </button>
                
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs",
                    isComplete ? "bg-emerald-600 text-white" : "bg-[#e0f2fe] text-[#005b8e]"
                  )}>
                    {isComplete ? <Trophy size={24} /> : <Target size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#002b49]">{g.name}</h3>
                    {g.targetDate && (
                      <p className="text-xs text-slate-500 font-medium">Target: {format(new Date(g.targetDate), 'MMM dd, yyyy')}</p>
                    )}
                  </div>
                </div>

                <div className="mb-6 relative z-10">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="text-3xl font-extrabold text-[#002b49]">{formatCurrency(current)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-500">of {formatCurrency(target)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className={clsx(
                      "text-sm font-bold",
                      isComplete ? "text-emerald-700" : "text-[#005b8e]"
                    )}>{percentage.toFixed(1)}% Complete</span>
                  </div>

                  <Progress.Root className="relative overflow-hidden bg-slate-100 rounded-full w-full h-3 border border-slate-200">
                    <Progress.Indicator
                      className={clsx(
                        "w-full h-full transition-transform duration-1000 ease-out rounded-full",
                        isComplete ? "bg-emerald-600" : "bg-[#005b8e]"
                      )}
                      style={{ transform: `translateX(-${100 - percentage}%)` }}
                    />
                  </Progress.Root>
                </div>
                
                {!isComplete && (
                  <button 
                    onClick={() => handleContribute(g.id, g.currentAmount)}
                    className="w-full py-2.5 bg-slate-50 hover:bg-[#e0f2fe] border border-[#e1e8ed] text-[#002b49] hover:text-[#005b8e] rounded-xl font-bold transition-colors relative z-10"
                  >
                    Add Funds
                  </button>
                )}
                {isComplete && (
                  <div className="w-full py-2.5 bg-emerald-100 text-emerald-800 text-center rounded-xl font-bold border border-emerald-200 relative z-10">
                    Goal Reached! 🎉
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
