import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import { Search, Send, MoreVertical, Phone, Mail, MapPin, Briefcase, Zap, Star, Sparkles, MessageSquare, Copy, Check, LayoutGrid, List, Loader2, X } from 'lucide-react'

const N8N_GENERATE_REPLY_URL = 'https://n8n-n8n-start.kfocge.easypanel.host/webhook/generate-reply'
import KanbanColumn from '../components/kanban/KanbanColumn'
import KanbanLeadCard from '../components/kanban/KanbanLeadCard'
import StrategicContextCard from '../components/StrategicContextCard'

const SalesInboxPage = () => {
    const { selectedClientId } = useClientSelection()
    const [leads, setLeads] = useState([])
    const [loadingLeads, setLoadingLeads] = useState(false)
    const [activeLead, setActiveLead] = useState(null)

    // View Mode
    const [viewMode, setViewMode] = useState('list') // 'list' | 'kanban'
    const [searchTerm, setSearchTerm] = useState('')

    // Chat State
    const [interactions, setInteractions] = useState([])
    const [loadingChat, setLoadingChat] = useState(false)
    const [newMessage, setNewMessage] = useState('')

    // AI Actions State
    const [draftMessage, setDraftMessage] = useState('')
    const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(null)
    const [copiedIdx, setCopiedIdx] = useState(null)
    const [generatingReply, setGeneratingReply] = useState(false)
    const [sdrSeniorGenerated, setSdrSeniorGenerated] = useState(false)
    const [generatedReasoning, setGeneratedReasoning] = useState(null)

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
                    .order('last_interaction_date', { ascending: false, nullsFirst: false })
                    .limit(50)

                if (error) throw error

                const leadIds = (data || []).map(l => l.id)

                // Fetch last interaction direction (is_sender) per lead
                let lastSenderMap = {}
                if (leadIds.length > 0) {
                    const { data: intData } = await supabase
                        .from('interactions')
                        .select('lead_id, is_sender, interaction_date')
                        .in('lead_id', leadIds)
                        .order('interaction_date', { ascending: false })

                    if (intData) {
                        intData.forEach(row => {
                            if (!(row.lead_id in lastSenderMap)) {
                                lastSenderMap[row.lead_id] = row.is_sender
                            }
                        })
                    }
                }

                const processedLeads = (data || []).map(lead => ({
                    ...lead,
                    total_interactions_count: lead.total_interactions_count || 0,
                    last_interaction_date: lead.last_interaction_date || null,
                    // is_sender=true → I sent last msg | is_sender=false → lead sent last msg
                    _lastMsgIsSender: lead.id in lastSenderMap ? lastSenderMap[lead.id] : null
                }))

                setLeads(processedLeads)
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
            setDraftMessage('')
            setSelectedSuggestionIdx(null)
            setSdrSeniorGenerated(false)
            setGeneratedReasoning(null)
            return
        }

        // Load suggested_message from DB if it exists
        if (activeLead.suggested_message) {
            setDraftMessage(activeLead.suggested_message)
            setSdrSeniorGenerated(true)
        } else {
            setDraftMessage('')
            setSdrSeniorGenerated(false)
        }
        setSelectedSuggestionIdx(null)
        setGeneratedReasoning(null)

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

    // Kanban Categorization Logic
    // 1) Prioridade Alta: confiança >= 75
    // 2) Para Responder: confiança < 75, lead enviou a última msg (eu preciso responder)
    // 3) Aguardando: confiança < 75, eu enviei a última msg (aguardando lead responder)
    // 4) Stand-by: confiança < 75, mais de 7 dias desde a última mensagem
    const categorizeLeads = (leadsArray) => {
        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const highPriority = []
        const toRespond = []
        const waiting = []
        const standby = []

        leadsArray.forEach(lead => {
            const trustScore = lead?.trust_score || lead?.engagement_score || 0
            const lastDate = lead?.last_interaction_date ? new Date(lead.last_interaction_date) : null

            // Rule 1: Prioridade Alta — confiança >= 75
            if (trustScore >= 75) {
                highPriority.push(lead)
                return
            }

            // Rule 4: Stand-by — mais de 7 dias sem interação
            if (lastDate && lastDate < sevenDaysAgo) {
                standby.push(lead)
                return
            }

            // Rule 2 & 3: baseado em quem enviou a última mensagem
            // _lastMsgIsSender: true = eu enviei, false = lead enviou, null = sem dados
            if (lead._lastMsgIsSender === false) {
                // Lead enviou a última msg → eu preciso responder
                toRespond.push(lead)
            } else if (lead._lastMsgIsSender === true) {
                // Eu enviei a última msg → aguardando resposta do lead
                waiting.push(lead)
            } else {
                // Sem histórico de interação → Para Responder (default)
                toRespond.push(lead)
            }
        })

        return { highPriority, toRespond, waiting, standby }
    }

    const filteredLeads = searchTerm.trim()
        ? leads.filter(lead => {
            const term = searchTerm.toLowerCase()
            return (
                (lead.nome || '').toLowerCase().includes(term) ||
                (lead.headline || '').toLowerCase().includes(term) ||
                (lead.company || '').toLowerCase().includes(term)
            )
        })
        : leads

    const kanbanData = categorizeLeads(filteredLeads)

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
    }

    const handleAiSend = () => {
        if (!draftMessage.trim() || !activeLead) return

        console.log('[LinkedIn Send] Simulating send:', draftMessage)

        // Optimistic Update
        const tempMsg = {
            id: Date.now(),
            content: draftMessage,
            direction: 'outbound',
            interaction_date: new Date().toISOString()
        }
        setInteractions([tempMsg, ...interactions])
        alert('✅ Mensagem enviada via LinkedIn (Simulação)')
        setDraftMessage('')
    }

    const copyToClipboard = (text, idx) => {
        navigator.clipboard.writeText(text)
        setCopiedIdx(idx)
        setTimeout(() => setCopiedIdx(null), 2000)
    }

    const generateAISuggestion = async () => {
        if (!activeLead || !selectedClientId) return

        setGeneratingReply(true)
        setSdrSeniorGenerated(false)
        setGeneratedReasoning(null)
        try {
            const conversationHistory = interactions
                .slice().reverse()
                .map(msg => `${msg.is_sender ? 'Eu' : 'Lead'}: ${msg.content}`)
                .join('\n')

            const payload = {
                user_id: selectedClientId,
                lead_id: activeLead.id,
                lead_name: activeLead.nome || '',
                lead_headline: activeLead.headline || '',
                lead_location: activeLead.location || '',
                lead_reasoning: activeLead.analysis_reasoning || '',
                lead_icp_reason: activeLead.icp_reason || '',
                conversation_history: conversationHistory,
                is_icebreaker: interactions.length === 0
            }

            const response = await fetch(N8N_GENERATE_REPLY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!response.ok) throw new Error('Erro na requisição')

            const data = await response.json()
            if (data.reply) {
                setNewMessage(data.reply)
                setDraftMessage(data.reply)
                setSdrSeniorGenerated(true)
                if (data.reasoning) {
                    setGeneratedReasoning(data.reasoning)
                }
            }

            // After 5s, re-fetch the lead's strategic columns + suggested_message (populated by n8n workflow)
            const leadId = activeLead.id
            setTimeout(async () => {
                try {
                    const { data: updated, error } = await supabase
                        .from('leads')
                        .select('last_cadence_level, last_signal_detected, last_psychological_factor, last_forbidden_action, last_strategy_used, suggested_message')
                        .eq('id', leadId)
                        .single()

                    if (error || !updated) return

                    // Update activeLead & leads array
                    setActiveLead(prev => prev && prev.id === leadId ? { ...prev, ...updated } : prev)
                    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updated } : l))

                    // Update Próximo Passo with DB suggested_message
                    if (updated.suggested_message) {
                        setDraftMessage(updated.suggested_message)
                        setSdrSeniorGenerated(true)
                    }
                } catch (err) {
                    console.error('[Raio-X] Error refreshing strategic data:', err)
                }
            }, 5000)
        } catch (error) {
            console.error('[AI] Error generating suggestion:', error)
            alert('❌ Erro ao gerar sugestão. Tente novamente.')
        } finally {
            setGeneratingReply(false)
        }
    }

    if (!selectedClientId) return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-gray-400 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Mail size={24} className="text-primary/70" />
            </div>
            <p className="text-gray-300">Selecione um cliente para acessar o Inbox.</p>
        </div>
    )

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] p-2 gap-4 overflow-hidden">

            {/* HEADER & TOGGLE */}
            <div className="flex flex-wrap justify-between items-center px-4 gap-3 shrink-0">
                <h1 className="text-xl font-bold text-black flex items-center gap-2">
                    <LayoutGrid size={20} className="text-primary" /> Inbox Inteligente
                </h1>

                {/* Search Input */}
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Pesquisar lead..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="bg-black/40 p-1 rounded-xl border border-white/10 flex gap-1 backdrop-blur-md">
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${viewMode === 'kanban' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <LayoutGrid size={14} /> Kanban
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <List size={14} /> Lista
                    </button>
                </div>
            </div>

            {/* KANBAN VIEW */}
            {viewMode === 'kanban' && (
                <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                    <div className="flex gap-6 min-w-max h-full px-4">
                        {/* Column 1: High Priority */}
                        <KanbanColumn
                            title="Prioridade Alta"
                            icon="🔥"
                            count={kanbanData.highPriority.length}
                            colorClass="bg-red-500"
                        >
                            {kanbanData.highPriority.map(lead => (
                                <KanbanLeadCard
                                    key={lead.id}
                                    lead={lead}
                                    onClick={(l) => { setActiveLead(l); setViewMode('list') }}
                                />
                            ))}
                        </KanbanColumn>

                        {/* Column 2: To Respond */}
                        <KanbanColumn
                            title="Para Responder"
                            icon="📩"
                            count={kanbanData.toRespond.length}
                            colorClass="bg-blue-500"
                        >
                            {kanbanData.toRespond.map(lead => (
                                <KanbanLeadCard
                                    key={lead.id}
                                    lead={lead}
                                    onClick={(l) => { setActiveLead(l); setViewMode('list') }}
                                />
                            ))}
                        </KanbanColumn>

                        {/* Column 3: Waiting */}
                        <KanbanColumn
                            title="Aguardando"
                            icon="⏳"
                            count={kanbanData.waiting.length}
                            colorClass="bg-amber-500"
                        >
                            {kanbanData.waiting.map(lead => (
                                <KanbanLeadCard
                                    key={lead.id}
                                    lead={lead}
                                    onClick={(l) => { setActiveLead(l); setViewMode('list') }}
                                />
                            ))}
                        </KanbanColumn>

                        {/* Column 4: Stand-by */}
                        <KanbanColumn
                            title="Stand-by / Frios"
                            icon="💤"
                            count={kanbanData.standby.length}
                            colorClass="bg-slate-400"
                        >
                            {kanbanData.standby.map(lead => (
                                <KanbanLeadCard
                                    key={lead.id}
                                    lead={lead}
                                    onClick={(l) => { setActiveLead(l); setViewMode('list') }}
                                />
                            ))}
                        </KanbanColumn>
                    </div>
                </div>
            )}

            {/* LIST / DETAIL VIEW */}
            {viewMode === 'list' && (
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* LEFT: Lead List */}
                    <div className="w-80 flex flex-col bg-[#0d0d0d] rounded-2xl border border-white/10 overflow-hidden shrink-0">
                        <div className="p-4 border-b border-white/10 bg-[#111111] flex justify-between items-center">
                            <span className="font-semibold text-white">Inbox Prioritário</span>
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-bold">
                                {filteredLeads.length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {loadingLeads ? (
                                <div className="p-8 text-center text-gray-500 text-sm">Carregando...</div>
                            ) : filteredLeads.map(lead => (
                                <div
                                    key={lead.id}
                                    onClick={() => setActiveLead(lead)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all ${activeLead?.id === lead.id
                                        ? 'bg-primary/20 border-primary/50 shadow-lg shadow-primary/10'
                                        : 'border-transparent hover:bg-white/10 hover:border-white/10'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-semibold text-sm truncate max-w-[160px] ${activeLead?.id === lead.id ? 'text-white' : 'text-white'}`}>
                                            {lead.nome || 'Sem Nome'}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {lead.last_interaction ? new Date(lead.last_interaction).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-300 mb-2 truncate">
                                        {lead.headline || 'Lead qualificado'}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-primary/30 self-start px-2 py-0.5 rounded-md inline-flex">
                                        <Star size={10} className="text-primary fill-primary" /> {lead.engagement_score} pts
                                    </div>
                                </div>
                            ))}
                            {!loadingLeads && filteredLeads.length === 0 && (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    {searchTerm ? 'Nenhum lead encontrado.' : 'Nenhum lead com engajamento.'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MIDDLE: Chat Area */}
                    {activeLead ? (
                        <div className="flex-1 flex flex-col bg-[#0d0d0d] rounded-2xl border border-white/10 overflow-hidden relative">
                            {/* Header */}
                            <div className="p-4 border-b border-white/10 bg-[#111111] flex items-center justify-between z-10">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-gray-700 to-black border border-glass-border flex items-center justify-center text-white font-bold shadow-inner overflow-hidden">
                                        {activeLead.avatar_url ? (
                                            <img src={activeLead.avatar_url} alt={activeLead.nome} className="w-full h-full object-cover" />
                                        ) : (
                                            activeLead.nome?.charAt(0)
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-white text-sm truncate">{activeLead.nome}</div>
                                        <div className="text-xs text-gray-400 truncate">{activeLead.headline || activeLead.company}</div>
                                    </div>
                                </div>
                                <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors shrink-0">
                                    <MoreVertical size={18} />
                                </button>
                            </div>

                            {/* Timeline */}
                            <div className="flex-1 overflow-y-auto p-6 flex flex-col-reverse gap-4 custom-scrollbar bg-black/20">
                                {loadingChat ? (
                                    <div className="text-center text-gray-500 text-sm py-10">Carregando histórico...</div>
                                ) : interactions.length === 0 ? (
                                    <div className="text-center text-gray-500 text-sm py-10 flex flex-col items-center gap-2">
                                        <MessageSquare size={24} className="opacity-20" />
                                        Nenhuma mensagem trocada ainda.
                                    </div>
                                ) : interactions.map(msg => (
                                    <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.is_sender === true ? 'self-end items-end' : 'self-start items-start'}`}>
                                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.is_sender === true
                                            ? 'bg-primary/90 text-white rounded-br-sm shadow-lg shadow-primary/10'
                                            : 'bg-white/10 text-gray-200 rounded-bl-sm'
                                            }`}>
                                            {msg.content}
                                        </div>
                                        <span className="text-[10px] text-gray-500 mt-1 px-1">
                                            {new Date(msg.interaction_date).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-glass-border bg-white/[0.02]">
                                <div className="relative">
                                    <textarea
                                        className="w-full bg-black/40 border border-glass-border rounded-xl pl-4 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none text-sm"
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
                                    <button
                                        onClick={handleSendMessage}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20 transition-all"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0d0d] rounded-2xl border border-white/10 text-gray-300 gap-4">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                                <Zap size={32} className="text-primary/50" />
                            </div>
                            <p className="text-sm text-gray-400">Selecione um lead para iniciar o atendimento.</p>
                        </div>
                    )}

                    {/* RIGHT: Context & AI (ENHANCED) */}
                    <div className="w-80 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar">
                        {activeLead ? (
                            <>
                                {/* Lead Info Card - 3 Main Indicators */}
                                <div className="bg-[#0d0d0d] rounded-2xl border border-white/10 p-5">
                                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Dados do Lead</h4>
                                    <div className="flex items-center justify-between gap-3">
                                        {/* ICP Score */}
                                        <div className={`flex-1 text-center py-2 px-3 rounded-lg border ${activeLead.icp_score === 'A' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                                            activeLead.icp_score === 'B' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' :
                                                'bg-slate-500/20 border-slate-500/50 text-slate-400'
                                            }`}>
                                            <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">ICP</div>
                                            <div className="text-lg font-bold">{activeLead.icp_score || 'C'}</div>
                                        </div>

                                        {/* Interactions Count */}
                                        <div className="flex-1 text-center py-2 px-3 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-400">
                                            <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Interações</div>
                                            <div className="text-lg font-bold">{activeLead.total_interactions_count || activeLead.total_interactions || 0}</div>
                                        </div>

                                        {/* Cadence Stage */}
                                        {(() => {
                                            const stage = activeLead.cadence_stage || ''
                                            const match = stage?.toString().match(/(\d+)/)
                                            const level = match ? parseInt(match[1], 10) : 0
                                            const style = level >= 5 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                                : level >= 3 ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                                    : level >= 1 ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                                        : 'bg-slate-500/20 border-slate-500/50 text-slate-400'
                                            return (
                                                <div className={`flex-1 text-center py-2 px-3 rounded-lg border ${style}`}>
                                                    <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Cadência</div>
                                                    <div className="text-lg font-bold">{stage || '—'}</div>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </div>

                                {/* Raio-X da Negociação */}
                                <StrategicContextCard lead={activeLead} />

                                {/* AI Suggestion Card - Always starts clean */}
                                <div className="relative p-[1px] rounded-2xl bg-gradient-to-br from-primary/50 to-purple-600/50 shadow-lg shadow-primary/10">
                                    <div className="bg-[#0d0d0d] rounded-2xl p-5 h-full flex flex-col gap-4">
                                        <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                            <Sparkles size={16} /> Próximo Passo
                                        </div>

                                        {(() => {
                                            const isIcebreaker = interactions.length === 0
                                            const hasGeneratedReply = !!draftMessage

                                            // Has a message (from DB or just generated) → show it
                                            if (hasGeneratedReply) {
                                                return (
                                                    <>
                                                        {/* SDR Senior Badge */}
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                                            <Sparkles size={12} />
                                                            Gerada pelo Agente SDR Senior
                                                        </div>

                                                        {/* Message - Prominent Display */}
                                                        <div className="p-4 rounded-xl bg-white/10 border border-primary/30">
                                                            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                                                                "{draftMessage}"
                                                            </p>
                                                        </div>

                                                        {/* Reasoning (only if available) */}
                                                        {generatedReasoning && (
                                                            <div className="flex gap-2 text-gray-400 text-xs">
                                                                <span className="text-primary/60 shrink-0">💡</span>
                                                                <p className="leading-relaxed italic">
                                                                    {generatedReasoning}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Regenerate Button */}
                                                        <button
                                                            onClick={generateAISuggestion}
                                                            disabled={generatingReply}
                                                            className="w-full mt-2 py-2.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {generatingReply ? (
                                                                <>
                                                                    <Loader2 size={14} className="animate-spin" />
                                                                    {isIcebreaker ? 'Gerando Icebreaker...' : 'Gerando Resposta...'}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles size={14} />
                                                                    {isIcebreaker ? 'Gerar Novo Icebreaker' : 'Gerar Nova Resposta'}
                                                                </>
                                                            )}
                                                        </button>

                                                        {/* Use in Chat Button */}
                                                        <button
                                                            onClick={() => {
                                                                setNewMessage(draftMessage)
                                                                setSelectedSuggestionIdx(0)
                                                            }}
                                                            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/80 text-white text-xs font-bold shadow-lg shadow-primary/20 transition-all flex justify-center items-center gap-2"
                                                        >
                                                            <Check size={14} />
                                                            Usar no Chat
                                                        </button>
                                                    </>
                                                )
                                            }

                                            // Default: Empty state → show generate button
                                            return (
                                                <div className="text-center py-6">
                                                    <p className="text-sm text-gray-400 mb-5">
                                                        {isIcebreaker
                                                            ? 'Nenhuma conversa iniciada com este lead.'
                                                            : 'Clique para gerar uma sugestão de resposta com IA.'}
                                                    </p>
                                                    <button
                                                        onClick={generateAISuggestion}
                                                        disabled={generatingReply}
                                                        className="w-full py-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 text-sm font-semibold text-amber-300 hover:text-amber-200 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {generatingReply ? (
                                                            <>
                                                                <Loader2 size={14} className="animate-spin" />
                                                                {isIcebreaker ? 'Gerando Icebreaker...' : 'Gerando Resposta...'}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles size={14} />
                                                                {isIcebreaker ? 'Gerar Icebreaker' : 'Gerar Resposta'}
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-[#0d0d0d] rounded-2xl border border-white/10 p-8 text-center text-gray-400 text-sm h-40 flex items-center justify-center">
                                Contexto do lead aparecerá aqui.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default SalesInboxPage
