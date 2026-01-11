'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/SupabaseClient';
import { TrendingUp, DollarSign, Briefcase, Activity, ArrowUpRight, ArrowDownRight, Target, Download } from 'lucide-react';
import { Deal } from '@/types/crm';

export default function DashboardView() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalWon: 0,
    totalPipeline: 0,
    winRate: 0,
    totalDeals: 0,
    activeDeals: 0
  });
  const [dealsByStage, setDealsByStage] = useState<Record<string, number>>({});
  const [recentSales, setRecentSales] = useState<Deal[]>([]);
  
  // CORRECCIÓN AQUÍ: Usamos 'any[]' para permitir el acceso a .clients sin errores
  const [allDeals, setAllDeals] = useState<any[]>([]); 

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*, clients(name, email)') // Traemos la info del cliente
        .order('created_at', { ascending: false });

      if (error) throw error;

      const deals = data as any[];
      setAllDeals(deals);
      
      const wonDeals = deals.filter(d => d.stage === 'won');
      const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');

      const totalWonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      const totalPipelineValue = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      
      const closedDealsCount = wonDeals.length + deals.filter(d => d.stage === 'lost').length;
      const winRate = closedDealsCount > 0 ? (wonDeals.length / closedDealsCount) * 100 : 0;

      setMetrics({
        totalWon: totalWonValue,
        totalPipeline: totalPipelineValue,
        winRate: Math.round(winRate),
        totalDeals: deals.length,
        activeDeals: activeDeals.length
      });

      const stageCounts: Record<string, number> = {};
      deals.forEach(d => {
        stageCounts[d.stage] = (stageCounts[d.stage] || 0) + 1;
      });
      setDealsByStage(stageCounts);
      setRecentSales(wonDeals.slice(0, 5));

    } catch (error) {
      console.error("Error cargando métricas:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (allDeals.length === 0) return alert("No hay datos para exportar.");

    const headers = ["ID", "Título", "Cliente", "Email Cliente", "Etapa", "Valor (GTQ)", "Prioridad", "Fecha Creación"];
    
    // Ahora TypeScript no se quejará de .clients
    const rows = allDeals.map(d => [
        d.id,
        `"${d.title}"`,
        `"${d.clients?.name || 'N/A'}"`, 
        d.clients?.email || 'N/A',
        d.stage.toUpperCase(),
        d.value || 0,
        d.priority,
        new Date(d.created_at).toLocaleDateString()
    ]);

    const csvContent = [
        headers.join(','), 
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Kitsune_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 }).format(amount);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-kiriko-teal animate-pulse uppercase tracking-widest text-xs">
        Calculando Rendimiento...
    </div>
  );

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-end mb-6">
          <p className="text-slate-500 text-sm">Resumen financiero y operativo en tiempo real.</p>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all border border-slate-700 hover:border-kiriko-teal/50"
          >
            <Download size={14} /> Exportar Excel (.csv)
          </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard title="Ingresos Ganados" value={formatMoney(metrics.totalWon)} icon={<DollarSign size={20}/>} trend="Total Histórico" color="text-green-400" borderColor="border-green-500/20" />
        <KpiCard title="Pipeline Activo" value={formatMoney(metrics.totalPipeline)} icon={<Activity size={20}/>} trend={`${metrics.activeDeals} activos`} color="text-blue-400" borderColor="border-blue-500/20" />
        <KpiCard title="Tasa de Cierre" value={`${metrics.winRate}%`} icon={<Target size={20}/>} trend={metrics.winRate > 30 ? "Saludable" : "Bajo"} color="text-purple-400" borderColor="border-purple-500/20" />
        <KpiCard title="Oportunidades" value={metrics.totalDeals.toString()} icon={<Briefcase size={20}/>} trend="Totales" color="text-kiriko-teal" borderColor="border-kiriko-teal/20" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <TrendingUp size={18} className="text-kiriko-teal"/> Embudo de Ventas
                </h3>
            </div>
            <div className="h-64 flex items-end justify-between gap-4 px-2">
                <Bar height={dealsByStage['prospect'] || 0} max={metrics.totalDeals} label="Prospecto" color="bg-emerald-500" />
                <Bar height={dealsByStage['qualified'] || 0} max={metrics.totalDeals} label="Calificado" color="bg-teal-500" />
                <Bar height={dealsByStage['meeting'] || 0} max={metrics.totalDeals} label="Reunión" color="bg-blue-500" />
                <Bar height={dealsByStage['negotiation'] || 0} max={metrics.totalDeals} label="Negociación" color="bg-violet-500" />
                <Bar height={dealsByStage['won'] || 0} max={metrics.totalDeals} label="Ganado" color="bg-green-500" />
                <Bar height={dealsByStage['lost'] || 0} max={metrics.totalDeals} label="Perdido" color="bg-red-500" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent pointer-events-none"></div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <DollarSign size={18} className="text-green-400"/> Cierres Recientes
            </h3>
            <div className="space-y-4">
                {recentSales.length === 0 ? (
                    <p className="text-slate-500 text-sm italic text-center py-10">Aún no hay ventas cerradas.</p>
                ) : (
                    recentSales.map((deal) => (
                        <div key={deal.id} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 hover:border-green-500/30 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-bold text-xs border border-green-500/20 group-hover:bg-green-500 group-hover:text-black transition-colors">$</div>
                                <div>
                                    <p className="text-sm font-bold text-slate-200 truncate max-w-[120px]">{deal.title}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">{new Date(deal.created_at || '').toLocaleDateString()}</p>
                                </div>
                            </div>
                            <span className="text-sm font-mono font-bold text-green-400">{formatMoney(deal.value)}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

// Sub-componentes visuales
function KpiCard({ title, value, icon, trend, color, borderColor }: any) {
    return (
        <div className={`bg-slate-900/60 border ${borderColor} p-5 rounded-2xl relative overflow-hidden group hover:bg-slate-900/80 transition-all`}>
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>{icon}</div>
            <div className="flex flex-col relative z-10">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">{icon} {title}</span>
                <span className="text-2xl font-bold text-white font-mono tracking-tight">{value}</span>
                <div className="flex items-center gap-1 mt-2">
                    {trend === 'En curso' || trend.includes('+') ? <ArrowUpRight size={12} className={color}/> : <ArrowDownRight size={12} className="text-red-400"/>}
                    <span className={`text-[10px] font-bold ${color} bg-slate-950/50 px-1.5 py-0.5 rounded`}>{trend}</span>
                </div>
            </div>
        </div>
    );
}

function Bar({ height, max, label, color }: any) {
    const percentage = max > 0 ? Math.max((height / max) * 100, 5) : 5;
    return (
        <div className="flex flex-col items-center justify-end h-full flex-1 gap-2 group cursor-pointer">
            <div className="relative w-full flex items-end justify-center h-full rounded-t-lg bg-slate-800/30 overflow-hidden">
                <div className={`w-full mx-1 rounded-t-md transition-all duration-1000 ease-out group-hover:brightness-110 ${color}`} style={{ height: `${percentage}%` }}>
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded border border-slate-700 whitespace-nowrap z-20 transition-opacity">
                        {height} Tratos
                    </div>
                </div>
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter truncate w-full text-center group-hover:text-white transition-colors">{label}</span>
        </div>
    );
}