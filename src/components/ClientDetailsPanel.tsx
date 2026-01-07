'use client';

import { X, FileText, Send, Trash2, Download, UploadCloud, Pencil, Save, RotateCcw } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// Tipos
interface Client {
  id: string;
  title: string;
  tag: string;
  amount: string;
  status: 'leads' | 'negotiation' | 'won'; 
}
interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onDelete: (id: string) => void;      // <--- NUEVA PROP
  onUpdate: (updatedClient: Client) => void; // <--- NUEVA PROP
}

type FileItem = {
  name: string;
  size: string;
  date: string;
  status: 'completed' | 'uploading';
};

export function ClientDetailsPanel({ isOpen, onClose, client, onDelete, onUpdate }: PanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // --- ESTADOS DE EDICIÓN ---
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editTag, setEditTag] = useState('');

  // Sincronizar estados cuando cambia el cliente
  useEffect(() => {
    if (isOpen && client) {
        setIsUploading(false);
        setProgress(0);
        setIsEditing(false); // Reseteamos modo edición
        
        // Cargar datos para editar
        setEditName(client.title);
        setEditAmount(client.amount);
        setEditTag(client.tag);

        // Cargar archivos persistentes
        const storageKey = `kitsune_files_${client.id}`;
        const savedFiles = localStorage.getItem(storageKey);
        
        if (savedFiles) {
            setFiles(JSON.parse(savedFiles));
        } else {
            setFiles([
                { name: 'Contrato_Base.pdf', size: '1.2 MB', date: 'Generado Auto', status: 'completed' }
            ]);
        }
    }
  }, [isOpen, client]);

  // Guardar archivos
  useEffect(() => {
    if (client && files.length > 0) {
        const storageKey = `kitsune_files_${client.id}`;
        localStorage.setItem(storageKey, JSON.stringify(files));
    }
  }, [files, client]);

  // --- HANDLERS ---

  const handleSaveEdit = () => {
    if (!client) return;
    
    onUpdate({
        ...client,
        title: editName,
        amount: editAmount,
        tag: editTag
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!client) return;
    if (confirm('¿Estás seguro de eliminar esta misión? Esta acción no se puede deshacer.')) {
        onDelete(client.id);
        onClose();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress(0);

    const interval = setInterval(() => {
        setProgress((prev) => {
            if (prev >= 100) {
                clearInterval(interval);
                const newFile: FileItem = {
                    name: file.name,
                    size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                    date: 'Ahora',
                    status: 'completed'
                };
                setFiles(prevFiles => [...prevFiles, newFile]);
                setIsUploading(false);
                return 100;
            }
            return prev + 15;
        });
    }, 100);
  };

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* PANEL */}
      <div className="relative w-full max-w-md h-full bg-kiriko-900/95 border-l border-kiriko-teal shadow-[-20px_0_50px_rgba(45,212,191,0.15)] flex flex-col animate-in slide-in-from-right duration-300">
        
        <div className="h-1 w-full bg-gradient-to-r from-kiriko-teal via-blue-500 to-kiriko-red shadow-[0_0_10px_#2dd4bf]" />

        {/* HEADER */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
          <div className="flex-1 mr-4">
            <span className="text-[10px] font-mono text-kiriko-teal mb-1 block tracking-widest">
                ID: {client.id.toUpperCase()} // CLASSIFIED
            </span>
            
            {/* TÍTULO EDITABLE */}
            {isEditing ? (
                <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-800 border border-kiriko-teal text-white text-xl font-bold p-1 rounded focus:outline-none mb-2"
                    autoFocus
                />
            ) : (
                <h2 className="text-2xl font-bold text-white tracking-wide uppercase font-sans truncate">{client.title}</h2>
            )}

            <div className="flex gap-2 mt-2 items-center">
              {isEditing ? (
                 <select 
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    className="bg-slate-800 border border-slate-600 text-xs text-white rounded p-1"
                 >
                    <option>SaaS</option>
                    <option>Web</option>
                    <option>Branding</option>
                    <option>App</option>
                    <option>SEO</option>
                 </select>
              ) : (
                 <span className="px-2 py-0.5 rounded text-[10px] border border-slate-600 text-slate-400 bg-slate-800">
                    {client.tag}
                 </span>
              )}

              <span className="px-2 py-0.5 rounded text-[10px] border border-kiriko-teal/30 text-kiriko-teal bg-kiriko-teal/10">
                {client.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Botón Editar/Guardar */}
            <button 
                onClick={isEditing ? handleSaveEdit : () => setIsEditing(true)}
                className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-kiriko-teal text-black hover:bg-teal-400' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                title={isEditing ? "Guardar Cambios" : "Editar Cliente"}
            >
                {isEditing ? <Save size={18} /> : <Pencil size={18} />}
            </button>
            
            {/* Botón Cancelar/Cerrar */}
            <button 
                onClick={() => isEditing ? setIsEditing(false) : onClose()} 
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                title={isEditing ? "Cancelar Edición" : "Cerrar Panel"}
            >
                {isEditing ? <RotateCcw size={18} /> : <X size={24} />}
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Valor del Contrato (Editable) */}
          <div className="bg-slate-800/40 p-5 rounded-sm border border-slate-700/50 flex justify-between items-center relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-20 h-20 bg-kiriko-teal/5 rounded-full blur-2xl group-hover:bg-kiriko-teal/10 transition-colors"></div>
             <div className="flex-1">
               <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Valor Total</p>
               
               {isEditing ? (
                   <input 
                        type="text" 
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="bg-slate-900 border-b border-kiriko-teal text-white text-2xl font-mono font-bold w-full focus:outline-none"
                   />
               ) : (
                   <p className="text-3xl font-bold text-white font-mono tracking-tighter">{client.amount}</p>
               )}
               
             </div>
             <div className="h-12 w-12 rounded-full bg-gradient-to-br from-kiriko-teal/20 to-transparent border border-kiriko-teal/30 flex items-center justify-center text-kiriko-teal shadow-[0_0_15px_rgba(45,212,191,0.2)]">
               $
             </div>
          </div>

          {/* Archivos (R2) */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText size={14} className="text-kiriko-teal" /> 
              Archivos del Pergamino
            </h3>
            
            <div className="space-y-3">
              {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-900/80 border border-slate-800 rounded-sm hover:border-kiriko-teal/50 transition-all group cursor-pointer hover:shadow-[0_0_10px_rgba(45,212,191,0.1)]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 rounded-sm text-slate-400 group-hover:text-kiriko-teal transition-colors">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{file.name}</p>
                        <p className="text-[10px] text-slate-500">{file.size} • {file.date}</p>
                      </div>
                    </div>
                    <Download size={16} className="text-slate-600 group-hover:text-kiriko-teal transition-colors" />
                  </div>
              ))}

              {isUploading && (
                  <div className="bg-slate-900 p-3 rounded-sm border border-slate-700">
                      <div className="flex justify-between text-xs text-slate-400 mb-2">
                          <span className="animate-pulse">Encriptando y Subiendo...</span>
                          <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-kiriko-teal shadow-[0_0_10px_#2dd4bf] transition-all duration-100 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                      </div>
                  </div>
              )}

              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-6 border border-dashed border-slate-700 rounded-sm text-slate-500 hover:text-kiriko-teal hover:border-kiriko-teal hover:bg-kiriko-teal/5 transition-all text-sm flex flex-col items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 <div className="p-3 bg-slate-800 rounded-full group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud size={20} className="group-hover:text-kiriko-teal transition-colors" />
                 </div>
                 <div className="flex flex-col items-center">
                    <span className="font-bold tracking-wide group-hover:text-white transition-colors">SUBIR DOCUMENTO</span>
                    <span className="text-[10px] opacity-60">Formatos: PDF, JPG, PNG (Max 50MB)</span>
                 </div>
              </button>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/80 backdrop-blur flex gap-3">
          <button className="flex-1 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 hover:border-green-500/50 py-3 rounded-sm text-sm font-bold flex items-center justify-center gap-2 transition-all">
            <Send size={16} /> Contactar Cliente
          </button>
          
          {/* BOTÓN ELIMINAR REAL */}
          <button 
            onClick={handleDelete}
            className="px-4 border border-slate-700 bg-slate-800/50 text-slate-400 hover:text-red-400 hover:border-red-400/50 hover:bg-red-400/10 rounded-sm transition-all"
            title="Eliminar Misión"
          >
            <Trash2 size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}