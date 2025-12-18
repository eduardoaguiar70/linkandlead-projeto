import React from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useClientAuth } from '../contexts/ClientAuthContext'
import { LogOut, LayoutDashboard, Lightbulb } from 'lucide-react'
import { supabase } from '../services/supabaseClient'

const ClientDashboardLayout = () => {
    const { clientUser, clientId, loading, signOut, isTokenAuth } = useClientAuth()
    const location = useLocation()

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando Portal...</div>

    if (!clientUser || !clientId) {
        return <Navigate to="/portal/login" state={{ from: location }} replace />
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
            {/* TOP HEADER */}
            <header style={{
                background: 'white',
                borderBottom: '1px solid #e2e8f0',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src="/logo-linklead.png" alt="Link&Lead" style={{ height: '32px' }} />
                    <span style={{ height: '24px', width: '1px', background: '#e2e8f0' }}></span>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Portal do Cliente</span>
                </div>

                {!isTokenAuth && (
                    <button
                        onClick={signOut}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        <LogOut size={18} /> Sair
                    </button>
                )}
            </header>

            {/* MAIN CONTENT */}
            <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <Outlet />
            </main>
        </div>
    )
}

export default ClientDashboardLayout
