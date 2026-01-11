'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/SupabaseClient';
import jsPDF from 'jspdf'; // <--- LIBRERÍA NUEVA
import { 
  X, Phone, Mail, Plus, Send, MessageSquare, 
  Trash2, Loader2, Edit2, Save as SaveIcon, Settings, Calendar, Info, 
  Briefcase, MessageCircle, FileText, Download 
} from 'lucide-react';
import { Client, Deal, Activity } from '@/types/crm';

interface ClientDetailsPanelProps {
  clientId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onClientDeleted: () => void; 
}

export default function ClientDetailsPanel({ clientId, isOpen, onClose, onClientDeleted }: ClientDetailsPanelProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', job_title: '' });

  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('kitsune_user') || '{}').name || 'Usuario' : 'Usuario';

  useEffect(() => {
    if (isOpen && clientId) {
      fetchClientData(clientId);
      fetchActivities(clientId);
    }
  }, [isOpen, clientId]);

  const fetchClientData = async (id: string) => {
    const { data: clientData } = await supabase.from('clients').select('*').eq('id', id).single();
    if (clientData) {
      setClient(clientData);
      setEditForm({ 
        name: clientData.name || '', 
        email: clientData.email || '', 
        phone: clientData.phone || '', 
        job_title: clientData.job_title || '' 
      });
    }

    const { data: dealsData } = await supabase.from('deals').select('*').eq('client_id', id);
    setDeals(dealsData || []);
    if (dealsData) {
      const revenue = dealsData
        .filter(d => d.stage === 'won')
        .reduce((sum, d) => sum + (d.value || 0), 0);
      setTotalRevenue(revenue);
    }
  };

  const fetchActivities = async (id: string) => {
    const { data } = await supabase.from('client_activities').select('*').eq('client_id', id).order('created_at', { ascending: false });
    setActivities(data || []);
  };

  const handleSaveChanges = async () => {
    if (!clientId) return;
    setIsSaving(true);
    const { error } = await supabase.from('clients').update(editForm).eq('id', clientId);
    if (!error) {
      setClient(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
    } else {
      alert("Error al guardar: " + error.message);
    }
    setIsSaving(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !clientId) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('client_activities').insert([{ client_id: clientId, type: 'note', content: newNote, author_name: currentUser }]);
    if (!error) { 
        setNewNote(''); 
        fetchActivities(clientId); 
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
      if (!clientId) return;
      if (confirm("¿Estás seguro de eliminar este cliente y todos sus datos?")) {
          await supabase.from('clients').delete().eq('id', clientId);
          onClientDeleted();
      }
  }

  // --- FUNCIÓN 1: WHATSAPP DIRECTO ---
  const handleWhatsApp = () => {
    if (!client?.phone) return alert("Este cliente no tiene número de teléfono registrado.");
    // Limpiamos el número (quitamos espacios, guiones, paréntesis)
    const cleanPhone = client.phone.replace(/\D/g, ''); 
    // Mensaje predeterminado profesional
    const message = `Hola ${client.name.split(' ')[0]}, te saludo de Zionak Studios. Me gustaría dar seguimiento a tu proyecto.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // --- FUNCIÓN 2: GENERAR PDF ---
  const handleGeneratePDF = () => {
    if (!client) return;
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();

    // 1. Encabezado Oscuro (Estilo Zionak)
    doc.setFillColor(2, 6, 23); // Color slate-950 aproximado
    doc.rect(0, 0, 210, 40, 'F');
    
    // 2. Título y Logo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ZIONAK STUDIOS", 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(45, 212, 191); // Kiriko Teal
    doc.text("COTIZACIÓN DE SERVICIOS", 150, 25);

    // 3. Datos del Cliente
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Preparado para:", 20, 60);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Cliente: ${client.name}`, 20, 70);
    doc.text(`Cargo: ${client.job_title || 'N/A'}`, 20, 77);
    doc.text(`Email: ${client.email}`, 20, 84);
    doc.text(`Fecha: ${today}`, 150, 70);

    // 4. Línea divisoria
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 95, 190, 95);

    // 5. Detalles (Usamos los Deals abiertos como items)
    doc.setFont("helvetica", "bold");
    doc.text("Detalle de la Propuesta", 20, 110);

    let yPos = 125;
    
    // Encabezados de tabla simple
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 115, 170, 10, 'F');
    doc.setFontSize(10);
    doc.text("Concepto", 25, 121);
    doc.text("Estado", 120, 121);
    doc.text("Monto", 160, 121);

    // Items
    doc.setFont("helvetica", "normal");
    deals.forEach((deal) => {
        doc.text(deal.title, 25, yPos);
        doc.text(deal.stage.toUpperCase(), 120, yPos);
        doc.text(`Q${deal.value.toLocaleString()}`, 160, yPos);
        yPos += 10;
    });

    // Total
    doc.setFont("helvetica", "bold");
    doc.line(20, yPos + 5, 190, yPos + 5);
    doc.text("TOTAL HISTÓRICO:", 120, yPos + 15);
    doc.setTextColor(45, 212, 191); // Teal para el precio
    doc.setFontSize(14);
    doc.text(`Q${totalRevenue.toLocaleString()}`, 160, yPos + 15);

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text("Este documento es una estimación generada automáticamente por Kitsune CRM.", 20, 280);
    doc.text("Zionak Studios - Software & Design", 20, 285);

    doc.save(`Cotizacion_${client.name.replace(/\s/g, '_')}.pdf`);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(amount);
  };

  if (!isOpen || !clientId) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>
      
      <div className="relative w-full max-w-[1150px] h-full bg-[#020617] border-l border-kiriko-teal/20 shadow-[-20px_0_50px_rgba(45,212,191,0.1)] flex flex-col animate-in slide-in-from-right duration-300 font-sans text-white">
        
        {/* HEADER SUPERIOR */}
        <div className="bg-slate-950/50 border-b border-slate-800 px-6 py-3 flex justify-between items-center flex-none backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Briefcase size={14} className="text-kiriko-teal"/>
            <span className="hover:text-kiriko-teal cursor-pointer transition-colors">Contactos</span>
            <span>/</span>
            <span className="text-white font-bold tracking-wide">{client?.name || 'Cargando...'}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} className="text-slate-400 hover:text-white" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0"></div>

          {/* COLUMNA IZQUIERDA: PERFIL */}
          <div className="w-[320px] bg-slate-950/80 border-r border-slate-800 overflow-y-auto custom-scrollbar p-6 z-10">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-slate-900 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-kiriko-teal/50 shadow-[0_0_15px_rgba(45,212,191,0.2)] text-3xl font-bold text-kiriko-teal">
                {client?.name?.substring(0,2).toUpperCase() || '??'}
              </div>
              
              <div className="flex justify-center items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white tracking-tight">
                    {client?.name} 
                </h2>
                {!isEditing && <Edit2 size={14} className="text-slate-500 cursor-pointer hover:text-kiriko-teal transition-colors" onClick={() => setIsEditing(true)} />}
              </div>
              <p className="text-sm text-slate-400 font-mono uppercase tracking-wider">{client?.job_title || 'Sin cargo definido'}</p>
            </div>

            {/* --- AQUÍ ESTÁN TUS NUEVOS BOTONES --- */}
            <div className="grid grid-cols-4 gap-2 mb-8 border-b border-slate-800 pb-6">
              <ActionButton icon={<MessageSquare size={18}/>} label="Nota" onClick={() => document.getElementById('note-input')?.focus()} />
              
              {/* Botón WhatsApp */}
              <div className="flex flex-col items-center gap-2 flex-1 cursor-pointer group" onClick={handleWhatsApp}>
                <div className="p-3 border border-green-900/50 bg-green-900/10 rounded-full group-hover:bg-green-500 text-green-500 group-hover:text-black transition-all shadow-sm">
                   <MessageCircle size={18} />
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-green-400 transition-colors">Chat</span>
              </div>

              {/* Botón PDF */}
              <div className="flex flex-col items-center gap-2 flex-1 cursor-pointer group" onClick={handleGeneratePDF}>
                <div className="p-3 border border-slate-700 bg-slate-900/50 rounded-full group-hover:bg-white group-hover:text-black text-slate-400 transition-all shadow-sm">
                   <FileText size={18} />
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-white transition-colors">PDF</span>
              </div>

              <ActionButton icon={<Calendar size={18}/>} label="Tarea" />
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4">
                <h3 className="text-xs font-bold text-kiriko-teal uppercase tracking-widest">Información</h3>
                <Settings size={14} className="text-slate-500 cursor-pointer hover:text-white" />
              </div>

              {isEditing ? (
                <div className="space-y-4 animate-in fade-in">
                  <EditField label="Nombre Completo" value={editForm.name} onChange={(v) => setEditForm({...editForm, name: v})} />
                  <EditField label="Correo" value={editForm.email} onChange={(v) => setEditForm({...editForm, email: v})} />
                  <EditField label="Teléfono" value={editForm.phone} onChange={(v) => setEditForm({...editForm, phone: v})} />
                  <EditField label="Cargo" value={editForm.job_title} onChange={(v) => setEditForm({...editForm, job_title: v})} />
                  
                  <div className="flex gap-2 pt-4">
                      <button onClick={handleSaveChanges} className="flex-1 bg-kiriko-teal text-black py-2 rounded font-bold text-xs hover:bg-teal-400 transition-all flex justify-center gap-2 items-center shadow-[0_0_10px_rgba(45,212,191,0.3)]">
                        {isSaving ? <Loader2 size={14} className="animate-spin"/> : <SaveIcon size={14}/>} GUARDAR
                      </button>
                      <button onClick={() => setIsEditing(false)} className="px-3 py-2 border border-slate-700 rounded text-slate-400 font-bold text-xs hover:bg-slate-800 hover:text-white transition-all">
                        Cancelar
                      </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <InfoItem label="Correo" value={client?.email} isLink icon={<Mail size={14}/>} />
                  <InfoItem label="Teléfono" value={client?.phone} icon={<Phone size={14}/>} />
                  <InfoItem label="Cargo" value={client?.job_title} icon={<Briefcase size={14}/>} />
                  
                  <div className="bg-slate-900/50 border border-kiriko-teal/20 p-3 rounded-lg shadow-inner">
                      <p className="text-[10px] text-kiriko-teal font-bold uppercase mb-1">Ingresos Totales (Won)</p>
                      <p className="text-lg font-mono font-bold text-white tracking-wider text-shadow-neon">{formatMoney(totalRevenue)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA CENTRAL (Contenido igual) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 z-10 bg-[#020617]">
            <div className="flex gap-6 border-b border-slate-800 mb-4">
              <button className="pb-2 border-b-2 border-orange-500 text-sm font-bold text-white tracking-wide">Actividades</button>
              <button className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors">Notas</button>
              <button className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors">Correos</button>
            </div>

            <div className="bg-slate-900/40 rounded-xl border border-slate-800 shadow-sm overflow-hidden relative group">
               <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-kiriko-teal/5 opacity-50 group-hover:opacity-80 transition-opacity"></div>
               <div className="p-6 relative">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white flex items-center gap-2 tracking-wide"><Info size={16} className="text-purple-400"/> Resumen de IA</h3>
                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.2)]">✦ KITSUNE AI</span>
                  </div>
                  <div className="bg-[#0a0f1e] border border-slate-800 rounded-xl p-5 text-sm text-slate-300 leading-relaxed shadow-inner font-mono">
                    <p className="text-[10px] text-slate-500 mb-2 uppercase font-bold tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span> Generado hoy
                    </p>
                    "El cliente {client?.name} mantiene una actividad constante. Actualmente tiene {deals.length} oportunidades en pipeline y ha generado un valor total de {formatMoney(totalRevenue)}. Se sugiere programar una llamada de seguimiento."
                  </div>
               </div>
            </div>

            <form onSubmit={handleAddNote} className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 shadow-sm relative focus-within:border-kiriko-teal/50 transition-colors">
                <textarea 
                  id="note-input"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escribe una nota..."
                  className="w-full bg-transparent text-sm outline-none resize-none h-20 text-white placeholder:text-slate-600 custom-scrollbar"
                />
                <div className="flex justify-between items-center border-t border-slate-800 pt-3 mt-2">
                  <div className="flex gap-2 text-slate-500">
                     <Edit2 size={14} className="hover:text-white cursor-pointer transition-colors"/>
                  </div>
                  <button 
                    disabled={!newNote.trim() || isSubmitting}
                    className="bg-orange-600 text-white px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 transition-all flex items-center gap-2 shadow-md"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>} Guardar nota
                  </button>
                </div>
            </form>

            <div className="space-y-4 pb-10 relative">
              <div className="absolute left-4 top-2 bottom-2 w-[1px] bg-slate-800 z-0"></div>
              {activities.map((activity) => (
                <div key={activity.id} className="relative z-10 pl-10 animate-in fade-in slide-in-from-bottom-2">
                  <div className="absolute left-0 top-1 bg-slate-950 p-1 rounded-full border border-slate-800 text-kiriko-teal"><MessageSquare size={14}/></div>  
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-kiriko-teal/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-bold text-white"><span className="text-kiriko-teal">{activity.author_name || 'Sistema'}</span> registró una nota</p>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono lowercase">{new Date(activity.created_at).toLocaleString()}</p>
                    </div>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-slate-950/30 p-2 rounded border border-slate-800/50">{activity.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="w-[300px] bg-slate-950/80 border-l border-slate-800 p-6 space-y-6 overflow-y-auto custom-scrollbar z-10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                <Briefcase size={14} className="text-kiriko-teal"/> Asociaciones
            </h3>
            <AssociationCard title="Empresas" count={1} />
            <AssociationCard 
              title="Oportunidades" 
              count={deals.length}
              content={deals.length > 0 ? (
                  <div className="space-y-2">
                      {deals.map(d => (
                          <div key={d.id} className="text-xs p-3 bg-slate-900/50 rounded-lg border border-slate-800 hover:border-slate-700 transition-all group">
                              <p className="font-bold text-white truncate mb-2 group-hover:text-kiriko-teal transition-colors">{d.title}</p>
                              <div className="flex justify-between items-center">
                                <span className={`uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-950 border ${d.stage === 'won' ? 'text-green-400 border-green-900' : 'text-slate-400 border-slate-800'}`}>
                                    {d.stage}
                                </span>
                                <span className="font-mono font-bold text-kiriko-teal">{formatMoney(d.value)}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : null}
            />
            <div className="pt-10 border-t border-slate-800 mt-auto">
              <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-white hover:bg-red-600/80 border border-red-900/30 p-2.5 rounded-lg transition-all text-xs font-bold uppercase tracking-widest">
                <Trash2 size={14}/> Eliminar Cliente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helpers
function InfoItem({ label, value, isLink, color, icon }: { label: string, value?: string | null | number, isLink?: boolean, color?: string, icon?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-1.5">
          {icon && <span className="text-slate-500">{icon}</span>}
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-sm truncate font-medium pl-5 ${isLink ? 'text-kiriko-teal cursor-pointer hover:underline' : color || 'text-white'}`}>
        {value || '--'}
      </p>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] text-kiriko-teal font-bold uppercase mb-1 block tracking-wider">{label}</label>
      <input 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full bg-slate-900 border border-slate-800 text-white p-2.5 rounded-lg text-sm focus:border-kiriko-teal focus:ring-1 focus:ring-kiriko-teal/30 outline-none transition-all font-mono" 
      />
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 cursor-pointer group" onClick={onClick}>
      <div className="p-3 border border-slate-700 bg-slate-900/50 rounded-full group-hover:border-kiriko-teal group-hover:bg-kiriko-teal/10 text-slate-400 group-hover:text-kiriko-teal transition-all shadow-sm group-hover:shadow-[0_0_10px_rgba(45,212,191,0.2)]">
        {icon}
      </div>
      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-white transition-colors">{label}</span>
    </div>
  );
}

function AssociationCard({ title, count, content }: { title: string, count: number, content?: React.ReactNode }) {
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30 shadow-sm relative">
      <div className="bg-slate-950/50 px-4 py-2.5 flex justify-between items-center border-b border-slate-800">
        <h4 className="text-[11px] font-bold text-white uppercase tracking-wide flex items-center gap-2">
            {title} <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full text-[9px]">{count}</span>
        </h4>
        <Plus size={14} className="text-slate-500 cursor-pointer hover:text-kiriko-teal transition-colors" />
      </div>
      <div className="p-3 max-h-[200px] overflow-y-auto custom-scrollbar">
        {content || <p className="text-[10px] text-slate-600 italic text-center py-2 font-mono">No hay registros asociados</p>}
      </div>
    </div>
  );
}