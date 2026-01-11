'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/SupabaseClient'; 
import { Plus, Trash2, Building, Tag, Paperclip, Flag, Loader2, X, Upload, FileText } from 'lucide-react';
import { Deal, DealStage } from '@/types/crm';

const STAGE_CONFIG: Record<DealStage, { title: string; color: string }> = {
  prospect:     { title: 'PROSPECTOS', color: 'bg-emerald-400' },
  qualified:    { title: 'CALIFICADOS', color: 'bg-teal-400' },
  contacted:    { title: 'CONTACTADOS', color: 'bg-cyan-400' },
  meeting:      { title: 'REUNIÓN / DEMO', color: 'bg-blue-400' },
  negotiation:  { title: 'NEGOCIACIÓN', color: 'bg-violet-400' },
  won:          { title: 'GANADOS 💰', color: 'bg-green-500' },
  lost:         { title: 'PERDIDOS', color: 'bg-red-500' }
};

const STAGE_ORDER: DealStage[] = ['prospect', 'qualified', 'meeting', 'negotiation', 'won'];

interface Attachment { id: string; name: string; size: number; type: string; url: string; created_at: string; }

interface KanbanTask extends Deal {
  files: Attachment[]; 
  tags: string[];
  client_data?: { name: string; logo_url?: string } | null;
}

interface Column { id: DealStage; title: string; color: string; tasks: KanbanTask[]; }

interface KanbanBoardProps { 
  currentUser: string; 
  onOpenClient: (clientId: string) => void; 
  searchTerm?: string;
}

