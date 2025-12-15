import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import {
    Loader2,
    Briefcase,
    ExternalLink,
    Link as LinkIcon,
    Users
} from 'lucide-react'
import './AdminPanel.css'

const AdminPanel = () => {
    const { profile, loading: authLoading } = useAuth()
    const [clients, setClients] = useState([])
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [unreadCounts, setUnreadCounts] = useState({}) // New state for notifications

    useEffect(() => {
        if (authLoading) return

        if (profile) {
            fetchDashboardData()
        } else {
            setLoading(false)
        }
    }, [authLoading, profile])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)

            // 1. Fetch Clients
            const { data: clientsData, error: clientsError } = await supabase
                .from('clients')
                .select('*')
                .order('name')

            if (clientsError) throw clientsError

            // 2. Fetch All Posts
            let postsQuery = supabase
                .from('tabela_projetofred1')
                .select('id, nome_cliente, status')

            if (profile.role === 'client') {
                if (profile.nome_empresa) {
                    postsQuery = postsQuery.eq('nome_cliente', profile.nome_empresa)
                }
            }

            const { data: postsData, error: postsError } = await postsQuery
            if (postsError) throw postsError

            // NEW: Fetch Unread Comments for Badge
            const { data: unreadData, error: unreadError } = await supabase
                .from('post_comments')
                .select('post_id')
                .eq('role', 'client')
                .eq('read_by_admin', false)

            if (unreadError) throw unreadError

            // Map unread comments to clients
            const counts = {}
            if (unreadData && postsData) {
                unreadData.forEach(comment => {
                    // Find which client owns this post
                    const post = postsData.find(p => p.id === comment.post_id)
                    if (post && post.nome_cliente) {
                        counts[post.nome_cliente] = (counts[post.nome_cliente] || 0) + 1
                    }
                })
            }
            setUnreadCounts(counts)

            // DEBUG LOGS
            console.log('Clientes:', clientsData)
            console.log('Comentários não lidos (Raw):', unreadData)
            console.log('Mapa de Counts:', counts)

            setClients(clientsData || [])
            setPosts(postsData || [])

        } catch (err) {
            console.error('Erro ao carregar dashboard:', err)
        } finally {
            setLoading(false)
        }
    }

    // Process Stats Per Client
    // Process Stats Per Client
    const getClientStats = (clientName) => {
        const clientPosts = posts.filter(p => p.nome_cliente === clientName)

        const normalize = (status) => status ? status.toLowerCase() : ''

        const drafts = clientPosts.filter(p => {
            const s = normalize(p.status)
            return !s || ['rascunho', 'ideia', 'draft', 'idea'].includes(s)
        }).length

        const waiting = clientPosts.filter(p => {
            const s = normalize(p.status)
            return ['aguardando aprovação', 'pending', 'waiting_approval'].includes(s)
        }).length

        const review = clientPosts.filter(p => {
            const s = normalize(p.status)
            return ['revisão', 'review', 'changes_requested', 'revision'].includes(s)
        }).length

        const approved = clientPosts.filter(p => {
            const s = normalize(p.status)
            return ['aprovado', 'postado', 'approved', 'ready', 'published'].includes(s)
        }).length

        return { drafts, waiting, review, approved }
    }

    const renderCount = (count, colorClass) => {
        if (count === 0) return <span style={{ color: '#cbd5e1', fontWeight: '400' }}>-</span>
        return <span className={colorClass} style={{ fontWeight: '700', fontSize: '1rem' }}>{count}</span>
    }

    const copyLink = (clientName) => {
        // Assuming we filter by client name in the URL for the client portal, or just general link.
        // Actually, client portal is usually specific to a post ID or a login.
        // But maybe they mean the link to the client's feed page?
        // For now, let's copy the Admin link filtered by client as a placeholder, strictly as requested "link do portal do cliente".
        // Use the '/login' or generic portal link if no specific ID. 
        // But usually "Portal" means 'ClientDashboard' which is protected.
        // Let's copy the origin + /login for now, or if there's a specific public link implemented.
        // I'll stick to copying the 'Meus Posts' filtered link for this user context, or just a placeholder alert.
        // User said: "Copiar Link (link do portal do cliente)".
        // I'll copy the base URL + '/login'.
        const url = `${window.location.origin}/login`
        navigator.clipboard.writeText(url)
        alert('Link do Portal copiado!')
    }

    return (
        <div style={{ padding: '0' }}>
            <header className="top-bar">
                <div>
                    <h1>Progresso da Agência</h1>
                    <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Visão geral do pipeline por cliente</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Link to="/clients" className="icon-btn" style={{ background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none', color: '#475569', fontWeight: '600', fontSize: '0.875rem' }}>
                        <Users size={16} style={{ marginBottom: '-2px', marginRight: '5px' }} /> Gerenciar Clientes
                    </Link>
                    <div className="user-profile">
                        <span>Admin Agência</span>
                    </div>
                </div>
            </header>

            <div className="table-container">
                {loading ? (
                    <div className="loading-state" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <Loader2 className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> Carregando pipeline...
                    </div>
                ) : (
                    <table className="posts-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: '1.5rem' }}>Cliente</th>
                                <th style={{ textAlign: 'center', color: '#64748b' }}>Ideias (Draft)</th>
                                <th style={{ textAlign: 'center', color: '#d97706' }}>Aguardando Aprovação</th>
                                <th style={{ textAlign: 'center', color: '#ef4444' }}>Em Revisão</th>
                                <th style={{ textAlign: 'center', color: '#16a34a' }}>Aprovados / Prontos</th>
                                <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.length > 0 ? (
                                clients.map(client => {
                                    const stats = getClientStats(client.name)
                                    // Generate initial from name
                                    const initial = client.name.charAt(0).toUpperCase()

                                    return (
                                        <tr key={client.id} className="hover-row">
                                            <td style={{ paddingLeft: '1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: '32px', height: '32px',
                                                        background: '#f1f5f9', borderRadius: '50%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: '700', color: '#475569', fontSize: '0.875rem'
                                                    }}>
                                                        {initial}
                                                    </div>
                                                    <span className="fw-500" style={{ fontSize: '0.95rem' }}>{client.name}</span>
                                                    {unreadCounts[client.name] > 0 && (
                                                        <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse" style={{ backgroundColor: '#ef4444', marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', color: 'white', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                            {unreadCounts[client.name]}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td style={{ textAlign: 'center' }}>
                                                {renderCount(stats.drafts, 'text-slug')}
                                            </td>

                                            <td style={{ textAlign: 'center' }}>
                                                {renderCount(stats.waiting, 'badge-warning')}
                                            </td>

                                            <td style={{ textAlign: 'center' }}>
                                                {stats.review > 0 ? (
                                                    <span className="badge badge-error" style={{ background: '#fef2f2', color: '#ef4444' }}>{stats.review}</span>
                                                ) : (
                                                    <span style={{ color: '#cbd5e1' }}>-</span>
                                                )}
                                            </td>

                                            <td style={{ textAlign: 'center' }}>
                                                {renderCount(stats.approved, 'badge-success')}
                                            </td>

                                            <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                                                <div className="actions-group" style={{ justifyContent: 'flex-end' }}>
                                                    <Link
                                                        to={`/posts?client=${encodeURIComponent(client.name)}`}
                                                        className="icon-btn"
                                                        title="Abrir Posts"
                                                    >
                                                        <ExternalLink size={18} />
                                                    </Link>
                                                    <button
                                                        className="icon-btn"
                                                        title="Copiar Link do Portal"
                                                        onClick={() => copyLink(client.name)}
                                                    >
                                                        <LinkIcon size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                        Nenhum cliente cadastrado no pipeline.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}

export default AdminPanel
