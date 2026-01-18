'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useSession } from '@clerk/nextjs';
import { useOrganization } from '@/lib/contexts/organization-context';
import { useIsOrgOwner } from '@/lib/hooks/use-is-org-owner';
import { createUserSchema, type CreateUserFormData } from '@/lib/validations/user-management.schema';
import { createUser, getOrganizationUsers, removeUserFromOrganization, type OrganizationUser } from '@/lib/services/user.service';
import { Loader2, UserPlus, Mail, User, Shield, Trash2, X, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export default function UsersPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { session } = useSession();
  const { organizationId } = useOrganization();
  const isOwner = useIsOrgOwner();
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
  });

  useEffect(() => {
    if (organizationId && user && session) {
      loadUsers();
    }
  }, [organizationId, user, session]);

  const loadUsers = async () => {
    if (!organizationId || !session) return;

    try {
      setLoading(true);
      setError(null);
      const token = await session.getToken();
      if (!token) throw new Error('No token');
      
      const organizationUsers = await getOrganizationUsers(token);
      setUsers(organizationUsers);
    } catch (err: any) {
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const onCreateUser = async (data: CreateUserFormData) => {
    if (!organizationId || !session) {
      setError('No se pudo identificar la organización o sesión');
      return;
    }

    try {
      setError(null);
      const token = await session.getToken();
      if (!token) throw new Error('No token');

      await createUser({
        name: data.name,
        email: data.email,
      }, token);
      
      reset();
      setIsCreateModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario');
    }
  };

  const onDeleteUser = async (userId: string) => {
    if (!organizationId || !session) return;

    if (!confirm('¿Estás seguro de que deseas eliminar este usuario de la organización?')) {
      return;
    }

    try {
      setDeletingUserId(userId);
      setError(null);
      const token = await session.getToken();
      if (!token) throw new Error('No token');

      await removeUserFromOrganization(userId, token);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuario');
    } finally {
      setDeletingUserId(null);
    }
  };

  useEffect(() => {
    if (!isOwner && !loading) {
      router.push('/');
    }
  }, [isOwner, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-kiriko-teal font-mono tracking-widest animate-pulse uppercase">
          Cargando usuarios...
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return null;
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Propietario';
      case 'admin':
        return 'Administrador';
      case 'member':
        return 'Miembro';
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Shield className="text-kiriko-teal" size={16} />;
      case 'admin':
        return <Shield className="text-blue-400" size={16} />;
      default:
        return <User className="text-slate-400" size={16} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gestión de Usuarios</h1>
            <p className="text-slate-400">Administra los usuarios de tu organización</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-kiriko-teal hover:bg-teal-400 text-black font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 uppercase tracking-wide text-sm"
          >
            <Plus size={18} />
            Crear Usuario
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No hay usuarios en la organización
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-kiriko-teal/20 flex items-center justify-center text-kiriko-teal font-bold">
                            {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {user.full_name || 'Sin nombre'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {user.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(user.role || 'member')}
                          <span className="text-slate-300">{getRoleLabel(user.role || 'member')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {!user.is_active ? (
                          <span className="px-3 py-1 bg-slate-700/60 text-slate-300 rounded-full text-xs font-bold">
                            Inactivo
                          </span>
                        ) : user.has_password ? (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                            Activo
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user.role !== 'owner' && (
                          <button
                            onClick={() => onDeleteUser(user.id)}
                            disabled={deletingUserId === user.id}
                            className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={user.is_active ? 'Desactivar usuario' : 'Usuario inactivo'}
                          >
                            {deletingUserId === user.id ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="text-kiriko-teal" size={20} />
                  Crear Nuevo Usuario
                </h2>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    reset();
                    setError(null);
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onCreateUser)} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className="w-full bg-black/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:border-kiriko-teal outline-none transition-all"
                    placeholder="Juan Pérez"
                  />
                  {errors.name && (
                    <p className="text-red-400 text-xs ml-1">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">
                    Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-kiriko-teal transition-colors" size={18} />
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full bg-black/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-kiriko-teal outline-none transition-all"
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-400 text-xs ml-1">{errors.email.message}</p>
                  )}
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg text-blue-400 text-xs">
                  ℹ️ El usuario recibirá un email y deberá establecer su contraseña al intentar iniciar sesión.
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      reset();
                      setError(null);
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all uppercase tracking-wide text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-kiriko-teal hover:bg-teal-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
                  >
                    <UserPlus size={18} />
                    Crear Usuario
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
