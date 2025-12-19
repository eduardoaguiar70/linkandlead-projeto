import React, { useState, useEffect, useRef } from 'react'
import { useClientAuth } from '../contexts/ClientAuthContext'
import { supabase } from '../services/supabaseClient'
import { useParams } from 'react-router-dom'
import {
    LayoutDashboard,
    CheckCircle2,
    AlertCircle,
    Mic,
    StopCircle,
    Play,
    Trash2,
    Send,
    Loader2,
    X,
    ChevronRight,
    MessageSquare,
    Image as ImageIcon,
    Clock,
    MoreHorizontal
} from 'lucide-react'
import ContentCalendar from '../components/ContentCalendar'

// --- STYLES (Responsive Grid & UI) ---
const pageStyles = `
  .insights-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem 6rem;
    font-family: 'Inter', system-ui, sans-serif;
    color: #1e293b;
  }
  
  /* Header */
  .insights-header {
    margin-bottom: 3rem;
  }
  .insights-header h1 {
    font-size: 2rem;
    font-weight: 800;
    color: #111827;
    margin-bottom: 0.5rem;
    letter-spacing: -0.025em;
  }
  .insights-header p {
    font-size: 1.125rem;
    color: #64748b;
    line-height: 1.6;
  }
  .highlight-stats {
    color: #7c3aed; /* Purple brand */
    font-weight: 700;
  }

  /* Grid Layout */
  .insights-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
    margin-bottom: 4rem;
  }
  @media (min-width: 768px) {
    .insights-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (min-width: 1024px) {
    .insights-grid { grid-template-columns: repeat(3, 1fr); }
  }

  /* Card Component */
  .insight-card {
    background: #ffffff;
    border-radius: 20px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
  }
  .insight-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    border-color: #cbd5e1;
  }

  /* Card Image */
  .card-image-wrapper {
    height: 200px;
    background: #f1f5f9;
    position: relative;
    overflow: hidden;
  }
  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  .insight-card:hover .card-image {
    transform: scale(1.05);
  }
  .card-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    color: #94a3b8;
  }

  /* Floating Badge */
  .status-badge-float {
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.35rem 0.85rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    backdrop-filter: blur(8px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  /* Card Content */
  .card-body {
    padding: 1.5rem;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .card-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.4;
    margin-bottom: 0.75rem;
    
    /* Line Clamp 2 */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-meta {
    font-size: 0.825rem;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: auto; /* Pushes footer down */
  }

  /* Card Actions */
  .card-actions {
    margin-top: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid #f1f5f9;
  }
  .btn-action {
    width: 100%;
    padding: 0.75rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    cursor: pointer;
    transition: background 0.2s;
  }
  /* Primary Action (Purple) */
  .btn-primary {
    background: #7c3aed;
    color: white;
  }
  .btn-primary:hover {
    background: #6d28d9;
  }
  /* Secondary Action (Outline) */
  .btn-outline {
    background: transparent;
    color: #7c3aed;
    border: 1px solid #e9d5ff;
  }
  .btn-outline:hover {
    background: #faf5ff;
    border-color: #d8b4fe;
  }

  /* Questions List */
  .questions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .question-item {
    background: white;
    padding: 1.5rem;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: transform 0.2s;
  }
  .question-item:hover {
    transform: translateX(4px);
    border-color: #cbd5e1;
  }

  /* Image Count Badge */
  .image-count-badge {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.25rem 0.6rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 700;
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    gap: 4px;
  }
`

// --- HELPERS ---
const getImagesFromPost = (post) => {
    if (!post.sugestao_imagem) return []

    // 1. If it's already an array (Supabase JSON/Array column), return it
    if (Array.isArray(post.sugestao_imagem)) {
        return post.sugestao_imagem
    }

    try {
        const val = String(post.sugestao_imagem).trim()
        // 2. Check if it looks like a JSON array
        if (val.startsWith('[')) {
            const parsed = JSON.parse(val)
            if (Array.isArray(parsed)) return parsed
        }
        // 3. Fallback for single string URL
        return [val]
    } catch (e) {
        // Failsafe
        return [post.sugestao_imagem]
    }
}

