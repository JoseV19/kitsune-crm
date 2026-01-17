import { useState, useEffect } from "react";
import { useOrganizationId } from "@/lib/contexts/organization-context";
import { useDatabaseService } from "@/lib/services/supabase/database.service";
import { useStorageService } from "@/lib/services/supabase/storage.service";
import {
  X,
  Save,
  Loader2,
  User,
  Briefcase,
  Mail,
  Phone,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated: () => void;
  currentUser?: string;
}

export default function NewClientModal({
  isOpen,
  onClose,
  onClientCreated,
  currentUser,
}: NewClientModalProps) {
  const organizationId = useOrganizationId();
  const db = useDatabaseService();
  const storage = useStorageService();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");

  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Set organization context in services
  useEffect(() => {
    if (organizationId) {
      db.setOrganizationId(organizationId);
      storage.setOrganizationId(organizationId);
    }
  }, [organizationId]);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setFirstName("");
      setLastName("");
      setJobTitle("");
      setPhone("");
      setLogoFile(null);
      setPreviewUrl(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setPreviewUrl(URL.createObjectURL(file)); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fullName = `${firstName} ${lastName}`.trim() || email.split("@")[0];
    let finalLogoUrl: string | null = null;

    try {
      if (!organizationId) {
        throw new Error('No se ha configurado la organización');
      }

      // Upload logo if provided
      if (logoFile) {
        // We'll need a temporary client ID, so we'll create the client first, then update with logo
        // Or we can use a temp ID for the upload path
        const tempClientId = `temp-${Date.now()}`;
        finalLogoUrl = await storage.uploadClientLogo(logoFile, tempClientId);
      }

      // Create client
      const newClient = await db.createClient({
        name: fullName,
        email: email || null,
        phone: phone || null,
        last_name: lastName || null,
        job_title: jobTitle || null,
        logo_url: finalLogoUrl,
      } as any);

      // If we uploaded a logo with temp ID, re-upload with real client ID
      if (logoFile && finalLogoUrl) {
        try {
          const realLogoUrl = await storage.uploadClientLogo(logoFile, newClient.id);
          await db.updateClient(newClient.id, { logo_url: realLogoUrl });
          finalLogoUrl = realLogoUrl;
        } catch (logoError) {
          console.warn('Error updating logo with real client ID:', logoError);
          // Continue anyway, the temp logo URL will work
        }
      }

      // Create initial deal
      await db.createDeal({
        title: `Oportunidad: ${fullName}`,
        value: 0,
        currency: "GTQ",
        stage: "prospect",
        priority: "medium",
        client_id: newClient.id,
        description: `Cliente creado manualmente por ${currentUser || "Admin"}`,
      } as any);

      onClientCreated();
      onClose();
    } catch (error: any) {
      console.error("Error:", error);
      alert("Error: " + (error.message || "Ocurrió un problema"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-md h-full bg-slate-950 border-l border-kiriko-teal/30 shadow-[-20px_0_50px_rgba(45,212,191,0.1)] animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-kiriko-teal to-transparent"></div>

        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50 flex-none">
          <div>
            <h2 className="text-white font-bold text-xl tracking-tight">
              Crear Contacto
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ingresa los datos del nuevo cliente
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
            
            <div className="flex justify-center mb-4">
              <div className="relative group cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center border-2 border-dashed transition-all overflow-hidden relative ${
                    previewUrl
                      ? "border-kiriko-teal"
                      : "border-slate-700 group-hover:border-kiriko-teal/50 bg-slate-900"
                  }`}
                >
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Logo Preview"
                      className="w-full h-full object-cover"
                      width={96}
                      height={96}
                    />
                  ) : (
                    <div className="text-center">
                      <Upload
                        size={20}
                        className="mx-auto text-slate-500 mb-1 group-hover:text-kiriko-teal"
                      />
                      <span className="text-[9px] text-slate-500 uppercase font-bold">
                        Subir Logo
                      </span>
                    </div>
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <ImageIcon size={16} className="text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Campos Normales */}
            <div className="space-y-1.5">
              <label className="text-xs text-kiriko-teal uppercase tracking-wider font-bold">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <span className="absolute left-3 top-3 text-slate-500 group-focus-within:text-kiriko-teal transition-colors">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white p-3 pl-10 rounded-lg focus:border-kiriko-teal focus:ring-1 focus:ring-kiriko-teal/50 outline-none transition-all"
                  placeholder="cliente@empresa.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                  Nombre
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white p-3 rounded-lg focus:border-kiriko-teal outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                  Apellidos
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white p-3 rounded-lg focus:border-kiriko-teal outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                Cargo
              </label>
              <div className="relative group">
                <span className="absolute left-3 top-3 text-slate-500 group-focus-within:text-kiriko-teal transition-colors">
                  <Briefcase size={16} />
                </span>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white p-3 pl-10 rounded-lg focus:border-kiriko-teal outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">
                Teléfono
              </label>
              <div className="relative group">
                <span className="absolute left-3 top-3 text-slate-500 group-focus-within:text-kiriko-teal transition-colors">
                  <Phone size={16} />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white p-3 pl-10 rounded-lg focus:border-kiriko-teal outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-between items-center gap-4 flex-none">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-400 hover:text-white font-medium transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !email}
              className="flex-1 bg-kiriko-teal hover:bg-teal-400 text-black font-bold py-3 rounded-lg shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Crear Contacto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
