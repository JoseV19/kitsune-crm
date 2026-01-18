"use client";

import { X, Save, Shield, Camera, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { UserAvatar, useUser, useSession } from "@clerk/nextjs";

interface UserData {
  name: string;
  role: string;
  avatar?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserData;
  onSave: (data: UserData) => void;
}

export function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onSave,
}: ProfileModalProps) {
  const { user, isLoaded } = useUser();
  const { session } = useSession();
  const [name, setName] = useState(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name);
      setRole(currentUser.role);
      setUploadError(null);
      setSaveError(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      const accessToken = await session?.getToken();
      if (!accessToken) {
        throw new Error('No se pudo obtener la sesión');
      }

      // Save to database via API
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          code_name: name || null,
          display_role: role || null,
          full_name: name || null, // Also update full_name so it shows in activity logs
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar el perfil');
      }

      // Update local state and call onSave callback
      onSave({ name, role });
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar el perfil';
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Stop propagation to prevent form submission, but don't prevent default
    // so the file input can work normally
    e.stopPropagation();
    
    const file = e.target.files?.[0];
    if (!file || !user) {
      // Reset input value to allow selecting the same file again
      e.target.value = '';
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona un archivo de imagen válido');
      e.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen debe ser menor a 5MB');
      e.target.value = '';
      return;
    }

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      // Create a preview URL immediately for better UX
      const previewUrl = URL.createObjectURL(file);
      setLocalImageUrl(previewUrl);
      
      // Use setProfileImage with proper error handling
      // Clerk will update the user object automatically
      await user.setProfileImage({ file });
      
      // Wait a moment for Clerk to process the image
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Clear preview and use Clerk's updated URL
      setLocalImageUrl(null);
      URL.revokeObjectURL(previewUrl);
      
      // Force image refresh by updating the timestamp
      setImageTimestamp(Date.now());
      setIsUploadingImage(false);
      
      // Clear the input to allow selecting the same file again
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading profile image:', error);
      
      // Provide more specific error messages
      const errorObj = error as { status?: number; message?: string };
      if (errorObj?.status === 413 || errorObj?.message?.includes('size')) {
        setUploadError('La imagen es demasiado grande. Por favor selecciona una imagen menor a 5MB.');
      } else if (errorObj?.status === 400 || errorObj?.message?.includes('format')) {
        setUploadError('Formato de imagen no válido. Por favor selecciona JPG, PNG o GIF.');
      } else {
        setUploadError('Error al subir la imagen. Por favor intenta de nuevo.');
      }
      
      setIsUploadingImage(false);
      if (localImageUrl) {
        URL.revokeObjectURL(localImageUrl);
        setLocalImageUrl(null);
      }
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-kiriko-bg border border-kiriko-teal/50 rounded-sm shadow-[0_0_40px_rgba(45,212,191,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-kiriko-teal via-white to-kiriko-red"></div>

        {/* HEADER CON LOGO */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-24 opacity-90">
              <Image
                src="/logo-kiriko.png"
                alt="Logo"
                width={96}
                height={96}
                className="w-full h-auto"
              />
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-2 border-kiriko-teal p-1 shadow-[0_0_15px_rgba(45,212,191,0.3)] bg-slate-800 overflow-hidden">
                {isUploadingImage ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 size={32} className="text-kiriko-teal animate-spin" />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full overflow-hidden relative">
                    {localImageUrl ? (
                      <Image
                        key={`preview-${imageTimestamp}`}
                        src={localImageUrl}
                        alt="Profile"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : user?.imageUrl ? (
                      <Image
                        key={`${user.imageUrl}-${imageTimestamp}`}
                        src={`${user.imageUrl}?t=${imageTimestamp}`}
                        alt="Profile"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover rounded-full"
                        onError={() => {
                          // Fallback to UserAvatar if image fails to load
                          console.warn('Failed to load profile image, using fallback');
                        }}
                      />
                    ) : (
                      <UserAvatar
                        rounded
                        appearance={{
                          elements: {
                            avatarBox: {
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                            },
                            avatarImage: {
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '50%',
                            },
                          },
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
              {isLoaded && user && !isUploadingImage && (
                <label 
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={(e) => {
                    // Only stop propagation to prevent form submission, but allow file input to work
                    e.stopPropagation();
                  }}
                >
                  <Camera size={24} className="text-white pointer-events-none" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isUploadingImage}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  />
                </label>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Hover sobre la foto para cambiarla</p>
              {uploadError && (
                <p className="text-xs text-red-400 mt-1">{uploadError}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">
                Nombre en Clave
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-kiriko-card-bg text-white border border-slate-700 focus:border-kiriko-teal focus:outline-none p-3 rounded-sm text-sm transition-all focus:shadow-[0_0_10px_rgba(45,212,191,0.2)]"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">
                Rango / Rol
              </label>
              <div className="relative">
                <Shield
                  className="absolute left-3 top-3 text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-kiriko-card-bg text-white border border-slate-700 focus:border-kiriko-teal focus:outline-none p-3 pl-10 rounded-sm text-sm transition-all"
                />
              </div>
            </div>
          </div>

          {saveError && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-sm text-red-400 text-sm">
              {saveError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-teal-500 hover:bg-teal-400 text-black font-bold py-3 mt-2 rounded-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(45,212,191,0.4)] hover:shadow-[0_0_25px_rgba(45,212,191,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                GUARDANDO...
              </>
            ) : (
              <>
                <Save size={18} />
                ACTUALIZAR CREDENCIALES
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
