'use client';
import { useState, useEffect } from 'react';
import { useOrganizationId } from '@/lib/contexts/organization-context';
import { db } from '@/lib/services/supabase/database.service';
import { supabase } from '@/lib/services/supabase/client'; // Still needed for count queries
import { 
  TrendingUp, Users, Package, ArrowRight, 
  Zap, Clock, Target, CalendarDays
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalRevenue: number;
  activeDeals: number;
  totalClients: number;
  productsCount: number;
}

export default function WelcomeScreen({ userName, onNavigateToKanban }: { userName: string, onNavigateToKanban: () => void }) {
  const organizationId = useOrganizationId();
  const [stats, setStats] = useState<DashboardStats>({ totalRevenue: 0, activeDeals: 0, totalClients: 0, productsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  
  // Estado para el reloj
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    if (organizationId) {
      db.setOrganizationId(organizationId);
    }
  }, [organizationId]);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');

    if (organizationId) {
      fetchStats();
    }

    return () => clearInterval(timer);
  }, [organizationId]);

  const fetchStats = async () => {
    if (!organizationId) return;
    
    try {
      // Get won deals for revenue
      const allDeals = await db.getDeals();
      const wonDeals = allDeals.filter(d => d.stage === 'won');
      const revenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
      
      // Get active deals count
      const activeDeals = allDeals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
      
      // Get clients count
      const clients = await db.getClients();
      
      // Get products count
      const products = await db.getProducts();

      setStats({
        totalRevenue: revenue,
        activeDeals: activeDeals.length,
        totalClients: clients.length,
        productsCount: products.length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 }).format(amount);
  };

  const timeString = currentTime ? currentTime.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const secondsString = currentTime ? currentTime.toLocaleTimeString('es-GT', { second: '2-digit' }) : '00';
  const dateString = currentTime ? currentTime.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' }) : '...';

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-8 font-sans text-white animate-in fade-in duration-500 relative">
      
      {/* HEADER BIENVENIDA CON RELOJ */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-slate-800 pb-6 relative overflow-hidden">
        
        {/* Efecto de Fondo Sutil */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-kiriko-teal/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="z-10">
          <p className="text-kiriko-teal font-mono text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Sistema Operativo Online
          </p>
          <h1 className="text-4xl font-bold mb-1 tracking-tight">
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{userName.split(' ')[0]}</span>.
          </h1>
          <p className="text-slate-400 text-sm capitalize flex items-center gap-2">
             <CalendarDays size={14}/> {dateString}
          </p>
        </div>

        {/* --- NUEVO: RELOJ CON KITSUNE DURMIENDO --- */}
        <div className="mt-6 md:mt-0 flex items-center gap-6 bg-slate-900/50 border border-slate-800 p-4 rounded-2xl shadow-lg backdrop-blur-sm group hover:border-kiriko-teal/30 transition-colors">
           
           {/* ANIMACIÓN DEL ZORRO KITSUNE DURMIENDO (SVG PERSONALIZADO) */}
           <div className="relative w-20 h-16 flex items-center justify-center">
              {/* El Zorro SVG - Con efecto de "respiración" (pulse lento) y brillo neón */}
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(45,212,191,0.6)] animate-pulse [animation-duration:4s]">
                  {/* Cuerpo enrollado */}
                  <path d="M58 32C58 46.3594 46.3594 58 32 58C17.6406 58 6 46.3594 6 32C6 17.6406 17.6406 6 32 6" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round" className="opacity-50"/>
                  {/* Cabeza y Orejas */}
                  <path d="M42 18L32 28L22 18" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* Ojos cerrados */}
                  <path d="M38 26C38 26 36 28 32 28C28 28 26 26 26 26" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                  {/* Cola esponjosa tapando */}
                  <path d="M32 58C40 58 46 52 46 44C46 38 42 34 36 34" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" />
                  
                  {/* Zzz Flotantes - Animación de rebote lento */}
                  <g className="animate-bounce [animation-duration:3s]">
                    <text x="44" y="14" fill="#2dd4bf" fontSize="10" fontFamily="monospace" fontWeight="bold">Z</text>
                  </g>
                  <g className="animate-bounce [animation-duration:3s]" style={{animationDelay: '0.5s'}}>
                    <text x="52" y="10" fill="#a855f7" fontSize="8" fontFamily="monospace">z</text>
                  </g>
              </svg>
              {/* Brillo de fondo suave */}
              <div className="absolute inset-0 bg-gradient-to-tr from-kiriko-teal/10 to-purple-500/10 blur-2xl rounded-full -z-10 animate-pulse [animation-duration:6s]"></div>
           </div>
           
           {/* El Reloj Digital */}
           <div className="text-right pr-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-end gap-1">
                 Hora Local <span className="w-1.5 h-1.5 bg-kiriko-teal rounded-full animate-pulse"></span>
              </div>
              <div className="flex items-baseline gap-1 font-mono leading-none">
                  <span className="text-4xl font-bold text-white text-shadow-neon tracking-tighter">{timeString}</span>
                  <span className="text-sm text-kiriko-teal font-medium w-6 relative top-[-2px]">{secondsString}</span>
              </div>
           </div>
        </div>

      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard 
          title="Ingresos Totales" 
          value={loading ? '...' : formatMoney(stats.totalRevenue)} 
          icon={<TrendingUp size={20} className="text-green-400"/>}
          trend="+12% vs mes anterior"
          delay={100}
        />
        <StatCard 
          title="Oportunidades Activas" 
          value={loading ? '...' : stats.activeDeals} 
          icon={<Target size={20} className="text-blue-400"/>}
          subtext="En negociación"
          delay={200}
        />
        <StatCard 
          title="Cartera de Clientes" 
          value={loading ? '...' : stats.totalClients} 
          icon={<Users size={20} className="text-purple-400"/>}
          subtext="Empresas registradas"
          delay={300}
        />
        <StatCard 
          title="Catálogo" 
          value={loading ? '...' : stats.productsCount} 
          icon={<Package size={20} className="text-orange-400"/>}
          subtext="Productos listados"
          delay={400}
        />
      </div>

      {/* SECCIÓN PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQ */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap size={100} />
              </div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap size={18} className="text-yellow-400"/> Centro de Acción
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ActionBtn 
                    title="Gestionar Pipeline" 
                    desc="Ir al tablero Kanban" 
                    icon={<TrendingUp size={18}/>} 
                    onClick={onNavigateToKanban}
                    color="text-kiriko-teal"
                  />
                  <Link href="/products" className="block">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-slate-600 hover:bg-slate-900 transition-all cursor-pointer group/btn">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 group-hover/btn:bg-orange-500 group-hover/btn:text-white transition-colors">
                                <Package size={18}/>
                            </div>
                            <ArrowRight size={16} className="text-slate-600 group-hover/btn:text-white -translate-x-2 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all"/>
                        </div>
                        <p className="font-bold text-sm text-slate-200">Catálogo de Productos</p>
                        <p className="text-xs text-slate-500">Administrar inventario y precios</p>
                    </div>
                  </Link>
              </div>
           </div>

           
           <div className="bg-gradient-to-r from-slate-900 to-slate-900/50 border-l-4 border-kiriko-teal p-6 rounded-r-xl">
              <p className="text-xs font-bold text-kiriko-teal uppercase mb-2 flex items-center gap-2">
                 <Clock size={12}/> Recordatorio del Sistema
              </p>
              <p className="text-slate-300 italic text-sm leading-relaxed">
                 "El éxito no es el final, el fracaso no es fatal: es el coraje para continuar lo que cuenta. Revisa tus oportunidades en la etapa de 'Negociación', hoy es un buen día para cerrar tratos."
              </p>
           </div>
        </div>

        
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 h-fit">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                <CalendarDays size={14}/> Estado del Sistema
            </h3>
            
            <div className="space-y-6 relative">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-800"></div>
                <StatusItem title="Base de Datos" status="Conectada" color="text-green-400" dotColor="bg-green-500"/>
                <StatusItem title="Almacenamiento" status="45% Usado" color="text-blue-400" dotColor="bg-blue-500"/>
                <StatusItem title="Seguridad" status="Encriptada" color="text-purple-400" dotColor="bg-purple-500"/>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                <p className="text-[10px] text-slate-600">Zionak Studios © 2026</p>
            </div>
        </div>

      </div>
    </div>
  );
}


