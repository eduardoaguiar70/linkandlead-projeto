import React, { useState } from 'react'
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
    ThumbsUp
} from 'lucide-react'
import CreatePostModal from './CreatePostModal'
import ClientSelector from './ClientSelector'
import '../pages/AdminPanel.css'

import { useLanguage } from '../contexts/LanguageContext'

const AdminLayout = () => {
    const { signOut } = useAuth()
    const { t } = useLanguage()
    const [showModal, setShowModal] = useState(false)
    const [isSidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()

    const isActive = (path) => location.pathname === path ? 'nav-item active' : 'nav-item'
    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen)

    const [showCreative, setShowCreative] = useState(false)

    return (
        <div className="dashboard-layout">
            {/* MOBILE HEADER */}
            <div className="mobile-header">
                <button onClick={toggleSidebar} className="menu-btn">
                    <Menu size={24} />
                </button>
                <img src="/logo-linklead.png" alt="Link&Lead" style={{ height: '32px' }} />
            </div>

            {/* OVERLAY FOR MOBILE */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* SIDEBAR */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="logo-area">
                    <img src="/logo-linklead.png" alt="Link&Lead" style={{ maxWidth: '160px', height: 'auto' }} />
                </div>

                <nav className="nav-menu" style={{ gap: '0.25rem' }}>

                    {/* ═══ PRIMARY: Máquina de Vendas (always visible, no toggle) ═══ */}
                    <div style={{
                        padding: '0.4rem 1.5rem 0.3rem',
                        fontSize: '0.65rem',
                        fontWeight: '800',
                        letterSpacing: '0.1em',
                        color: '#f97316',
                        textTransform: 'uppercase'
                    }}>
                        Máquina de Vendas
                    </div>

                    <div className="nav-group-items">
                        <Link to="/" className={isActive('/')}>
                            <LayoutDashboard size={18} /> Visão Geral
                        </Link>
                        <Link to="/campaigns" className={isActive('/campaigns')}>
                            <Target size={18} /> Campanhas
                        </Link>
                        <Link to="/missions" className={isActive('/missions')}>
                            <Flame size={18} /> Cockpit de Vendas
                        </Link>
                        <Link to="/sales/inbox" className={isActive('/sales/inbox')}>
                            <MessageCircle size={18} /> Inbox Inteligente
                        </Link>
                        <Link to="/clients" className={isActive('/clients')}>
                            <Users size={18} /> Clientes
                        </Link>
                        <Link to="/engagement" className={isActive('/engagement')}>
                            <ThumbsUp size={18} /> Engajamento
                        </Link>
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
                            Conteúdo
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
                {(location.pathname === '/' || location.pathname.startsWith('/sales') || location.pathname.startsWith('/leads') || location.pathname.startsWith('/campaigns') || location.pathname.startsWith('/engagement') || location.pathname.startsWith('/missions')) && (
                    <div className="context-header" style={{
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '0.9rem', color: '#5F5F5F' }}>Contexto:</span>
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

export default AdminLayout

