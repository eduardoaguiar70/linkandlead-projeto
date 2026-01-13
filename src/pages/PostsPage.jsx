import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import {
    Loader2,
    ExternalLink,
    FileText,
    Trash2,
    Link as LinkIcon,
    AlertCircle,
    Filter,
    Pencil,
    MessageCircle,
    CalendarClock
} from 'lucide-react'
import EditPostModal from '../components/EditPostModal'
import SchedulePostModal from '../components/SchedulePostModal'
import './PostsPage.css'

const PostsPage = () => {
    // Dashboard States
    // Helper for Status Translation
    const getStatusLabel = (status) => {
        if (!status) return 'Desconhecido'

        const map = {
            'WAITING_APPROVAL': 'Aguardando Aprovação',
            'CHANGES_REQUESTED': 'Alteração Solicitada',
            'APPROVED': 'Aprovado',
            'waiting_approval': 'Aguardando Aprovação',
            'changes_requested': 'Alteração Solicitada',
            'approved': 'Aprovado',
            'postado': 'Postado',
            'POSTADO': 'Postado',
            'AGENDADO': 'Agendado'
        }

        return map[status] || map[status.toUpperCase()] || map[status.toLowerCase()] || status
    }

    const { profile, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [posts, setPosts] = useState([])
    const [loadingPosts, setLoadingPosts] = useState(true)
    const [statusFilter, setStatusFilter] = useState('Todos')
    const [editingPost, setEditingPost] = useState(null)
    const [schedulingPost, setSchedulingPost] = useState(null)
    const [searchParams] = useSearchParams()
    const clientFilter = searchParams.get('client')

    // Notifications State
    const [unreadCounts, setUnreadCounts] = useState({})

    // Stable Fetch Functions
    // Safe Mount Check
    const isMounted = React.useRef(true)
    useEffect(() => {
        return () => { isMounted.current = false }
    }, [])

    const fetchPosts = React.useCallback(async () => {
        setLoadingPosts(true)
        try {
            let query = supabase
                .from('tabela_projetofred1')
                .select('*')
                .order('id', { ascending: false })
                .range(0, 49) // Limit to last 50 items

            // Role-based filtering
            // IMPORTANT: If Admin, show ALL. If Client, show ONLY THEIRS.
            if (profile?.role === 'client') {
                if (profile.nome_empresa) {
                    query = query.eq('nome_cliente', profile.nome_empresa)
                } else {
                    console.warn('Cliente sem nome_empresa definido.')
                    setPosts([])
                    return
                }
            }
            // Admin gets standard "All Posts" query (unless client param exists for specific filter)
            if (clientFilter && clientFilter.trim() !== '') {
                query = query.eq('nome_cliente', clientFilter)
            }

            const { data, error } = await query
            if (error) throw error

            // BLINDAGEM: Se houver processamento de dados (ex: map), proteja-o
            // Normalize status strictly to Uppercase String or UNKNOWN
            const postsTratados = (data || []).map(post => ({
                ...post,
                status: post.status ? String(post.status).toUpperCase() : 'UNKNOWN'
            }));

            // FORCE STATE UPDATE - NO MOUNT CHECK
            setPosts(postsTratados);

        } catch (err) {
            console.error("Erro CRÍTICO no fetch ou processamento:", err);
        } finally {
            setLoadingPosts(false); // FORÇAR REMOÇÃO DO SPINNER
        }
    }, [profile?.role, profile?.nome_empresa, clientFilter])

    const fetchUnreadMessages = React.useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('post_comments')
                .select('post_id')
                .eq('read_by_admin', false)
                .eq('role', 'client')

            if (error) throw error

            const counts = {}
            data.forEach(msg => {
                counts[msg.post_id] = (counts[msg.post_id] || 0) + 1
            })
            setUnreadCounts(counts)
        } catch (err) {
            console.error("Erro ao buscar notificações:", err)
        }
    }, [])

    useEffect(() => {
        if (!authLoading && profile) {
            // Initial Load
            fetchPosts()
            fetchUnreadMessages()

            // Realtime subscription (Cleanup enforced)
            const channel = supabase
                .channel('realtime:posts_and_comments')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tabela_projetofred1' }, () => {
                    fetchPosts()
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => {
                    fetchUnreadMessages()
                })
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [authLoading, profile?.id, fetchPosts, fetchUnreadMessages]) // Primitive dependency + memozied functions



    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este post?')) return

        try {
            const { error } = await supabase
                .from('tabela_projetofred1')
                .delete()
                .eq('id', id)

            if (error) throw error
            setPosts(posts.filter(post => post.id !== id))
        } catch (err) {
            alert('Erro ao excluir: ' + err.message)
        }
    }

    const copyLink = (id) => {
        const url = `${window.location.origin}/aprovacao?id=${id}`
        navigator.clipboard.writeText(url)
        alert('Link copiado!')
    }

    const getStatusColor = (status) => {
        const s = (status || 'WAITING_APPROVAL').toUpperCase()
        if (s === 'APPROVED' || s === 'APROVADO' || s.includes('APPROV')) return 'badge-success'
        if (s === 'CHANGES_REQUESTED' || s.includes('CHANGE') || s.includes('REVI')) return 'badge-warning'
        if (s.includes('POSTADO')) return 'badge-purple'
        if (s === 'AGENDADO') return 'badge-purple' // Or another distinctive color like badge-primary
        return 'badge-info'
    }

    // Filter Logic
    const filteredPosts = posts.filter(post => {
        // 1. Client Filter (URL)
        if (clientFilter && clientFilter.trim() !== '' && post.nome_cliente !== clientFilter) return false

        // 2. Tab Filter
        if (statusFilter === 'Todos') return true

        const s = (post.status || 'WAITING_APPROVAL').toUpperCase()
        if (statusFilter === 'Pendentes') return s === 'WAITING_APPROVAL' || s.includes('WAITING')
        if (statusFilter === 'Aprovados') return s === 'APPROVED' || s.includes('APPROV')
        if (statusFilter === 'Revisão') return s === 'CHANGES_REQUESTED' || s.includes('REVI')
        return true
    })

    return (
        <div style={{ padding: '0' }}>
            <header className="top-bar">
                <div>
                    <h1>Meus Posts</h1>
                    {clientFilter && (
                        <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <Filter size={16} /> Filtrando por cliente: <strong>{clientFilter}</strong>
                            <Link to="/posts" style={{ color: '#2563eb', fontSize: '0.875rem', marginLeft: '0.5rem' }}>Limpar</Link>
                        </span>
                    )}
                </div>
                <div className="user-profile">
                    <span>Admin Agência</span>
                </div>
            </header>

            <div className="filters-bar">
                <div className="tabs">
                    {['Todos', 'Pendentes', 'Aprovados', 'Revisão'].map(filter => (
                        <button
                            key={filter}
                            className={`tab-btn ${statusFilter === filter ? 'active' : ''}`}
                            onClick={() => setStatusFilter(filter)}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            <div className="table-container">
                {loadingPosts ? (
                    <div className="loading-state">
                        <Loader2 className="spinner" /> Carregando posts...
                    </div>
                ) : (
                    <table className="posts-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Cliente</th>
                                <th>Tema</th>
                                <th>Público Alvo</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPosts.length > 0 ? (
                                filteredPosts.map(post => {
                                    const unreadCount = unreadCounts[post.id] || 0
                                    return (
                                        <tr key={post.id}>
                                            <td>#{post.id}</td>
                                            <td className="fw-500">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {post.nome_cliente || 'N/A'}
                                                    {unreadCount > 0 && (
                                                        <span title={`${unreadCount} novas mensagens`} style={{
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold',
                                                            padding: '0.1rem 0.5rem',
                                                            borderRadius: '99px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            <MessageCircle size={10} fill="white" /> {unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{post.tema || 'Sem Tema'}</td>
                                            <td>{post.publico || '-'}</td>
                                            <td>
                                                <span className={`badge ${getStatusColor(post.status)}`}>
                                                    {getStatusLabel(post.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="actions-group">
                                                    <button
                                                        className="icon-btn"
                                                        title="Abrir Sala de Guerra"
                                                        onClick={() => navigate(`/post-feedback/${post.id}`)}
                                                        style={{ position: 'relative' }}
                                                    >
                                                        <ExternalLink size={18} />
                                                        {unreadCount > 0 && <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: '#ef4444', borderRadius: '50%' }}></span>}
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        title="Editar Post"
                                                        onClick={() => setEditingPost(post)}
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        title="Copiar Link"
                                                        onClick={() => copyLink(post.id)}
                                                    >
                                                        <LinkIcon size={18} />
                                                    </button>
                                                    <button
                                                        className="icon-btn text-danger"
                                                        title="Excluir"
                                                        onClick={() => handleDelete(post.id)}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                    <button
                                                        className="icon-btn"
                                                        title="Agendar Postagem"
                                                        onClick={() => setSchedulingPost(post)}
                                                        style={{ color: '#8b5cf6' }}
                                                    >
                                                        <CalendarClock size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                        Nenhum post encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {editingPost && (
                <EditPostModal
                    post={editingPost}
                    onClose={() => setEditingPost(null)}
                    onSuccess={() => {
                        fetchPosts()
                        setEditingPost(null)
                    }}
                />
            )}

            {schedulingPost && (
                <SchedulePostModal
                    post={schedulingPost}
                    onClose={() => setSchedulingPost(null)}
                    onSuccess={() => {
                        fetchPosts()
                        setSchedulingPost(null)
                    }}
                />
            )}
        </div>
    )
}

export default PostsPage
