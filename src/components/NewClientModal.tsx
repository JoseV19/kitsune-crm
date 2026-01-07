'use client';

import { X, Save } from 'lucide-react';
import { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, amount: string, tag: string) => void;
}

export function NewClientModal({ isOpen, onClose, onSave }: ModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [tag, setTag] = useState('SaaS');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validamos que tenga nombre y precio
    if (!name || !amount) return; 
    
    // Formateamos el precio si el usuario no puso el signo $
    const formattedAmount = amount.includes('$') ? amount : `$${amount}`;
    
    onSave(name, formattedAmount, tag);
    
    // Limpiamos el formulario
    setName('');
    setAmount('');
    onClose();
  };

  return (
    // Overlay oscuro (Fondo)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      {/* La Ventana del Modal */}
      <div className="w-full max-w-md bg-kiriko-900 border border-kiriko-teal rounded-sm shadow-[0_0_30px_rgba(45,212,191,0.2)] relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h2 className="text-white font-bold tracking-widest uppercase flex items-center gap-2">
            <span className="w-1 h-4 bg-kiriko-teal inline-block"></span>
            Nuevo Contrato
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          
          {/* Nombre del Cliente */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Cliente / Empresa</label>
            <input 
              type="text" 
              autoFocus
              placeholder="Ej. Arasaka Corp"
              className="w-full bg-kiriko-800 text-white border border-slate-700 focus:border-kiriko-teal focus:outline-none p-2 rounded-sm text-sm transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            {/* Monto ($) */}
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Valor Estimado</label>
              <input 
                type="text" 
                placeholder="$5,000"
                className="w-full bg-kiriko-800 text-white border border-slate-700 focus:border-kiriko-teal focus:outline-none p-2 rounded-sm text-sm transition-colors font-mono"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Etiqueta (Tag) */}
            <div className="w-1/3">
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Tipo</label>
              <select 
                className="w-full bg-kiriko-800 text-white border border-slate-700 focus:border-kiriko-teal focus:outline-none p-2 rounded-sm text-sm"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              >
                <option value="SaaS">SaaS</option>
                <option value="Web">Web</option>
                <option value="App">App</option>
                <option value="SEO">SEO</option>
              </select>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3 mt-4">
             <button 
               type="button" 
               onClick={onClose}
               className="flex-1 py-2 text-sm text-slate-400 hover:text-white transition-colors"
             >
               Cancelar
             </button>
             <button 
               type="submit"
               className="flex-1 bg-kiriko-teal hover:bg-teal-400 text-black font-bold py-2 text-sm rounded-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_10px_rgba(45,212,191,0.4)] hover:shadow-[0_0_20px_rgba(45,212,191,0.6)]"
             >
               <Save size={16} />
               Guardar Misión
             </button>
          </div>

        </form>
      </div>
    </div>
  );
}