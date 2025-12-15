import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Send, Check, AlertTriangle, ArrowLeft, Loader2, Image as ImageIcon, MessageSquare, ThumbsUp, MessageCircle } from 'lucide-react'

// --- CUSTOM CSS STYLES (Vertical Feed + Compact Fixed Footer) ---
const pageStyles = `
  .feedback-page {
    min-height: 100vh;
    background-color: #f8fafc; /* Lighter background for better contrast */
    font-family: 'Montserrat', system-ui, sans-serif;
    color: #1f2937;
    /* Extra padding at bottom to prevent footer overlap */
    padding-bottom: 160px; 
  }
  
  .page-container {
    max-width: 700px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Navigation */
  .back-nav {
    margin-bottom: 0.5rem;
  }
  .btn-back {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 600;
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.2s;
  }
  .btn-back:hover { color: #0f172a; }

  /* SECTION 1: POST PREVIEW CARD */
  .post-preview-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }

  .preview-header {
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border-bottom: 1px solid #f8fafc;
  }
  .preview-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #64748b;
    font-size: 1.1rem;
  }
  .preview-meta h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #0f172a;
  }
  .preview-subtext {
    margin: 0;
    font-size: 0.75rem;
    color: #64748b;
  }

  /* Status Banner inside Post Card */
  .status-banner {
    padding: 0.4rem 0.8rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 99px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .status-approved { background: #dcfce7; color: #166534; }
  .status-pending { background: #fef9c3; color: #854d0e; }
  .status-changes { background: #ffedd5; color: #9a3412; }

  .post-content-text {
    padding: 1.25rem;
    white-space: pre-wrap;
    font-size: 0.95rem;
    line-height: 1.6;
    color: #334155;
  }

  .post-media {
    width: 100%;
    background: #000;
  }
  .post-media img {
    width: 100%;
    height: auto;
    display: block;
    max-height: 600px;
    object-fit: contain; /* Contain ensures full image visible */
  }
  .media-placeholder {
    background: #f8fafc;
    padding: 4rem;
    text-align: center;
    color: #94a3b8;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* Mock Social Actions Footer */
  .social-footer {
    padding: 0.75rem 1.25rem;
    display: flex;
    gap: 1.5rem;
    border-top: 1px solid #e2e8f0;
    color: #64748b;
    background: #fff;
  }
  .mock-action {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: default;
  }

  /* SECTION 2: FEEDBACK UI (Vertical below post) */
  .feedback-section {
    /* No visual container styles needed as it's just the messages */
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .feedback-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-left: 0.5rem;
  }

  .chat-scroll {
    /* Remove max-height so it flows naturally with the page */
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 2rem; /* Extra buffer */
  }

  .message-row {
    display: flex;
    flex-direction: column;
    max-width: 85%;
  }
  .row-admin { align-self: flex-end; align-items: flex-end; }
  .row-client { align-self: flex-start; }

  .chat-bubble {
    padding: 0.75rem 1rem;
    border-radius: 16px;
    font-size: 0.95rem;
    line-height: 1.5;
    position: relative;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  .bubble-admin {
    background: #3b82f6; 
    color: white;
    border-bottom-right-radius: 4px;
  }
  .bubble-client {
    background: white;
    border: 1px solid #e2e8f0;
    color: #1e293b;
    border-top-left-radius: 4px;
  }

  .chat-meta {
    font-size: 0.7rem;
    color: #94a3b8;
    margin-top: 4px;
    padding: 0 4px;
  }

  /* --- FIXED BOTTOM ACTION BAR --- */
  .fixed-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-top: 1px solid #e2e8f0;
    box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05);
    z-index: 1000;
    padding: 0.75rem 1rem;
  }

  .footer-content {
    max-width: 700px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Input Row */
  .input-wrapper {
    display: flex;
    gap: 0.5rem;
    background: #f1f5f9;
    padding: 0.25rem 0.25rem 0.25rem 1rem;
    border-radius: 99px;
    align-items: center;
  }
  .chat-input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0.5rem 0;
    outline: none;
    font-size: 0.9rem;
    color: #334155;
  }
  .btn-send {
    background: #3b82f6;
    color: white;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
  }
  .btn-send:hover { background: #2563eb; }

  /* Buttons Row (Client Only) */
  .approval-actions {
    display: flex;
    gap: 0.75rem;
  }
  .btn-action {
    flex: 1;
    padding: 0.6rem;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    text-align: center;
    transition: transform 0.1s;
  }
  .btn-action:active { transform: scale(0.98); }

  .btn-approve {
    background: #16a34a;
    color: white;
    border: none;
    box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);
  }
  .btn-request {
    background: white;
    color: #475569;
    border: 1px solid #cbd5e1;
  }
  
  /* Upload Button Style */
  .upload-btn-overlay {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 99px;
    font-size: 0.75rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    backdrop-filter: blur(4px);
  }
`

const PostFeedbackPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user, profile, loading: authLoading } = useAuth()
    const [post, setPost] = useState(null)
    const [comments, setComments] = useState([])
    const [loading, setLoading] = useState(true)
    const [messageText, setMessageText] = useState('')
    const [sending, setSending] = useState(false)
    const [uploading, setUploading] = useState(false)

    const commentsEndRef = useRef(null)
    const inputRef = useRef(null)

    const isAdmin = profile?.role === 'admin'
    const isClient = profile?.role === 'client'

    useEffect(() => { commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments])

    useEffect(() => {
        if (!id) return
        const fetchData = async () => {
            try {
                const { data: postData } = await supabase.from('tabela_projetofred1').select('*').eq('id', id).single()
                setPost(postData)
                const { data: commentsData } = await supabase.from('post_comments').select('*').eq('post_id', id).order('created_at', { ascending: true })
                setComments(commentsData || [])
            } catch (err) { console.error(err) } finally { setLoading(false) }
        }
        fetchData()
        const channel = supabase.channel(`post_feed_${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${id}` }, (pl) => setComments(prev => [...prev, pl.new])).subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [id])

    const handleSendMessage = async () => {
        if (!messageText.trim() || !user) return
        setSending(true)
        try {
            const authorName = isAdmin ? 'Link&Lead' : (post?.nome_cliente || 'Cliente')
            await supabase.from('post_comments').insert([{ post_id: id, content: messageText, role: isAdmin ? 'admin' : 'client', author_name: authorName }])
            setMessageText('')
        } catch (err) { alert('Erro ao enviar.') } finally { setSending(false) }
    }

    const handleUpdateStatus = async (newStatus) => {
        if (!isClient) return
        try {
            await supabase.from('tabela_projetofred1').update({ status: newStatus }).eq('id', id)
            setPost({ ...post, status: newStatus })
            if (newStatus === 'APPROVED') alert('Post Aprovado! 🚀')
            else inputRef.current?.focus()
        } catch (err) { alert('Erro.') }
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        setUploading(true)
        try {
            const fileName = `${id}_${Date.now()}_${file.name}`
            await supabase.storage.from('post-images').upload(fileName, file)
            const { data } = supabase.storage.from('post-images').getPublicUrl(fileName)
            await supabase.from('tabela_projetofred1').update({ sugestao_imagem: data.publicUrl }).eq('id', id)
            setPost({ ...post, sugestao_imagem: data.publicUrl })
        } catch (err) { alert('Erro no upload.') } finally { setUploading(false) }
    }

    if (authLoading || loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
    if (!post) return <div>404 Post Not Found</div>

    const statusObj = post.status === 'APPROVED' ? { cls: 'status-approved', txt: 'Aprovado' } : post.status === 'CHANGES_REQUESTED' ? { cls: 'status-changes', txt: 'Revisão Solicitada' } : { cls: 'status-pending', txt: 'Pendente' }

    return (
        <div className="feedback-page">
            <style>{pageStyles}</style>

            <div className="page-container">
                <div className="back-nav">
                    <button onClick={() => navigate(-1)} className="btn-back">
                        <ArrowLeft size={16} /> Voltar
                    </button>
                </div>

                {/* --- 1. POST PREVIEW (Top) --- */}
                <div className="post-preview-card">
                    {/* Header */}
                    <div className="preview-header">
                        <div className="preview-avatar">
                            {post.nome_cliente ? post.nome_cliente.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="preview-meta">
                            <h3>{post.nome_cliente || 'Nome do Cliente'}</h3>
                            <p className="preview-subtext">Post Preview • {new Date(post.created_at).toLocaleDateString()}</p>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                            <div className={`status-banner ${statusObj.cls}`}>
                                {statusObj.txt}
                            </div>
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="post-content-text">
                        {post.corpo_post}
                    </div>

                    {/* Media Content */}
                    <div className="post-media" style={{ position: 'relative' }}>
                        {post.sugestao_imagem ? (
                            <img src={post.sugestao_imagem} alt="Post" />
                        ) : (
                            <div className="media-placeholder">
                                <ImageIcon size={48} style={{ opacity: 0.3, marginBottom: 4 }} />
                                <span>Sem imagem selecionada</span>
                            </div>
                        )}

                        {isClient && (
                            <label className="upload-btn-overlay">
                                {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                                {uploading ? '...' : 'Alterar Imagem'}
                                <input type="file" onChange={handleImageUpload} hidden disabled={uploading} />
                            </label>
                        )}
                    </div>

                    {/* Mock Footer */}
                    <div className="social-footer">
                        <div className="mock-action"><ThumbsUp size={16} /> Curtir</div>
                        <div className="mock-action"><MessageCircle size={16} /> Comentar</div>
                    </div>
                </div>

                {/* --- 2. FEEDBACK (Messages) --- */}
                <div className="feedback-section">
                    <div className="feedback-title">Comentários</div>
                    <div className="chat-scroll">
                        {comments.length === 0 && <div style={{ textAlign: 'center', color: '#cbd5e1', padding: '1rem', fontSize: '0.9rem' }}>Nenhum comentário ainda.</div>}
                        {comments.map((msg, i) => {
                            const isAdminMsg = msg.role === 'admin'
                            return (
                                <div key={i} className={`message-row ${isAdminMsg ? 'row-admin' : 'row-client'}`}>
                                    <div className={`chat-bubble ${isAdminMsg ? 'bubble-admin' : 'bubble-client'}`}>
                                        {msg.content}
                                    </div>
                                    <div className="chat-meta">{msg.author_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            )
                        })}
                        <div ref={commentsEndRef}></div>
                    </div>
                </div>
            </div>

            {/* --- 3. FIXED COMPACT FOOTER --- */}
            <div className="fixed-footer">
                <div className="footer-content">
                    {/* Chat Input */}
                    <div className="input-wrapper">
                        <input
                            ref={inputRef}
                            className="chat-input"
                            placeholder="Digite sua mensagem..."
                            value={messageText}
                            onChange={e => setMessageText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button className="btn-send" onClick={handleSendMessage} disabled={sending || !messageText.trim()}>
                            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>

                    {/* Actions (Only Client) */}
                    {isClient && (
                        <div className="approval-actions">
                            <button className="btn-action btn-request" onClick={() => handleUpdateStatus('CHANGES_REQUESTED')}>
                                Solicitar Alteração
                            </button>
                            <button className="btn-action btn-approve" onClick={() => handleUpdateStatus('APPROVED')}>
                                Aprovar e Publicar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PostFeedbackPage
