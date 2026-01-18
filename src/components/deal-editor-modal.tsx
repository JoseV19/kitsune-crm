'use client';
import { useState, useEffect } from 'react';
import { useOrganizationId } from '@/lib/contexts/organization-context';
import { useDatabaseService } from '@/lib/services/supabase/database.service';
import { X, Plus, Trash2, Search, Calculator, Save, Package } from 'lucide-react';
import { Deal, Product, DealItem } from '@/types/crm';

interface DealEditorModalProps {
  deal: Deal;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; 
}

export default function DealEditorModal({ deal, isOpen, onClose, onUpdate }: DealEditorModalProps) {
  const organizationId = useOrganizationId();
  const db = useDatabaseService();
  const [items, setItems] = useState<DealItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (organizationId) {
      db.setOrganizationId(organizationId);
    }
  }, [organizationId, db]);

  useEffect(() => {
    if (isOpen && deal) {
      fetchItems();
      fetchProducts();
    }
  }, [isOpen, deal]);

  const fetchItems = async () => {
    if (!organizationId) return;
    try {
      db.setOrganizationId(organizationId);
      const data = await db.getDealItems(deal.id);
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems([]);
    }
  };

  const fetchProducts = async () => {
    if (!organizationId) return;
    try {
      db.setOrganizationId(organizationId);
      const data = await db.getProducts();
      setProducts(data.slice(0, 50)); // Limit to 50
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const handleAddItem = async (product: Product) => {
    if (!organizationId) return;
    const exists = items.find(i => i.product_id === product.id);
    if (exists) {
      alert("Este producto ya está en la lista.");
      return;
    }

    try {
      db.setOrganizationId(organizationId);
      const newItem = {
        deal_id: deal.id,
        product_id: product.id,
        quantity: 1,
        unit_price: product.unit_price,
      };

      const data = await db.createDealItem(newItem);
      const updatedItems = [...items, data];
      setItems(updatedItems);
      updateDealTotal(updatedItems);
      setIsSearching(false);
    } catch (error: any) {
      alert("Error al agregar: " + (error.message || "Ocurrió un problema"));
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1 || !organizationId) return;
    
    try {
      // Optimistic UI update
      const updatedItems = items.map(i => 
        i.id === itemId 
          ? { ...i, quantity: newQty, total_price: newQty * i.unit_price } 
          : i
      );
      setItems(updatedItems);

      db.setOrganizationId(organizationId);
      await db.updateDealItem(itemId, { 
        quantity: newQty,
        unit_price: updatedItems.find(i => i.id === itemId)!.unit_price
      });
      updateDealTotal(updatedItems);
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Revert optimistic update
      fetchItems();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!organizationId) return;
    try {
      const updatedItems = items.filter(i => i.id !== itemId);
      setItems(updatedItems);
      db.setOrganizationId(organizationId);
      await db.deleteDealItem(itemId);
      updateDealTotal(updatedItems);
    } catch (error) {
      console.error('Error deleting item:', error);
      // Revert optimistic update
      fetchItems();
    }
  };

  const updateDealTotal = async (currentItems: DealItem[]) => {
    if (!organizationId) return;
    try {
      db.setOrganizationId(organizationId);
      const total = currentItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      await db.updateDeal(deal.id, { value: total });
    } catch (error) {
      console.error('Error updating deal total:', error);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grandTotal = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calculator className="text-kiriko-teal" size={20}/> Cotizador
              </h2>
              <p className="text-xs text-slate-400">Editando: {deal.title}</p>
          </div>
          <button onClick={() => { onUpdate(); onClose(); }}><X size={24} className="text-slate-400 hover:text-white"/></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            
            <div className="space-y-3 mb-8">
                {items.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
                        <p className="text-slate-500 text-sm">No hay productos en esta oportunidad.</p>
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                            <div className="p-2 bg-slate-800 rounded-lg text-kiriko-teal"><Package size={16}/></div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white">{(item as any).product?.name || 'Producto'}</p>
                                <p className="text-xs text-slate-500 font-mono">PU: Q{item.unit_price.toLocaleString()}</p>
                            </div>
                            
                            {/* Control Cantidad */}
                            <div className="flex items-center bg-slate-950 rounded border border-slate-800">
                                <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} className="px-2 py-1 text-slate-400 hover:text-white">-</button>
                                <span className="w-8 text-center text-sm font-mono text-white">{item.quantity}</span>
                                <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} className="px-2 py-1 text-slate-400 hover:text-white">+</button>
                            </div>

                            <div className="text-right w-24">
                                <p className="text-sm font-bold text-kiriko-teal font-mono">Q{(item.quantity * item.unit_price).toLocaleString()}</p>
                            </div>

                            <button onClick={() => handleDeleteItem(item.id)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
                        </div>
                    ))
                )}
            </div>

            {/* Botón agregar producto */}
            {!isSearching ? (
                <button onClick={() => setIsSearching(true)} className="w-full py-3 border border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-kiriko-teal transition-all flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide">
                    <Plus size={16}/> Agregar Producto del Catálogo
                </button>
            ) : (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 border-b border-slate-700 pb-2 mb-2">
                        <Search size={16} className="text-slate-500"/>
                        <input 
                            autoFocus
                            placeholder="Buscar O-Rings, Intercambiadores..." 
                            className="bg-transparent w-full outline-none text-sm text-white placeholder:text-slate-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button onClick={() => setIsSearching(false)} className="text-xs text-slate-500 hover:text-white">Cancelar</button>
                    </div>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                        {filteredProducts.map(prod => (
                            <div key={prod.id} onClick={() => handleAddItem(prod)} className="flex justify-between items-center p-2 hover:bg-slate-800 rounded cursor-pointer group">
                                <span className="text-sm text-slate-300 group-hover:text-white">{prod.name}</span>
                                <span className="text-xs font-mono text-kiriko-teal">Q{prod.unit_price}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>

        {/* Footer Totales */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex justify-between items-center shrink-0">
            <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Total Estimado</p>
                <p className="text-2xl font-bold text-white font-mono tracking-tight text-shadow-neon">Q{grandTotal.toLocaleString()}</p>
            </div>
            <button onClick={() => { onUpdate(); onClose(); }} className="bg-kiriko-teal text-black px-6 py-3 rounded-xl font-bold hover:bg-teal-400 transition-all shadow-[0_0_20px_rgba(45,212,191,0.2)] flex items-center gap-2">
                <Save size={18}/> Guardar y Cerrar
            </button>
        </div>
      </div>
    </div>
  );
}