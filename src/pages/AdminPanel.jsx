import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import {
    Loader2,
    Briefcase,
    ExternalLink,
    Link as LinkIcon,
    Users,
    ArrowUpRight
} from 'lucide-react'

const AdminPanel = () => {
    const { profile, loading: authLoading } = useAuth()
    const [clients, setClients] = useState([])
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [unreadCounts, setUnreadCounts] = useState({})

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
            setClients(clientsData || [])
            setPosts(postsData || [])

        } catch (err) {
            console.error('Erro ao carregar dashboard:', err)
        } finally {
            setLoading(false)
        }
    }

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

    const renderCount = (count, type) => {
        if (count === 0) return <span className="text-gray-600 font-light">-</span>

        let colorClass = 'text-white'
        switch (type) {
            case 'draft': colorClass = 'text-gray-300'; break;
            case 'waiting': colorClass = 'text-amber-400 font-bold'; break;
            case 'review': colorClass = 'text-red-400 font-bold'; break;
            case 'approved': colorClass = 'text-emerald-400 font-bold'; break;
        }

        return <span className={`text-lg ${colorClass}`}>{count}</span>
    }

    const copyLink = (clientName) => {
        const url = `${window.location.origin}/login`
        navigator.clipboard.writeText(url)
        alert('Link do Portal copiado!')
    }

    return (
        <div className="min-h-screen bg-obsidian text-white p-8 relative overflow-hidden">
            {/* BACKGROUND ACCENTS */}
            <div className="fixed top-20 right-20 w-96 h-96 bg-primary/10 blur-[100px] rounded-full pointer-events-none z-0" />

            {/* FLOATING HUD HEADER */}
            <header className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Progresso da Agência</h1>
                    <p className="text-gray-400">Visão geral do pipeline por cliente</p>
                </div>
                <div className="flex items-center gap-4">
                    <Link to="/clients" className="glass-panel px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white hover:border-primary/50 transition-all flex items-center gap-2">
                        <Users size={16} />
                        Gerenciar Clientes
                    </Link>
                    <div className="px-4 py-2 rounded-full border border-glass-border bg-white/5 text-sm font-medium text-gray-400">
                        Admin Agência
                    </div>
                </div>
            </header>

            {/* GLASS TABLE CONTAINER */}
            <div className="relative z-10 glass-panel rounded-2xl overflow-hidden border-glass-border/30 shadow-2xl animate-fade-in-up">
                {loading ? (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="tracking-wide uppercase text-xs font-bold">Carregando pipeline...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-glass-border">
                                    <th className="p-5 text-gray-500 font-medium text-xs uppercase tracking-wider pl-8">Cliente</th>
                                    <th className="p-5 text-center text-gray-500 font-medium text-xs uppercase tracking-wider">Ideias</th>
                                    <th className="p-5 text-center text-amber-500/80 font-medium text-xs uppercase tracking-wider">Aguardando</th>
                                    <th className="p-5 text-center text-red-500/80 font-medium text-xs uppercase tracking-wider">Revisão</th>
                                    <th className="p-5 text-center text-emerald-500/80 font-medium text-xs uppercase tracking-wider">Aprovados</th>
                                    <th className="p-5 text-right text-gray-500 font-medium text-xs uppercase tracking-wider pr-8">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-glass-border/50">
                                {clients.length > 0 ? (
                                    clients.map(client => {
                                        const stats = getClientStats(client.name)
                                        const initial = client.name.charAt(0).toUpperCase()

                                        return (
                                            <tr key={client.id} className="group hover:bg-white/5 transition-colors duration-200">
                                                <td className="p-5 pl-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border border-glass-border flex items-center justify-center text-sm font-bold text-gray-300 shadow-inner group-hover:border-primary/50 transition-colors">
                                                            {initial}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-200 group-hover:text-white transition-colors">{client.name}</span>
                                                            {unreadCounts[client.name] > 0 && (
                                                                <span className="text-xs text-red-400 animate-pulse font-bold flex items-center gap-1 mt-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                                    {unreadCounts[client.name]} nova(s) msg
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="p-5 text-center">
                                                    {renderCount(stats.drafts, 'draft')}
                                                </td>

                                                <td className="p-5 text-center">
                                                    {renderCount(stats.waiting, 'waiting')}
                                                </td>

                                                <td className="p-5 text-center">
                                                    {stats.review > 0 ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                                            {stats.review}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-600">-</span>
                                                    )}
                                                </td>

                                                <td className="p-5 text-center relative overflow-hidden">
                                                    {renderCount(stats.approved, 'approved')}
                                                    {stats.approved > 0 && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500/20 group-hover:bg-emerald-500/50 transition-colors" />}
                                                </td>

                                                <td className="p-5 pr-8 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <Link
                                                            to={`/posts?client=${encodeURIComponent(client.name)}`}
                                                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                            title="Abrir Posts"
                                                        >
                                                            <ArrowUpRight size={18} />
                                                        </Link>
                                                        <button
                                                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-primary transition-colors"
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
                                        <td colSpan="6" className="p-12 text-center text-gray-500">
                                            Nenhum cliente cadastrado no pipeline.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminPanel
