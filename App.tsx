
import React, { useState, useEffect, useRef } from 'react';
import { Plus, PieChart, List, Sparkles, Trash2, Wallet, LogOut, Search, Share, BarChart3, Info, Mic, MicOff } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart as RePieChart, Pie, Legend 
} from 'recharts';
import { Expense, Category } from './types';
import { analyzeExpenses, parseNaturalLanguageExpense } from './services/geminiService';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

const App: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'insights'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [magicText, setMagicText] = useState('');
  const [isLoadingMagic, setIsLoadingMagic] = useState(false);
  const [insights, setInsights] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone;
    
    if (!isStandalone && expenses.length > 0) {
      const timer = setTimeout(() => setShowInstallHint(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [expenses.length]);

  // Voice Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'ru-RU';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMagicText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setMagicText('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const addExpense = (newExpense: Expense) => {
    setExpenses(prev => [newExpense, ...prev]);
  };

  const deleteExpense = (id: string) => {
    if (confirm('Удалить этот расход?')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const loadDemoData = () => {
    const demo: Expense[] = [
      { id: '1', amount: 1500, category: Category.Food, description: 'Продукты на неделю', date: new Date().toISOString().split('T')[0] },
      { id: '2', amount: 300, category: Category.Transport, description: 'Такси в центр', date: new Date().toISOString().split('T')[0] },
      { id: '3', amount: 5000, category: Category.Shopping, description: 'Новые кроссовки', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
      { id: '4', amount: 800, category: Category.Entertainment, description: 'Кино и попкорн', date: new Date(Date.now() - 172800000).toISOString().split('T')[0] },
    ];
    setExpenses(demo);
  };

  const handleMagicAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicText.trim()) return;

    setIsLoadingMagic(true);
    try {
      const parsed = await parseNaturalLanguageExpense(magicText);
      if (parsed && (parsed.amount || 0) > 0) {
        const expense: Expense = {
          id: crypto.randomUUID(),
          amount: parsed.amount || 0,
          category: (parsed.category as Category) || Category.Other,
          description: parsed.description || magicText,
          date: new Date().toISOString().split('T')[0],
        };
        addExpense(expense);
        setMagicText('');
        setIsModalOpen(false);
      } else {
        alert("Не удалось распознать сумму. Попробуйте: 'Такси 500р'");
      }
    } catch (err) {
      alert("Ошибка при обработке.");
    } finally {
      setIsLoadingMagic(false);
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeExpenses(expenses);
    setInsights(result);
    setIsAnalyzing(false);
    setActiveTab('insights');
  };

  const getTotalSpent = () => expenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryData = () => {
    const data: Record<string, number> = {};
    expenses.forEach(e => {
      data[e.category] = (data[e.category] || 0) + e.amount;
    });
    return Object.entries(data).map(([name, amount]) => ({ name, amount }));
  };

  const getTimelineData = () => {
    const data: Record<string, number> = {};
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(date => { data[date] = 0; });
    expenses.forEach(e => {
      if (data[e.date] !== undefined) data[e.date] += e.amount;
    });

    return Object.entries(data).map(([name, amount]) => ({ 
      name: name.split('-').slice(2).join('.'), 
      amount 
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] md:pl-64 transition-colors duration-500">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-100 flex-col p-8 z-10">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-emerald-600 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-200">
            <Wallet size={24} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter">FinSmart</h1>
        </div>

        <nav className="flex flex-col gap-3 flex-grow">
          {[
            { id: 'dashboard', icon: PieChart, label: 'Обзор' },
            { id: 'history', icon: List, label: 'История' },
            { id: 'insights', icon: Sparkles, label: 'ИИ Советник' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${activeTab === tab.id ? 'bg-emerald-50 text-emerald-700 font-bold shadow-sm translate-x-1' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              <tab.icon size={22} /> {tab.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-slate-50">
          <button className="flex items-center gap-3 px-5 py-3 rounded-xl text-slate-300 hover:text-slate-500 transition-all text-sm font-medium">
            <LogOut size={18} /> Выход
          </button>
        </div>
      </aside>

      {/* Header for Mobile */}
      <header className="md:hidden bg-white/70 backdrop-blur-xl border-b border-slate-100 p-5 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-xl text-white">
            <Wallet size={18} />
          </div>
          <h1 className="font-black text-xl text-slate-800 tracking-tighter">FinSmart</h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 text-white p-2.5 rounded-full shadow-xl shadow-emerald-200 active:scale-90 transition-transform"
        >
          <Plus size={22} />
        </button>
      </header>

      {/* PWA Install Hint */}
      {showInstallHint && (
        <div className="mx-4 mt-4 bg-slate-900 text-white p-5 rounded-3xl shadow-2xl flex items-center justify-between animate-in slide-in-from-top-full duration-700 z-40">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-2xl">
              <Share size={20} />
            </div>
            <div>
              <p className="font-black text-sm">Установи как приложение</p>
              <p className="text-xs text-slate-400 font-medium">Нажми "Поделиться" → "На экран «Домой»"</p>
            </div>
          </div>
          <button onClick={() => setShowInstallHint(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
            <Plus size={18} className="rotate-45" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow p-5 md:p-10 max-w-6xl mx-auto w-full mb-24 md:mb-0">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">Твой баланс</h2>
                <p className="text-slate-400 font-medium mt-1">Сегодня {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-5 min-w-[240px]">
                  <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
                    <BarChart3 size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Расход за месяц</p>
                    <p className="text-3xl font-black text-slate-900">{getTotalSpent().toLocaleString()} ₽</p>
                  </div>
                </div>
              </div>
            </header>

            {expenses.length === 0 ? (
              <div className="bg-emerald-50/50 rounded-[40px] p-12 text-center border-2 border-dashed border-emerald-100 flex flex-col items-center">
                <div className="bg-white p-6 rounded-full shadow-sm mb-6">
                  <Wallet size={48} className="text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Начнем экономить?</h3>
                <p className="text-slate-500 max-w-xs mb-8 font-medium">Добавь первый расход или посмотри примеры.</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 hover:scale-105 transition-all"
                  >
                    Добавить расход
                  </button>
                  <button 
                    onClick={loadDemoData}
                    className="bg-white text-emerald-700 px-8 py-4 rounded-2xl font-black border border-emerald-100 hover:bg-emerald-50 transition-all"
                  >
                    Примеры
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 transition-transform hover:scale-[1.01]">
                    <h3 className="font-black text-slate-800 text-xl mb-6 flex items-center gap-3">
                      <PieChart className="text-emerald-500" /> Категории
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={getCategoryData()}
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={8}
                            dataKey="amount"
                          >
                            {getCategoryData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '16px'}}
                            formatter={(value: number) => [`${value} ₽`, '']}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50 transition-transform hover:scale-[1.01]">
                    <h3 className="font-black text-slate-800 text-xl mb-6 flex items-center gap-3">
                      <BarChart3 className="text-blue-500" /> Последние 7 дней
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getTimelineData()}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                          <YAxis hide />
                          <Tooltip 
                            cursor={{fill: '#F8FAFC'}}
                            contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)'}}
                            formatter={(value: number) => [`${value} ₽`, '']}
                          />
                          <Bar dataKey="amount" fill="#3B82F6" radius={[8, 8, 8, 8]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-8 relative overflow-hidden group border-4 border-emerald-500/20">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="bg-emerald-500 p-5 rounded-3xl shadow-lg shadow-emerald-500/30 animate-pulse">
                      <Sparkles size={32} />
                    </div>
                    <div>
                      <h3 className="font-black text-2xl">Анализ Gemini</h3>
                      <p className="text-slate-400 font-medium">Нейросеть найдет способ сэкономить</p>
                    </div>
                  </div>
                  <button 
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white w-full sm:w-auto px-10 py-5 rounded-3xl font-black transition-all shadow-xl shadow-emerald-500/20 relative z-10 text-lg"
                  >
                    {isAnalyzing ? 'Обработка...' : 'Узнать инсайты'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-slate-900">Список трат</h2>
                <p className="text-slate-400 font-medium">Всё под контролем</p>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="bg-white p-20 rounded-[40px] text-center border border-slate-100 flex flex-col items-center">
                <Search size={64} className="text-slate-100 mb-6" />
                <p className="text-slate-300 font-bold text-lg">Здесь пока тихо...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map(expense => (
                  <div key={expense.id} className="bg-white p-6 rounded-[32px] border border-slate-50 flex justify-between items-center group hover:shadow-md transition-all active:scale-[0.98]">
                    <div className="flex gap-5 items-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl shadow-inner">
                        {expense.category === Category.Food ? '🥗' : 
                         expense.category === Category.Transport ? '⚡' :
                         expense.category === Category.Shopping ? '🛍️' :
                         expense.category === Category.Entertainment ? '🎡' : '📦'}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-lg leading-tight mb-1">{expense.description}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                            {expense.category}
                          </span>
                          <span className="text-[10px] text-slate-300 font-bold">
                            {new Date(expense.date).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <p className="font-black text-slate-900 text-xl tracking-tighter">-{expense.amount} ₽</p>
                      <button 
                        onClick={() => deleteExpense(expense.id)} 
                        className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <h2 className="text-3xl font-black text-slate-900">ИИ Советник</h2>
            
            {isAnalyzing ? (
              <div className="bg-white p-20 rounded-[40px] border border-slate-100 flex flex-col items-center justify-center">
                <div className="relative mb-8">
                  <div className="w-20 h-20 border-8 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <Sparkles size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600" />
                </div>
                <p className="text-slate-500 font-black text-xl animate-pulse">Gemini строит стратегию...</p>
              </div>
            ) : insights ? (
              <div className="bg-white p-10 rounded-[40px] border border-slate-50 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Sparkles size={120} />
                </div>
                <div className="prose prose-slate max-w-none relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="bg-emerald-500 p-2 rounded-xl text-white">
                      <Info size={20} />
                    </div>
                    <p className="font-black text-emerald-600 uppercase tracking-widest text-sm">Персональный отчет</p>
                  </div>
                  <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-line font-medium">
                    {insights}
                  </p>
                </div>
                <button 
                  onClick={runAnalysis}
                  className="mt-12 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center gap-3"
                >
                  <Sparkles size={18} /> Обновить анализ
                </button>
              </div>
            ) : (
              <div className="bg-white p-20 rounded-[40px] text-center border border-slate-100 flex flex-col items-center">
                <Sparkles size={64} className="text-emerald-100 mb-8" />
                <h3 className="text-2xl font-black text-slate-800 mb-4">Анализ не готов</h3>
                <button 
                  onClick={() => setActiveTab('dashboard')} 
                  className="bg-emerald-600 text-white px-10 py-5 rounded-3xl font-black"
                >
                  На главную
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white/80 backdrop-blur-2xl border-t border-slate-100 safe-pb px-10 pt-4 flex justify-between items-center z-40 shadow-[0_-20px_40px_rgba(0,0,0,0.03)]">
        {[
          { id: 'dashboard', icon: PieChart, label: 'Обзор' },
          { id: 'history', icon: List, label: 'История' },
          { id: 'insights', icon: Sparkles, label: 'ИИ' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-2 px-6 py-2 rounded-[24px] transition-all duration-300 ${activeTab === tab.id ? 'text-emerald-600' : 'text-slate-300'}`}
          >
            <tab.icon size={26} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className={`text-[10px] font-black uppercase tracking-tighter transition-opacity ${activeTab === tab.id ? 'opacity-100' : 'opacity-0'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Modal for adding expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-t-[48px] sm:rounded-[48px] p-10 pb-16 sm:pb-10 shadow-[0_50px_100px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-full duration-500">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 sm:hidden"></div>
            <h3 className="text-3xl font-black text-slate-800 mb-2">Новая трата</h3>
            <p className="text-slate-400 text-sm mb-8 font-bold uppercase tracking-wider">Используй магию голоса или текст</p>

            <form onSubmit={handleMagicAdd} className="space-y-8">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder={isListening ? "Слушаю..." : "Напр.: 1500р на продукты"}
                  className={`w-full bg-slate-50 border-4 rounded-[32px] px-8 py-6 text-2xl font-black text-slate-800 placeholder:text-slate-200 focus:outline-none focus:bg-white transition-all shadow-inner ${isListening ? 'border-emerald-500 animate-pulse' : 'border-transparent focus:border-emerald-500/30'}`}
                  value={magicText}
                  onChange={(e) => setMagicText(e.target.value)}
                  autoFocus
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={toggleListening}
                    className={`p-3 rounded-2xl transition-all ${isListening ? 'bg-red-100 text-red-600 scale-110 shadow-lg' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`}
                  >
                    {isListening ? <Mic size={24} className="animate-bounce" /> : <Mic size={24} />}
                  </button>
                  {isLoadingMagic && (
                    <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"></div>
                  )}
                </div>
              </div>

              <div className="flex gap-5">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-8 py-5 rounded-[28px] font-black text-slate-300 bg-slate-50 hover:bg-slate-100 transition-all text-lg"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  disabled={isLoadingMagic || !magicText}
                  className="flex-1 bg-emerald-600 text-white px-8 py-5 rounded-[28px] font-black hover:bg-emerald-700 active:scale-95 transition-all shadow-[0_15px_40px_rgba(16,185,129,0.3)] disabled:opacity-50 text-lg"
                >
                  {isLoadingMagic ? 'Распознаю...' : 'Готово'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
