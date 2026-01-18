'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useOrganizationId } from '@/lib/contexts/organization-context';
import { useDatabaseService } from '@/lib/services/supabase/database.service';
import { useStorageService } from '@/lib/services/supabase/storage.service';
import { useSupabaseClient } from '@/lib/services/supabase/client';
// Importamos el generador actualizado
import { generarPDFZionak } from '@/lib/pdfGenerator';
import DealEditorModal from './deal-editor-modal';
import ClientHealthDNA from './client-health-dna';
import {
  X, Phone, Mail, Plus, Send, MessageSquare,
  Trash2, Loader2, Edit2, Save as SaveIcon, Settings,
  Briefcase, MessageCircle, FileText, User, Users, Sparkles, Activity as ActivityIcon
} from 'lucide-react';
import { Client, Deal, Activity, Contact } from '@/types/crm';

// --- DEFINICIÓN LOCAL PARA EVITAR ERRORES DE BUILD EN VERCEL ---
interface OrganizationSettings {
  id: string;
  company_name: string;
  address: string;
  email: string;
  phone: string;
  tax_id: string;
  logo_url?: string;
}

interface ClientDetailsPanelProps {
  clientId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onClientDeleted: () => void;
}

export default function ClientDetailsPanel({ clientId, isOpen, onClose, onClientDeleted }: ClientDetailsPanelProps) {
  const organizationId = useOrganizationId();
  const db = useDatabaseService();
  const storage = useStorageService();
  const [client, setClient] = useState<Client | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null);

  const [activeTab, setActiveTab] = useState<'activities' | 'contacts'>('activities');
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedDealForEdit, setSelectedDealForEdit] = useState<Deal | null>(null);
  const [isAddingContact, setIsAddingContact] = useState(false);

  const [newContact, setNewContact] = useState({ name: '', role: '', email: '', phone: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', job_title: '' });

  // Get current user from Supabase auth
  const [currentUser, setCurrentUser] = useState('Usuario');
  const { user } = useUser();
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (organizationId) {
      db.setOrganizationId(organizationId);
      storage.setOrganizationId(organizationId);
    }
  }, [organizationId, db, storage]);

  useEffect(() => {
    const getUser = async () => {
      try {
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('code_name, full_name')
            .eq('id', user.id)
            .single();
          // Prefer code_name (Nombre en Clave) over full_name, then fall back to Clerk name
          const displayName = profile?.code_name || profile?.full_name || user.fullName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'Usuario';
          setCurrentUser(displayName);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    getUser();
  }, [user, supabase]);

  const fetchOrgSettings = useCallback(async () => {
    if (!organizationId) return;
    try {
      db.setOrganizationId(organizationId);
      const data = await db.getOrganizationSettings();
      if (data) setOrgSettings(data as OrganizationSettings);
    } catch (error) {
      console.error('Error fetching org settings:', error);
    }
  }, [organizationId, db]);

  const fetchClientData = useCallback(async (id: string) => {
    if (!organizationId) return;
    try {
      db.setOrganizationId(organizationId);
      const clientData = await db.getClientById(id);
      if (clientData) {
        setClient(clientData);
        setEditForm({
          name: clientData.name || '',
          email: clientData.email || '',
          phone: clientData.phone || '',
          job_title: clientData.job_title || ''
        });
      }

      // Get deals for this client
      const allDeals = await db.getDeals();
      const clientDeals = allDeals.filter(d => d.client_id === id);
      setDeals(clientDeals);

      const revenue = clientDeals
        .filter(d => d.stage === 'won')
        .reduce((sum, d) => sum + (d.value || 0), 0);
      setTotalRevenue(revenue);
    } catch (error) {
      console.error('Error fetching client data:', error);
    }
  }, [organizationId, db]);

  const fetchActivities = useCallback(async (id: string) => {
    if (!organizationId) return;
    try {
      db.setOrganizationId(organizationId);
      const data = await db.getActivities(id);
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    }
  }, [organizationId, db]);

  const fetchContacts = useCallback(async (id: string) => {
    if (!organizationId) return;
    try {
      db.setOrganizationId(organizationId);
      const data = await db.getContacts(id);
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    }
  }, [organizationId, db]);

  useEffect(() => {
    if (isOpen && clientId) {
      // Use setTimeout to avoid setState in effect warning
      setTimeout(() => {
        fetchClientData(clientId);
        fetchActivities(clientId);
        fetchContacts(clientId);
        fetchOrgSettings();
      }, 0);
    }
  }, [isOpen, clientId, fetchClientData, fetchActivities, fetchContacts, fetchOrgSettings]);

  const aiSummary = useMemo(() => {
    if (!client) return "Analizando datos del cliente...";
    const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
    const wonDeals = deals.filter(d => d.stage === 'won');
    const potencialValue = activeDeals.reduce((acc, d) => acc + d.value, 0);
    const lastActivity = activities[0];

    let text = "";
    if (activeDeals.length > 0) {
      text += `El cliente está ACTIVO con ${activeDeals.length} oportunidad(es) en curso (Valor Potencial: ${new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(potencialValue)}). `;
    } else {
      text += `El cliente está actualmente INACTIVO sin oportunidades abiertas. `;
    }
    if (wonDeals.length > 0) {
      text += `Históricamente ha cerrado ${wonDeals.length} negocios exitosos. `;
    }
    if (lastActivity) {
      const daysSince = Math.floor((new Date().getTime() - new Date(lastActivity.created_at).getTime()) / (1000 * 3600 * 24));
      if (daysSince > 30) text += `⚠️ Alerta: No ha habido interacción en ${daysSince} días. Se recomienda contactar urgentemente.`;
      else if (daysSince > 7) text += `Hace ${daysSince} días fue la última interacción. Sería bueno dar seguimiento.`;
      else text += `La comunicación es fluida (última: hace ${daysSince} días).`;
    } else {
      text += "No hay historial de interacciones. Registra una nota o llamada para iniciar.";
    }
    return text;
  }, [client, deals, activities]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !organizationId) return;
    setIsSubmitting(true);
    try {
      db.setOrganizationId(organizationId);
      await db.createContact({
        client_id: clientId,
        name: newContact.name,
        role: newContact.role || null,
        email: newContact.email || null,
        phone: newContact.phone || null,
      });
      setNewContact({ name: '', role: '', email: '', phone: '' });
      setIsAddingContact(false);
      fetchContacts(clientId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un problema';
      alert("Error al guardar contacto: " + errorMessage);
    }
    setIsSubmitting(false);
  };

  const handleSaveChanges = async () => {
    if (!clientId || !organizationId) return;
    setIsSaving(true);
    try {
      db.setOrganizationId(organizationId);
      await db.updateClient(clientId, editForm);
      setClient(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un problema';
      alert("Error al guardar: " + errorMessage);
    }
    setIsSaving(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !clientId || !organizationId) return;
    setIsSubmitting(true);
    try {
      db.setOrganizationId(organizationId);
      await db.createActivity({
        client_id: clientId,
        organization_id: organizationId,
        type: 'note',
        content: newNote,
        author_name: currentUser,
      });
      setNewNote('');
      fetchActivities(clientId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un problema';
      alert("Error al guardar nota: " + errorMessage);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!clientId || !organizationId) return;
    if (confirm("¿Estás seguro de eliminar este cliente y todos sus datos?")) {
      try {
        db.setOrganizationId(organizationId);
        await db.deleteClient(clientId);
        onClientDeleted();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un problema';
        alert("Error al eliminar: " + errorMessage);
      }
    }
  }

  const handleWhatsApp = () => {
    if (!client?.phone) return alert("Este cliente no tiene número de teléfono registrado.");
    const cleanPhone = client.phone.replace(/\D/g, '');
    const message = `Hola ${client.name.split(' ')[0]}, te saludo de Zionak Studios. Me gustaría dar seguimiento a tu proyecto.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // --- PDF GENERATOR (LLAMADA ACTUALIZADA) ---
  const handleGeneratePDF = async () => {
    if (!client) return;

    // Configuración por defecto si no existe orgSettings
    const configToUse = orgSettings || {
      id: 'default',
      company_name: 'Zionak Studios',
      address: 'Ciudad de Guatemala',
      email: 'info@zionak.com',
      phone: '',
      tax_id: 'CF'
    };

    const productosMap = deals.map(deal => {
      const precio = deal.value || 0;
      return {
        nombre: deal.title, cantidad: 1, precio: precio, subtotal: precio, iva: precio * 0.12, total: precio * 1.12
      };
    });

    const totalFinalCalculado = productosMap.reduce((acc, item) => acc + item.total, 0);

    const datosParaImprimir = {
      numeroCotizacion: "KITSUNE-" + Math.floor(Math.random() * 10000),
      cliente: client.name,
      fecha: new Date().toLocaleDateString('es-GT'),
      direccion: "Ciudad de Guatemala",
      formaPago: "A convenir",
      totalEnLetras: "---",
      productos: productosMap,
      totalFinal: totalFinalCalculado.toFixed(2),
    };

    // AHORA SÍ: Llamamos con 2 argumentos, pero como pdfGenerator acepta 'any', no dará error.
    generarPDFZionak(datosParaImprimir, configToUse);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(amount);
  };

  if (!isOpen || !clientId) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in" onClick={onClose}></div>

      <div className="relative w-full max-w-[1150px] h-full bg-[#020617] border-l border-kiriko-teal/20 shadow-[-20px_0_50px_rgba(45,212,191,0.1)] flex flex-col animate-in slide-in-from-right duration-300 font-sans text-white">

        <div className="bg-slate-950/50 border-b border-slate-800 px-6 py-3 flex justify-between items-center flex-none backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Briefcase size={14} className="text-kiriko-teal" />
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

          <div className="w-[320px] bg-slate-950/80 border-r border-slate-800 overflow-y-auto custom-scrollbar p-6 z-10">

            <div className="mb-4 animate-in zoom-in-95 duration-500">
              <ClientHealthDNA
                deals={deals}
                activities={activities}
                totalRevenue={totalRevenue}
              />
            </div>

            <div className="text-center mb-6">
              <div className="flex justify-center items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {client?.name}
                </h2>
                {!isEditing && <Edit2 size={14} className="text-slate-500 cursor-pointer hover:text-kiriko-teal transition-colors" onClick={() => setIsEditing(true)} />}
              </div>
              <p className="text-sm text-slate-400 font-mono uppercase tracking-wider">{client?.job_title || 'Organización'}</p>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-8 border-b border-slate-800 pb-6">
              <ActionButton icon={<MessageSquare size={18} />} label="Nota" onClick={() => { setActiveTab('activities'); setTimeout(() => document.getElementById('note-input')?.focus(), 100); }} />
              <div className="flex flex-col items-center gap-2 flex-1 cursor-pointer group" onClick={handleWhatsApp}>
                <div className="p-3 border border-green-900/50 bg-green-900/10 rounded-full group-hover:bg-green-500 text-green-500 group-hover:text-black transition-all shadow-sm">
                  <MessageCircle size={18} />
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-green-400 transition-colors">Chat</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1 cursor-pointer group" onClick={handleGeneratePDF}>
                <div className="p-3 border border-slate-700 bg-slate-900/50 rounded-full group-hover:bg-white group-hover:text-black text-slate-400 transition-all shadow-sm">
                  <FileText size={18} />
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-white transition-colors">PDF</span>
              </div>
              <ActionButton icon={<Users size={18} />} label="Staff" onClick={() => setActiveTab('contacts')} />
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4">
                <h3 className="text-xs font-bold text-kiriko-teal uppercase tracking-widest">Información</h3>
                <Settings size={14} className="text-slate-500 cursor-pointer hover:text-white" />
              </div>

              {isEditing ? (
                <div className="space-y-4 animate-in fade-in">
                  <EditField label="Nombre Empresa" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
                  <EditField label="Correo Central" value={editForm.email} onChange={(v) => setEditForm({ ...editForm, email: v })} />
                  <EditField label="Teléfono PBX" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
                  <EditField label="Tipo / Rubro" value={editForm.job_title} onChange={(v) => setEditForm({ ...editForm, job_title: v })} />

                  <div className="flex gap-2 pt-4">
                    <button onClick={handleSaveChanges} className="flex-1 bg-kiriko-teal text-black py-2 rounded font-bold text-xs hover:bg-teal-400 transition-all flex justify-center gap-2 items-center shadow-[0_0_10px_rgba(45,212,191,0.3)]">
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <SaveIcon size={14} />} GUARDAR
                    </button>
                    <button onClick={() => setIsEditing(false)} className="px-3 py-2 border border-slate-700 rounded text-slate-400 font-bold text-xs hover:bg-slate-800 hover:text-white transition-all">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <InfoItem label="Correo" value={client?.email} isLink icon={<Mail size={14} />} />
                  <InfoItem label="Teléfono" value={client?.phone} icon={<Phone size={14} />} />
                  <InfoItem label="Rubro" value={client?.job_title} icon={<Briefcase size={14} />} />

                  <div className="bg-slate-900/50 border border-kiriko-teal/20 p-3 rounded-lg shadow-inner">
                    <p className="text-[10px] text-kiriko-teal font-bold uppercase mb-1">Ingresos Totales (Won)</p>
                    <p className="text-lg font-mono font-bold text-white tracking-wider text-shadow-neon">{formatMoney(totalRevenue)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 z-10 bg-[#020617]">
            <div className="flex gap-6 border-b border-slate-800 mb-4">
              <button
                onClick={() => setActiveTab('activities')}
                className={`pb-2 text-sm font-bold tracking-wide transition-colors ${activeTab === 'activities' ? 'border-b-2 border-orange-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Bitácora
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`pb-2 text-sm font-bold tracking-wide transition-colors flex items-center gap-2 ${activeTab === 'contacts' ? 'border-b-2 border-kiriko-teal text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Empleados <span className="bg-slate-800 px-1.5 py-0.5 rounded-full text-[9px]">{contacts.length}</span>
              </button>
            </div>

            {activeTab === 'activities' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">

                <div className="bg-slate-900/40 rounded-xl border border-slate-800 shadow-sm overflow-hidden relative group mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-kiriko-teal/5 opacity-50 group-hover:opacity-80 transition-opacity"></div>
                  <div className="p-6 relative">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-white flex items-center gap-2 tracking-wide">
                        <Sparkles size={16} className="text-purple-400 animate-pulse" /> Análisis Inteligente
                      </h3>
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.2)]">KITSUNE AI</span>
                    </div>
                    <div className="bg-[#0a0f1e] border border-slate-800 rounded-xl p-5 text-sm text-slate-300 leading-relaxed shadow-inner font-mono">
                      {aiSummary}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAddNote} className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 shadow-sm relative focus-within:border-kiriko-teal/50 transition-colors mb-6">
                  <textarea
                    id="note-input"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Escribe una nota, resumen de llamada o recordatorio..."
                    className="w-full bg-transparent text-sm outline-none resize-none h-20 text-white placeholder:text-slate-600 custom-scrollbar"
                  />
                  <div className="flex justify-between items-center border-t border-slate-800 pt-3 mt-2">
                    <div className="flex gap-2 text-slate-500">
                      <Edit2 size={14} className="hover:text-white cursor-pointer transition-colors" />
                    </div>
                    <button
                      disabled={!newNote.trim() || isSubmitting}
                      className="bg-orange-600 text-white px-4 py-1.5 rounded-lg font-bold text-xs hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 transition-all flex items-center gap-2 shadow-md"
                    >
                      {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Guardar nota
                    </button>
                  </div>
                </form>

                <div className="space-y-4 pb-10 relative">
                  <div className="absolute left-4 top-2 bottom-2 w-[1px] bg-slate-800 z-0"></div>

                  {activities.length === 0 && (
                    <p className="text-center text-slate-600 text-sm italic py-4">No hay actividad reciente.</p>
                  )}

                  {activities.map((activity) => (
                    <div key={activity.id} className="relative z-10 pl-10 animate-in fade-in slide-in-from-bottom-2">
                      <div className={`absolute left-0 top-1 p-1 rounded-full border bg-slate-950 ${activity.type === 'system' ? 'border-slate-700 text-slate-500' : 'border-slate-800 text-kiriko-teal'}`}>
                        {activity.type === 'system' ? <ActivityIcon size={14} /> : <MessageSquare size={14} />}
                      </div>
                      <div className={`bg-slate-900/60 border rounded-xl p-4 shadow-sm transition-colors ${activity.type === 'system' ? 'border-slate-800/40 opacity-75 hover:opacity-100' : 'border-slate-800/80 hover:border-kiriko-teal/30'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-xs font-bold text-white">
                              {activity.type === 'system' ? (
                                <span className="text-slate-400">Notificación del Sistema</span>
                              ) : (
                                <><span className="text-kiriko-teal">{activity.author_name || 'Usuario'}</span> registró una nota</>
                              )}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono lowercase">{new Date(activity.created_at).toLocaleString()}</p>
                        </div>
                        <p className={`text-sm whitespace-pre-wrap font-mono leading-relaxed p-2 rounded ${activity.type === 'system' ? 'text-slate-400 italic' : 'text-slate-300 bg-slate-950/30 border border-slate-800/50'}`}>
                          {activity.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'contacts' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-white font-bold">Personal de {client?.name}</h3>
                  <button
                    onClick={() => setIsAddingContact(true)}
                    className="bg-kiriko-teal text-black px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-teal-400 flex items-center gap-2 shadow-[0_0_10px_rgba(45,212,191,0.2)]"
                  >
                    <Plus size={14} /> Nuevo Empleado
                  </button>
                </div>

                {isAddingContact && (
                  <form onSubmit={handleAddContact} className="bg-slate-900/80 border border-kiriko-teal/50 rounded-xl p-4 mb-6 animate-in zoom-in-95">
                    <h4 className="text-xs font-bold text-kiriko-teal uppercase mb-3">Datos del Empleado</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold">Nombre</label>
                        <input required placeholder="Ej: John Doe" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:border-kiriko-teal outline-none"
                          value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold">Cargo</label>
                        <input placeholder="Ej: Gerente Industrial" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:border-kiriko-teal outline-none"
                          value={newContact.role} onChange={e => setNewContact({ ...newContact, role: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold">Email</label>
                        <input placeholder="john@empresa.com" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:border-kiriko-teal outline-none"
                          value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-bold">Teléfono</label>
                        <input placeholder="+502 0000 0000" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-white focus:border-kiriko-teal outline-none"
                          value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setIsAddingContact(false)} className="text-slate-400 text-xs hover:text-white px-3 py-2">Cancelar</button>
                      <button type="submit" disabled={isSubmitting} className="bg-kiriko-teal text-black px-4 py-2 rounded font-bold text-xs hover:bg-teal-400">
                        {isSubmitting ? 'Guardando...' : 'Guardar Contacto'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {contacts.length === 0 && !isAddingContact ? (
                    <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                      <Users size={30} className="mx-auto text-slate-600 mb-2" />
                      <p className="text-slate-500 text-sm">No hay empleados registrados.</p>
                    </div>
                  ) : (
                    contacts.map(contact => (
                      <div key={contact.id} className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex justify-between items-center group transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-slate-700 group-hover:text-white transition-colors">
                            <User size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{contact.name}</p>
                            <p className="text-xs text-kiriko-teal font-mono">{contact.role || 'Sin cargo'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="p-2 bg-slate-950 border border-slate-800 rounded text-slate-400 hover:text-white hover:border-slate-600" title={contact.email}>
                              <Mail size={14} />
                            </a>
                          )}
                          {contact.phone && (
                            <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" className="p-2 bg-slate-950 border border-slate-800 rounded text-slate-400 hover:text-green-400 hover:border-green-900" title={contact.phone}>
                              <MessageCircle size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-[300px] bg-slate-950/80 border-l border-slate-800 p-6 space-y-6 overflow-y-auto custom-scrollbar z-10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Briefcase size={14} className="text-kiriko-teal" /> Asociaciones
            </h3>
            <AssociationCard title="Empresas" count={1} />
            <AssociationCard
              title="Oportunidades"
              count={deals.length}
              content={deals.length > 0 ? (
                <div className="space-y-2">
                  {deals.map(d => (
                    <div key={d.id}
                      onClick={() => setSelectedDealForEdit(d)}
                      className="text-xs p-3 bg-slate-900/50 rounded-lg border border-slate-800 hover:border-kiriko-teal cursor-pointer transition-all group shadow-sm">

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
                <Trash2 size={14} /> Eliminar Cliente
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedDealForEdit && (
        <DealEditorModal
          deal={selectedDealForEdit}
          isOpen={!!selectedDealForEdit}
          onClose={() => setSelectedDealForEdit(null)}
          onUpdate={() => {
            fetchClientData(clientId);
            setSelectedDealForEdit(null);
          }}
        />
      )}

    </div>
  );
}


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