'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useOrganization, useOrganizationId } from '@/lib/contexts/organization-context';
import { useDatabaseService } from '@/lib/services/supabase/database.service';
import { useStorageService } from '@/lib/services/supabase/storage.service';
import { Product } from '@/types/crm';
import { 
  Search, Plus, Package, Edit2, Trash2, X, 
  Image as ImageIcon, Loader2, DollarSign, Barcode 
} from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const params = useParams();
  const domain = params.domain as string;
  const { organization } = useOrganization();
  const organizationId = useOrganizationId();
  const db = useDatabaseService();
  const storage = useStorageService();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    db.setOrganizationId(organizationId);
    storage.setOrganizationId(organizationId);
  }, [organizationId, db, storage]);

  useEffect(() => {
    if (organizationId) {
      fetchProducts();
    }
  }, [organizationId]);

  const fetchProducts = async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      db.setOrganizationId(organizationId);
      const data = await db.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      alert('Error al guardar: Organización no seleccionada.');
      return;
    }

    setIsSaving(true);

    try {
      db.setOrganizationId(organizationId);
      storage.setOrganizationId(organizationId);

      let finalImageUrl = currentProduct.image_url;

      if (imageFile && currentProduct.id) {
        finalImageUrl = await storage.uploadProductImage(imageFile, currentProduct.id);
      } else if (imageFile) {
        const tempId = `temp-${Date.now()}`;
        finalImageUrl = await storage.uploadProductImage(imageFile, tempId);
      }

      const productData: Omit<Product, 'id' | 'created_at' | 'organization_id'> = {
        name: currentProduct.name!,
        description: currentProduct.description || null,
        sku: currentProduct.sku || null,
        unit_price: currentProduct.unit_price!,
        image_url: finalImageUrl || null,
      };

      if (currentProduct.id) {
        await db.updateProduct(currentProduct.id, productData);
        if (imageFile && finalImageUrl?.includes('temp-')) {
          const realImageUrl = await storage.uploadProductImage(imageFile, currentProduct.id);
          await db.updateProduct(currentProduct.id, { image_url: realImageUrl });
        }
      } else {
        const newProduct = await db.createProduct(productData);
        if (imageFile && finalImageUrl?.includes('temp-')) {
          const realImageUrl = await storage.uploadProductImage(imageFile, newProduct.id);
          await db.updateProduct(newProduct.id, { image_url: realImageUrl });
        }
      }

      setIsModalOpen(false);
      setImageFile(null);
      setCurrentProduct({});
      fetchProducts();

    } catch (error: any) {
      alert('Error al guardar: ' + (error.message || 'Ocurrió un problema'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto del catálogo?') || !organizationId) return;
    try {
      db.setOrganizationId(organizationId);
      await db.deleteProduct(id);
      fetchProducts();
    } catch (error: any) {
      alert('Error al eliminar: ' + (error.message || 'Ocurrió un problema'));
    }
  };

  const openEdit = (prod: Product) => {
    setCurrentProduct(prod);
    setIsModalOpen(true);
  };

  const openNew = () => {
    setCurrentProduct({ unit_price: 0 });
    setImageFile(null);
    setIsModalOpen(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans p-8">
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="text-kiriko-teal" size={32} />{' '}
            {`Catálogo ${organization?.name ?? 'tu empresa'}`}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gestiona tus productos y servicios</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar producto o SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-kiriko-teal outline-none transition-colors"
            />
          </div>
          <button onClick={openNew} className="bg-kiriko-teal text-black font-bold px-4 py-2 rounded-lg hover:bg-teal-400 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(45,212,191,0.3)]">
            <Plus size={18} /> Nuevo Producto
          </button>
          <Link href={`/${domain}/dashboard`} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700">Volver</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-20 text-slate-500">
             <Loader2 size={40} className="animate-spin mx-auto mb-4"/> Cargando inventario...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
             <Package size={48} className="mx-auto text-slate-600 mb-4"/>
             <p className="text-slate-400">No hay productos que coincidan.</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-kiriko-teal/50 transition-all hover:shadow-[0_0_20px_rgba(45,212,191,0.1)] flex flex-col">
              <div className="h-48 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                ) : (
                  <ImageIcon size={40} className="text-slate-700" />
                )}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(product)} className="p-2 bg-slate-900/80 backdrop-blur text-white rounded-full hover:bg-kiriko-teal hover:text-black transition-colors"><Edit2 size={14}/></button>
                  <button onClick={() => handleDelete(product.id)} className="p-2 bg-slate-900/80 backdrop-blur text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white leading-tight">{product.name}</h3>
                  {product.sku && <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{product.sku}</span>}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 flex-1">{product.description || 'Sin descripción'}</p>
                
                <div className="pt-3 border-t border-slate-800 flex justify-between items-center mt-auto">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Precio Unitario</span>
                  <span className="text-lg font-mono font-bold text-kiriko-teal">Q{product.unit_price.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {currentProduct.id ? <Edit2 size={18}/> : <Plus size={18}/>} 
                {currentProduct.id ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-white"/></button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre del Producto</label>
                <input 
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-kiriko-teal outline-none"
                  placeholder="Ej: O-Ring EPDM"
                  value={currentProduct.name || ''}
                  onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><DollarSign size={12}/> Precio (Q)</label>
                  <input 
                    type="number" step="0.01" required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-kiriko-teal outline-none font-mono"
                    placeholder="0.00"
                    value={currentProduct.unit_price || ''}
                    onChange={e => setCurrentProduct({...currentProduct, unit_price: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Barcode size={12}/> SKU / Código</label>
                  <input 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-kiriko-teal outline-none font-mono"
                    placeholder="Ej: MK15-001"
                    value={currentProduct.sku || ''}
                    onChange={e => setCurrentProduct({...currentProduct, sku: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descripción</label>
                <textarea 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-kiriko-teal outline-none h-24 resize-none"
                  placeholder="Detalles técnicos..."
                  value={currentProduct.description || ''}
                  onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><ImageIcon size={12}/> Imagen</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setImageFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-kiriko-teal hover:file:bg-slate-700 cursor-pointer"
                />
                {currentProduct.image_url && !imageFile && (
                  <p className="text-[10px] text-green-500 mt-1">✓ Imagen actual cargada</p>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-lg hover:bg-slate-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-kiriko-teal text-black font-bold rounded-lg hover:bg-teal-400 transition-colors flex justify-center items-center gap-2">
                  {isSaving ? <Loader2 size={18} className="animate-spin"/> : <SaveIconCustom />} Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const SaveIconCustom = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
);
