
import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useLanguage } from '../contexts/LanguageContext'
import {
    Lightbulb,
    Plus,
    Trash2,
    MessageSquare,
    Loader2,
    Building2,
    Sparkles // Added
} from 'lucide-react'
import './IdeasPage.css'

const IdeasPage = () => {
    const { t } = useLanguage()

    // Data
    const [clients, setClients] = useState([])
    const [questions, setQuestions] = useState([])

    // Selection
    const [selectedClientId, setSelectedClientId] = useState('')

    // Loading
    const [loadingClients, setLoadingClients] = useState(true)
    const [loadingQuestions, setLoadingQuestions] = useState(false)
    const [suggesting, setSuggesting] = useState(false) // New State for AI
    const [generatingIds, setGeneratingIds] = useState([]) // State for per-insight generation loading

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false)

    // Inputs
    const [newQuestionText, setNewQuestionText] = useState('')
    const [answerText, setAnswerText] = useState('')
    const [currentQuestionId, setCurrentQuestionId] = useState(null)

    // 1. Fetch Clients on Mount
    useEffect(() => {
        const fetchClients = async () => {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, name') // Need ID for relation
                    .order('name')

                if (error) throw error
                setClients(data || [])

                // Auto-select first client if available
                if (data && data.length > 0) {
                    setSelectedClientId(data[0].id)
                }
            } catch (err) {
                console.error('Error fetching clients:', err)
            } finally {
                setLoadingClients(false)
            }
        }
        fetchClients()
    }, [])

    // 2. Fetch Questions when Client Changes
    useEffect(() => {
        if (!selectedClientId) return

        const fetchQuestions = async () => {
            setLoadingQuestions(true)
            try {
                const { data, error } = await supabase
                    .from('interview_questions')
                    .select('*')
                    .eq('client_id', selectedClientId)
                    .order('created_at', { ascending: false })

                if (error) throw error
                setQuestions(data || [])
            } catch (err) {
                console.error('Error fetching questions:', err)
            } finally {
                setLoadingQuestions(false)
            }
        }
        fetchQuestions()
    }, [selectedClientId])

    // ACTIONS

    const handleCreateQuestion = async () => {
        // 1. VALIDAÇÃO
        if (!selectedClientId) {
            alert('Erro: Nenhum cliente selecionado.')
            return
        }
        if (!newQuestionText.trim()) {
            alert('Por favor, digite o texto da pergunta.')
            return
        }

        try {
            // 2. GRAVAÇÃO NO SUPABASE
            const { error } = await supabase
                .from('interview_questions')
                .insert([
                    {
                        client_id: selectedClientId,
                        question_text: newQuestionText,
                        status: 'pending'
                    }
                ])

            if (error) throw error

            // 3. ATUALIZAÇÃO DA LISTA (Recarregar Perguntas)
            const { data: refreshedData, error: refreshError } = await supabase
                .from('interview_questions')
                .select('*')
                .eq('client_id', selectedClientId)
                .order('created_at', { ascending: false })

            if (refreshError) throw refreshError

            // Atualiza estado
            setQuestions(refreshedData || [])

            // Limpa e Fecha
            setNewQuestionText('')
            setIsCreateModalOpen(false)

        } catch (err) {
            console.error('Erro ao salvar pergunta:', err)
            alert('Erro ao criar pergunta: ' + err.message)
        }
    }

    const handleSuggestAI = async () => {
        if (!selectedClientId) return
        setSuggesting(true)
        try {
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/gerar-pergunta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: selectedClientId })
            })

            if (!response.ok) throw new Error('Falha na conexão com IA')

            const data = await response.json()
            if (data && data.question) {
                setNewQuestionText(data.question)
            } else {
                throw new Error('Formato de resposta inválido (esperado: { question: "..." })')
            }

        } catch (err) {
            console.error(err)
            alert('Erro ao gerar sugestão: ' + err.message)
        } finally {
            setSuggesting(false)
        }
    }

    const handleGenerateFromInsight = async (question) => {
        if (generatingIds.includes(question.id)) return

        // Finds the selected client to send the name
        const selectedClientObj = clients.find(c => c.id === selectedClientId)
        const clientName = selectedClientObj ? selectedClientObj.name : 'Unknown'

        setGeneratingIds(prev => [...prev, question.id])
        try {
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/criar-post-respostas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: selectedClientId,
                    nome_cliente: clientName, // Fix: Sending client name
                    pergunta_original: question.question_text,
                    resposta_expert: question.answer_text
                })
            })

            if (!response.ok) throw new Error('Falha ao enviar solicitação para IA')

            alert('Solicitação enviada! O post aparecerá em breve.')

        } catch (err) {
            console.error(err)
            alert('Erro ao criar post: ' + err.message)
        } finally {
            setGeneratingIds(prev => prev.filter(id => id !== question.id))
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm(t('delete') + '?')) return
        try {
            const { error } = await supabase.from('interview_questions').delete().eq('id', id)
            if (error) throw error
            setQuestions(prev => prev.filter(q => q.id !== id))
        } catch (err) {
            console.error(err)
        }
    }

    const openAnswerModal = (q) => {
        setCurrentQuestionId(q.id)
        setAnswerText(q.answer_text || '')
        setIsAnswerModalOpen(true)
    }

    const handleSaveAnswer = async () => {
        if (!currentQuestionId) return
        try {
            const { error } = await supabase
                .from('interview_questions')
                .update({
                    answer_text: answerText,
                    status: 'answered'
                })
                .eq('id', currentQuestionId)

            if (error) throw error

            // Update local state
            setQuestions(prev => prev.map(q => {
                if (q.id === currentQuestionId) {
                    return { ...q, answer_text: answerText, status: 'answered' }
                }
                return q
            }))

            setIsAnswerModalOpen(false)
        } catch (err) {
            alert('Erro ao salvar resposta: ' + err.message)
        }
    }

    // LISTS
    const pendingList = questions.filter(q => q.status === 'pending')
    const answeredList = questions.filter(q => q.status === 'answered')

    return (
        <div className="ideas-page-container">
            <header className="ideas-header">
                <h1><Lightbulb size={28} color="#eab308" /> {t('ideas')}</h1>
                <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)} disabled={!selectedClientId}>
                    <Plus size={18} /> {t('newQuestion')}
                </button>
            </header>

            <div className="client-selector-container">
                <div className="input-wrapper" style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <Building2 className="input-icon" size={18} color="#64748b" />
                    <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="modern-input"
                        style={{ border: 'none', outline: 'none', width: '100%' }}
                    >
                        {loadingClients ? <option>{t('loading')}</option> : null}
                        {!loadingClients && clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loadingQuestions ? (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: '#64748b' }}>
                    <Loader2 className="spinner" /> {t('loading')}
                </div>
            ) : (
                <div className="ideas-columns">
                    {/* LEFT: PENDING */}
                    <div className="ideas-column">
                        <div className="column-header">
                            {t('pendingQuestions')}
                            <span className="badge-count">{pendingList.length}</span>
                        </div>
                        {pendingList.length === 0 && <p style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '1rem' }}>Nenhuma pendente.</p>}
                        {pendingList.map(q => (
                            <div key={q.id} className="question-card">
                                <div className="question-text">{q.question_text}</div>
                                <div className="card-actions">
                                    <button className="btn-card-action danger" onClick={() => handleDelete(q.id)}>
                                        <Trash2 size={14} /> {t('delete')}
                                    </button>
                                    <button className="btn-card-action primary" onClick={() => openAnswerModal(q)}>
                                        <MessageSquare size={14} /> {t('answer')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* RIGHT: ANSWERED */}
                    <div className="ideas-column">
                        <div className="column-header">
                            {t('answeredQuestions')}
                            <span className="badge-count">{answeredList.length}</span>
                        </div>
                        {answeredList.length === 0 && <p style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '1rem' }}>Nenhuma respondida.</p>}
                        {answeredList.map(q => (
                            <div key={q.id} className="question-card">
                                <div className="question-text">{q.question_text}</div>
                                <div className="answer-text">
                                    <strong>Insight:</strong> {q.answer_text}
                                </div>
                                <div className="card-actions">
                                    <button
                                        className="btn-card-action"
                                        style={{ color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', fontWeight: 600 }}
                                        onClick={() => handleGenerateFromInsight(q)}
                                        disabled={generatingIds.includes(q.id)}
                                        title="Gerar Post com IA"
                                    >
                                        {generatingIds.includes(q.id) ? (
                                            <>
                                                <Loader2 size={14} className="spinner" /> Gerando...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={14} /> Gerar Post
                                            </>
                                        )}
                                    </button>
                                    <button className="btn-card-action danger" onClick={() => handleDelete(q.id)}>
                                        <Trash2 size={14} /> {t('delete')}
                                    </button>
                                    <button className="btn-card-action" onClick={() => openAnswerModal(q)}>
                                        Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="mini-modal-overlay">
                    <div className="mini-modal">
                        <h3>{t('newQuestion')}</h3>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Texto da Pergunta</span>
                            <button
                                onClick={handleSuggestAI}
                                disabled={suggesting}
                                className="btn-text-primary"
                                style={{
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#7c3aed',
                                    background: '#f5f3ff',
                                    border: '1px solid #ddd6fe',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    cursor: suggesting ? 'wait' : 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                {suggesting ? <Loader2 size={14} className="spinner" /> : <Sparkles size={14} />}
                                {suggesting ? 'Criando...' : 'Sugerir com IA'}
                            </button>
                        </div>

                        <textarea
                            value={newQuestionText}
                            onChange={e => setNewQuestionText(e.target.value)}
                            placeholder={t('questionPlaceholder')}
                            autoFocus
                            disabled={suggesting}
                        />
                        <div className="mini-modal-actions">
                            <button className="btn-secondary" onClick={() => setIsCreateModalOpen(false)} disabled={suggesting}>{t('cancel')}</button>
                            <button className="btn-primary" onClick={handleCreateQuestion} disabled={suggesting}>{t('save')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ANSWER MODAL */}
            {isAnswerModalOpen && (
                <div className="mini-modal-overlay">
                    <div className="mini-modal">
                        <h3>{t('answer')} / Insight</h3>
                        <textarea
                            value={answerText}
                            onChange={e => setAnswerText(e.target.value)}
                            placeholder={t('answerPlaceholder')}
                            autoFocus
                        />
                        <div className="mini-modal-actions">
                            <button className="btn-secondary" onClick={() => setIsAnswerModalOpen(false)}>{t('cancel')}</button>
                            <button className="btn-primary" onClick={handleSaveAnswer}>{t('save')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default IdeasPage
