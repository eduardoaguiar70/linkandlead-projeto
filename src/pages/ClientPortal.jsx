
import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { CheckCircle, Edit3, Image as ImageIcon, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import './ClientPortal.css'

const ClientPortal = () => {
    const [searchParams] = useSearchParams()
    const id = searchParams.get('id')

    const [post, setPost] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [feedbackMode, setFeedbackMode] = useState(false)
    const [feedbackText, setFeedbackText] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState(null)

    useEffect(() => {
        const numericId = parseInt(id, 10);
        if (!id || isNaN(numericId)) {
            setError('ID do projeto inválido ou não fornecido.');
            setLoading(false);
            return;
        }
        fetchPost(numericId);
    }, [id]);

    const fetchPost = async (numericId) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tabela_projetofred1')
                .select('*')
                .eq('id', numericId)
                .single();

            if (error) {
                // PGRST116 means no rows returned (JSON) or row count 0
                if (error.code === 'PGRST116') {
                    throw new Error('Post não encontrado ou acesso negado.');
                }
                throw error;
            }

            if (!data) {
                throw new Error('Post não encontrado.');
            }

            setPost(data);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Erro ao carregar o post.');
        } finally {
            setLoading(false);
        }
    }

    const handleApprove = async () => {
        setActionLoading(true)
        try {
            const { error } = await supabase
                .from('tabela_projetofred1')
                .update({ status: 'Aprovado' })
                .eq('id', id)

            if (error) throw error

            setPost(prev => ({ ...prev, status: 'Aprovado' }))
            setSuccessMessage('Conteúdo aprovado! Em breve será publicado.')
        } catch (err) {
            alert('Erro ao aprovar: ' + err.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleRequestChange = async () => {
        if (!feedbackText.trim()) return

        setActionLoading(true)
        try {
            const { error } = await supabase
                .from('tabela_projetofred1')
                .update({
                    status: 'Revisão',
                    feedback_cliente: feedbackText
                })
                .eq('id', id)

            if (error) throw error

            setPost(prev => ({ ...prev, status: 'Revisão', feedback_cliente: feedbackText }))
            setFeedbackMode(false)
            setSuccessMessage('Solicitação enviada. Vamos ajustar para você!')
        } catch (err) {
            alert('Erro ao enviar feedback: ' + err.message)
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) return <div className="loading-screen"><Loader2 className="spinner" /> Carregando post...</div>
    if (error) return <div className="error-screen">{error}</div>
    if (!post) return null

    // Logic to determine if footer info should be shown or if actions are available
    const isApproved = post.status?.toLowerCase().includes('aprovado')
    const isPosted = post.status?.toLowerCase().includes('postado')
    const isActionable = !isApproved && !isPosted && !successMessage

    return (
        <div className="client-container">
            <header className="client-header">
                <div className="logo-area">Portal de Aprovação</div>
                <div className={`status-badge status-${post.status?.toLowerCase().replace(/\s/g, '-')}`}>
                    {post.status || 'Aguardando'}
                </div>
            </header>

            <main className="post-view">
                <article className="post-card">
                    {post.nome_cliente && (
                        <div className="client-badge-display">
                            Cliente: {post.nome_cliente}
                        </div>
                    )}
                    <h1 className="post-title">{post.titulo_hook || 'Sem Título'}</h1>

                    <div className="post-meta">
                        <span>#{post.tema}</span>
                    </div>

                    <div className="post-body">
                        <ReactMarkdown>{post.corpo_post || 'Conteúdo vazio...'}</ReactMarkdown>
                    </div>

                    {post.sugestao_imagem && (
                        <div className="image-suggestion-box">
                            <div className="box-icon">
                                <ImageIcon size={24} />
                            </div>
                            <div className="box-content">
                                <strong>Sugestão de Imagem:</strong>
                                <p>{post.sugestao_imagem}</p>
                            </div>
                        </div>
                    )}
                </article>
            </main>

            {/* Success Banner (after action in this session) */}
            {successMessage && (
                <div className="success-banner">
                    <CheckCircle /> {successMessage}
                </div>
            )}

            {/* Permanent State Banners (if status loaded from DB) */}
            {!successMessage && isApproved && (
                <div className="info-banner success">
                    <CheckCircle size={20} /> Este post já foi aprovado.
                </div>
            )}

            {!successMessage && isPosted && (
                <div className="info-banner purple">
                    <CheckCircle size={20} /> Este conteúdo já foi publicado no LinkedIn.
                </div>
            )}

            {/* Actions Footer */}
            {isActionable && (
                <footer className="action-footer">
                    {feedbackMode ? (
                        <div className="feedback-area">
                            <textarea
                                placeholder="Descreva o que precisa ser alterado..."
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                            />
                            <div className="feedback-actions">
                                <button className="btn-cancel" onClick={() => setFeedbackMode(false)}>Cancelar</button>
                                <button className="btn-confirm-change" onClick={handleRequestChange} disabled={actionLoading}>
                                    {actionLoading ? 'Enviando...' : 'Enviar Feedback'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="button-group">
                            <button
                                className="btn-revise"
                                onClick={() => setFeedbackMode(true)}
                            >
                                <Edit3 size={18} /> Solicitar Alteração
                            </button>
                            <button
                                className="btn-approve"
                                onClick={handleApprove}
                            >
                                <CheckCircle size={18} /> Aprovar Post
                            </button>
                        </div>
                    )}
                </footer>
            )}
        </div>
    )
}

export default ClientPortal
