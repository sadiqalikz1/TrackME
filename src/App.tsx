/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  FirebaseUser,
  handleFirestoreError,
  OperationType
} from './firebase';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Settings, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  PieChart as PieChartIcon,
  Plus,
  Trash2,
  AlertCircle,
  X,
  Search,
  Filter,
  LineChart,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  Camera,
  CheckCircle2,
  Clock,
  XCircle,
  Image as ImageIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  AreaChart,
  Area,
  LineChart as ReLineChart,
  Line
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, eachMonthOfInterval } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Transaction {
  id: string;
  uid: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: Date;
  note?: string;
  createdAt: Date;
}

interface Budget {
  id: string;
  uid: string;
  category: string;
  limit: number;
  month: string; // YYYY-MM
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  currency: string;
}

interface Work {
  id: string;
  uid: string;
  title: string;
  category: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  quotationAmount: number;
  finalAmount: number;
  workingCost: number;
  expenses: number;
  profit: number;
  photos: string[];
  progress: number;
  isProfitTransferred: boolean;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
}

// --- Contexts ---
const NotificationContext = React.createContext<{
  showNotification: (message: string, type?: 'success' | 'error') => void;
  confirm: (title: string, message: string, onConfirm: () => void) => void;
} | null>(null);

function useNotification() {
  const context = React.useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
}

// --- Components ---

const CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Shopping', 'Entertainment', 'Health', 'Salary', 'Investment', 'Other'
];