function StatCard({ title, value, icon, subtext, trend, delay }: any) {
    return (
        <div 
          className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl hover:bg-slate-900/80 hover:border-slate-700 transition-all group animate-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
          style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-slate-950 rounded-lg shadow-sm group-hover:scale-110 transition-transform">{icon}</div>
                {trend && <span className="text-[10px] text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded border border-green-900/30 font-bold">{trend}</span>}
            </div>
            <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">{title}</p>
            <p className="text-2xl font-bold text-white font-mono tracking-tight">{value}</p>
            {subtext && <p className="text-[10px] text-slate-600 mt-1">{subtext}</p>}
        </div>
    );
}

function ActionBtn({ title, desc, icon, onClick, color }: any) {
    return (
        <div onClick={onClick} className="bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-kiriko-teal/50 hover:bg-slate-900 transition-all cursor-pointer group/btn shadow-sm hover:shadow-[0_0_15px_rgba(45,212,191,0.1)]">
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2 bg-slate-900 rounded-lg ${color} group-hover/btn:bg-kiriko-teal group-hover/btn:text-black transition-colors`}>
                    {icon}
                </div>
                <ArrowRight size={16} className="text-slate-600 group-hover/btn:text-white -translate-x-2 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all"/>
            </div>
            <p className="font-bold text-sm text-slate-200">{title}</p>
            <p className="text-xs text-slate-500">{desc}</p>
        </div>
    );
}

function StatusItem({ title, status, color, dotColor }: any) {
    return (
        <div className="flex items-center gap-4 relative z-10 pl-4">
            <div className={`w-2 h-2 rounded-full ${dotColor} absolute left-[1px] top-2 ring-4 ring-slate-950`}></div>
            <div className="flex-1">
                <p className="text-xs text-slate-400 font-bold">{title}</p>
                <p className={`text-[10px] font-mono ${color}`}>{status}</p>
            </div>
        </div>
    );
}