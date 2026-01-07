'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/SupabaseClient'; 
import { Plus, Trash2, Edit, X, Save, DollarSign, Building, Tag, Paperclip, FileText, Image as ImageIcon, UploadCloud, Calendar, AlignLeft, Flag, Loader2 } from 'lucide-react';

// --- TIPOS DE DATOS ---
type Priority = 'Low' | 'Medium' | 'High';

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
  date: string;
}

interface Task {
  id: string;
  title: string;
  company: string;
  value: number;
  tags: string[];
  priority: Priority;
  description: string;
  dueDate: string;
  files: Attachment[];
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'prospectos', title: 'PROSPECTOS', color: 'bg-emerald-400', tasks: [] },
  { id: 'negociacion', title: 'NEGOCIACIÓN', color: 'bg-blue-400', tasks: [] },
  { id: 'ganados', title: 'GANADOS', color: 'bg-red-400', tasks: [] }
];

interface KanbanBoardProps {
    currentUser: string; 
}

export default function KanbanBoard({ currentUser }: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [editingTask, setEditingTask] = useState<{ colId: string, task: Task } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. CARGAR DATOS (CON MIGRACIÓN DE SEGURIDAD) ---
  useEffect(() => {
    const fetchBoard = async () => {
        const { data, error } = await supabase
            .from('boards')
            .select('data')
            .eq('user_id', currentUser)
            .single();

        if (data && data.data) {
            // MIGRACIÓN: Aseguramos que 'files' nunca sea undefined
            const sanitizedData = (data.data as Column[]).map(col => ({
                ...col,
                tasks: col.tasks.map(task => ({
                    ...task,
                    files: task.files || [] // <--- ESTO EVITA EL ERROR AL CARGAR
                }))
            }));
            setColumns(sanitizedData);
        } else {
            setColumns(DEFAULT_COLUMNS);
        }
        setIsLoaded(true);
    };

    fetchBoard();
  }, [currentUser]);

  // --- 2. AUTO-GUARDADO ---
  useEffect(() => {
    if (!isLoaded) return;

    const saveBoard = async () => {
        setIsSaving(true);
        const { error } = await supabase
            .from('boards')
            .upsert({ user_id: currentUser, data: columns }, { onConflict: 'user_id' });
        
        if (error) console.error('Error guardando:', error);
        setTimeout(() => setIsSaving(false), 500);
    };

    const timeout = setTimeout(saveBoard, 1000);
    return () => clearTimeout(timeout);

  }, [columns, isLoaded, currentUser]);

  // --- LOGICA DRAG & DROP ---
  const handleDragStart = (e: React.DragEvent, taskId: string, sourceColId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('sourceColId', sourceColId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const sourceColId = e.dataTransfer.getData('sourceColId');
    if (!taskId || !sourceColId || sourceColId === targetColId) return;

    const sourceCol = columns.find(c => c.id === sourceColId);
    const targetCol = columns.find(c => c.id === targetColId);
    const task = sourceCol?.tasks.find(t => t.id === taskId);

    if (sourceCol && targetCol && task) {
      const newColumns = columns.map(col => {
        if (col.id === sourceColId) return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) };
        if (col.id === targetColId) return { ...col, tasks: [...col.tasks, task] };
        return col;
      });
      setColumns(newColumns);
    }
  };

  const addTask = (colId: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: "Nueva Misión",
      company: "",
      value: 0,
      tags: ['Web'], 
      priority: 'Medium',
      description: "",
      dueDate: "",
      files: [] // <--- Inicializamos siempre como array vacío
    };
    const newColumns = columns.map(col => col.id === colId ? { ...col, tasks: [...col.tasks, newTask] } : col);
    setColumns(newColumns);
    setEditingTask({ colId, task: newTask });
  };

  const deleteTask = (colId: string, taskId: string) => {
      if(!confirm("¿Eliminar misión?")) return;
      setColumns(columns.map(col => col.id === colId ? { ...col, tasks: col.tasks.filter(t => t.id !== taskId) } : col));
      if (editingTask?.task.id === taskId) setEditingTask(null);
  };

  const saveTaskLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setColumns(columns.map(col => col.id === editingTask.colId ? { ...col, tasks: col.tasks.map(t => t.id === editingTask.task.id ? editingTask.task : t) } : col));
    setEditingTask(null);
  };

  // --- 3. SUBIDA DE ARCHIVOS (CORREGIDO) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || !editingTask) return;

      setIsUploading(true);
      const newAttachments: Attachment[] = [];

      for (const file of Array.from(files)) {
          const fileName = `${currentUser}/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
          
          const { data, error } = await supabase.storage
              .from('attachments')
              .upload(fileName, file);

          if (error) {
              console.error('Error subiendo archivo:', error);
              alert('Error al subir archivo a la nube');
              continue;
          }

          const { data: { publicUrl } } = supabase.storage
              .from('attachments')
              .getPublicUrl(fileName);

          newAttachments.push({
              id: fileName,
              name: file.name,
              size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
              type: file.type.split('/')[1] || 'unknown',
              url: publicUrl,
              date: new Date().toLocaleDateString()
          });
      }

      // --- AQUÍ ESTÁ EL FIX ---
      // Usamos (editingTask.task.files || []) para evitar el error "not iterable"
      const currentFiles = editingTask.task.files || [];
      
      setEditingTask({
          ...editingTask,
          task: { 
              ...editingTask.task, 
              files: [...currentFiles, ...newAttachments] 
          }
      });
      setIsUploading(false);
  };

  const removeFile = (fileId: string) => {
      if (!editingTask) return;
      const currentFiles = editingTask.task.files || [];
      setEditingTask({
          ...editingTask,
          task: { ...editingTask.task, files: currentFiles.filter(f => f.id !== fileId) }
      });
  };

  const getPriorityColor = (p: Priority) => {
      switch(p) {
          case 'High': return 'text-red-500';
          case 'Medium': return 'text-yellow-500';
          case 'Low': return 'text-slate-500';
          default: return 'text-slate-500';
      }
  };

  if (!isLoaded) return <div className="text-kiriko-teal animate-pulse">Sincronizando con Zionak Cloud...</div>;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
          {isSaving ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-kiriko-teal/30 px-3 py-1 rounded-full text-[10px] text-kiriko-teal animate-pulse">
                  <Loader2 size={10} className="animate-spin" /> Guardando en Nube...
              </div>
          ) : (
             <div className="text-[10px] text-slate-600 opacity-50">Sincronizado</div>
          )}
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-320px)] items-start">
        {columns.map((col) => (
          <div key={col.id} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)} className="min-w-[350px] bg-transparent border border-slate-800/50 rounded-xl flex flex-col h-full hover:bg-white/5 transition-colors">
            <div className="flex justify-between items-center mb-4 p-4 pb-0">
              <div className="flex items-center gap-3">
                 <div className={`w-2.5 h-2.5 rounded-full ${col.color} shadow-[0_0_8px_currentColor]`}></div>
                 <h3 className="font-bold text-xs tracking-widest text-white uppercase">{col.title}</h3>
              </div>
              <span className="text-xs text-slate-600 font-mono bg-slate-900 px-2 py-1 rounded-full">{col.tasks.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-none">
               {col.tasks.map((task) => (
                 <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id, col.id)} onClick={() => setEditingTask({ colId: col.id, task: { ...task, files: task.files || [] } })} className="group bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-kiriko-teal/50 p-5 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 relative shadow-lg">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-kiriko-teal opacity-0 group-hover:opacity-100 rounded-l-xl transition-opacity"></div>
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-white text-sm group-hover:text-kiriko-teal transition-colors tracking-wide truncate pr-2">{task.title}</h4>
                        <div className={`${getPriorityColor(task.priority)} opacity-80`}><Flag size={10} fill="currentColor" /></div>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 font-medium flex items-center gap-2"><Building size={10} />{task.company}</p>
                    <div className="flex gap-3 mb-3">
                        {task.files && task.files.length > 0 && <div className="flex items-center gap-1 text-[10px] text-kiriko-teal/80"><Paperclip size={10} /> {task.files.length}</div>}
                        {task.dueDate && <div className="flex items-center gap-1 text-[10px] text-slate-400"><Calendar size={10} /> {new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>}
                    </div>
                    <div className="flex justify-between items-end border-t border-slate-800/50 pt-3">
                        <div className="flex gap-2">{task.tags.slice(0, 3).map(tag => (<span key={tag} className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-400 font-mono uppercase tracking-wider">{tag}</span>))}</div>
                        <div className="font-bold text-white text-sm font-mono tracking-tight flex items-center gap-1"><span className="text-kiriko-teal">$</span>{task.value.toLocaleString()}</div>
                    </div>
                 </div>
               ))}
               <button onClick={() => addTask(col.id)} className="w-full py-3 mt-2 border border-dashed border-slate-800 text-slate-600 rounded-lg hover:border-kiriko-teal/30 hover:text-kiriko-teal hover:bg-kiriko-teal/5 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 opacity-60 hover:opacity-100"><Plus size={14} /> Nueva Misión</button>
            </div>
          </div>
        ))}
      </div>

      {editingTask && (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setEditingTask(null)}></div>
            <div className="relative w-full max-w-lg h-full bg-black border-l border-kiriko-teal/30 shadow-[-20px_0_50px_rgba(45,212,191,0.1)] animate-in slide-in-from-right duration-300 flex flex-col">
               <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-kiriko-teal to-transparent"></div>
               <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/30">
                   <div>
                       <h2 className="text-kiriko-teal font-bold uppercase tracking-[0.2em] text-sm mb-1 flex items-center gap-2"><Edit size={14} /> Misión Control</h2>
                       <p className="text-[10px] text-slate-500 font-mono">ID: {editingTask.task.id}</p>
                   </div>
                   <button onClick={() => setEditingTask(null)} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"><X size={24} /></button>
               </div>

               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                   <form onSubmit={saveTaskLocal} className="space-y-8">
                       <div className="group">
                           <label className="block text-[10px] text-kiriko-teal/70 uppercase tracking-widest mb-2 font-bold">Objetivo</label>
                           <input type="text" value={editingTask.task.title} onChange={(e) => setEditingTask({...editingTask, task: { ...editingTask.task, title: e.target.value }})} className="w-full bg-transparent border-b border-slate-700 text-white text-xl font-bold py-2 focus:border-kiriko-teal outline-none transition-all" />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-6">
                           <div><label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold flex items-center gap-2"><Building size={12} /> Cliente</label><input type="text" value={editingTask.task.company} onChange={(e) => setEditingTask({...editingTask, task: { ...editingTask.task, company: e.target.value }})} className="w-full bg-slate-900/50 border border-slate-800 text-slate-300 p-3 rounded-lg focus:border-kiriko-teal/50 outline-none transition-all text-sm" /></div>
                           <div><label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold flex items-center gap-2"><DollarSign size={12} /> Valor</label><div className="relative"><span className="absolute left-3 top-3 text-kiriko-teal font-bold">$</span><input type="number" value={editingTask.task.value} onChange={(e) => setEditingTask({...editingTask, task: { ...editingTask.task, value: Number(e.target.value) }})} className="w-full bg-slate-900/50 border border-slate-800 text-white p-3 pl-6 rounded-lg focus:border-kiriko-teal/50 outline-none transition-all font-mono text-sm" /></div></div>
                       </div>

                       <div className="grid grid-cols-2 gap-6">
                           <div><label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold flex items-center gap-2"><Calendar size={12} /> Fecha Límite</label><input type="date" value={editingTask.task.dueDate} onChange={(e) => setEditingTask({...editingTask, task: { ...editingTask.task, dueDate: e.target.value }})} className="w-full bg-slate-900/50 border border-slate-800 text-slate-300 p-3 rounded-lg focus:border-kiriko-teal/50 outline-none transition-all text-sm [color-scheme:dark]" /></div>
                           <div><label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold flex items-center gap-2"><Flag size={12} /> Prioridad</label><select value={editingTask.task.priority} onChange={(e) => setEditingTask({...editingTask, task: { ...editingTask.task, priority: e.target.value as Priority }})} className="w-full bg-slate-900/50 border border-slate-800 text-slate-300 p-3 rounded-lg focus:border-kiriko-teal/50 outline-none transition-all text-sm appearance-none cursor-pointer"><option value="Low">Baja (Low)</option><option value="Medium">Media (Normal)</option><option value="High">Alta (Urgent)</option></select></div>
                       </div>

                       <div><label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold flex items-center gap-2"><AlignLeft size={12} /> Bitácora</label><textarea rows={4} value={editingTask.task.description} onChange={(e) => setEditingTask({...editingTask, task: { ...editingTask.task, description: e.target.value }})} className="w-full bg-slate-900/50 border border-slate-800 text-slate-300 p-4 rounded-lg focus:border-kiriko-teal/50 outline-none transition-all text-sm leading-relaxed" placeholder="Notas..."></textarea></div>

                       <div className="pt-4 border-t border-slate-800">
                           <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-bold flex items-center gap-2"><Paperclip size={12} /> Archivos (Nube)</label>
                           {(editingTask.task.files || []).length > 0 && (
                               <div className="space-y-2 mb-4">
                                   {(editingTask.task.files || []).map(file => (
                                       <div key={file.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-lg group hover:border-kiriko-teal/30 transition-all">
                                           <div className="flex items-center gap-3">
                                               <div className="p-2 bg-slate-800 rounded text-kiriko-teal">{['jpg','png','jpeg'].includes(file.type) ? <ImageIcon size={16} /> : <FileText size={16} />}</div>
                                               <div>
                                                   <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-white font-medium truncate max-w-[150px] hover:text-kiriko-teal hover:underline">{file.name}</a>
                                                   <p className="text-[10px] text-slate-500">{file.size} • {file.date}</p>
                                               </div>
                                           </div>
                                           <button type="button" onClick={() => removeFile(file.id)} className="text-slate-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                       </div>
                                   ))}
                               </div>
                           )}
                           <div className={`border-2 border-dashed border-slate-800 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 transition-all cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-kiriko-teal/50 hover:bg-kiriko-teal/5 hover:text-kiriko-teal'}`} onClick={() => !isUploading && fileInputRef.current?.click()}>
                               {isUploading ? <Loader2 size={24} className="animate-spin mb-2" /> : <UploadCloud size={24} className="mb-2" />}
                               <p className="text-xs font-bold uppercase tracking-wider">{isUploading ? 'Subiendo a la nube...' : 'Subir Archivos'}</p>
                               <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} disabled={isUploading} />
                           </div>
                       </div>
                   </form>
               </div>

               <div className="p-6 border-t border-slate-800 bg-slate-900/30 flex gap-4">
                   <button type="button" onClick={() => deleteTask(editingTask.colId, editingTask.task.id)} className="px-4 py-3 border border-red-900/30 text-red-500 hover:bg-red-900/10 hover:border-red-500/50 rounded-lg transition-all"><Trash2 size={18} /></button>
                   <button onClick={saveTaskLocal} className="flex-1 bg-kiriko-teal hover:bg-teal-400 text-black font-bold py-3 rounded-lg shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"><Save size={16} /> Guardar Cambios</button>
               </div>
            </div>
        </div>
      )}
    </>
  );
}