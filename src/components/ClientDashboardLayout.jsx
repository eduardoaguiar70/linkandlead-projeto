import React from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useClientAuth } from '../contexts/ClientAuthContext'
import { LogOut, LayoutDashboard, HelpCircle } from 'lucide-react'
import SystemStatusHelpModal from './SystemStatusHelpModal'

const ClientDashboardLayout = () => {
    const { clientUser, clientId, loading, signOut, isTokenAuth } = useClientAuth()
    const location = useLocation()
    const [isHelpOpen, setIsHelpOpen] = React.useState(false)

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-obsidian text-white">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-gray-400 text-sm tracking-wider uppercase">Carregando Portal...</span>
            </div>
        </div>
    )

    if (!clientUser || !clientId) {
        return <Navigate to="/portal/login" state={{ from: location }} replace />
    }

    return (
        <div className="min-h-screen bg-obsidian text-white selection:bg-primary selection:text-white pb-12 relative overflow-x-hidden">

            {/* AMBIENT BACKGROUND GLOWS - FIXED POSITIONS */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 z-0" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2 z-0" />

            {/* FLOATING HUD HEADER */}
            <header className="sticky top-6 mx-auto max-w-7xl px-6 z-50 mb-12">
                <div className="glass-panel rounded-2xl md:rounded-full px-6 py-4 flex justify-between items-center shadow-glow border border-glass-border/50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center border border-glass-border shadow-inner">
                            <img src="/logo-linklead.png" alt="Link&Lead" className="h-6 w-auto opacity-90" />
                        </div>
                        <div className="h-6 w-px bg-glass-border"></div>
                        <span className="text-gray-300 font-medium tracking-wide text-sm uppercase">Portal do Cliente</span>

                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsHelpOpen(true)}
                            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            title="Ajuda e Status do Sistema"
                        >
                            <HelpCircle size={20} />
                        </button>

                        {!isTokenAuth && (
                            <button
                                onClick={signOut}
                                className="group flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm font-medium px-4 py-2 rounded-full hover:bg-white/5 active:scale-95"
                            >
                                <span className="group-hover:translate-x-1 transition-transform">Sair</span>
                                <LogOut size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="relative z-10 mx-auto max-w-7xl px-6 w-full animate-fade-in-up">
                <Outlet />
            </main>
            <SystemStatusHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </div>
    )
}

export default ClientDashboardLayout
