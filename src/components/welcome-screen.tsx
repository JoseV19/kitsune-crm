'use client';
import { useState, useEffect, useCallback } from 'react';
import { useOrganizationId } from '@/lib/contexts/organization-context';
import { useDatabaseService } from '@/lib/services/supabase/database.service';
// import { useSupabaseClient } from '@/lib/services/supabase/client'; // Unused for now
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
  const db = useDatabaseService();
  // const supabase = useSupabaseClient(); // Unused for now
  const [stats, setStats] = useState<DashboardStats>({ totalRevenue: 0, activeDeals: 0, totalClients: 0, productsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  // Estado para el reloj
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    if (organizationId) {
      db.setOrganizationId(organizationId);
    }
  }, [organizationId, db]);

  const fetchStats = useCallback(async () => {
    if (!organizationId) return;

    try {
      // Ensure organization ID is set before operations
      db.setOrganizationId(organizationId);

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
  }, [organizationId, db]);

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
  }, [organizationId, fetchStats]);

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
            <CalendarDays size={14} /> {dateString}
          </p>
        </div>

        {/* --- NUEVO: RELOJ CON KITSUNE DURMIENDO --- */}
        <div className="mt-6 md:mt-0 flex items-center gap-6 bg-slate-900/50 border border-slate-800 p-4 rounded-2xl shadow-lg backdrop-blur-sm group hover:border-kiriko-teal/30 transition-colors">

          {/* ANIMACIÓN DEL ZORRO KITSUNE DURMIENDO (SVG PERSONALIZADO) */}
          <div className="relative w-20 h-16 flex items-center justify-center overflow-visible">
            {/* El Zorro SVG - Con efecto de "respiración" (pulse lento) y brillo neón */}
            <svg viewBox="0 -100 714 583" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(45,212,191,0.6)] animate-pulse [animation-duration:4s] overflow-visible" style={{ fillRule: 'evenodd', clipRule: 'evenodd', strokeLinecap: 'round', strokeLinejoin: 'round', strokeMiterlimit: 1.5, overflow: 'visible' }}>
              <g transform="matrix(1,0,0,1,-161.860883,-266.125582)">
                {/* Cuerpo principal del zorro enrollado */}
                <path d="M718,346C718,346 663.214,303.232 586.328,283.44C527.629,268.33 408.814,260.403 330,298C218.673,351.106 177.714,420.154 168.469,487.182C157.473,566.902 196.073,650.958 263.401,700.706C289.662,720.109 338.707,740.792 395.627,743.669C457.339,746.788 529.309,714.088 590.535,706.443C635.423,700.837 674.073,720.262 701,719C713.619,718.409 682.515,668.747 621.112,624.161C600.612,609.276 544.206,567.095 475.854,564.157C425.004,561.97 347.623,585.976 300.078,589.678C258.334,592.929 244.4,577.091 226,561"
                  fill="none" stroke="#2dd4bf" strokeWidth="9.5px" />
                {/* Patas delanteras */}
                <path d="M298,392C299.884,391.827 341.308,363.092 389.065,377.956C443.113,394.777 502.465,460.418 470,557"
                  fill="none" stroke="#2dd4bf" strokeWidth="9.5px" />
                {/* Cola */}
                <path d="M593,430L553,497C553,497 632.318,553.182 639,589"
                  fill="none" stroke="#2dd4bf" strokeWidth="9.5px" />
                {/* Cabeza y orejas */}
                <path d="M664,628C664,628 691.061,635.139 714,613C736.939,590.861 871,510 871,510L833,438C833,438 847.216,387.414 849.049,365.414C850.699,345.606 844,306 844,306C844,306 817.157,319.709 792.348,340.6C773.073,356.832 755.423,380.173 750,387"
                  fill="none" stroke="#a855f7" strokeWidth="9.5px" />
                {/* Detalles de la cola */}
                <path d="M608,499C619.117,507.933 633.996,516.61 641,517C648.004,517.39 653.696,573.489 643,587C630.239,603.121 639.301,627.806 675,629"
                  fill="none" stroke="#2dd4bf" strokeWidth="9.5px" />
                {/* Detalles faciales y cuerpo */}
                <path d="M755,377C755,377 723.857,369.675 709.357,370.508C694.857,371.342 666,380 666,380C666,380 637.953,351.574 622.619,340.24C607.64,329.169 574,312 574,312C574,312 573.689,348.949 576.961,367.023C580.461,386.356 593,426 593,426"
                  fill="none" stroke="#a855f7" strokeWidth="9.5px" />
                {/* Detalles adicionales */}
                <path d="M772,503C772,503 742.657,520.135 731,521C719.343,521.865 709.209,537.542 706,549"
                  fill="none" stroke="#2dd4bf" strokeWidth="9.5px" />
                {/* Detalles finales */}
                <path d="M737,596C737,596 758.212,598.229 778.849,603.58C795.382,607.866 813.472,617.873 825,622C835,625.58 854.953,612.642 850.926,594.349C847.006,576.546 820.422,558.568 808,553"
                  fill="none" stroke="#2dd4bf" strokeWidth="9.5px" />
              </g>
              {/* Zzz Flotantes - Animación de rebote lento */}
              <g className="animate-bounce [animation-duration:3s]">
                <text x="600" y="80" fill="#2dd4bf" fontSize="60" fontFamily="monospace" fontWeight="bold">Z</text>
              </g>
              <g className="animate-bounce [animation-duration:3s]" style={{ animationDelay: '0.5s' }}>
                <text x="650" y="50" fill="#a855f7" fontSize="80" fontFamily="monospace" fontWeight="bold">z</text>
              </g>
              <g className="animate-bounce [animation-duration:3s]" style={{ animationDelay: '1s' }}>
                <text x="700" y="30" fill="#a855f7" fontSize="70" fontFamily="monospace" fontWeight="bold">z</text>
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
          icon={<TrendingUp size={20} className="text-green-400" />}
          trend="+12% vs mes anterior"
          delay={100}
        />
        <StatCard
          title="Oportunidades Activas"
          value={loading ? '...' : stats.activeDeals}
          icon={<Target size={20} className="text-blue-400" />}
          subtext="En negociación"
          delay={200}
        />
        <StatCard
          title="Cartera de Clientes"
          value={loading ? '...' : stats.totalClients}
          icon={<Users size={20} className="text-purple-400" />}
          subtext="Empresas registradas"
          delay={300}
        />
        <StatCard
          title="Catálogo"
          value={loading ? '...' : stats.productsCount}
          icon={<Package size={20} className="text-orange-400" />}
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
              <Zap size={18} className="text-yellow-400" /> Centro de Acción
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ActionBtn
                title="Gestionar Pipeline"
                desc="Ir al tablero Kanban"
                icon={<TrendingUp size={18} />}
                onClick={onNavigateToKanban}
                color="text-kiriko-teal"
              />
              <Link href="/products" className="block">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-slate-600 hover:bg-slate-900 transition-all cursor-pointer group/btn">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 group-hover/btn:bg-orange-500 group-hover/btn:text-white transition-colors">
                      <Package size={18} />
                    </div>
                    <ArrowRight size={16} className="text-slate-600 group-hover/btn:text-white -translate-x-2 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                  </div>
                  <p className="font-bold text-sm text-slate-200">Catálogo de Productos</p>
                  <p className="text-xs text-slate-500">Administrar inventario y precios</p>
                </div>
              </Link>
            </div>
          </div>


          <div className="bg-gradient-to-r from-slate-900 to-slate-900/50 border-l-4 border-kiriko-teal p-6 rounded-r-xl">
            <p className="text-xs font-bold text-kiriko-teal uppercase mb-2 flex items-center gap-2">
              <Clock size={12} /> Recordatorio del Sistema
            </p>
            <p className="text-slate-300 italic text-sm leading-relaxed">
              &ldquo;El éxito no es el final, el fracaso no es fatal: es el coraje para continuar lo que cuenta. Revisa tus oportunidades en la etapa de &apos;Negociación&apos;, hoy es un buen día para cerrar tratos.&rdquo;
            </p>
          </div>
        </div>


        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 h-fit">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <CalendarDays size={14} /> Estado del Sistema
          </h3>

          <div className="space-y-6 relative">
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-800"></div>
            <StatusItem title="Base de Datos" status="Conectada" color="text-green-400" dotColor="bg-green-500" />
            <StatusItem title="Almacenamiento" status="45% Usado" color="text-blue-400" dotColor="bg-blue-500" />
            <StatusItem title="Seguridad" status="Encriptada" color="text-purple-400" dotColor="bg-purple-500" />
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-[10px] text-slate-600">Zionak Studios © 2026</p>
          </div>
        </div>

      </div>
    </div>
  );
}


interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  trend?: string;
  delay: number;
}

function StatCard({ title, value, icon, subtext, trend, delay }: StatCardProps) {
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

interface ActionBtnProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
}

function ActionBtn({ title, desc, icon, onClick, color }: ActionBtnProps) {
  return (
    <div onClick={onClick} className="bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-kiriko-teal/50 hover:bg-slate-900 transition-all cursor-pointer group/btn shadow-sm hover:shadow-[0_0_15px_rgba(45,212,191,0.1)]">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 bg-slate-900 rounded-lg ${color} group-hover/btn:bg-kiriko-teal group-hover/btn:text-black transition-colors`}>
          {icon}
        </div>
        <ArrowRight size={16} className="text-slate-600 group-hover/btn:text-white -translate-x-2 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
      </div>
      <p className="font-bold text-sm text-slate-200">{title}</p>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
  );
}

interface StatusItemProps {
  title: string;
  status: string;
  color: string;
  dotColor: string;
}

function StatusItem({ title, status, color, dotColor }: StatusItemProps) {
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