import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Send, Check, AlertTriangle, ArrowLeft, Loader2, Image as ImageIcon, MessageSquare, ThumbsUp, MessageCircle, MessageSquarePlus } from 'lucide-react'
import { pdfjs, Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Sub-component for PDF Carousel
const PdfCarousel = ({ url }) => {
  const [numPages, setNumPages] = useState(null);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <Document file={url} onLoadSuccess={onDocumentLoadSuccess} className="flex gap-2">
      {Array.from(new Array(numPages), (el, index) => (
        <div key={`page_${index + 1}`} style={{ scrollSnapAlign: 'center', display: 'flex', justifyContent: 'center' }}>
          <Page
            pageNumber={index + 1}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            height={600}
            canvasBackground="white"
          />
        </div>
      ))}
    </Document>
  );
}

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
  // Magic Link Logic: If not admin, assume it's the client (Public Access)
  const isClient = !isAdmin

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

  const handleQuoteParagraph = (text) => {
    const maxLen = 100
    const truncated = text.length > maxLen ? text.substring(0, maxLen) + '...' : text
    const quote = `> "${truncated}"\n\n`

    // Append or set message
    setMessageText(prev => (prev ? prev + '\n' + quote : quote))

    // Scroll and Focus
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setTimeout(() => {
      inputRef.current?.focus()
    }, 300)
  }

  const handleSendMessage = async () => {
    if (!messageText.trim()) return
    setSending(true)
    try {
      const authorName = isAdmin ? 'Link&Lead' : (post?.nome_cliente || 'Cliente')

      const payload = {
        post_id: id,
        content: messageText,
        role: isAdmin ? 'admin' : 'client',
        author_name: authorName
        // user_id is NOT sent for guests/clients as it doesn't exist in the table schema or is optional
      }

      await supabase.from('post_comments').insert([payload])
      setMessageText('')
    } catch (err) { alert('Erro ao enviar.') } finally { setSending(false) }
  }

  const handleUpdateStatus = async (newStatus) => {
    if (!isClient) return

    let finalStatus = newStatus
    let successMessage = 'Post Aprovado! 🚀'

    // Smart Approval Logic
    if (newStatus === 'APPROVED') {
      if (post.data_agendamento) {
        finalStatus = 'AGENDADO'
        const date = new Date(post.data_agendamento).toLocaleString('pt-BR')
        successMessage = `Post aprovado e agendado automaticamente para ${date}! 📅`
      } else {
        successMessage = 'Post aprovado! Aguardando definição de data pela agência. ✅'
      }
    }

    try {
      await supabase.from('tabela_projetofred1').update({ status: finalStatus }).eq('id', id)
      setPost({ ...post, status: finalStatus })

      if (newStatus === 'APPROVED' || finalStatus === 'AGENDADO') {
        alert(successMessage)
      } else {
        inputRef.current?.focus()
      }
    } catch (err) { alert('Erro ao atualizar status.') }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fileName = `${id}_${Date.now()}_${file.name}`
      await supabase.storage.from('post-images').upload(fileName, file)
      const { data } = supabase.storage.from('post-images').getPublicUrl(fileName)

      // Save as array [url]
      const newImageArray = [data.publicUrl]

      await supabase.from('tabela_projetofred1').update({ sugestao_imagem: newImageArray }).eq('id', id)
      setPost({ ...post, sugestao_imagem: newImageArray })
    } catch (err) { alert('Erro no upload.') } finally { setUploading(false) }
  }

  if (authLoading || loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>
  if (!post) return <div>404 Post Not Found</div>

  const normalizedStatus = (post.status || '').toUpperCase()
  let statusObj = { cls: 'status-pending', txt: 'Pendente' }

  if (normalizedStatus === 'APPROVED' || normalizedStatus === 'APROVADO') {
    statusObj = { cls: 'status-approved', txt: 'Aprovado' }
  } else if (normalizedStatus === 'WAITING_APPROVAL' || normalizedStatus === 'PENDING') {
    statusObj = { cls: 'status-pending', txt: 'Aguardando Aprovação' }
  } else if (normalizedStatus === 'CHANGES_REQUESTED' || normalizedStatus.includes('REVI')) {
    statusObj = { cls: 'status-changes', txt: 'Revisão Solicitada' }
  } else if (normalizedStatus === 'AGENDADO') {
    statusObj = { cls: 'status-approved', txt: 'Agendado' } // Reusing approved style for scheduled
  } else if (normalizedStatus === 'POSTADO') {
    statusObj = { cls: 'status-approved', txt: 'Publicado' }
  }

  // Helper to get array
  const images = Array.isArray(post.sugestao_imagem) ? post.sugestao_imagem : post.sugestao_imagem ? [post.sugestao_imagem] : []

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
              <p className="preview-subtext">
                {post.data_agendamento
                  ? `Post Agendado para ${new Date(post.data_agendamento).toLocaleDateString('pt-BR')}`
                  : 'Post ainda não agendado'
                }
              </p>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <div className={`status-banner ${statusObj.cls}`}>
                {statusObj.txt}
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="post-content-text">
            {post.corpo_post && post.corpo_post.split(/\r?\n/).map((paragraph, idx) => {
              // If it's an empty line, render a small spacer to simulate a paragraph break
              if (!paragraph.trim()) return <div key={idx} style={{ height: '0.5rem' }} />

              return (
                <div key={idx} className="group relative p-1 -mx-1 hover:bg-gray-50 rounded transition-colors flex items-start">
                  <p className="flex-1 whitespace-pre-wrap leading-relaxed">{paragraph}</p>
                  <button
                    onClick={() => handleQuoteParagraph(paragraph)}
                    className="ml-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all text-blue-500 bg-white border border-blue-100 shadow-sm p-1 rounded-md hover:bg-blue-50 hover:text-blue-700 flex-shrink-0"
                    title="Citar este trecho"
                    style={{ marginTop: '0px' }}
                  >
                    <MessageSquarePlus size={14} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Media Content */}
          <div className="post-media" style={{ position: 'relative', background: '#000', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {images.length > 0 ? (
              <div style={{ display: 'flex', overflowX: 'auto', width: '100%', scrollSnapType: 'x mandatory', gap: '4px' }}>
                {images.map((url, idx) => {
                  const isPdf = url.toLowerCase().includes('.pdf')
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: '0 0 100%',
                        width: '100%',
                        height: '600px',
                        scrollSnapAlign: 'start',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f1f5f9'
                      }}
                    >
                      {isPdf ? (
                        <div style={{ width: '100%', height: '100%', overflowY: 'hidden', overflowX: 'auto', display: 'flex', scrollSnapType: 'x mandatory' }}>
                          <PdfCarousel url={url} />
                        </div>
                      ) : (
                        <img
                          src={url}
                          alt={`Slide ${idx}`}
                          style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '600px',
                            objectFit: 'contain'
                          }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
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

      {/* --- 4. STICKY ACTION BAR (Client Only & Pending) --- */}
      {isClient && (normalizedStatus === 'WAITING_APPROVAL' || normalizedStatus === 'PENDING') && (
        <div className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] mb-[70px]">
          <div className="max-w-[700px] mx-auto px-4 py-4 flex justify-between gap-4">
            <button
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
              onClick={() => {
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                setTimeout(() => {
                  inputRef.current?.focus()
                  setMessageText("Solicito ajuste em: ")
                }, 300)
              }}
            >
              Solicitar Alteração
            </button>

            <button
              className="flex-1 px-4 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
              onClick={() => handleUpdateStatus('APPROVED')}
            >
              Aprovar Post <Check size={18} />
            </button>
          </div>
        </div>
      )}

      {/* --- 5. ALWAYS VISIBLE CHAT FOOTER --- */}
      <div className="fixed-footer" style={{ zIndex: 40 }}>
        <div className="footer-content">
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
        </div>
      </div>

      {/* Helper Spacer to prevent content from being hidden behind footer */}
      <div style={{ height: '100px' }}></div>
    </div>
  )
}

export default PostFeedbackPage
