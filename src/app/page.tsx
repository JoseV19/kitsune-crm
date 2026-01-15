'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/services/supabase/client";
import { useOrganization } from "@/lib/contexts/organization-context";
import { getActiveUserOrganizations } from "@/lib/services/organization.service";
import { buildSubdomainUrl, getBaseHost } from "@/lib/utils/url-helper";
import { prepareSessionTransfer } from "@/lib/services/supabase/session-transfer";
import Sidebar from "@/components/sidebar";
import KanbanBoard from "@/components/kanban-board";
import { LoginPage } from "@/components/login-page";
import ClientDetailsPanel from "@/components/client-details-panel";
import NewClientModal from "@/components/new-client-modal";
import { ProfileModal } from "@/components/profile-modal";
import WelcomeScreen from "@/components/welcome-screen"; 
import DashboardView from "@/components/dashboard-view"; 
import { Search } from "lucide-react"; 

interface UserData {
  name: string;
  role: string;
  avatar: string;
}

export default function Home() {
  const router = useRouter();
  const { organization, organizationId, isLoading: orgLoading } = useOrganization();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<UserData>({
    name: "Usuario",
    role: "Miembro",
    avatar: "",
  });

  
  const [currentView, setCurrentView] = useState<"home" | "kanban" | "dashboard">("home"); 
  
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [is360Open, setIs360Open] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (error || !authUser) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        setIsAuthenticated(true);
        setUserId(authUser.id);

        // Get user profile for name
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          setUser({
            name: profile.full_name || authUser.email?.split('@')[0] || 'Usuario',
            role: 'Miembro',
            avatar: authUser.user_metadata?.avatar_url || '',
          });
        } else {
          setUser({
            name: authUser.email?.split('@')[0] || 'Usuario',
            role: 'Miembro',
            avatar: '',
          });
        }

        // Check if we're on the main domain (no subdomain)
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        const isMainDomain = !subdomain || subdomain === 'localhost' || subdomain.includes(':');

        // If on main domain and authenticated, redirect immediately
        if (isMainDomain) {
          setIsRedirecting(true);
          const memberships = await getActiveUserOrganizations(authUser.id);

          if (memberships.length === 0) {
            router.push('/onboarding');
            return;
          }

          // Check for last accessed organization
          const lastOrgSlug = localStorage.getItem('last_organization_slug');
          if (lastOrgSlug) {
            // Verify the user still has access to this organization
            const lastOrgMembership = memberships.find(
              m => m.organization?.slug === lastOrgSlug
            );
            if (lastOrgMembership?.organization?.slug) {
              const protocol = window.location.protocol;
              const host = window.location.host;
              const isLocalhost = host.includes('localhost');
              let redirectUrl = buildSubdomainUrl(lastOrgSlug, host, protocol);
              
              // Add session transfer token for localhost
              if (isLocalhost) {
                const refreshToken = await prepareSessionTransfer();
                if (refreshToken) {
                  redirectUrl += `#session_token=${encodeURIComponent(refreshToken)}`;
                }
              }
              
              window.location.href = redirectUrl;
              return;
            }
          }

          // If single organization, redirect there
          if (memberships.length === 1 && memberships[0].organization?.slug) {
            const protocol = window.location.protocol;
            const host = window.location.host;
            const isLocalhost = host.includes('localhost');
            const slug = memberships[0].organization?.slug;
            // Store as last accessed
            localStorage.setItem('last_organization_slug', slug);
            
            let redirectUrl = buildSubdomainUrl(slug, host, protocol);
            
            // Add session transfer token for localhost
            if (isLocalhost) {
              const refreshToken = await prepareSessionTransfer();
              if (refreshToken) {
                redirectUrl += `#session_token=${encodeURIComponent(refreshToken)}`;
              }
            }
            
            window.location.href = redirectUrl;
            return;
          }

          // Multiple organizations, go to selector
          const protocol = window.location.protocol;
          const host = window.location.host;
          const baseHost = getBaseHost(host);
          window.location.href = `${protocol}//${baseHost}/select-organization`;
          return;
        }
      } catch (e) {
        console.error("Error al cargar sesión", e);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkSessionAndRedirect();
  }, [router]);

  useEffect(() => {
    const loadUserRole = async () => {
      if (!userId || !organizationId) {
        return;
      }

      const { data: membership } = await supabase
        .from('user_organization_memberships')
        .select('role, is_active')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single();

      if (membership?.is_active) {
        setUser((prev) => ({
          ...prev,
          role: membership.role === 'owner' ? 'Propietario' : membership.role === 'admin' ? 'Administrador' : 'Miembro',
        }));
      }
    };

    loadUserRole();
  }, [organizationId, userId]);

  // Redirect based on memberships if no organization is selected (for subdomain cases)
  useEffect(() => {
    const handleNoOrganization = async () => {
      // Skip if we're on main domain (handled in checkSessionAndRedirect)
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      const isMainDomain = !subdomain || subdomain === 'localhost' || subdomain.includes(':');
      if (isMainDomain) {
        return;
      }

      // Only handle subdomain cases where organization isn't loaded
      if (orgLoading || isLoading || !isAuthenticated || organization || isRedirecting) {
        return;
      }

      if (!userId) {
        router.push('/');
        return;
      }

      const memberships = await getActiveUserOrganizations(userId);

      if (memberships.length === 0) {
        const protocol = window.location.protocol;
        const host = window.location.host;
        const baseHost = getBaseHost(host);
        window.location.href = `${protocol}//${baseHost}/onboarding`;
        return;
      }

      if (memberships.length === 1 && memberships[0].organization?.slug) {
        const protocol = window.location.protocol;
        const host = window.location.host;
        const slug = memberships[0].organization?.slug;
        localStorage.setItem('last_organization_slug', slug);
        window.location.href = buildSubdomainUrl(slug, host, protocol);
        return;
      }

      const protocol = window.location.protocol;
      const host = window.location.host;
      const baseHost = getBaseHost(host);
      window.location.href = `${protocol}//${baseHost}/select-organization`;
    };

    handleNoOrganization();
  }, [orgLoading, isLoading, isAuthenticated, organization, router, userId, isRedirecting]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    router.push('/');
  };

  const handleOpenClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setIs360Open(true);
  };

  if (isLoading || orgLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-kiriko-teal font-mono tracking-widest animate-pulse uppercase">
        {isRedirecting ? 'Redirigiendo...' : 'Iniciando Kitsune CRM...'}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Check if we're on a subdomain - if so, we need an organization
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const subdomain = hostname.split('.')[0];
  const isMainDomain = !subdomain || subdomain === 'localhost' || subdomain.includes(':');
  
  // If on subdomain but no organization, show redirecting (organization provider will handle redirect)
  if (!isMainDomain && !organization && !orgLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-kiriko-teal font-mono tracking-widest animate-pulse uppercase">
        Redirigiendo...
      </div>
    );
  }
  
  // If on main domain and authenticated but no organization, redirect logic should handle it
  // But if we get here, something went wrong - show login
  if (isMainDomain && !organization && !orgLoading) {
    return <LoginPage />;
  }
  
  // If we have an organization, show the app
  if (!organization) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-kiriko-teal font-mono tracking-widest animate-pulse uppercase">
        Cargando...
      </div>
    );
  }

 
  const getPageTitle = () => {
    switch (currentView) {
      case 'home': return 'Centro de Comando';
      case 'kanban': return 'Tablero de Oportunidades';
      case 'dashboard': return 'Métricas del Sistema';
    }
  };

  const getPageSubtitle = () => {
    switch (currentView) {
      case 'home': return 'INICIO';
      case 'kanban': return 'PIPELINE';
      case 'dashboard': return 'ANALYTICS';
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] text-white overflow-hidden selection:bg-kiriko-teal selection:text-black">
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        user={user}
        onNewClient={() => setIsNewClientOpen(true)}
        onProfileClick={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#020617] relative">
        <div className="px-8 py-6 flex justify-between items-center bg-[#020617]/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-kiriko-teal uppercase">
              {getPageTitle()}
            </h1>
            <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30">
              {getPageSubtitle()}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {currentView === "kanban" && (
              <div className="relative group animate-in fade-in slide-in-from-right-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-kiriko-teal transition-colors" size={16}/>
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-sm text-white rounded-full py-2 pl-10 pr-4 w-64 focus:w-80 transition-all focus:border-kiriko-teal focus:outline-none placeholder:text-slate-600"
                />
              </div>
            )}
            <div className="flex flex-col items-end gap-1">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                {user.role}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono italic">
                <div className="w-2 h-2 rounded-full bg-kiriko-teal animate-pulse"></div>
                Agente: {user.name}
              </div>
            </div>
          </div>
        </div>

        <div className="h-[1px] w-full bg-gradient-to-r from-slate-800 via-slate-800 to-transparent mb-6 mx-8 opacity-50"></div>

        <div className="flex-1 overflow-hidden px-8 pb-4 relative">
          
          
          
          {currentView === "home" && (
             <WelcomeScreen 
                userName={user.name}
                onNavigateToKanban={() => setCurrentView('kanban')}
             />
          )}

          {currentView === "kanban" && (
            <KanbanBoard
              currentUser={user.name}
              onOpenClient={handleOpenClient}
              searchTerm={searchTerm}
            />
          )}

          {currentView === "dashboard" && (
             <div className="h-full overflow-y-auto custom-scrollbar pb-10">
                <DashboardView />
             </div>
          )}

        </div>
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-kiriko-teal/20 to-transparent pointer-events-none"></div>
      </main>

      <ClientDetailsPanel
        clientId={selectedClientId}
        isOpen={is360Open}
        onClose={() => setIs360Open(false)}
        onClientDeleted={() => { setIs360Open(false); window.location.reload(); }}
      />
      <NewClientModal
        isOpen={isNewClientOpen}
        onClose={() => setIsNewClientOpen(false)}
        onClientCreated={() => { setIsNewClientOpen(false); window.location.reload(); }}
        currentUser={user.name}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={user}
        onSave={(updated) => { setUser(updated); localStorage.setItem("kitsune_user", JSON.stringify(updated)); }}
      />
    </div>
  );
}