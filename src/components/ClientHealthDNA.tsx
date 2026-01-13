'use client';
import { useMemo } from 'react';
import { Activity, Deal } from '@/types/crm';
import { AlertTriangle, CheckCircle2, HelpCircle, Activity as ActivityIcon } from 'lucide-react';

interface ClientHealthDNAProps {
  deals: Deal[];
  activities: Activity[];
  totalRevenue: number;
}

export default function ClientHealthDNA({ deals, activities, totalRevenue }: ClientHealthDNAProps) {
 
  const healthData = useMemo(() => {
    let score = 50; 
    let status = 'Neutral';
    let colorTheme = 'blue'; 

    
    const lastActivity = activities[0];
    const daysSinceContact = lastActivity 
      ? Math.floor((new Date().getTime() - new Date(lastActivity.created_at).getTime()) / (1000 * 3600 * 24))
      : 999;
    
    
    const wonDealsCount = deals.filter(d => d.stage === 'won').length;
    const activeDealsCount = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').length;

    
    if (daysSinceContact <= 7) score += 20;
    else if (daysSinceContact <= 14) score += 10;
    else if (daysSinceContact > 30) score -= 20; 

    // Dinero manda
    if (totalRevenue > 10000) score += 15;
    if (totalRevenue > 50000) score += 10;

    // Fidelidad
    if (wonDealsCount > 2) score += 10;
    
    // Riesgo: Sin tratos activos y sin hablar hace mucho
    if (activeDealsCount === 0 && daysSinceContact > 20) score -= 15;

    // Límites 0-100
    score = Math.min(Math.max(score, 0), 100);

    // --- DETERMINAR ESTADO VISUAL ---
    if (score >= 80) {
        status = 'Socio Estratégico';
        colorTheme = 'green';
    } else if (score >= 60) {
        status = 'Saludable';
        colorTheme = 'blue';
    } else if (score >= 40) {
        status = 'Atención Requerida';
        colorTheme = 'orange';
    } else {
        status = 'Riesgo Crítico';
        colorTheme = 'red';
    }

    return { score, status, colorTheme, daysSinceContact };
  }, [deals, activities, totalRevenue]);

  // --- CONFIGURACIÓN DE COLORES ---
  const theme = {
    green: { primary: '#10b981', secondary: '#059669', shadow: 'rgba(16, 185, 129, 0.5)', icon: <CheckCircle2 size={16}/> },
    blue:  { primary: '#2dd4bf', secondary: '#0ea5e9', shadow: 'rgba(45, 212, 191, 0.5)', icon: <ActivityIcon size={16}/> },
    orange:{ primary: '#f59e0b', secondary: '#d97706', shadow: 'rgba(245, 158, 11, 0.5)', icon: <HelpCircle size={16}/> },
    red:   { primary: '#ef4444', secondary: '#b91c1c', shadow: 'rgba(239, 68, 68, 0.5)', icon: <AlertTriangle size={16}/> },
  }[healthData.colorTheme] || { primary: '#2dd4bf', secondary: '#0ea5e9', shadow: 'rgba(45, 212, 191, 0.5)', icon: <ActivityIcon size={16}/> };

  
  const rotationSpeed = `${30 - (healthData.score / 100 * 20)}s`; 

  return (
    <div className="relative h-[260px] rounded-2xl overflow-hidden bg-[#050b1a] border border-slate-800 p-4 flex flex-col items-center justify-center group shadow-inner">
      
      
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.6)),linear-gradient(to_right,transparent_50%,rgba(0,0,0,0.6))] bg-[size:20px_20px] opacity-20 pointer-events-none"></div>
      
      
      <div className="relative w-32 h-32 flex items-center justify-center z-10 mt-2">
         
         <svg className="absolute inset-0 w-full h-full animate-spin-slow" viewBox="0 0 100 100" style={{ animationDuration: rotationSpeed }}>
            <circle cx="50" cy="50" r="48" stroke={theme.secondary} strokeWidth="0.5" fill="none" strokeDasharray="4 4" opacity="0.3" />
            <circle cx="50" cy="50" r="40" stroke={theme.primary} strokeWidth="1" fill="none" strokeDasharray="20 15" opacity="0.6" />
            <circle cx="50" cy="50" r="32" stroke={theme.secondary} strokeWidth="2" fill="none" strokeDasharray="60 100" opacity="0.8" />
         </svg>
         
         
         <div className="relative z-20 flex flex-col items-center justify-center w-20 h-20 bg-[#0a0f1e] rounded-full border border-slate-700/50 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.5)]">
             <div className="absolute inset-0 rounded-full opacity-20 animate-pulse" style={{ backgroundColor: theme.primary }}></div>
             <span className="text-2xl font-bold font-mono relative z-10" style={{ color: theme.primary, textShadow: `0 0 15px ${theme.shadow}` }}>
                 {healthData.score}
             </span>
             <span className="text-[6px] uppercase text-slate-500 tracking-widest font-bold">Score</span>
         </div>
      </div>

      
      <div className="text-center z-10 mt-5 w-full">
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 mb-2 backdrop-blur-md">
            <span style={{ color: theme.primary }}>{theme.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-white">{healthData.status}</span>
          </div>
          
          <div className="flex justify-between text-[9px] text-slate-500 px-4 mt-2 font-mono border-t border-slate-800/50 pt-2">
            <span>Ult. Contacto:</span>
            <span className={healthData.daysSinceContact > 30 ? 'text-red-400' : 'text-slate-300'}>
                {healthData.daysSinceContact > 900 ? 'Nunca' : `${healthData.daysSinceContact}d`}
            </span>
          </div>
      </div>

      
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 animate-scanline pointer-events-none"></div>
    </div>
  );
}