'use client';

import { useEffect, useState } from 'react';
import {
  TrendingDown,
  Activity,
  Users,
  Zap,
  DollarSign,
  CheckSquare,
  Plus,
  Trash2,
  LineChart as LineChartIcon,
} from 'lucide-react';
import { getMarketInsights, type MarketInsight } from '@/lib/api/insights';
import { getDashboardSummary, type DashboardSummary } from '@/lib/api/dashboard';
import { listTodos, updateTodo, deleteTodo, createTodo, type TodoItem } from '@/lib/api/todos';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function isHighSeverity(severity: string): boolean {
  const s = severity?.toLowerCase() ?? '';
  return s === 'high' || s === 'critical';
}

function formatInr(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function getStatusColor(status: string): string {
  if (status === 'done') return 'text-emerald-600 bg-emerald-50';
  if (status === 'in_progress') return 'text-amber-600 bg-amber-50';
  return 'text-slate-600 bg-slate-100';
}

const mockGraphData = [
  { name: 'Jan', progress: 40, goal: 60 },
  { name: 'Feb', progress: 55, goal: 65 },
  { name: 'Mar', progress: 68, goal: 70 },
  { name: 'Apr', progress: 85, goal: 80 },
  { name: 'May', progress: 92, goal: 90 },
  { name: 'Jun', progress: 105, goal: 100 },
];

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [addingTodo, setAddingTodo] = useState(false);

  useEffect(() => {
    Promise.all([
      getDashboardSummary().catch(() => null),
      getMarketInsights().catch(() => []),
      listTodos().catch(() => []),
    ]).then(([sum, ins, todoList]) => {
      setSummary(sum);
      setInsights(ins);
      setTodos(todoList);
      setLoading(false);
    });
  }, []);

  const handleTodoStatusToggle = async (todo: TodoItem) => {
    const nextStatus =
      todo.status === 'pending'
        ? 'in_progress'
        : todo.status === 'in_progress'
        ? 'done'
        : 'pending';
    const updated = await updateTodo(todo.id, { status: nextStatus });
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteTodo(id);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;
    setAddingTodo(true);
    try {
      const created = await createTodo({ title: newTodoTitle.trim() });
      setTodos((prev) => [created, ...prev]);
      setNewTodoTitle('');
    } finally {
      setAddingTodo(false);
    }
  };

  const pendingTodos = todos.filter((t) => t.status !== 'done');

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex justify-center font-sans text-slate-800">
      
      {/* Outer Dashboard Container precisely matching wireframe */}
      <div className="w-full max-w-6xl border-2 border-slate-800 rounded-3xl p-6 relative bg-white">
        
        {/* Title over border trick */}
        <div className="absolute -top-4 left-10 bg-white px-2 text-xl font-medium tracking-wide">
          Dashboard
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-2">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6 flex flex-col">
            
            {/* Box: Clients Overview Panel */}
            <div className="border-2 border-slate-800 rounded-3xl p-6 flex-1 min-h-[300px] relative flex flex-col">
              <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide">
                Clients Overview Panel
              </div>
              <div className="mt-10 flex flex-col justify-center items-center h-full gap-6">
                {/* Embedded the stats purely to give it data, but keep wireframe label */}
                <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
                  <div className="text-center p-4 bg-emerald-50 rounded-2xl">
                    <Users className="h-6 w-6 mx-auto text-emerald-600 mb-2" />
                    <p className="text-2xl font-bold">{loading ? '—' : (summary?.totalClients ?? 0)}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Total Clients</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-2xl">
                    <DollarSign className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">{loading ? '—' : formatInr(summary?.totalAUM ?? 0)}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Total AUM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Box: Current market statistics */}
            <div className="border-2 border-slate-800 rounded-3xl p-6 min-h-[220px] relative flex flex-col flex-1">
              <div className="absolute top-4 w-full text-center left-0 text-sm font-medium tracking-wide">
                Current market statistics
              </div>
              <div className="mt-8 flex flex-col items-center justify-center h-full gap-4">
                 <div className="text-center p-4">
                    <Activity className="h-8 w-8 mx-auto text-indigo-500 mb-2" />
                    <p className="text-3xl font-bold">{loading ? '—' : (summary?.marketAlerts ?? insights.length)}</p>
                    <p className="text-sm font-semibold text-slate-500 uppercase mt-1">Market Alerts / Signals</p>
                 </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6 flex flex-col">
            
            {/* Box: To-Do List of Clients */}
            <div className="border-2 border-slate-800 rounded-3xl p-4 relative min-h-[220px] flex flex-col">
              <div className="absolute top-3 w-full text-center left-0 text-sm font-medium tracking-wide z-10">
                To-Do List of Clients
              </div>
              
              <div className="mt-8 flex flex-col h-full flex-1">
                {/* Input row */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Add task..."
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-800"
                  />
                  <button
                    onClick={handleAddTodo}
                    disabled={addingTodo || !newTodoTitle.trim()}
                    className="flex items-center justify-center rounded-xl bg-slate-800 px-3 py-1.5 text-white disabled:opacity-50 hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto max-h-32 space-y-2 pr-1">
                  {loading && <p className="text-center text-sm text-slate-400 mt-4">Loading…</p>}
                  {!loading && todos.map((todo) => (
                    <div key={todo.id} className="flex flex-row items-center justify-between p-2 rounded-lg bg-slate-50 text-sm">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={todo.status === 'done'}
                          onChange={() => handleTodoStatusToggle(todo)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-800"
                        />
                        <span className={todo.status === 'done' ? 'line-through text-slate-400' : ''}>
                          {todo.title}
                        </span>
                      </div>
                      <button onClick={() => handleDeleteTodo(todo.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Box: Graph progress rate/ personal goals */}
            <div className="border-2 border-slate-800 rounded-3xl p-4 relative min-h-[220px] flex flex-col justify-center items-center">
              <div className="absolute top-3 w-full text-center left-0 text-sm font-medium tracking-wide">
                Graph progress rate/ personal goals
              </div>
              <div className="w-full h-40 mt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockGraphData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip cursor={{ stroke: '#94A3B8', strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="progress" stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} name="Progress" />
                    <Line type="monotone" dataKey="goal" stroke="#94A3B8" strokeWidth={3} strokeDasharray="4 4" dot={false} name="Goal" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Box: Summary of recent events(AI) */}
            <div className="border-2 border-slate-800 rounded-3xl p-4 relative min-h-[220px] flex flex-col">
              <div className="absolute top-3 w-full text-center left-0 text-sm font-medium tracking-wide z-10 bg-white">
                Summary of recent events(AI)
              </div>
              <div className="mt-8 flex-1 overflow-y-auto max-h-40 space-y-3 pr-1">
                {loading && <p className="text-center text-sm text-slate-400 mt-4">Loading insights…</p>}
                {!loading && insights.map((insight) => (
                  <div key={insight.id} className="p-3 bg-slate-50 rounded-xl flex gap-3 text-sm">
                    <Zap className={`h-4 w-4 shrink-0 mt-0.5 ${isHighSeverity(insight.severity) ? 'text-red-500' : 'text-amber-500'}`} />
                    <div>
                      <p className="font-semibold text-slate-800">{insight.title}</p>
                      <p className="text-slate-600 text-xs mt-1 leading-relaxed line-clamp-2">{insight.ai_summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