export default function KanbanBoard({ currentUser, onOpenClient, searchTerm = '' }: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<{ task: KanbanTask } | null>(null);
  
  const [tempTag, setTempTag] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const fetchDeals = async () => {
    const { data, error } = await supabase
      .from('deals')
      .select('*, clients (id, name, logo_url)')
      .order('created_at', { ascending: false });

    if (error) { console.error("Error:", error); return; }

    const newColumns: Column[] = STAGE_ORDER.map(stage => ({ 
        id: stage, 
        title: STAGE_CONFIG[stage].title, 
        color: STAGE_CONFIG[stage].color, 
        tasks: [] 
    }));

    (data as any[]).forEach(deal => {
        const colIndex = newColumns.findIndex(c => c.id === deal.stage);
        if (colIndex !== -1) {
            newColumns[colIndex].tasks.push({ 
                ...deal, 
                files: Array.isArray(deal.files) ? deal.files : [], 
                tags: Array.isArray(deal.tags) ? deal.tags : ['Nuevo'], 
                client_data: deal.clients 
            });
        }
    });
    setColumns(newColumns); 
    setIsLoaded(true); 
  };

  useEffect(() => { fetchDeals(); }, []);

  // Lógica de Etiquetas
  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && tempTag.trim() && editingTask) {
          e.preventDefault();
          const newTags = [...(editingTask.task.tags || []), tempTag.trim()];
          setEditingTask({ ...editingTask, task: { ...editingTask.task, tags: newTags } });
          setTempTag('');
      }
  };

  const handleRemoveTag = (tagToRemove: string) => {
      if (!editingTask) return;
      const newTags = editingTask.task.tags.filter(t => t !== tagToRemove);
      setEditingTask({ ...editingTask, task: { ...editingTask.task, tags: newTags } });
  };

  // Lógica de Archivos
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0] || !editingTask) return;
      setUploadingFile(true);
      const file = e.target.files[0];
      const fileName = `${editingTask.task.id}/${Date.now()}_${file.name}`;

      try {
          const { error: uploadError } = await supabase.storage.from('deal_attachments').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('deal_attachments').getPublicUrl(fileName);
          const newFile: Attachment = { id: fileName, name: file.name, size: file.size, type: file.type, url: publicUrl, created_at: new Date().toISOString() };
          const newFiles = [...(editingTask.task.files || []), newFile];
          setEditingTask({ ...editingTask, task: { ...editingTask.task, files: newFiles } });
      } catch (error: any) {
          alert('Error subiendo archivo: ' + error.message);
      } finally {
          setUploadingFile(false);
      }
  };

  const handleRemoveFile = (fileId: string) => {
      if (!editingTask) return;
      const newFiles = editingTask.task.files.filter(f => f.id !== fileId);
      setEditingTask({ ...editingTask, task: { ...editingTask.task, files: newFiles } });
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, taskId: string, sourceColId: string) => { e.dataTransfer.setData('taskId', taskId); e.dataTransfer.setData('sourceColId', sourceColId); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = async (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const sourceStage = e.dataTransfer.getData('sourceColId') as DealStage;
    if (!taskId || sourceStage === targetStage) return;

    const sourceColIdx = columns.findIndex(c => c.id === sourceStage);
    const targetColIdx = columns.findIndex(c => c.id === targetStage);
    const taskIndex = columns[sourceColIdx].tasks.findIndex(t => t.id === taskId);
    const task = columns[sourceColIdx].tasks[taskIndex];
    
    const newColumns = [...columns];
    newColumns[sourceColIdx].tasks.splice(taskIndex, 1);
    newColumns[targetColIdx].tasks.push({ ...task, stage: targetStage });
    setColumns(newColumns);
    
    setIsSaving(true);
    await supabase.from('deals').update({ stage: targetStage }).eq('id', taskId);
    if (task.client_id) {
        const oldS = STAGE_CONFIG[sourceStage].title; const newS = STAGE_CONFIG[targetStage].title;
        await supabase.from('client_activities').insert([{ client_id: task.client_id, type: 'system', content: `🔄 Cambio de etapa: De "${oldS}" a "${newS}"`, author_name: 'Sistema 🤖' }]);
    }
    setIsSaving(false);
  };

  const addTask = async (stage: DealStage) => {
    const tempTitle = prompt("Título de la oportunidad:"); if (!tempTitle) return;
    setIsSaving(true);
    const { data } = await supabase.from('deals').insert([{ title: tempTitle, stage, value: 0, currency: 'GTQ', priority: 'medium' }]).select().single();
    if (data) { fetchDeals(); }
    setIsSaving(false);
  };

  const saveTaskLocal = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingTask) return; setIsSaving(true);
    const { id, title, value, priority, expected_close_date, files, tags } = editingTask.task;
    await supabase.from('deals').update({ title, value, priority, expected_close_date, files, tags }).eq('id', id);
    fetchDeals(); setEditingTask(null); setIsSaving(false);
  };

  const handleDeleteDeal = async () => {
      if (!editingTask) return;
      if (!window.confirm("¿Eliminar tarjeta?")) return;
      setIsSaving(true);
      await supabase.from('deals').delete().eq('id', editingTask.task.id);
      fetchDeals(); setEditingTask(null); setIsSaving(false);
  };

  const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: currency || 'GTQ' }).format(amount);

  if (!isLoaded) return <div className="text-kiriko-teal animate-pulse p-10 font-mono">CARGANDO PIPELINE...</div>;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
          {isSaving && <div className="flex items-center gap-2 bg-slate-900 border border-kiriko-teal/30 px-3 py-1 rounded-full text-[10px] text-kiriko-teal animate-pulse"><Loader2 size={10} className="animate-spin" /> Guardando...</div>}
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-280px)] items-start">
        {columns.map((col) => (
          <div key={col.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)} className="min-w-[320px] flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${col.color}`}></div><h3 className="font-bold text-xs text-white uppercase tracking-wider">{col.title}</h3></div>
              <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">{col.tasks.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-none pb-10">
               {col.tasks
                 .filter(task => {
                    if (!searchTerm) return true;
                    const searchLower = searchTerm.toLowerCase();
                    const titleMatch = task.title.toLowerCase().includes(searchLower);
                    const clientMatch = task.client_data?.name.toLowerCase().includes(searchLower);
                    return titleMatch || clientMatch;
                 })
                 .map((task) => (
                 <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id, col.id)} className="group bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 hover:border-kiriko-teal/40 p-4 rounded-lg cursor-grab active:cursor-grabbing transition-all relative">
                    
                    <div className="flex justify-between items-start mb-2">
                        <h4 onClick={() => setEditingTask({ task })} className="font-bold text-slate-200 text-sm hover:text-kiriko-teal cursor-pointer transition-colors truncate pr-2 flex-1">{task.title}</h4>
                        <Flag size={10} className={task.priority === 'high' ? 'text-red-500' : task.priority === 'medium' ? 'text-yellow-500' : 'text-slate-500'} fill="currentColor" />
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        {task.client_id && task.client_data ? (
                             <button 
                                type="button"
                                onMouseDown={(e) => e.stopPropagation()} 
                                onClick={(e) => { 
                                    e.preventDefault();
                                    e.stopPropagation(); 
                                    onOpenClient(task.client_id!); 
                                }} 
                                className="flex items-center gap-2 text-[11px] text-slate-400 hover:text-kiriko-teal font-medium group/client hover:bg-white/5 px-2 py-1 rounded -ml-2 transition-all cursor-pointer z-20 relative"
                             >
                                {task.client_data.logo_url ? <img src={task.client_data.logo_url} className="w-5 h-5 rounded-full object-cover border border-slate-600" /> : <Building size={12}/>}
                                <span className="truncate max-w-[150px] group-hover/client:underline">{task.client_data.name}</span>
                             </button>
                        ) : (<span className="flex items-center gap-1 text-[11px] text-slate-600 italic"><Building size={10}/> Sin Asignar</span>)}
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                        {task.tags?.map((tag, i) => (
                            <span key={i} className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">{tag}</span>
                        ))}
                    </div>

                    <div className="flex justify-between items-end pt-2 border-t border-slate-800/50">
                        <div className="flex gap-2">{task.files?.length > 0 && <span className="flex items-center gap-1 text-[9px] text-slate-500"><Paperclip size={8}/> {task.files.length}</span>}</div>
                        <div className="font-bold text-slate-300 text-xs font-mono">{formatMoney(task.value, task.currency)}</div>
                    </div>
                 </div>
               ))}
               <button onClick={() => addTask(col.id)} className="w-full py-2 border border-dashed border-slate-800 text-slate-600 rounded hover:border-kiriko-teal/30 hover:text-kiriko-teal text-[10px] uppercase flex items-center justify-center gap-1 transition-all opacity-50 hover:opacity-100"><Plus size={12} /> Agregar</button>
            </div>
          </div>
        ))}
      </div>

      {editingTask && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingTask(null)}></div>
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar animate-in zoom-in-95">
               <form onSubmit={saveTaskLocal} className="p-6 space-y-6">
                   <input type="text" value={editingTask.task.title} onChange={(e) => setEditingTask({...editingTask, task: { ...editingTask.task, title: e.target.value }})} className="w-full bg-transparent text-xl font-bold text-white border-b border-slate-700 focus:border-kiriko-teal outline-none pb-2" />
                   
                   <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] text-slate-500 font-bold uppercase">Valor</label><input type="number" value={editingTask.task.value} onChange={(e) => setEditingTask({...editingTask, task: { ...editingTask.task, value: Number(e.target.value) }})} className="w-full bg-slate-800 rounded p-2 text-white text-sm" /></div>
                        <div><label className="text-[10px] text-slate-500 font-bold uppercase">Prioridad</label>
                            <select value={editingTask.task.priority} onChange={(e) => setEditingTask({...editingTask, task: { ...editingTask.task, priority: e.target.value as any }})} className="w-full bg-slate-800 rounded p-2 text-white text-sm">
                                <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option>
                            </select>
                        </div>
                   </div>

                   <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block flex items-center gap-1"><Tag size={12}/> Etiquetas</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {editingTask.task.tags?.map((tag, i) => (
                                <span key={i} className="text-xs bg-kiriko-teal/20 text-kiriko-teal border border-kiriko-teal/40 px-2 py-1 rounded-full flex items-center gap-1">
                                    {tag} <X size={10} className="cursor-pointer hover:text-white" onClick={() => handleRemoveTag(tag)} />
                                </span>
                            ))}
                        </div>
                        <input type="text" value={tempTag} onChange={(e) => setTempTag(e.target.value)} onKeyDown={handleAddTag} placeholder="+ Etiqueta y Enter" className="w-full bg-slate-800/50 text-xs p-2 rounded border border-slate-700 focus:border-kiriko-teal outline-none text-slate-300" />
                   </div>

                   <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1"><Paperclip size={12}/> Archivos</label>
                            <label className="cursor-pointer text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2 py-1 rounded text-white flex items-center gap-1 transition-all">
                                {uploadingFile ? <Loader2 size={10} className="animate-spin"/> : <Upload size={10}/>} Subir
                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                            </label>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar bg-slate-950/30 p-2 rounded-lg border border-slate-800/50">
                            {editingTask.task.files?.map((file) => (
                                <div key={file.id} className="flex justify-between items-center bg-slate-900 border border-slate-800 p-2 rounded group">
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 overflow-hidden">
                                        <FileText size={14} className="text-kiriko-teal flex-shrink-0" /><span className="text-xs text-slate-300 truncate hover:text-white hover:underline">{file.name}</span>
                                    </a>
                                    <button type="button" onClick={() => handleRemoveFile(file.id)} className="text-slate-600 hover:text-red-500"><X size={12}/></button>
                                </div>
                            ))}
                        </div>
                   </div>

                   <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-4">
                        <button type="button" onClick={handleDeleteDeal} className="p-2 text-red-500 hover:bg-red-900/20 rounded transition-colors"><Trash2 size={18} /></button>
                        <div className="flex gap-2">
                             <button type="button" onClick={() => setEditingTask(null)} className="px-4 py-2 text-slate-400 text-sm">Cancelar</button>
                             <button type="submit" className="px-4 py-2 bg-kiriko-teal text-black font-bold rounded text-sm hover:bg-teal-400">Guardar</button>
                        </div>
                   </div>
               </form>
            </div>
        </div>
      )}
    </>
  );
}