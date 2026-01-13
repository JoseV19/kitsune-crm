'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/SupabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { TrendingUp, Wallet, Package, AlertCircle, Loader2, Layers } from 'lucide-react';


const CHART_COLORS = ['#2dd4bf', '#a855f7', '#f59e0b', '#3b82f6', '#ef4444', '#10b981'];


const STAGE_CONFIG = [
    { id: 'prospect', label: 'PROSPECTOS', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
    { id: 'qualified', label: 'CALIFICADOS', color: 'text-teal-400', border: 'border-teal-500/20', bg: 'bg-teal-500/5' },
    { id: 'meeting', label: 'REUNIÓN / DEMO', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5' },
    { id: 'negotiation', label: 'NEGOCIACIÓN', color: 'text-violet-400', border: 'border-violet-500/20', bg: 'bg-violet-500/5' },
    { id: 'won', label: 'GANADOS 💰', color: 'text-green-400', border: 'border-green-500/20', bg: 'bg-green-500/5' }
];

export default function DashboardView() {
  const [loading, setLoading] = useState(true);
  
  
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  
  
  const [stageStats, setStageStats] = useState<Record<string, { count: number, value: number }>>({});

  // KPIs Generales
  const [kpis, setKpis] = useState({
    totalWon: 0,
    winRate: 0,
    avgTicket: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: deals } = await supabase.from('deals').select('*');
    const { data: items } = await supabase.from('deal_items').select('*, product:products(name)');

    if (!deals || !items) { setLoading(false); return; }

   
    const statsByStage: Record<string, { count: number, value: number }> = {};
    
    
    STAGE_CONFIG.forEach(s => statsByStage[s.id] = { count: 0, value: 0 });

    deals.forEach(d => {
        if (!statsByStage[d.stage]) statsByStage[d.stage] = { count: 0, value: 0 };
        statsByStage[d.stage].count += 1;
        statsByStage[d.stage].value += d.value;
    });
    setStageStats(statsByStage);

    
    const funnel = Object.keys(statsByStage).map(key => ({ 
        name: formatStageName(key), 
        value: statsByStage[key].count 
    }));
    setFunnelData(funnel);

    
    const salesMap: Record<string, number> = {};
    deals.filter(d => d.stage === 'won').forEach(d => {
        const month = new Date(d.created_at).toLocaleDateString('es-GT', { month: 'short' }); 
        salesMap[month] = (salesMap[month] || 0) + d.value;
    });
    const sales = Object.keys(salesMap).map(key => ({ name: key, total: salesMap[key] }));
    setSalesTrend(sales);

    
    const prodMap: Record<string, number> = {};
    items.forEach((item: any) => {
        const pName = item.product?.name || 'Desconocido';
        prodMap[pName] = (prodMap[pName] || 0) + item.quantity;
    });
    const products = Object.keys(prodMap)
        .map(key => ({ name: key, value: prodMap[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    setTopProducts(products);

    // --- 5. KPIs GENERALES ---
    const wonDeals = deals.filter(d => d.stage === 'won');
    const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const winRate = deals.length > 0 ? (wonDeals.length / deals.length) * 100 : 0;
    const avgTicket = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;

    setKpis({ totalWon: totalRevenue, winRate: Math.round(winRate), avgTicket: Math.round(avgTicket) });

    setLoading(false);
  };

  const formatStageName = (stageId: string) => {
     const found = STAGE_CONFIG.find(s => s.id === stageId);
     return found ? found.label.split(' ')[0] : stageId; 
  };

  const formatMoney = (val: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 }).format(val);

  if (loading) return <div className="h-full flex items-center justify-center text-kiriko-teal animate-pulse"><Loader2 className="animate-spin mr-2"/> Calculando métricas...</div>;

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. KPIs SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Ventas Totales" value={formatMoney(kpis.totalWon)} icon={<Wallet className="text-green-400"/>} color="border-green-500/20 bg-green-500/5"/>
        <KpiCard title="Tasa de Cierre" value={`${kpis.winRate}%`} sub="De las oportunidades creadas" icon={<TrendingUp className="text-kiriko-teal"/>} color="border-kiriko-teal/20 bg-kiriko-teal/5"/>
        <KpiCard title="Ticket Promedio" value={formatMoney(kpis.avgTicket)} sub="Valor medio por venta" icon={<AlertCircle className="text-purple-400"/>} color="border-purple-500/20 bg-purple-500/5"/>
      </div>

      {/* 2. NUEVO: DESGLOSE POR ETAPA (TARJETAS DE EMBUDO) */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Layers size={14}/> Estado del Embudo
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {STAGE_CONFIG.map((stage) => {
                const data = stageStats[stage.id] || { count: 0, value: 0 };
                return (
                    <div key={stage.id} className={`p-4 rounded-xl border ${stage.border} ${stage.bg} flex flex-col justify-between min-h-[100px] transition-all hover:scale-105`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${stage.color}`}>{stage.label}</p>
                        <div>
                            <p className="text-2xl font-mono font-bold text-white">{data.count}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-1 opacity-70">
                                {data.value > 0 ? formatMoney(data.value) : 'Q 0'}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* 3. GRÁFICOS PRINCIPALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
        {/* Barras */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Distribución Visual</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} cursor={{ fill: '#1e293b' }} />
                        <Bar dataKey="value" fill="#2dd4bf" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex flex-col">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Package size={16}/> Top Productos</h3>
            <div className="flex-1 min-h-0 flex items-center justify-center">
                {topProducts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={topProducts} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                {topProducts.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="rgba(0,0,0,0.5)" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : <p className="text-slate-500 text-sm italic">Sin datos</p>}
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
                {topProducts.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1 text-[10px] text-slate-400">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                        {entry.name}
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* 4. TENDENCIA */}
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl h-[350px] flex flex-col">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Tendencia de Ingresos</h3>
        <div className="flex-1 min-h-0">
            {salesTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesTrend}>
                        <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `Q${val/1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} formatter={(value: any) => [formatMoney(value), 'Ingresos']} />
                        <Area type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-slate-600 italic">No hay suficientes datos.</div>}
        </div>
      </div>

    </div>
  );
}

function KpiCard({ title, value, sub, icon, color }: any) {
    return (
        <div className={`p-6 rounded-2xl border ${color} relative overflow-hidden group transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.3)]`}>
            <div className="absolute right-4 top-4 opacity-20 group-hover:opacity-40 transition-opacity scale-150">{icon}</div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
            <h2 className="text-3xl font-mono font-bold text-white tracking-tight">{value}</h2>
            {sub && <p className="text-[10px] text-slate-400 mt-2">{sub}</p>}
        </div>
    )
}