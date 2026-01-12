"use client";

import { X, Save, Camera, Shield } from "lucide-react";
import { useState, useEffect } from "react";

interface UserData {
  name: string;
  role: string;
  avatar: string;
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
  const [name, setName] = useState(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [avatar, setAvatar] = useState(currentUser.avatar);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name);
      setRole(currentUser.role);
      setAvatar(currentUser.avatar);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, role, avatar });
    onClose();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatar(url);
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
              <img
                src="/logo-kiriko.png"
                alt="Logo"
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
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full border-2 border-kiriko-teal p-1 shadow-[0_0_15px_rgba(45,212,191,0.3)]">
                <img
                  src={
                    avatar ||
                    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  }
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover bg-slate-800"
                />
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                <Camera size={24} />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <p className="text-xs text-slate-500">Click para cambiar foto</p>
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

          <button
            type="submit"
            className="w-full bg-teal-500 hover:bg-teal-400 text-black font-bold py-3 mt-2 rounded-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(45,212,191,0.4)] hover:shadow-[0_0_25px_rgba(45,212,191,0.6)]"
          >
            <Save size={18} />
            ACTUALIZAR CREDENCIALES
          </button>
        </form>
      </div>
    </div>
  );
}
