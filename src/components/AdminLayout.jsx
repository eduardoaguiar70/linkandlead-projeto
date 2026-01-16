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
    Menu, // Added
    X, // Added
    Briefcase, // Added
    Database // Added
} from 'lucide-react'
import CreatePostModal from './CreatePostModal'
import ClientSelector from './ClientSelector'
// Reusing AdminPanel styles as requested/implied for consistency without full CSS refactor
import '../pages/AdminPanel.css'

import { useLanguage } from '../contexts/LanguageContext'

const AdminLayout = () => {
    const { signOut } = useAuth()
    const { t, language, setLanguage } = useLanguage()
    const [showModal, setShowModal] = useState(false)
    const [isSidebarOpen, setSidebarOpen] = useState(false) // Mobile State
    const location = useLocation()

    const isActive = (path) => {
        return location.pathname === path ? 'nav-item active' : 'nav-item'
    }

    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen)

    return (
        <div className="dashboard-layout">
            {/* MOBILE HEADER (VISIBLE ONLY ON MOBILE) */}
            <div className="mobile-header">
                <button onClick={toggleSidebar} className="menu-btn">
                    <Menu size={24} />
                </button>
                <img src="/logo-linklead.png" alt="Link&Lead" style={{ height: '32px' }} />
            </div>

            {/* OVERLAY FOR MOBILE */}
            {isSidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* GLOBAL SIDEBAR */}
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>

                {/* Mobile Close Button */}
                <button
                    className="mobile-close-btn"
                    onClick={() => setSidebarOpen(false)}
                >
                    <X size={20} />
                </button>


                <div className="logo-area">
                    <img src="/logo-linklead.png" alt="Link&Lead" style={{ maxWidth: '160px', height: 'auto' }} />
                </div>
                <nav className="nav-menu" style={{ gap: '0.5rem' }}>

                    {/* SECTION 1 */}
                    <div style={{ padding: '0 1.5rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em' }}>
                            GESTÃO CRIATIVA
                        </span>
                    </div>

                    <Link to="/" className={isActive('/')}>
                        <LayoutDashboard size={20} /> {t('dashboard')}
                    </Link>
                    <Link to="/posts" className={isActive('/posts')}>
                        <FileText size={20} /> {t('posts')}
                    </Link>
                    <Link to="/ideas" className={isActive('/ideas')}>
                        <Lightbulb size={20} /> {t('ideas')}
                    </Link>
                    <Link to="/clients" className={isActive('/clients')}>
                        <Users size={20} /> {t('clients')}
                    </Link>

                    {/* SECTION 2 */}
                    <div style={{ padding: '0 1.5rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em' }}>
                            MÁQUINA DE VENDAS
                        </span>
                    </div>

                    <Link to="/sales" className={isActive('/sales')}>
                        <Database size={20} /> Mineração de Base
                    </Link>
                    <Link to="/leads" className={isActive('/leads')}>
                        <Briefcase size={20} /> Gestão de Leads
                    </Link>

                    <div style={{ marginTop: 'auto' }}></div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            signOut()
                        }}
                        className="nav-item"
                        style={{
                            marginTop: '0',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            width: '100%',
                            justifyContent: 'flex-start',
                            position: 'relative',
                            zIndex: 50
                        }}
                    >
                        <LogOut size={20} /> {t('logout')}
                    </button>
                </nav>
                <div className="sidebar-footer">
                    <button className="btn-new-post" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> {t('newPost')}
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="main-content">
                {/* Sales Context Header */}
                {(location.pathname.startsWith('/sales') || location.pathname.startsWith('/leads')) && (
                    <div className="context-header" style={{
                        padding: '1rem 2rem',
                        background: 'white',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Contexto:</span>
                            <ClientSelector />
                        </div>
                    </div>
                )}
                <Outlet />
            </main>

            {/* GLOBAL CREATE MODAL */}
            {
                showModal && (
                    <CreatePostModal
                        onClose={() => setShowModal(false)}
                        onSuccess={() => {
                            // Ideally we trigger a refresh here. 
                            // Since we are in Layout, we might need a context or simple page reload for now.
                            // Or we pass a context method. 
                            // For simplicity in this request (focus on Layout), I'll just close it.
                            // The user can refresh individual pages or we rely on React Query (not installed) or Realtime (installed).
                            // I'll force a soft reload of the current view if possible, or just close.
                            setShowModal(false)
                            window.location.reload() // Bruteforce refresh to ensure lists update on all pages
                        }}
                    />
                )
            }
        </div >
    )
}

export default AdminLayout
