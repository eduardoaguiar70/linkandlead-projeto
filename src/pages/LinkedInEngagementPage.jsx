import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import {
    ThumbsUp,
    MessageCircle,
    UserPlus,
    Send,
    X,
    Clock,
    Users,
    Loader2,
    MessageSquare,
    Linkedin,
    RefreshCw,
    Check
} from 'lucide-react'

// Helper: relative time in Portuguese
const timeAgo = (dateString) => {
    if (!dateString) return ''
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora mesmo'
    if (diffMins < 60) return `Há ${diffMins} min`
    if (diffHours < 24) return `Há ${diffHours}h`
    if (diffDays === 1) return 'Há 1 dia'
    if (diffDays < 30) return `Há ${diffDays} dias`
    return date.toLocaleDateString('pt-BR')
}

const LinkedInEngagementPage = () => {
    const { selectedClientId } = useClientSelection()

    // Posts state
    const [posts, setPosts] = useState([])
    const [loadingPosts, setLoadingPosts] = useState(false)
    const [selectedPost, setSelectedPost] = useState(null)

    // Comments state
    const [comments, setComments] = useState([])
    const [loadingComments, setLoadingComments] = useState(false)

    // Connect modal state
    const [connectModal, setConnectModal] = useState(null) // { author_name, author_urn_id }
    const [connectNote, setConnectNote] = useState('')

    // Sync state
    const [isSyncing, setIsSyncing] = useState(false)
    const [notification, setNotification] = useState(null) // { message, type }

    // Reusable fetch function
    const fetchPosts = useCallback(async (resetSelection = true) => {
        if (!selectedClientId) return
        setLoadingPosts(true)
        try {
            const { data, error } = await supabase
                .from('linkedin_posts')
                .select('*')
                .eq('client_id', selectedClientId)
                .order('created_at_linkedin', { ascending: false })

            if (error) throw error
            setPosts(data || [])
            if (resetSelection) {
                setSelectedPost(null)
                setComments([])
            }
        } catch (err) {
            console.error('Error fetching LinkedIn posts:', err)
        } finally {
            setLoadingPosts(false)
        }
    }, [selectedClientId])

    // 1. Initial fetch
    useEffect(() => {
        if (!selectedClientId) {
            setPosts([])
            setSelectedPost(null)
            return
        }
        fetchPosts()
    }, [selectedClientId, fetchPosts])

    // 2. Fetch Comments for selected post
    useEffect(() => {
        if (!selectedPost) {
            setComments([])
            return
        }

        const fetchComments = async () => {
            setLoadingComments(true)
            try {
                const { data, error } = await supabase
                    .from('linkedin_comments')
                    .select('*')
                    .eq('post_id', selectedPost.id)
                    .order('created_at', { ascending: false })

                if (error) throw error
                setComments(data || [])
            } catch (err) {
                console.error('Error fetching comments:', err)
            } finally {
                setLoadingComments(false)
            }
        }

        fetchComments()
    }, [selectedPost?.id])

    // 3. Sync Handler
    const handleSyncLinkedIn = async () => {
        setIsSyncing(true)
        setNotification(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook-test/sync-linkedin-comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user?.id || 'system_user',
                    client_id: selectedClientId
                })
            })

            if (!response.ok) throw new Error('Erro na sincronização')

            // Refetch posts (keep current selection if possible)
            await fetchPosts(false)

            setNotification({ message: 'Posts e comentários atualizados!', type: 'success' })
        } catch (err) {
            console.error('Sync error:', err)
            setNotification({ message: err.message || 'Erro ao sincronizar. Tente novamente.', type: 'error' })
        } finally {
            setIsSyncing(false)
            setTimeout(() => setNotification(null), 5000)
        }
    }

    // 4. Action Handlers
    const handleOpenChat = (authorUrnId) => {
        console.log('handleOpenChat:', authorUrnId)
    }

    const handleConnect = (authorUrnId, noteText) => {
        console.log('handleConnect:', authorUrnId, noteText)
        setConnectModal(null)
        setConnectNote('')
    }

    const handleSelectPost = (post) => {
        setSelectedPost(post)
    }

    // Extract metrics safely
    const getMetrics = (post) => {
        const metrics = post.metrics || {}
        return {
            likes: metrics.likes_count || 0,
            comments: metrics.comments_count || 0
        }
    }

    // No client selected
    if (!selectedClientId) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <div className="text-center space-y-3">
                    <Users size={48} className="mx-auto text-slate-300" />
                    <h2 className="text-xl font-bold text-slate-600">Selecione um Cliente</h2>
                    <p className="text-sm text-slate-400">Escolha um cliente no seletor acima para ver o engajamento LinkedIn.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6 h-full">
            {/* TOAST NOTIFICATION */}
            {notification && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-xl shadow-2xl border-2 flex items-center gap-3 animate-slide-in-right min-w-[300px] ${notification.type === 'error'
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    }`}>
                    {notification.type === 'error' ? <X size={20} className="shrink-0" /> : <Check size={20} className="shrink-0" />}
                    <span className="text-sm font-semibold flex-1">{notification.message}</span>
                </div>
            )}

            {/* PAGE HEADER */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Linkedin size={22} className="text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Engajamento LinkedIn</h1>
                        <p className="text-sm text-slate-500">Analise posts e interaja com quem comentou</p>
                    </div>
                </div>
            </div>

            {/* SPLIT VIEW */}
            <div className="flex gap-4 h-[calc(100vh-220px)]">

                {/* LEFT COLUMN — Posts List */}
                <div className="w-[380px] shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Posts Recentes</h2>
                            <p className="text-xs text-slate-400 mt-0.5">{posts.length} posts encontrados</p>
                        </div>
                        <button
                            onClick={handleSyncLinkedIn}
                            disabled={isSyncing}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isSyncing
                                ? 'bg-blue-50 text-blue-400 cursor-not-allowed'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                                }`}
                            title="Buscar novos posts e comentários"
                        >
                            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                            {isSyncing ? 'Atualizando...' : 'Atualizar'}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loadingPosts ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 size={24} className="animate-spin text-blue-500" />
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <Linkedin size={32} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm text-slate-400">Nenhum post encontrado</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {posts.map(post => {
                                    const { likes, comments: commentCount } = getMetrics(post)
                                    const isSelected = selectedPost?.id === post.id

                                    return (
                                        <button
                                            key={post.id}
                                            onClick={() => handleSelectPost(post)}
                                            className={`w-full text-left p-4 transition-all hover:bg-slate-50 ${isSelected
                                                ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                                : 'border-l-4 border-l-transparent'
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                {/* Post Thumbnail */}
                                                {post.post_image_url && (
                                                    <img
                                                        src={post.post_image_url}
                                                        alt=""
                                                        className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-200"
                                                        onError={(e) => { e.target.style.display = 'none' }}
                                                    />
                                                )}

                                                {/* Text content */}
                                                <div className="flex-1 min-w-0">
                                                    {/* Snippet — max 2 lines */}
                                                    <p className="text-sm text-slate-700 font-medium line-clamp-2 leading-snug">
                                                        {post.content_snippet || 'Post sem conteúdo'}
                                                    </p>

                                                    {/* Meta row */}
                                                    <div className="flex items-center gap-3 mt-2.5">
                                                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                            <Clock size={11} />
                                                            {timeAgo(post.created_at_linkedin)}
                                                        </span>
                                                        <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                                            <ThumbsUp size={10} /> {likes}
                                                        </span>
                                                        <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                                            <MessageCircle size={10} /> {commentCount}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN — Comments */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    {!selectedPost ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center space-y-2">
                                <MessageSquare size={40} className="mx-auto text-slate-300" />
                                <p className="text-sm text-slate-400 font-medium">Selecione um post para ver os comentários</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Selected Post Header */}
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <p className="text-sm text-slate-700 font-medium line-clamp-3 leading-relaxed">
                                    {selectedPost.content_snippet}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-[11px] text-slate-400">
                                        {timeAgo(selectedPost.created_at_linkedin)}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-medium">
                                        {comments.length} comentários carregados
                                    </span>
                                </div>
                            </div>

                            {/* Comments List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {loadingComments ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 size={24} className="animate-spin text-blue-500" />
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="text-center py-16">
                                        <MessageCircle size={32} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-sm text-slate-400">Nenhum comentário neste post</p>
                                    </div>
                                ) : (
                                    comments.map(comment => (
                                        <div
                                            key={comment.id}
                                            className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group"
                                        >
                                            {/* Avatar */}
                                            {comment.author_image_url ? (
                                                <img
                                                    src={comment.author_image_url}
                                                    alt={comment.author_name || 'Autor'}
                                                    className="w-10 h-10 rounded-full shrink-0 object-cover border border-slate-200"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none'
                                                        e.target.nextSibling.style.display = 'flex'
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 ${comment.author_image_url ? 'hidden' : ''}`}>
                                                {(comment.author_name || '?')[0].toUpperCase()}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <a
                                                            href={comment.author_profile_url || '#'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors"
                                                        >
                                                            {comment.author_name || 'Autor desconhecido'}
                                                        </a>
                                                        {comment.author_headline && (
                                                            <p className="text-xs text-slate-400 truncate max-w-[300px]">
                                                                {comment.author_headline}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Action Button */}
                                                    {comment.is_connection ? (
                                                        <button
                                                            onClick={() => handleOpenChat(comment.author_urn_id)}
                                                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Enviar mensagem"
                                                        >
                                                            <MessageCircle size={13} />
                                                            Mensagem
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConnectModal({
                                                                author_name: comment.author_name,
                                                                author_urn_id: comment.author_urn_id
                                                            })}
                                                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Enviar convite de conexão"
                                                        >
                                                            <UserPlus size={13} />
                                                            Conectar
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Comment Text */}
                                                <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                        {comment.content}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* CONNECT MODAL */}
            {connectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md animate-fade-in">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Enviar Convite</h3>
                                <p className="text-sm text-slate-400 mt-0.5">
                                    Conectar com <span className="font-semibold text-slate-600">{connectModal.author_name}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => { setConnectModal(null); setConnectNote('') }}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Nota de Conexão (opcional)
                            </label>
                            <textarea
                                value={connectNote}
                                onChange={(e) => setConnectNote(e.target.value)}
                                placeholder="Escreva uma nota personalizada para o convite..."
                                className="w-full h-28 p-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                                maxLength={300}
                            />
                            <p className="text-xs text-slate-400 mt-1 text-right">{connectNote.length}/300</p>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
                            <button
                                onClick={() => { setConnectModal(null); setConnectNote('') }}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleConnect(connectModal.author_urn_id, connectNote)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Send size={14} />
                                Enviar Convite
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default LinkedInEngagementPage
