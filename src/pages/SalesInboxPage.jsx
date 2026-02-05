import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import { Search, Send, MoreVertical, Phone, Mail, MapPin, Briefcase, Zap, Star, Sparkles, MessageSquare, Copy, Check, LayoutGrid, List } from 'lucide-react'
import KanbanColumn from '../components/kanban/KanbanColumn'
import KanbanLeadCard from '../components/kanban/KanbanLeadCard'

const SalesInboxPage = () => {
    const { selectedClientId } = useClientSelection()
    const [leads, setLeads] = useState([])
    const [loadingLeads, setLoadingLeads] = useState(false)
    const [activeLead, setActiveLead] = useState(null)

    // View Mode
    const [viewMode, setViewMode] = useState('list') // 'list' | 'kanban'

    // Chat State
    const [interactions, setInteractions] = useState([])
    const [loadingChat, setLoadingChat] = useState(false)
    const [newMessage, setNewMessage] = useState('')

    // AI Actions State
    const [draftMessage, setDraftMessage] = useState('')
    const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(null)
    const [copiedIdx, setCopiedIdx] = useState(null)

    // 1. Fetch Inbox Leads (Score > 0, Sorted Desc)
    useEffect(() => {
        if (!selectedClientId) return

        const fetchInboxLeads = async () => {
            setLoadingLeads(true)
            try {
                // Fetch leads with interaction stats
                const { data, error } = await supabase
                    .from('leads')
                    .select(`
                        *,
                        interactions:interactions(count),
                        last_interaction:interactions(interaction_date)
                    `)
                    .eq('client_id', selectedClientId)
                    .gt('engagement_score', 0)
                    .order('engagement_score', { ascending: false })
                    .limit(50)

                if (error) throw error

                // Process leads to flatten interaction data
                const processedLeads = (data || []).map(lead => ({
                    ...lead,
                    total_interactions_count: lead.interactions?.[0]?.count || 0,
                    last_interaction_date: lead.last_interaction?.length > 0
                        ? lead.last_interaction.sort((a, b) => new Date(b.interaction_date) - new Date(a.interaction_date))[0]?.interaction_date
                        : null
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
            return
        }

        // Set initial draft if AI suggestion exists
        if (activeLead.ai_suggested_replies) {
            // Handle both object and string format safely
            try {
                const replies = typeof activeLead.ai_suggested_replies === 'string'
                    ? JSON.parse(activeLead.ai_suggested_replies)
                    : activeLead.ai_suggested_replies

                if (Array.isArray(replies) && replies.length > 0) {
                    const firstReply = replies[0]
                    setDraftMessage(typeof firstReply === 'object' ? firstReply.text : firstReply)
                    setSelectedSuggestionIdx(0)
                }
            } catch (e) {
                console.error("Error parsing AI replies", e)
            }
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

    // Kanban Categorization Logic
    const categorizeLeads = (leadsArray) => {
        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const highPriority = []
        const toRespond = []
        const waiting = []
        const standby = []

        leadsArray.forEach(lead => {
            const trustScore = lead?.trust_score || lead?.engagement_score || 0
            const icpScore = lead?.qualification_tier || lead?.icp_score
            // Using engagement_score as proxy if trust_score missing for this view
            const lastType = lead?.last_interaction_type // assuming this field exists on leads table or we check interactions
            const lastDate = lead?.last_interaction_date ? new Date(lead.last_interaction_date) : null

            // Logic adapted for what we have available in `leads` table fetch
            // If `last_interaction_type` isn't on `leads` table, we might be limited. 
            // Assuming for now it is or relying on simple rules.

            // Rule: High Priority
            if (trustScore > 70 || icpScore === 'A') {
                highPriority.push(lead)
                return
            }

            // Rule: Standby (Low score or old)
            if (trustScore < 40 || (lastDate && lastDate < sevenDaysAgo)) {
                standby.push(lead)
                return
            }

            // Since we might not have `last_interaction_type` on the lead object directly without a join,
            // we'll default to 'Para Responder' based on 'To Respond' usually being the default active state for engagement
            toRespond.push(lead)
        })

        return { highPriority, toRespond, waiting, standby }
    }

    const kanbanData = categorizeLeads(leads)

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
            <div className="flex justify-between items-center px-4 shrink-0">
                <h1 className="text-xl font-bold text-black flex items-center gap-2">
                    <LayoutGrid size={20} className="text-primary" /> Inbox Inteligente
                </h1>
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
                                {leads.length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {loadingLeads ? (
                                <div className="p-8 text-center text-gray-500 text-sm">Carregando...</div>
                            ) : leads.map(lead => (
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
                            {!loadingLeads && leads.length === 0 && (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    Nenhum lead com engajamento.
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
                                {/* Lead Info Card */}
                                <div className="bg-[#0d0d0d] rounded-2xl border border-white/10 p-5">
                                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Dados do Lead</h4>
                                    <div className="space-y-3">
                                        <div className="flex gap-3 items-center text-sm text-white">
                                            <Briefcase size={16} className="text-primary" />
                                            <span className="truncate">{activeLead.headline}</span>
                                        </div>
                                        <div className="flex gap-3 items-center text-sm text-white">
                                            <MapPin size={16} className="text-primary" />
                                            <span className="truncate">{activeLead.location || 'Localização não informada'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Suggestion Card (Enhanced) */}
                                <div className="relative p-[1px] rounded-2xl bg-gradient-to-br from-primary/50 to-purple-600/50 shadow-lg shadow-primary/10">
                                    <div className="bg-[#0d0d0d] rounded-2xl p-5 h-full flex flex-col gap-4">
                                        <div className="flex items-center gap-2 mb-1 text-primary font-bold text-sm">
                                            <Sparkles size={16} /> Próximo Passo
                                        </div>

                                        {(() => {
                                            // Parse AI Suggestions Safely
                                            let aiReplies = [];
                                            try {
                                                const raw = activeLead.ai_suggested_replies;
                                                aiReplies = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
                                                if (!Array.isArray(aiReplies)) aiReplies = [];
                                            } catch (e) { aiReplies = [] }

                                            if (aiReplies.length > 0) {
                                                return (
                                                    <div className="space-y-3">
                                                        {aiReplies.map((reply, idx) => {
                                                            const text = typeof reply === 'object' ? reply.text : reply
                                                            const strategy = typeof reply === 'object' ? reply.strategy : null
                                                            const isSelected = selectedSuggestionIdx === idx

                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        setDraftMessage(text)
                                                                        setSelectedSuggestionIdx(idx)
                                                                    }}
                                                                    className={`p-3 rounded-lg border transition-all cursor-pointer ${isSelected
                                                                        ? 'bg-primary/20 border-primary/50'
                                                                        : 'bg-[#1a1a1a] border-white/10 hover:bg-white/10'
                                                                        }`}
                                                                >
                                                                    <p className="text-sm text-white line-clamp-3">"{text}"</p>
                                                                    {strategy && (
                                                                        <div className="mt-2 text-[11px] text-primary/80 italic border-t border-white/10 pt-2">
                                                                            💡 {strategy}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )
                                            } else {
                                                return (
                                                    <p className="text-sm text-gray-400">
                                                        Sem sugestões disponíveis.
                                                    </p>
                                                )
                                            }
                                        })()}

                                        {/* Editor */}
                                        {draftMessage && (
                                            <div className="mt-2 pt-4 border-t border-white/20">
                                                <label className="text-[11px] text-primary uppercase font-bold mb-2 block">Editar & Enviar</label>
                                                <textarea
                                                    className="w-full bg-black/40 border border-glass-border rounded-lg p-3 text-sm text-white mb-2 focus:ring-1 focus:ring-primary/50 focus:outline-none resize-none"
                                                    rows="4"
                                                    value={draftMessage}
                                                    onChange={(e) => setDraftMessage(e.target.value)}
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => copyToClipboard(draftMessage, 999)}
                                                        className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all flex justify-center items-center gap-2"
                                                    >
                                                        {copiedIdx === 999 ? <Check size={14} /> : <Copy size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={handleAiSend}
                                                        className="flex-[3] py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex justify-center items-center gap-2"
                                                    >
                                                        <Send size={14} /> Enviar via LinkedIn
                                                    </button>
                                                </div>
                                            </div>
                                        )}
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
