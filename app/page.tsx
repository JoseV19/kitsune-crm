'use client';

import { useState, useEffect } from 'react';
import KanbanBoard from '@/components/KanbanBoard';
import { LogOut } from 'lucide-react'; 
import { LoginPage } from '@/components/LoginPage';
import { ProfileModal } from '@/components/ProfileModal';

interface UserData {
  name: string;
  role: string;
  avatar: string; 
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [user, setUser] = useState<UserData>({
    name: 'Admin Zionak',
    role: 'Senior Operative',
    avatar: '' 
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('kitsune_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  const handleLogin = (name: string, role: string) => {
    const newUser = { ...user, name, role };
    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('kitsune_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('kitsune_user');
  };

  const handleSaveProfile = (updatedUser: UserData) => {
    setUser(updatedUser);
    localStorage.setItem('kitsune_user', JSON.stringify(updatedUser));
  };

  if (isLoading) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center text-kiriko-teal font-mono animate-pulse tracking-widest">
            CARGANDO SISTEMA KITSUNE...
        </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <main className="min-h-screen bg-kiriko-900 text-white font-sans selection:bg-kiriko-teal selection:text-black">
      
      {/* --- HEADER EXPANDIDO "MODO CINE" --- */}
      <header className="relative w-full h-56 mb-8 overflow-hidden group border-b border-kiriko-teal/50 shadow-[0_0_40px_rgba(45,212,191,0.2)]">
        
        {/* 1. FONDO GIGANTE: LA IMAGEN DEL LOGO ESTIRADA */}
        <div className="absolute inset-0 z-0">
            {/* Imagen estirada (object-cover) para ocupar TODO el espacio */}
            <img 
                src="/logo-kiriko.png" 
                alt="Background Texture" 
                className="w-full h-full object-cover object-[center_40%] opacity-80 blur-xl scale-110 mix-blend-screen"
            />
            
            {/* Capa de oscurecimiento suave para que el texto resalte (Gradient Mask) */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/80"></div>
            
            {/* Capa de color sólido extra para teñir de azul todo el bloque (Overlay) */}
            <div className="absolute inset-0 bg-kiriko-teal/10 mix-blend-overlay"></div>
        </div>
        
        {/* 2. TEXTURA SCANLINE (Detalle técnico) */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.2)_1px,transparent_1px)] bg-[size:4px_4px] z-0 pointer-events-none opacity-50"></div>

        {/* 3. CONTENIDO DEL HEADER */}
        <div className="relative z-10 flex justify-between items-end px-10 pb-8 h-full w-full">
            
            {/* IZQUIERDA: LOGO FLOTANTE NÍTIDO (CON ENLACE) */}
            <div className="flex items-center gap-6">
              <a 
                href="https://studios.zionak.com/es" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-72 drop-shadow-[0_0_30px_rgba(45,212,191,0.9)] hover:scale-105 transition-transform duration-300 cursor-pointer block"
                title="Ir a Zionak Studios"
              >
                 {/* El logo principal superpuesto */}
                 <img 
                   src="/logo-kiriko.png" 
                   alt="Kitsune CRM" 
                   className="w-full h-auto object-contain mix-blend-screen" 
                 />
              </a>
              
              <div className="hidden xl:block pb-5 opacity-80">
                  <p className="text-xs text-kiriko-teal font-mono tracking-[0.5em] uppercase drop-shadow-md">
                      Pipeline // Secure Connection
                  </p>
              </div>
            </div>
            
            {/* DERECHA: PERFIL */}
            <div className="flex items-center gap-6 pb-2">
                <div 
                    className="flex items-center gap-4 cursor-pointer group/profile bg-black/60 backdrop-blur-md p-3 pr-6 rounded-full border border-kiriko-teal/50 hover:border-kiriko-teal transition-all hover:bg-black/80 shadow-lg" 
                    onClick={() => setIsProfileOpen(true)}
                >
                    <div className="relative w-12 h-12">
                        <img 
                            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                            alt="User" 
                            className="w-full h-full rounded-full object-cover border-2 border-kiriko-teal shadow-[0_0_15px_rgba(45,212,191,0.6)]"
                        />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse"></div>
                    </div>

                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-kiriko-teal font-bold font-mono uppercase tracking-widest mb-0.5">{user.role}</p>
                        <p className="text-base font-bold text-white leading-none shadow-black drop-shadow-sm">{user.name}</p>
                    </div>
                </div>

                <button 
                    onClick={handleLogout}
                    className="bg-black/60 backdrop-blur-md text-slate-300 hover:text-red-400 border border-slate-600 hover:border-red-500 transition-all p-4 rounded-full group/logout shadow-lg"
                    title="Cerrar Sesión"
                >
                    <LogOut size={22} className="group-hover/logout:scale-110 transition-transform" />
                </button>
            </div>

        </div>
        
        {/* LÍNEA DE ENERGÍA INFERIOR */}
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-kiriko-teal via-white to-kiriko-teal opacity-90 shadow-[0_0_20px_#2dd4bf] animate-pulse"></div>
      </header>

      {/* --- CONTENIDO PRINCIPAL --- */}
     <div className="px-10 pb-10">
         {/* AHORA PASAMOS EL NOMBRE DEL USUARIO AL TABLERO */}
         <KanbanBoard currentUser={user.name} />
      </div>
      <ProfileModal 
         isOpen={isProfileOpen} 
         onClose={() => setIsProfileOpen(false)} 
         currentUser={user}
         onSave={handleSaveProfile}
      />

    </main>
  );
}