// --- SUB-COMPONENT: QUESTION RESPONSE MODAL ---
const QuestionResponseModal = ({ question, onClose, onResponseSent }) => {
    const [answerText, setAnswerText] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [audioBlob, setAudioBlob] = useState(null)
    const [audioUrl, setAudioUrl] = useState(null)
    const [publicAudioUrl, setPublicAudioUrl] = useState(null)
    const [recordingTime, setRecordingTime] = useState(0)

    const [isProcessing, setIsProcessing] = useState(false)
    const [isReviewing, setIsReviewing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const mediaRecorderRef = useRef(null)
    const timerRef = useRef(null)

    useEffect(() => { return () => { if (audioUrl) URL.revokeObjectURL(audioUrl) } }, [audioUrl])

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            const chunks = []
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' })
                const url = URL.createObjectURL(blob)
                setAudioBlob(blob)
                setAudioUrl(url)
                stream.getTracks().forEach(track => track.stop())
            }
            mediaRecorder.start()
            setIsRecording(true)
            setRecordingTime(0)
            timerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1) }, 1000)
        } catch (err) { alert('Erro microfone: ' + err.message) }
    }

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [])

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            clearInterval(timerRef.current)
        }
    }

    const discardRecording = () => {
        setAudioBlob(null); setAudioUrl(null); setRecordingTime(0); setIsReviewing(false); setPublicAudioUrl(null)
    }

    const handleProcessAudio = async () => {
        if (!audioBlob) return alert("Áudio vazio.")
        if (audioBlob.size > 50 * 1024 * 1024) return alert("O arquivo de áudio excede o limite de 50MB.")
        setIsProcessing(true)
        try {
            const fileName = "audio_" + Date.now() + ".webm"
            const audioFile = new File([audioBlob], fileName, { type: 'audio/webm' })
            const { error: upErr } = await supabase.storage.from('audio-responses').upload(fileName, audioFile)
            if (upErr) throw upErr
            const { data: pubData } = supabase.storage.from('audio-responses').getPublicUrl(fileName)
            const generatedUrl = pubData.publicUrl
            setPublicAudioUrl(generatedUrl)

            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/transcrever-audio', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question_id: question.id, audio_url: generatedUrl })
            })
            if (response.ok) {
                const webData = await response.json()
                if (webData?.transcription) setAnswerText(webData.transcription)
            }
            setIsReviewing(true)
        } catch (err) { alert("Erro processar: " + err.message) } finally { setIsProcessing(false) }
    }

    const handleConfirmSend = async () => {
        if (!answerText.trim() && !audioBlob) return alert('Escreva ou grave algo.')
        setIsSaving(true)
        try {
            const { error } = await supabase.from('interview_questions').update({
                answer_text: answerText, answer_audio_url: publicAudioUrl, status: 'answered'
            }).eq('id', question.id)
            if (error) throw error
            onResponseSent(question.id); onClose()
        } catch (err) { alert('Erro salvar: ' + err.message) } finally { setIsSaving(false) }
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', width: '90%', maxWidth: '600px', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#94a3b8" /></button>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem', paddingRight: '2rem' }}>{question.question_text}</h3>

                {!isReviewing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {!audioBlob && <textarea placeholder="Escreva sua resposta..." value={answerText} onChange={e => setAnswerText(e.target.value)} style={{ width: '100%', minHeight: '120px', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />}
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
                            {!isRecording && !audioBlob && <button onClick={startRecording} style={{ display: 'flex', gap: '8px', color: '#ef4444', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}><Mic /> Gravar Áudio</button>}
                            {isRecording && <span style={{ color: '#ef4444', fontWeight: 600 }}>Gravando... {Math.floor(recordingTime / 60)}:{recordingTime % 60 < 10 ? '0' : ''}{recordingTime % 60}</span>}
                            {isRecording && <button onClick={stopRecording} style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '99px' }}>Parar</button>}
                            {audioBlob && <div style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'center' }}><audio src={audioUrl} controls style={{ flex: 1, height: 36 }} /><button onClick={discardRecording} style={{ border: 'none', background: 'none' }}><Trash2 color="#64748b" /></button></div>}
                        </div>
                        <button onClick={audioBlob ? handleProcessAudio : handleConfirmSend} disabled={(!answerText.trim() && !audioBlob) || isProcessing || isSaving} style={{ width: '100%', padding: '1rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, opacity: (!answerText.trim() && !audioBlob) ? 0.5 : 1 }}>{isProcessing ? 'Processando...' : isSaving ? 'Enviando...' : audioBlob ? 'Transcrever e Revisar' : 'Enviar Resposta'}</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '8px' }}><CheckCircle2 /> Transcrição pronta!</div>
                        <textarea value={answerText} onChange={e => setAnswerText(e.target.value)} style={{ width: '100%', minHeight: '150px', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                        <div style={{ display: 'flex', gap: '1rem' }}><button onClick={() => setIsReviewing(false)} style={{ flex: 1, padding: '1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }}>Voltar</button><button onClick={handleConfirmSend} style={{ flex: 1, padding: '1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600 }}>Confirmar Envio</button></div>
                    </div>
                )}
            </div>
        </div>
    )
}

