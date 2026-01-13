import {
  LayoutDashboard,
  KanbanSquare,
  LogOut,
  Plus,
  Package,
  Home, // <--- 1. NUEVO ICONO
  Settings
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface SidebarProps {
  currentView?: "home" | "kanban" | "dashboard"; // <--- 2. AHORA SON 3 OPCIONES
  onChangeView?: (view: "home" | "kanban" | "dashboard") => void;
  user: { name: string; role: string; avatar: string };
  onNewClient: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentView,
  onChangeView,
  user,
  onNewClient,
  onProfileClick,
  onLogout,
}: SidebarProps) {
  
  // 3. DEFINIMOS LOS 3 ÍTEMS DEL MENÚ
  const menuItems = [
    { id: "home", label: "Inicio", icon: <Home size={20} /> },
    { id: "kanban", label: "Tablero", icon: <KanbanSquare size={20} /> },
    { id: "dashboard", label: "Métricas", icon: <LayoutDashboard size={20} /> },
  ];

  return (
    <aside className="w-64 h-screen bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0 relative z-50 shadow-2xl">
      {/* 1. LOGO */}
      <div className="p-6 pb-8">
        <Link href={"https://studios.zionak.com"} target="_blank" className="block">
          <Image
            src="/logo-kiriko.png"
            alt="Kitsune"
            className="w-40 mx-auto opacity-90 hover:scale-105 transition-transform cursor-pointer"
            width={160}
            height={40}
          />
        </Link>
      </div>

      {/* 2. BOTÓN DE ACCIÓN PRINCIPAL */}
      <div className="px-4 mb-8">
        <button
          onClick={onNewClient}
          className="w-full bg-[#00d4bd] hover:bg-[#00c0aa] text-black font-bold py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(0,212,189,0.3)] hover:shadow-[0_0_25px_rgba(0,212,189,0.5)] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
        >
          <Plus size={16} strokeWidth={3} /> Nuevo Cliente
        </button>
      </div>

      {/* 3. MENÚ DE NAVEGACIÓN */}
      <nav className="flex-1 px-4 space-y-2">
        <p className="px-4 text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">
          Menú Principal
        </p>

        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView && onChangeView(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                isActive
                  ? "bg-kiriko-teal/10 text-kiriko-teal border border-kiriko-teal/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={isActive ? "text-kiriko-teal" : "text-slate-500 group-hover:text-white"}>
                {item.icon}
              </span>
              <span className="text-sm font-bold">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-kiriko-teal shadow-[0_0_10px_#2dd4bf]"></div>
              )}
            </button>
          );
        })}

        {/* DIVISOR */}
        <div className="my-2 border-t border-slate-800/50 mx-4"></div>

        {/* CATÁLOGO */}
        <Link 
          href="/products" 
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group text-slate-400 hover:bg-white/5 hover:text-white"
        >
            <span className="text-slate-500 group-hover:text-white"><Package size={20} /></span>
            <span className="text-sm font-bold">Catálogo</span>
        </Link>
        
        {/* CONFIGURACIÓN */}
        <Link 
          href="/settings" 
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group text-slate-400 hover:bg-white/5 hover:text-white"
        >
            <span className="text-slate-500 group-hover:text-white"><Settings size={20} /></span>
            <span className="text-sm font-bold">Configuración</span>
        </Link>

      </nav>

      {/* 4. PERFIL DE USUARIO */}
      <div className="p-4 border-t border-slate-900 bg-slate-900/30">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={onProfileClick}>
          <div className="relative">
            <Image
              src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
              className="w-10 h-10 rounded-full border border-slate-600 group-hover:border-kiriko-teal transition-colors"
              alt="Profile"
              width={40}
              height={40}
            />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900"></div>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-white truncate group-hover:text-kiriko-teal transition-colors">{user.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{user.role}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onLogout(); }} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}