const WORK_CATEGORIES = [
  'CCTV Installation', 'Computer Hardware', 'Networking', 'Software Development', 'Maintenance', 'Consultation', 'Other'
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b'];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'budgets' | 'analysis' | 'works' | 'settings'>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);

  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void 
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch/Create Profile
        const userDoc = doc(db, 'users', u.uid);
        try {
          const snap = await getDoc(userDoc);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || 'User',
              currency: 'USD'
            };
            await setDoc(userDoc, { ...newProfile, createdAt: Timestamp.now() });
            setProfile(newProfile);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
        }
      } else {
        setProfile(null);
        setTransactions([]);
        setBudgets([]);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user) return;

    const tQuery = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribeTransactions = onSnapshot(tQuery, (snap) => {
      const ts = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: data.date.toDate(),
          createdAt: data.createdAt.toDate()
        } as Transaction;
      });
      setTransactions(ts);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    const bQuery = query(
      collection(db, 'budgets'),
      where('uid', '==', user.uid)
    );

    const unsubscribeBudgets = onSnapshot(bQuery, (snap) => {
      const bs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Budget));
      setBudgets(bs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'budgets'));
    
    const wQuery = query(
      collection(db, 'works'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeWorks = onSnapshot(wQuery, (snap) => {
      const ws = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
          createdAt: data.createdAt.toDate()
        } as Work;
      });
      setWorks(ws);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'works'));

    return () => {
      unsubscribeTransactions();
      unsubscribeBudgets();
      unsubscribeWorks();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-stone-100"
        >
          <div className="w-20 h-20 bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-lg">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-stone-900 mb-4 tracking-tight">FinanceFlow</h1>
          <p className="text-stone-500 mb-10 text-lg leading-relaxed">
            Take control of your financial future with real-time tracking and smart insights.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-semibold text-lg hover:bg-stone-800 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <NotificationContext.Provider value={{ showNotification, confirm: confirmAction }}>
      <div className="min-h-screen bg-stone-50 flex flex-col lg:flex-row font-sans text-stone-900">
        {/* Sidebar */}
        <nav className="w-full lg:w-72 bg-white border-b lg:border-r border-stone-200 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">FinanceFlow</span>
          </div>

          <div className="flex-1 space-y-2">
            <NavButton 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')}
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="Dashboard"
            />
            <NavButton 
              active={activeTab === 'works'} 
              onClick={() => setActiveTab('works')}
              icon={<Briefcase className="w-5 h-5" />}
              label="Work Tracking"
            />
            <NavButton 
              active={activeTab === 'transactions'} 
              onClick={() => setActiveTab('transactions')}
              icon={<History className="w-5 h-5" />}
              label="History & Search"
            />
            <NavButton 
              active={activeTab === 'analysis'} 
              onClick={() => setActiveTab('analysis')}
              icon={<LineChart className="w-5 h-5" />}
              label="Detailed Analysis"
            />
            <NavButton 
              active={activeTab === 'budgets'} 
              onClick={() => setActiveTab('budgets')}
              icon={<PieChartIcon className="w-5 h-5" />}
              label="Budgets"
            />
            <NavButton 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')}
              icon={<Settings className="w-5 h-5" />}
              label="Settings"
            />
          </div>

          <div className="pt-6 border-t border-stone-100 mt-auto">
            <div className="flex items-center gap-3 px-3 py-4 mb-4 bg-stone-50 rounded-2xl">
              <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border border-stone-200" alt="User" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.displayName}</p>
                <p className="text-xs text-stone-500 truncate">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-h-screen">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <Dashboard transactions={transactions} budgets={budgets} currency={profile?.currency || 'USD'} />}
            {activeTab === 'transactions' && <TransactionsView transactions={transactions} currency={profile?.currency || 'USD'} />}
            {activeTab === 'budgets' && <BudgetsView transactions={transactions} budgets={budgets} currency={profile?.currency || 'USD'} />}
            {activeTab === 'analysis' && <AnalysisView transactions={transactions} currency={profile?.currency || 'USD'} />}
            {activeTab === 'works' && <WorkTrackingView works={works} currency={profile?.currency || 'USD'} />}
            {activeTab === 'settings' && <SettingsView profile={profile} uid={user.uid} />}
          </AnimatePresence>
        </main>

        {/* Global Add Button (Mobile/Desktop) */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-40">
          <button 
            onClick={() => setIsWorkModalOpen(true)}
            className="w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
            title="Add New Work"
          >
            <Briefcase className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-16 h-16 bg-stone-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
            title="Add Transaction"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        {/* Add Transaction Modal */}
        <AddTransactionModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          uid={user.uid}
        />

        {/* Add Work Modal */}
        <AddWorkModal 
          isOpen={isWorkModalOpen}
          onClose={() => setIsWorkModalOpen(false)}
          uid={user.uid}
        />

        {/* Notifications & Modals */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={cn(
                "fixed bottom-28 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-xl z-50 font-bold flex items-center gap-2",
                notification.type === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              )}
            >
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {notification.message}
            </motion.div>
          )}

          {confirmModal.isOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
              >
                <h3 className="text-xl font-bold mb-2">{confirmModal.title}</h3>
                <p className="text-stone-500 mb-8">{confirmModal.message}</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

// --- Sub-Views ---

function Dashboard({ transactions, budgets, currency }: { transactions: Transaction[], budgets: Budget[], currency: string }) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthTransactions = transactions.filter(t => format(t.date, 'yyyy-MM') === currentMonth);
  
  const income = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expenses;

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    monthTransactions.filter(t => t.type === 'expense').forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [monthTransactions]);

  const dailyData = useMemo(() => {
    const days: Record<string, { income: number, expense: number }> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[format(d, 'MMM dd')] = { income: 0, expense: 0 };
    }

    transactions.forEach(t => {
      const day = format(t.date, 'MMM dd');
      if (days[day]) {
        if (t.type === 'income') days[day].income += t.amount;
        else days[day].expense += t.amount;
      }
    });

    return Object.entries(days).map(([name, vals]) => ({ name, ...vals }));
  }, [transactions]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financial Overview</h2>
          <p className="text-stone-500">Here's what's happening with your money this month.</p>
        </div>
        <div className="px-4 py-2 bg-stone-100 rounded-xl text-sm font-medium text-stone-600">
          {format(new Date(), 'MMMM yyyy')}
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Balance" 
          amount={balance} 
          currency={currency} 
          icon={<Wallet className="w-6 h-6 text-stone-900" />}
          trend={balance >= 0 ? 'up' : 'down'}
        />
        <StatCard 
          title="Monthly Income" 
          amount={income} 
          currency={currency} 
          icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
          color="emerald"
        />
        <StatCard 
          title="Monthly Expenses" 
          amount={expenses} 
          currency={currency} 
          icon={<TrendingDown className="w-6 h-6 text-red-600" />}
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Spending by Category</h3>
          <div className="h-80">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-400 italic">
                No expense data for this month
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Income vs Expenses (Last 7 Days)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} />
                <Tooltip 
                  cursor={{ fill: '#f5f5f4' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-lg font-bold">Recent Transactions</h3>
          <button className="text-sm font-medium text-stone-500 hover:text-stone-900">View All</button>
        </div>
        <div className="divide-y divide-stone-50">
          {transactions.slice(0, 5).map(t => (
            <TransactionItem key={t.id} transaction={t} currency={currency} />
          ))}
          {transactions.length === 0 && (
            <div className="p-12 text-center text-stone-400">
              No transactions yet. Start by adding one!
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TransactionsView({ transactions, currency }: { transactions: Transaction[], currency: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState<'All' | 'income' | 'expense'>('All');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.note?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
      const matchesType = selectedType === 'All' || t.type === selectedType;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [transactions, searchQuery, selectedCategory, selectedType]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financial History</h2>
          <p className="text-stone-500">Search and filter through your entire financial record.</p>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input 
            type="text"
            placeholder="Search notes or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none appearance-none transition-all"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex p-1 bg-stone-100 rounded-2xl">
          {(['All', 'income', 'expense'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-bold transition-all capitalize",
                selectedType === type ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-stone-50">
          {filteredTransactions.map(t => (
            <TransactionItem key={t.id} transaction={t} currency={currency} showDelete />
          ))}
          {filteredTransactions.length === 0 && (
            <div className="p-20 text-center text-stone-400">
              <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No transactions found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AnalysisView({ transactions, currency }: { transactions: Transaction[], currency: string }) {
  const last6Months = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, 5);
    return eachMonthOfInterval({ start, end });
  }, []);

  const monthlyTrendData = useMemo(() => {
    return last6Months.map(monthDate => {
      const monthStr = format(monthDate, 'yyyy-MM');
      const monthTransactions = transactions.filter(t => format(t.date, 'yyyy-MM') === monthStr);
      const income = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      return {
        name: format(monthDate, 'MMM yy'),
        income,
        expense,
        savings: income - expense
      };
    });
  }, [transactions, last6Months]);

  const categorySpendingTrend = useMemo(() => {
    const data: Record<string, any> = {};
    
    last6Months.forEach(monthDate => {
      const monthStr = format(monthDate, 'yyyy-MM');
      const monthName = format(monthDate, 'MMM yy');
      data[monthName] = { name: monthName };
      
      CATEGORIES.forEach(cat => {
        const spent = transactions
          .filter(t => t.category === cat && t.type === 'expense' && format(t.date, 'yyyy-MM') === monthStr)
          .reduce((acc, t) => acc + t.amount, 0);
        data[monthName][cat] = spent;
      });
    });

    return Object.values(data);
  }, [transactions, last6Months]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Detailed Analysis</h2>
        <p className="text-stone-500">Deep dive into your spending patterns over time.</p>
      </header>

      {/* Monthly Savings Trend */}
      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Monthly Savings Trend</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrendData}>
              <defs>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="savings" stroke="#10b981" fillOpacity={1} fill="url(#colorSavings)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Income vs Expense Line Chart */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Income vs Expenses Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stacked Bar Chart for Categories */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Category Spending Over Time</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySpendingTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                {CATEGORIES.slice(0, 5).map((cat, index) => (
                  <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[index % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BudgetsView({ transactions, budgets, currency }: { transactions: Transaction[], budgets: Budget[], currency: string }) {
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const currentMonth = format(new Date(), 'yyyy-MM');

  const budgetProgress = useMemo(() => {
    return budgets.map(b => {
      const spent = transactions
        .filter(t => t.category === b.category && t.type === 'expense' && format(t.date, 'yyyy-MM') === b.month)
        .reduce((acc, t) => acc + t.amount, 0);
      return { ...b, spent };
    });
  }, [transactions, budgets]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Monthly Budgets</h2>
          <p className="text-stone-500">Set limits and track your spending by category.</p>
        </div>
        <button 
          onClick={() => setIsAddBudgetOpen(true)}
          className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          Set Budget
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgetProgress.map(b => (
          <div key={b.id} className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg">{b.category}</h3>
                <p className="text-xs text-stone-400 uppercase tracking-wider">{format(new Date(b.month + '-01'), 'MMMM yyyy')}</p>
              </div>
              <button 
                onClick={async () => {
                  try {
                    await deleteDoc(doc(db, 'budgets', b.id));
                  } catch (err) {
                    handleFirestoreError(err, OperationType.DELETE, `budgets/${b.id}`);
                  }
                }}
                className="p-2 text-stone-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-stone-500">Spent: {formatCurrency(b.spent, currency)}</span>
                <span className="text-stone-900">Limit: {formatCurrency(b.limit, currency)}</span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((b.spent / b.limit) * 100, 100)}%` }}
                  className={cn(
                    "h-full transition-all",
                    (b.spent / b.limit) > 0.9 ? "bg-red-500" : (b.spent / b.limit) > 0.7 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                />
              </div>
              <p className="text-xs text-right text-stone-400">
                {Math.round((b.spent / b.limit) * 100)}% of budget used
              </p>
            </div>
          </div>
        ))}

        {budgets.length === 0 && (
          <div className="col-span-full p-20 text-center text-stone-400 bg-white rounded-3xl border border-dashed border-stone-200">
            <PieChartIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No budgets set for this month.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAddBudgetOpen && (
          <AddBudgetModal 
            onClose={() => setIsAddBudgetOpen(false)} 
            uid={auth.currentUser?.uid || ''} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- UI Components ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-medium",
        active 
          ? "bg-stone-900 text-white shadow-lg shadow-stone-200" 
          : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function StatCard({ title, amount, currency, icon, trend, color = 'stone' }: { title: string, amount: number, currency: string, icon: React.ReactNode, trend?: 'up' | 'down', color?: string }) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-3 rounded-2xl", `bg-${color}-50`)}>
          {icon}
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-lg",
            trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}>
            {trend === 'up' ? '+2.4%' : '-1.2%'}
          </span>
        )}
      </div>
      <p className="text-stone-500 text-sm font-medium mb-1">{title}</p>
      <h4 className="text-2xl font-bold tracking-tight">{formatCurrency(amount, currency)}</h4>
    </div>
  );
}

interface TransactionItemProps {
  transaction: Transaction;
  currency: string;
  showDelete?: boolean;
  key?: string; // Add key to satisfy strict linter if needed, though React handles it
}

function TransactionItem({ transaction, currency, showDelete }: TransactionItemProps) {
  const isExpense = transaction.type === 'expense';
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { confirm, showNotification } = useNotification();
  
  const handleDelete = async () => {
    confirm(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      async () => {
        try {
          await deleteDoc(doc(db, 'transactions', transaction.id));
          showNotification('Transaction deleted');
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `transactions/${transaction.id}`);
        }
      }
    );
  };

  return (
    <>
      <div className="flex items-center gap-4 p-6 hover:bg-stone-50 transition-colors group">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
          isExpense ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
        )}>
          {isExpense ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsEditModalOpen(true)}>
          <h5 className="font-bold text-stone-900 truncate">{transaction.category}</h5>
          <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">
            {format(transaction.date, 'MMM dd, yyyy')} • {transaction.note || 'No note'}
          </p>
        </div>
        <div className="text-right flex items-center gap-4">
          <span className={cn(
            "font-bold text-lg",
            isExpense ? "text-stone-900" : "text-emerald-600"
          )}>
            {isExpense ? '-' : '+'}{formatCurrency(transaction.amount, currency)}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 text-stone-300 hover:text-stone-900 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            {showDelete && (
              <button 
                onClick={handleDelete}
                className="p-2 text-stone-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditModalOpen && (
          <EditTransactionModal 
            transaction={transaction} 
            onClose={() => setIsEditModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}

// --- Modals ---

function AddTransactionModal({ isOpen, onClose, uid }: { isOpen: boolean, onClose: () => void, uid: string }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    setSubmitting(true);
    try {
      const finalCategory = category === 'Other' ? customCategory || 'Other' : category;
      await addDoc(collection(db, 'transactions'), {
        uid,
        amount: Number(amount),
        type,
        category: finalCategory,
        date: Timestamp.fromDate(new Date(date)),
        note,
        createdAt: Timestamp.now()
      });
      showNotification('Transaction added successfully');
      onClose();
      setAmount('');
      setNote('');
      setCustomCategory('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <h3 className="text-xl font-bold">Add Transaction</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex p-1 bg-stone-100 rounded-2xl">
            <button 
              type="button"
              onClick={() => setType('expense')}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold transition-all",
                type === 'expense' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
              )}
            >
              Expense
            </button>
            <button 
              type="button"
              onClick={() => setType('income')}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold transition-all",
                type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-stone-500"
              )}
            >
              Income
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Amount</label>
            <input 
              type="number" 
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full text-4xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-stone-200"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Category</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {category === 'Other' && (
                <input 
                  type="text"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category"
                  className="w-full p-4 mt-2 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
                  required
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Date</label>
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Note (Optional)</label>
            <input 
              type="text" 
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What was this for?"
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
            />
          </div>

          <button 
            disabled={submitting}
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Transaction'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function EditTransactionModal({ transaction, onClose }: { transaction: Transaction, onClose: () => void }) {
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [type, setType] = useState<'income' | 'expense'>(transaction.type);
  const [category, setCategory] = useState(CATEGORIES.includes(transaction.category) ? transaction.category : 'Other');
  const [customCategory, setCustomCategory] = useState(CATEGORIES.includes(transaction.category) ? '' : transaction.category);
  const [date, setDate] = useState(format(transaction.date, 'yyyy-MM-dd'));
  const [note, setNote] = useState(transaction.note || '');
  const [submitting, setSubmitting] = useState(false);
  const { showNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    setSubmitting(true);
    try {
      const finalCategory = category === 'Other' ? customCategory || 'Other' : category;
      await updateDoc(doc(db, 'transactions', transaction.id), {
        amount: Number(amount),
        type,
        category: finalCategory,
        date: Timestamp.fromDate(new Date(date)),
        note,
      });
      showNotification('Transaction updated successfully');
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${transaction.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <h3 className="text-xl font-bold">Edit Transaction</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex p-1 bg-stone-100 rounded-2xl">
            <button 
              type="button"
              onClick={() => setType('expense')}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold transition-all",
                type === 'expense' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
              )}
            >
              Expense
            </button>
            <button 
              type="button"
              onClick={() => setType('income')}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold transition-all",
                type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-stone-500"
              )}
            >
              Income
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Amount</label>
            <input 
              type="number" 
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full text-4xl font-bold bg-transparent border-none focus:ring-0 placeholder:text-stone-200"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Category</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {category === 'Other' && (
                <input 
                  type="text"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category"
                  className="w-full p-4 mt-2 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
                  required
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Date</label>
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Note (Optional)</label>
            <input 
              type="text" 
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What was this for?"
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
            />
          </div>

          <button 
            disabled={submitting}
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Update Transaction'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function AddBudgetModal({ onClose, uid }: { onClose: () => void, uid: string }) {
  const [limit, setLimit] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!limit || isNaN(Number(limit))) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'budgets'), {
        uid,
        category,
        limit: Number(limit),
        month
      });
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'budgets');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold">Set Category Budget</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Category</label>
            <select 
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Month</label>
            <input 
              type="month" 
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Monthly Limit</label>
            <input 
              type="number" 
              value={limit}
              onChange={e => setLimit(e.target.value)}
              placeholder="0.00"
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none font-bold text-xl"
              required
            />
          </div>

          <button 
            disabled={submitting}
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all disabled:opacity-50"
          >
            {submitting ? 'Setting...' : 'Set Budget'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function SettingsView({ profile, uid }: { profile: UserProfile | null, uid: string }) {
  const [currency, setCurrency] = useState(profile?.currency || 'USD');
  const [submitting, setSubmitting] = useState(false);
  const { showNotification } = useNotification();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', uid), { currency });
      showNotification('Settings updated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl space-y-8"
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-stone-500">Customize your experience and preferences.</p>
      </header>

      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Preferred Currency</label>
            <select 
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="LKR">LKR (Rs)</option>
            </select>
          </div>

          <button 
            disabled={submitting}
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

// --- Helpers ---

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function WorkTrackingView({ works, currency }: { works: Work[], currency: string }) {
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const filteredWorks = useMemo(() => {
    return works.filter(w => {
      const matchesSearch = w.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           w.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'All' || w.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [works, searchQuery, selectedStatus]);

  const stats = useMemo(() => {
    const totalQuotation = works.reduce((acc, w) => acc + w.quotationAmount, 0);
    const totalProfit = works.reduce((acc, w) => acc + w.profit, 0);
    const activeWorks = works.filter(w => w.status === 'in-progress').length;
    return { totalQuotation, totalProfit, activeWorks };
  }, [works]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Work Tracking</h2>
          <p className="text-stone-500">Manage your professional projects and financial progress.</p>
        </div>
      </header>

      {/* Work Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Total Quotations</p>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalQuotation, currency)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Total Profit</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalProfit, currency)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
          <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-1">Active Projects</p>
          <p className="text-2xl font-bold text-blue-600">{stats.activeWorks}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input 
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none appearance-none transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredWorks.map(work => (
          <div 
            key={work.id} 
            onClick={() => setSelectedWork(work)}
            className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm hover:border-stone-900 transition-all cursor-pointer group"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  work.status === 'completed' ? "bg-emerald-100 text-emerald-600" :
                  work.status === 'in-progress' ? "bg-blue-100 text-blue-600" :
                  work.status === 'cancelled' ? "bg-red-100 text-red-600" : "bg-stone-100 text-stone-600"
                )}>
                  {work.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                   work.status === 'in-progress' ? <Clock className="w-6 h-6" /> :
                   work.status === 'cancelled' ? <XCircle className="w-6 h-6" /> : <Clock className="w-6 h-6 opacity-50" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-lg group-hover:text-stone-900 transition-colors">{work.title}</h4>
                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-stone-100 rounded text-stone-400 uppercase tracking-tighter">
                      {work.category}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 line-clamp-1">{work.description || 'No description'}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-bold px-2 py-1 bg-stone-100 rounded-lg uppercase tracking-wider">
                      {work.status.replace('-', ' ')}
                    </span>
                    <span className="text-xs text-stone-400">
                      Created {format(work.createdAt, 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <p className="text-sm text-stone-400 font-medium">Profit</p>
                <p className={cn(
                  "text-xl font-bold",
                  work.profit >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {formatCurrency(work.profit, currency)}
                </p>
                <div className="w-32 h-1.5 bg-stone-100 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-stone-900 transition-all" 
                    style={{ width: `${work.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredWorks.length === 0 && (
          <div className="p-20 text-center text-stone-400 bg-white rounded-3xl border border-dashed border-stone-200">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No work records found matching your search.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedWork && (
          <WorkDetailModal 
            work={selectedWork} 
            onClose={() => setSelectedWork(null)} 
            currency={currency}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddWorkModal({ isOpen, onClose, uid }: { isOpen: boolean, onClose: () => void, uid: string }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(WORK_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [quotationAmount, setQuotationAmount] = useState('');
  const [workingCost, setWorkingCost] = useState('');
  const [expenses, setExpenses] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !quotationAmount) return;

    setSubmitting(true);
    try {
      const qAmt = Number(quotationAmount);
      const wCost = Number(workingCost) || 0;
      const exp = Number(expenses) || 0;
      const profit = qAmt - wCost - exp;
      const finalCategory = category === 'Other' ? customCategory || 'Other' : category;

      await addDoc(collection(db, 'works'), {
        uid,
        title,
        category: finalCategory,
        description,
        status: 'pending',
        quotationAmount: qAmt,
        finalAmount: 0,
        workingCost: wCost,
        expenses: exp,
        profit: profit,
        photos: [],
        progress: 0,
        isProfitTransferred: false,
        createdAt: Timestamp.now()
      });
      showNotification('Work record added successfully');
      onClose();
      // Reset form
      setTitle('');
      setCategory(WORK_CATEGORIES[0]);
      setCustomCategory('');
      setDescription('');
      setQuotationAmount('');
      setWorkingCost('');
      setExpenses('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'works');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold">Add New Work</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Work Title</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. CCTV Installation"
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Category</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
              >
                {WORK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {category === 'Other' && (
                <input 
                  type="text"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category"
                  className="w-full p-4 mt-2 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none"
                  required
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Description</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Details about the work..."
              className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Quotation Amount</label>
              <input 
                type="number" 
                value={quotationAmount}
                onChange={e => setQuotationAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none font-bold"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Working Cost</label>
              <input 
                type="number" 
                value={workingCost}
                onChange={e => setWorkingCost(e.target.value)}
                placeholder="0.00"
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Initial Expenses</label>
              <input 
                type="number" 
                value={expenses}
                onChange={e => setExpenses(e.target.value)}
                placeholder="0.00"
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none font-bold"
              />
            </div>
          </div>

          <button 
            disabled={submitting}
            className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Start Tracking Work'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function WorkDetailModal({ work, onClose, currency }: { work: Work, onClose: () => void, currency: string }) {
  const [title, setTitle] = useState(work.title);
  const [description, setDescription] = useState(work.description || '');
  const [status, setStatus] = useState(work.status);
  const [progress, setProgress] = useState(work.progress);
  const [finalAmount, setFinalAmount] = useState(work.finalAmount.toString());
  const [workingCost, setWorkingCost] = useState(work.workingCost.toString());
  const [expenses, setExpenses] = useState(work.expenses.toString());
  const [submitting, setSubmitting] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const { confirm, showNotification } = useNotification();

  const profit = Number(finalAmount || work.quotationAmount) - Number(workingCost) - Number(expenses);

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'works', work.id), {
        title,
        description,
        status,
        progress,
        finalAmount: Number(finalAmount),
        workingCost: Number(workingCost),
        expenses: Number(expenses),
        profit: profit
      });
      showNotification('Work updated successfully');
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `works/${work.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPhoto = async () => {
    if (!photoUrl) return;
    try {
      await updateDoc(doc(db, 'works', work.id), {
        photos: [...work.photos, photoUrl]
      });
      setPhotoUrl('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `works/${work.id}`);
    }
  };

  const handleTransferProfit = async () => {
    if (work.isProfitTransferred || profit <= 0) return;
    setTransferring(true);
    try {
      // 1. Add income transaction
      await addDoc(collection(db, 'transactions'), {
        uid: work.uid,
        amount: profit,
        type: 'income',
        category: 'Work Profit',
        date: Timestamp.now(),
        note: `Profit from work: ${work.title}`,
        createdAt: Timestamp.now()
      });

      // 2. Mark work as transferred
      await updateDoc(doc(db, 'works', work.id), {
        isProfitTransferred: true
      });
      
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl p-8 max-h-[95vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <input 
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-2xl font-bold bg-transparent border-none focus:ring-0 w-full p-0"
            />
            <input 
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add description..."
              className="text-stone-500 bg-transparent border-none focus:ring-0 w-full p-0 text-sm"
            />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Status</label>
              <div className="flex flex-wrap gap-2">
                {['pending', 'in-progress', 'completed', 'cancelled'].map(s => (
                  <button 
                    key={s}
                    onClick={() => setStatus(s as any)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-bold transition-all capitalize",
                      status === s ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                    )}
                  >
                    {s.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Progress</label>
                <span className="text-sm font-bold">{progress}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={progress}
                onChange={e => setProgress(Number(e.target.value))}
                className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-900"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">Photos</label>
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={photoUrl}
                  onChange={e => setPhotoUrl(e.target.value)}
                  placeholder="Paste photo URL..."
                  className="flex-1 p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none"
                />
                <button 
                  onClick={handleAddPhoto}
                  className="p-3 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {work.photos.map((p, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-stone-200 relative group">
                    <img src={p} alt="Work" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={async () => {
                        const newPhotos = work.photos.filter((_, idx) => idx !== i);
                        await updateDoc(doc(db, 'works', work.id), { photos: newPhotos });
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {work.photos.length === 0 && (
                  <div className="col-span-3 py-8 text-center border-2 border-dashed border-stone-100 rounded-2xl text-stone-300">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No photos added</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-stone-50 p-6 rounded-3xl border border-stone-100">
            <h4 className="font-bold text-lg mb-4">Financial Summary</h4>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">Quotation Amount</span>
                <span className="font-bold">{formatCurrency(work.quotationAmount, currency)}</span>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase">Final Amount Received</label>
                <input 
                  type="number" 
                  value={finalAmount}
                  onChange={e => setFinalAmount(e.target.value)}
                  className="w-full p-3 bg-white border border-stone-200 rounded-xl font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase">Working Cost</label>
                <input 
                  type="number" 
                  value={workingCost}
                  onChange={e => setWorkingCost(e.target.value)}
                  className="w-full p-3 bg-white border border-stone-200 rounded-xl font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-400 uppercase">Additional Expenses</label>
                <input 
                  type="number" 
                  value={expenses}
                  onChange={e => setExpenses(e.target.value)}
                  className="w-full p-3 bg-white border border-stone-200 rounded-xl font-bold"
                />
              </div>
              
              <div className="pt-4 border-t border-stone-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total Profit</span>
                  <span className={cn(
                    "text-2xl font-black",
                    profit >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {formatCurrency(profit, currency)}
                  </span>
                </div>
              </div>

              {profit > 0 && (
                <button 
                  onClick={handleTransferProfit}
                  disabled={work.isProfitTransferred || transferring}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                    work.isProfitTransferred 
                      ? "bg-emerald-50 text-emerald-600 cursor-default" 
                      : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                  )}
                >
                  {work.isProfitTransferred ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Profit Transferred to Personal
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5" />
                      {transferring ? 'Transferring...' : 'Transfer Profit to Personal'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button 
            onClick={handleUpdate}
            disabled={submitting}
            className="flex-1 py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Save Changes'}
          </button>
          <button 
            onClick={() => {
              confirm(
                'Delete Work Record',
                'Are you sure you want to delete this work record? All associated data will be lost.',
                async () => {
                  await deleteDoc(doc(db, 'works', work.id));
                  onClose();
                  showNotification('Work record deleted');
                }
              );
            }}
            className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