// --- SUB-COMPONENT: POST REVIEW MODAL ---
const PostReviewModal = ({ post, onClose, onReview }) => {
    const [comment, setComment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [currentImgIndex, setCurrentImgIndex] = useState(0)

    const images = getImagesFromPost(post)
    const currentImage = images[currentImgIndex]

    const handleAction = async (action) => {
        setIsSubmitting(true)
        try {
            await onReview(post.id, action === 'approve' ? 'aprovado' : 'revisão', comment)
            onClose()
        } catch (err) { alert(err.message) } finally { setIsSubmitting(false) }
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ background: 'white', width: '95%', maxWidth: '1000px', height: '85vh', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>
                <div style={{ flex: 1.5, background: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

                    {/* Image */}
                    {currentImage ? (
                        <img src={currentImage} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Post" />
                    ) : (
                        <div style={{ color: 'white' }}>Sem Imagem</div>
                    )}

                    {/* Navigation Buttons */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(prev => prev > 0 ? prev - 1 : images.length - 1) }}
                                style={{ position: 'absolute', left: '1rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                            >
                                <ChevronRight style={{ transform: 'rotate(180deg)' }} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(prev => prev < images.length - 1 ? prev + 1 : 0) }}
                                style={{ position: 'absolute', right: '1rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                            >
                                <ChevronRight />
                            </button>
                            {/* Dots */}
                            <div style={{ position: 'absolute', bottom: '1rem', display: 'flex', gap: '6px' }}>
                                {images.map((_, idx) => (
                                    <div key={idx} style={{ width: 8, height: 8, borderRadius: '50%', background: idx === currentImgIndex ? 'white' : 'rgba(255,255,255,0.4)' }} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Revisão de Conteúdo</h3>
                        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X /></button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <p style={{ whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.6 }}>{post.corpo_post}</p>
                    </div>
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '1rem' }}>
                        {post.status.includes('approv') ? <div style={{ textAlign: 'center', padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '12px', fontWeight: 600 }}>Este post já está aprovado! 🚀</div> : (
                            <>
                                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Deixe um comentário se precisar de ajustes..." style={{ width: '100%', height: '80px', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '1rem' }} />
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button onClick={() => handleAction('reject')} disabled={isSubmitting} style={{ flex: 1, padding: '1rem', border: '1px solid #ef4444', color: '#ef4444', background: 'white', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>Solicitar Ajuste</button>
                                    <button onClick={() => handleAction('approve')} disabled={isSubmitting} style={{ flex: 1, padding: '1rem', background: '#ea580c', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>Aprovar Agora</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- MAIN PAGE ---
const ClientInsightsPage = () => {
    // Legacy/Context access (still used for Admin Emulation or Standard Login)
    const { clientId: contextId, clientLegacyId, clientName: contextName } = useClientAuth()

    const [posts, setPosts] = useState([])
    const [questions, setQuestions] = useState([])
    const [status, setStatus] = useState('loading') // 'loading', 'success', 'error'
    const [errorMessage, setErrorMessage] = useState('')
    const [clientData, setClientData] = useState(null) // Local client data for Magic Link

    const [selectedQuestion, setSelectedQuestion] = useState(null)
    const [selectedPost, setSelectedPost] = useState(null)

    // "RADICAL SIMPLIFICATION" - Single Load Logic
    useEffect(() => {
        let isMounted = true

        const carregarDados = async () => {
            // 1. Detect Token Mode
            const pathname = window.location.pathname;
            const isMagicLink = pathname.includes('/portal/') && !pathname.includes('insights') && !pathname.includes('login');

            if (!isMagicLink) {
                // Not Magic Link -> Standard Context logic
                if (contextName && status !== 'success') {
                    // Check if context has valid data
                    supabase.from('tabela_projetofred1')
                        .select('*')
                        .eq('nome_cliente', contextName)
                        .order('created_at', { ascending: false })
                        .range(0, 49) // Paginação Auto (Limit 50)
                        .then(({ data }) => {
                            if (isMounted) {
                                setPosts(data || [])
                                setClientData({ name: contextName })
                                setStatus('success')
                            }
                        })
                }
                return;
            }

            console.log("Iniciando carga única (Magic Link)...");

            const token = pathname.split('/').pop();

            // 2. Busca Cliente
            const { data: cliente, error: erroCliente } = await supabase
                .from('clients')
                .select('*')
                .eq('access_token', token)
                .maybeSingle();

            if (erroCliente) console.error("Erro Cliente:", erroCliente);

            if (!cliente) {
                if (isMounted) {
                    setStatus('error');
                    setErrorMessage("Link inválido ou expirado.");
                }
                return;
            }

            // 3. Busca Posts (Cruzando nome)
            const { data: postsData, error: erroPosts } = await supabase
                .from('tabela_projetofred1')
                .select('*')
                .eq('nome_cliente', cliente.name)
                .order('created_at', { ascending: false })
                .range(0, 49); // Paginação Auto

            if (erroPosts) console.error("Erro Posts:", erroPosts);

            // 4. Busca Perguntas (Via UUID id_client)
            let questionsData = [];
            if (cliente.id_client) {
                const { data: qData, error: qError } = await supabase
                    .from('interview_questions')
                    .select('*')
                    .eq('id_client', cliente.id_client)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })
                    .range(0, 49); // Paginação Auto

                if (qError) console.error("Erro Questions:", qError);
                questionsData = qData || [];
            } else {
                console.warn("Cliente sem id_client (UUID) para buscar perguntas.");
            }

            if (isMounted) {
                setClientData(cliente);
                setPosts(postsData || []);
                setQuestions(questionsData);
                setStatus('success');
            }
        };

        carregarDados();

        return () => {
            isMounted = false
        }
    }, [contextName]); // Dependency on contextName helps trigger standard auth load if needed

    // --- HELPERS ---
    const handlePostReview = async (postId, status, comment) => {
        const { error } = await supabase.from('tabela_projetofred1').update({ status }).eq('id', postId)
        if (!error) {
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p))
            if (status === 'aprovado') alert("Post aprovado com sucesso! 🚀")
        }
    }
    const handleQuestionResponse = (qId) => setQuestions(prev => prev.filter(q => q.id !== qId))
    const getStatusStyle = (status) => {
        const s = (status || '').toUpperCase()
        if (s === 'APPROVED' || s === 'APROVADO' || s.includes('APPROV')) return { bg: '#dcfce7', color: '#166534', label: 'Aprovado', icon: <CheckCircle2 size={12} /> }
        if (s === 'WAITING_APPROVAL' || s.includes('WAITING') || s.includes('PEND')) return { bg: '#fef3c7', color: '#b45309', label: 'Aguardando Aprovação', icon: <Play size={12} /> }
        if (s === 'CHANGES_REQUESTED' || s.includes('CHANGE') || s.includes('REVI')) return { bg: '#f3e8ff', color: '#7e22ce', label: 'Alteração Solicitada', icon: <Mic size={12} /> }
        return { bg: '#f1f5f9', color: '#64748b', label: 'Status: ' + status, icon: <AlertCircle size={12} /> }
    }

    // MOVED TO TOP LEVEL SCOPE

    if (status === 'loading') {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                <h1>Carregando Portal... <Loader2 className="animate-spin inline ml-2" /></h1>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
                <h1 style={{ color: '#ef4444' }}>Erro: {errorMessage}</h1>
            </div>
        )
    }

    const displayName = clientData?.name || contextName || 'Cliente';

    // SUCCESS RENDER
    return (
        <div className="insights-container">
            <style>{pageStyles}</style>

            {/* Header */}
            <div className="insights-header">
                <h1>Olá, {displayName}</h1>
                <p>
                    Você tem <span className="highlight-stats">{questions.length} perguntas pendentes</span> e <span className="highlight-stats">{posts.length} posts</span> na sua galeria.
                </p>
            </div>

            {/* Section: Posts Grid (MOVED TO TOP) */}
            <div style={{ marginBottom: '4rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ImageIcon size={20} /> Galeria de Conteúdo
                </h3>

                {posts.length > 0 ? (
                    <div className="insights-grid">
                        {posts.map(post => {
                            const statusBadge = getStatusStyle(post.status)
                            const images = getImagesFromPost(post)
                            const coverImage = images[0]
                            const extraImages = images.length - 1

                            return (
                                <div id={`post-${post.id}`} key={post.id} className="insight-card group" onClick={() => window.location.href = `/post-feedback/${post.id}`}>
                                    {/* Image Top */}
                                    <div className="card-image-wrapper">
                                        {coverImage ? (
                                            <>
                                                <img src={coverImage} className="card-image" alt="Capa" />
                                                {extraImages > 0 && (
                                                    <div className="image-count-badge">
                                                        <ImageIcon size={12} /> +{extraImages} fotos
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="card-placeholder">
                                                <ImageIcon size={48} className="opacity-20" />
                                            </div>
                                        )}
                                        <div className="status-badge-float" style={{ background: statusBadge.bg, color: statusBadge.color }}>
                                            {statusBadge.label}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="card-body">
                                        <h3 className="card-title">{post.tema || post.titulo_hook || "Sem título definido"}</h3>
                                        <div className="card-meta">
                                            <Clock size={14} />
                                            {new Date(post.created_at).toLocaleDateString('pt-BR')}
                                        </div>

                                        <div className="card-actions">
                                            <button
                                                className={`btn-action ${statusBadge.label === 'Aprovado' ? 'btn-outline' : 'btn-primary'}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.location.href = `/post-feedback/${post.id}`;
                                                }}
                                            >
                                                {statusBadge.label === 'Aprovado' ? (
                                                    <>Ver Detalhes <ChevronRight size={16} /></>
                                                ) : (
                                                    <>Revisar e Aprovar <Play size={16} /></>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
                        <CheckCircle2 size={48} className="text-gray-400 mx-auto mb-4" />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Nenhum post encontrado!</h3>
                        <p style={{ color: '#64748b' }}>Verifique se o cliente "{displayName}" tem posts cadastrados.</p>
                    </div>
                )}
            </div>

            {/* Section: Questions (Pending) */}
            {questions.length > 0 && (
                <div style={{ marginBottom: '4rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mic size={20} /> Perguntas Pendentes
                    </h3>
                    <div className="questions-list">
                        {questions.map(q => (
                            <div key={q.id} className="question-item">
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '50%', color: '#d97706' }}>
                                        <MessageSquare size={20} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{q.question_text}</p>
                                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Aguardando sua resposta</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedQuestion(q)}
                                    style={{ padding: '0.75rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    Responder <ChevronRight size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section: Content Calendar (MOVED TO BOTTOM) */}
            {posts.length > 0 && (
                <ContentCalendar posts={posts} />
            )}

            {/* Modals */}
            {selectedQuestion && <QuestionResponseModal question={selectedQuestion} onClose={() => setSelectedQuestion(null)} onResponseSent={handleQuestionResponse} />}
            {selectedPost && <PostReviewModal post={selectedPost} onClose={() => setSelectedPost(null)} onReview={handlePostReview} />}
        </div >
    )
}

export default ClientInsightsPage
