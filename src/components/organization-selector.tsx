import Image from 'next/image';
import { OrganizationRole, UserOrganizationMembership } from '@/types/organization';
import { Building2 } from 'lucide-react';

interface OrganizationSelectorProps {
  memberships: UserOrganizationMembership[];
  onSelect: (membership: UserOrganizationMembership) => void;
  isLoading?: boolean;
}

function getRoleLabel(role: OrganizationRole) {
  switch (role) {
    case 'owner':
      return 'Propietario';
    case 'admin':
      return 'Administrador';
    default:
      return 'Miembro';
  }
}

export default function OrganizationSelector({
  memberships,
  onSelect,
  isLoading = false,
}: OrganizationSelectorProps) {
  if (isLoading) {
    return (
      <div className="text-kiriko-teal font-mono tracking-widest animate-pulse uppercase text-sm text-center">
        Cargando organizaciones...
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <div className="text-slate-400 text-sm text-center">
        No tienes organizaciones activas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {memberships.map((membership) => {
        const organization = membership.organization;
        return (
          <button
            key={membership.id}
            type="button"
            onClick={() => onSelect(membership)}
            className="w-full flex items-center gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-kiriko-teal/60 hover:bg-slate-900 transition-all"
          >
            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700">
              {organization?.logo_url ? (
                <Image
                  src={organization.logo_url}
                  alt={organization.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="text-kiriko-teal" size={20} />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-semibold">
                {organization?.name || 'Organización'}
              </p>
              <p className="text-xs text-slate-400">
                {getRoleLabel(membership.role)}
              </p>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {organization?.slug}
            </div>
          </button>
        );
      })}
    </div>
  );
}
