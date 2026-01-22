import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import './SalesInbox.css'
import { Search, Send, MoreVertical, Phone, Mail, MapPin, Briefcase, Zap, Star, Sparkles } from 'lucide-react'

const SalesInboxPage = () => {
    const { selectedClientId } = useClientSelection()
    const [leads, setLeads] = useState([])
    const [loadingLeads, setLoadingLeads] = useState(false)
    const [activeLead, setActiveLead] = useState(null)

    // Chat State
    const [interactions, setInteractions] = useState([])
    const [loadingChat, setLoadingChat] = useState(false)
    const [newMessage, setNewMessage] = useState('')

    // 1. Fetch Inbox Leads (Score > 0, Sorted Desc)
    useEffect(() => {
        if (!selectedClientId) return

        const fetchInboxLeads = async () => {
            setLoadingLeads(true)
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('client_id', selectedClientId)
                    .gt('engagement_score', 0) // Only engaged leads
                    .order('engagement_score', { ascending: false })
                    .limit(50)

                if (error) throw error
                setLeads(data || [])

                // Auto-select first lead if none selected logic could go here
            } catch (err) {
                console.error('Erro ao buscar leads do inbox:', err)
            } finally {
                setLoadingLeads(false)
            }
        }

        fetchInboxLeads()
    }, [selectedClientId])

    // 2. Fetch Interactions when Active Lead Changes
    useEffect(() => {
        if (!activeLead) {
            setInteractions([])
            return
        }

        const fetchInteractions = async () => {
            setLoadingChat(true)
            try {
                const { data, error } = await supabase
                    .from('interactions')
                    .select('*')
                    .eq('lead_id', activeLead.id)
                    .order('interaction_date', { ascending: false })

                if (error) throw error
                setInteractions(data || [])
            } catch (err) {
                console.error('Erro ao buscar chat:', err)
            } finally {
                setLoadingChat(false)
            }
        }

        fetchInteractions()
    }, [activeLead])

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeLead) return

        // Optimistic UI Update
        const tempMsg = {
            id: Date.now(),
            content: newMessage,
            direction: 'outbound',
            interaction_date: new Date().toISOString()
        }
        setInteractions([tempMsg, ...interactions])
        setNewMessage('')

        // In a real app, we would make an API call / Webhook here
        // await sendMessageWebhook(...)
    }

    if (!selectedClientId) return <div className="empty-state">Selecione um cliente para acessar o Inbox.</div>

    return (
        <div className="inbox-container">
            {/* LEFT: Lead List */}
            <div className="inbox-list">
                <div className="inbox-list-header">
                    <span>Inbox Prioritário</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                        {leads.length}
                    </span>
                </div>
                <div className="inbox-list-scroll">
                    {loadingLeads ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Carregando...</div>
                    ) : leads.map(lead => (
                        <div
                            key={lead.id}
                            className={`inbox-lead-item ${activeLead?.id === lead.id ? 'active' : ''}`}
                            onClick={() => setActiveLead(lead)}
                        >
                            <div className="lead-item-header">
                                <span className="lead-name">{lead.nome || 'Sem Nome'}</span>
                                <span className="lead-time">{lead.last_interaction ? new Date(lead.last_interaction).toLocaleDateString() : ''}</span>
                            </div>
                            <div className="lead-preview">
                                {lead.headline || 'Lead qualificado'}
                            </div>
                            <div className="lead-score-tag">
                                <Star size={10} fill="#dc2626" /> {lead.engagement_score} pts
                            </div>
                        </div>
                    ))}
                    {!loadingLeads && leads.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#cbd5e1' }}>
                            Nenhum lead com engajamento encontrado.
                        </div>
                    )}
                </div>
            </div>

            {/* MIDDLE: Chat Area */}
            {activeLead ? (
                <div className="inbox-chat">
                    <div className="chat-header">
                        <div className="chat-avatar">{activeLead.nome?.charAt(0)}</div>
                        <div>
                            <div style={{ fontWeight: 'bold' }}>{activeLead.nome}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{activeLead.company}</div>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                            <MoreVertical size={20} color="#94a3b8" />
                        </div>
                    </div>

                    <div className="chat-timeline">
                        {loadingChat ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8' }}>Carregando histórico...</div>
                        ) : interactions.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#cbd5e1', marginTop: 'auto' }}>Nenhuma mensagem trocada ainda.</div>
                        ) : interactions.map(msg => (
                            <div key={msg.id} className={`chat-bubble ${msg.direction === 'inbound' ? 'inbound' : 'outbound'}`}>
                                {msg.content}
                                <span className="chat-date">
                                    {new Date(msg.interaction_date).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="chat-input-area">
                        <textarea
                            className="chat-input"
                            rows="1"
                            placeholder="Digite sua resposta..."
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSendMessage()
                                }
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button
                                onClick={handleSendMessage}
                                style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Send size={14} /> Enviar
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="empty-state">
                    <Zap size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                    <p>Selecione um lead para iniciar o atendimento.</p>
                </div>
            )}

            {/* RIGHT: Context & AI */}
            <div className="inbox-context">
                {activeLead ? (
                    <>
                        <div className="context-section">
                            <h4>Dados do Lead</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                                    <Briefcase size={16} color="#64748b" />
                                    <span>{activeLead.headline}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                                    <MapPin size={16} color="#64748b" />
                                    <span>{activeLead.location || 'Localização não informada'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="context-section">
                            <h4>Sugestão de IA</h4>
                            <div className="ai-suggestion-box">
                                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Sparkles size={14} /> Próximo Passo
                                </div>
                                <p style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                                    O lead demonstrou interesse (Score {activeLead.engagement_score}).
                                    Sugiro mencionar o case de sucesso do setor de {activeLead.industry || 'Tecnologia'}.
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', color: '#cbd5e1', marginTop: '4rem' }}>
                        Contexto do lead aparecerá aqui.
                    </div>
                )}
            </div>
        </div>
    )
}

export default SalesInboxPage
