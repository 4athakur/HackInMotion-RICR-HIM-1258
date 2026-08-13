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