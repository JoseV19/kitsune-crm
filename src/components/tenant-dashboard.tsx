'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk, useSession } from "@clerk/nextjs";
import { useOrganization } from "@/lib/contexts/organization-context";
import Sidebar from "@/components/sidebar";
import KanbanBoard from "@/components/kanban-board";
import ClientDetailsPanel from "@/components/client-details-panel";
import NewClientModal from "@/components/new-client-modal";
import { ProfileModal } from "@/components/profile-modal";
import WelcomeScreen from "@/components/welcome-screen";
import DashboardView from "@/components/dashboard-view";
import { Search } from "lucide-react";

interface UserData {
  name: string;
  role: string;
  avatar?: string;
}

export default function TenantDashboard() {
  const router = useRouter();
  const { user: clerkUser, isLoaded: isAuthLoaded, isSignedIn } = useUser();
  const { session } = useSession();
  const { signOut } = useClerk();
  const { organization, isLoading: orgLoading } = useOrganization();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [user, setUser] = useState<UserData>({
    name: "Usuario",
    role: "Miembro",
  });

  const [currentView, setCurrentView] = useState<"home" | "kanban" | "dashboard">("home");
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [is360Open, setIs360Open] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch user profile from database
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isAuthLoaded || !isSignedIn || !clerkUser || !session) return;

      try {
        const accessToken = await session.getToken();
        if (!accessToken) return;

        const response = await fetch('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const profile = data.profile;
          
          // Use code_name if available, otherwise fall back to full_name or Clerk name
          const displayName = profile?.code_name || profile?.full_name || clerkUser.fullName || clerkUser.firstName || "Usuario";
          const displayRole = profile?.display_role || "Miembro";

          setUser({
            name: displayName,
            role: displayRole,
          });
        } else {
          // Fallback to Clerk data if API fails
          setUser({
            name: clerkUser.fullName || clerkUser.firstName || "Usuario",
            role: "Miembro",
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to Clerk data on error
        setUser({
          name: clerkUser.fullName || clerkUser.firstName || "Usuario",
          role: "Miembro",
        });
      }
    };

    if (isAuthLoaded && isSignedIn && clerkUser && session) {
      fetchUserProfile();
    }
  }, [isAuthLoaded, isSignedIn, clerkUser?.id, session]);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthLoaded) return;

      if (isSignedIn && clerkUser) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.push('/');
      }
      setIsInitialLoading(false);
    };

    checkAuth();
    // Only depend on user ID, not the entire user object to avoid reloads on profile updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoaded, isSignedIn, clerkUser?.id, router]);

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
    router.push('/');
  };

  const handleOpenClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setIs360Open(true);
  };

  if (isInitialLoading || orgLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-kiriko-teal font-mono tracking-widest animate-pulse uppercase">
        {isRedirecting ? 'Redirigiendo...' : 'Iniciando Kitsune CRM...'}
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/');
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-kiriko-teal font-mono tracking-widest animate-pulse uppercase">
        Redirigiendo...
      </div>
    );
  }

  if (!organization && !orgLoading) {
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-kiriko-teal transition-colors" size={16} />
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
        onClose={() => {
          setIsProfileOpen(false);
          // Refetch user profile after closing modal to get updated data
          if (isAuthLoaded && isSignedIn && clerkUser && session) {
            const refetchProfile = async () => {
              try {
                const accessToken = await session.getToken();
                if (!accessToken) return;

                const response = await fetch('/api/users/profile', {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                });

                if (response.ok) {
                  const data = await response.json();
                  const profile = data.profile;
                  const displayName = profile?.code_name || profile?.full_name || clerkUser.fullName || clerkUser.firstName || "Usuario";
                  const displayRole = profile?.display_role || "Miembro";
                  setUser({ name: displayName, role: displayRole });
                }
              } catch (error) {
                console.error('Error refetching user profile:', error);
              }
            };
            refetchProfile();
          }
        }}
        currentUser={user}
        onSave={(updated) => { 
          setUser(updated);
          // Keep localStorage for backward compatibility, but database is now the source of truth
          localStorage.setItem("kitsune_user", JSON.stringify(updated));
        }}
      />
    </div>
  );
}
