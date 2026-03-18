import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    LayoutDashboard,
    FileText,
    Users,
    LogOut,
    Plus,
    Lightbulb,
    Menu,
    X,
    ChevronDown,
    ChevronRight,
    MessageCircle,
    Target,
    Flame,
    ThumbsUp,
    Library,
    Kanban,
    ShieldBan,
    Link2,
    Calendar,
    BarChart2,
    Shield
} from 'lucide-react'
import CreatePostModal from './CreatePostModal'
import ClientSelector from './ClientSelector'
import '../pages/AdminPanel.css'

import { useLanguage } from '../contexts/LanguageContext'
import { useNotifications } from '../hooks/useNotifications'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import { supabase } from '../services/supabaseClient'
import { TeamMemberProvider, useTeamMember } from '../contexts/TeamMemberContext'

const SidebarContent = () => {
    const { isTeamAdmin } = useTeamMember()
    return null // consumed inside AdminLayout below
}

const AdminLayout = () => {
    const { signOut } = useAuth()
    const { t } = useLanguage()
    const { isTeamAdmin } = useTeamMember()
    const [showModal, setShowModal] = useState(false)
    const [isSidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()

    const isActive = (path) => location.pathname === path ? 'nav-item active' : 'nav-item'
    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen)

    const [showCreative, setShowCreative] = useState(false)

    // ── Notification System: listen for unread_count increases ──
    const { selectedClientId, activeLeadId } = useClientSelection()
    const { notify } = useNotifications()
    const [inAppNotification, setInAppNotification] = useState(null) // { leadId, leadName }

    useEffect(() => {
        if (!selectedClientId) return

        const channel = supabase.channel('leads-unread-notifications')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'leads',
                filter: `client_id=eq.${selectedClientId}`
            }, (payload) => {
                const oldCount = payload.old?.unread_count || 0
                const newCount = payload.new?.unread_count || 0
                const leadId = payload.new?.id

                // Only notify if unread INCREASED and it's not the currently open lead
                if (newCount > oldCount && String(leadId) !== String(activeLeadId)) {
                    const leadName = payload.new?.nome || 'Lead'
                    notify(leadName, leadId)

                    // Trigger visual in-app toast
                    setInAppNotification({ leadId, leadName })

                    // Auto-dismiss after 5 seconds
                    setTimeout(() => {
                        setInAppNotification(current => {
                            if (current && current.leadId === leadId) return null
                            return current
                        })
                    }, 5000)
                }
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [selectedClientId, activeLeadId, notify])

    return (
        <div className="dashboard-layout">
            {/* IN-APP VISUAL NOTIFICATION TOAST */}
            {inAppNotification && (
                <div className="fixed top-6 right-6 z-[9999] animate-slide-in-right">
                    <div
                        onClick={() => {
                            window.location.href = `/sales/inbox?leadId=${inAppNotification.leadId}`
                            setInAppNotification(null)
                        }}
                        className="bg-white rounded-xl shadow-2xl border-2 border-primary/20 p-4 pr-12 cursor-pointer hover:bg-gray-50 hover:border-primary/50 hover:shadow-primary/10 transition-all flex items-start gap-4"
                        style={{ minWidth: '320px' }}
                    >
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                            <MessageCircle size={20} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 mb-1">New message</h4>
                            <p className="text-xs text-gray-500 truncate block">
                                {inAppNotification.leadName} sent a message.
                            </p>
                            <span className="text-[10px] font-bold text-primary mt-2 flex items-center gap-1">
                                Click to open Inbox <ChevronRight size={10} />
                            </span>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setInAppNotification(null)
                            }}
                            className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* MOBILE HEADER */}
            <div className="mobile-header">
                <button onClick={toggleSidebar} className="menu-btn">
                    <Menu size={24} />
                </button>
                <img src="/logo-linklead-light.png" alt="Link&Lead" style={{ height: '32px' }} />
            </div>

            {/* OVERLAY FOR MOBILE */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* SIDEBAR */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="logo-area">
                    <img src="/logo-linklead-light.png" alt="Link&Lead" style={{ maxWidth: '160px', height: 'auto' }} />
                </div>

                <nav className="nav-menu" style={{ gap: '0.25rem' }}>

                    {/* ═══ PRIMARY: Máquina de Vendas (always visible, no toggle) ═══ */}
                    <div className="px-6 py-2 text-[10px] font-extrabold tracking-widest text-primary uppercase opacity-70">
                        Sales Engine
                    </div>

                    <div className="nav-group-items">
                        <Link to="/" className={isActive('/')}>
                            <LayoutDashboard size={18} /> Overview
                        </Link>
                        <Link to="/network" className={isActive('/network')}>
                            <Users size={18} /> My Network
                        </Link>
                        <Link to="/connections" className={isActive('/connections')}>
                            <Link2 size={18} /> Connection Requests
                        </Link>
                        <Link to="/missions" className={isActive('/missions')}>
                            <Flame size={18} /> Daily Tasks
                        </Link>
                        <Link to="/sales/inbox" className={isActive('/sales/inbox')}>
                            <MessageCircle size={18} /> Smart Inbox
                        </Link>
                        <Link to="/sales/scheduled" className={isActive('/sales/scheduled')}>
                            <Calendar size={18} /> Scheduled Messages
                        </Link>
                        <Link to="/pipeline" className={isActive('/pipeline')}>
                            <Kanban size={18} /> Pipeline
                        </Link>
                        <Link to="/clients" className={isActive('/clients')}>
                            <Users size={18} /> Clients
                        </Link>
                        <Link to="/engagement" className={isActive('/engagement')}>
                            <ThumbsUp size={18} /> Engagement
                        </Link>
                        <Link to="/blacklist" className={isActive('/blacklist')}>
                            <ShieldBan size={18} /> Blacklist
                        </Link>
                        <Link to="/content-library" className={isActive('/content-library')}>
                            <Library size={18} /> Content Library
                        </Link>
                    </div>

                    {/* ═══ ANALYTICS ═══ */}
                    <div style={{ marginTop: '1.5rem' }}>
                        <div className="px-6 py-2 text-[10px] font-extrabold tracking-widest text-primary uppercase opacity-70">
                            Analytics
                        </div>
                        <div className="nav-group-items">
                            <Link to="/analytics" className={isActive('/analytics')}>
                                <BarChart2 size={18} /> My Analytics
                            </Link>
                            {isTeamAdmin && (
                                <Link to="/team-dashboard" className={isActive('/team-dashboard')}>
                                    <Shield size={18} /> Team View
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* ═══ SECONDARY: Gestão Criativa (collapsible, subtle) ═══ */}
                    <div style={{ marginTop: '1.5rem' }}>
                        <button
                            onClick={() => setShowCreative(prev => !prev)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'transparent',
                                border: 'none',
                                color: '#a1a1aa',
                                padding: '0.4rem 1.5rem',
                                cursor: 'pointer',
                                fontSize: '0.6rem',
                                fontWeight: '700',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase'
                            }}
                        >
                            Content
                            {showCreative ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>

                        {showCreative && (
                            <div className="nav-group-items" style={{ animation: 'fadeIn 0.2s' }}>
                                <Link to="/posts" className={isActive('/posts')}>
                                    <FileText size={18} /> {t('posts')}
                                </Link>
                                <Link to="/ideas" className={isActive('/ideas')}>
                                    <Lightbulb size={18} /> {t('ideas')}
                                </Link>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 'auto' }}></div>

                    <Link
                        to="/docs"
                        className={isActive('/docs')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.5rem 1.5rem', color: '#6B7280',
                            fontSize: '0.75rem', fontWeight: '600', textDecoration: 'none',
                            marginBottom: '0.25rem'
                        }}
                    >
                        <FileText size={16} /> Ajuda & Documentação
                    </Link>

                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); signOut() }}
                        className="nav-item"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            width: '100%',
                            justifyContent: 'flex-start'
                        }}
                    >
                        <LogOut size={18} /> {t('logout')}
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <button className="btn-new-post" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> {t('newPost')}
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="main-content">
                {/* Client Context Header for sales-related pages */}
                {(location.pathname === '/' || location.pathname.startsWith('/sales') || location.pathname.startsWith('/leads') || location.pathname.startsWith('/campaigns') || location.pathname.startsWith('/network') || location.pathname.startsWith('/connections') || location.pathname.startsWith('/engagement') || location.pathname.startsWith('/missions') || location.pathname.startsWith('/content-library') || location.pathname.startsWith('/pipeline') || location.pathname.startsWith('/blacklist')) && !location.pathname.startsWith('/analytics') && !location.pathname.startsWith('/team-dashboard') && (
                    <div className="px-6 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-text-muted font-medium">Context:</span>
                            <ClientSelector />
                        </div>
                    </div>
                )}
                <Outlet />
            </main>

            {/* GLOBAL CREATE MODAL */}
            {showModal && (
                <CreatePostModal
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false)
                        window.location.reload()
                    }}
                />
            )}
        </div>
    )
}

const AdminLayoutWithTeam = () => (
    <TeamMemberProvider>
        <AdminLayout />
    </TeamMemberProvider>
)

export default AdminLayoutWithTeam

