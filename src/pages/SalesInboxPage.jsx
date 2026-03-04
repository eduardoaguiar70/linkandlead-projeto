import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import { Search, Send, MoreVertical, Phone, Mail, MapPin, Briefcase, Zap, Star, Sparkles, MessageSquare, Check, LayoutGrid, List, Loader2, X, ClipboardList, CheckCircle2, Ban } from 'lucide-react'
const N8N_GENERATE_REPLY_URL = 'https://n8n-n8n-start.kfocge.easypanel.host/webhook/generate-reply'
const N8N_SEND_MESSAGE_URL = 'https://n8n-n8n-start.kfocge.easypanel.host/webhook/send-linkedin-message'
import StrategicContextCard from '../components/StrategicContextCard'

// Returns true only for confirmed OVERDUE follow-ups (last_task_completed_at NOT null)
// leads with null last_task_completed_at are excluded here to avoid false positives
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const isCockpitPendingStrict = (lead) => {
    if (!lead) return false
    if (lead.is_blacklisted) return false
    if (lead.crm_stage === 'Ganho') return false
    if (!lead.last_task_completed_at) return false // null handled via cockpitLeadId
    const overdue = new Date(lead.last_task_completed_at).getTime() < Date.now() - SEVEN_DAYS_MS
    return overdue && !lead.has_engaged
}

const SalesInboxPage = () => {
    const { selectedClientId } = useClientSelection()
    const [searchParams, setSearchParams] = useSearchParams()
    const [leads, setLeads] = useState([])
    const [loadingLeads, setLoadingLeads] = useState(false)
    const [activeLead, setActiveLead] = useState(null)

    // View Mode
    const [searchTerm, setSearchTerm] = useState('')
    const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)
    const [globalSearchResults, setGlobalSearchResults] = useState(null)

    // Chat State
    const [interactions, setInteractions] = useState([])
    const [loadingChat, setLoadingChat] = useState(false)
    const [newMessage, setNewMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [toast, setToast] = useState(null)

    // AI Actions State
    const [draftMessage, setDraftMessage] = useState('')
    const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(null)
    const [generatingReply, setGeneratingReply] = useState(false)
    const [sdrSeniorGenerated, setSdrSeniorGenerated] = useState(false)
    const [generatedReasoning, setGeneratedReasoning] = useState(null)

    // Right sidebar tabs + AI Copilot state
    const [rightTab, setRightTab] = useState('detalhes')
    const [aiChatHistory, setAiChatHistory] = useState([])
    const [aiInput, setAiInput] = useState('')
    const [aiLoading, setAiLoading] = useState(false)

    // Track which lead was opened directly from the Cockpit (via ?leadId= URL param)
    const [cockpitLeadId, setCockpitLeadId] = useState(null)

    // Cockpit task auto-complete
    const [pendingTaskId, setPendingTaskId] = useState(null)

    // CRM Quick Actions
    const [crmToast, setCrmToast] = useState(null)
    const showCrmToast = (msg, type = 'success') => {
        setCrmToast({ msg, type })
        setTimeout(() => setCrmToast(null), 2500)
    }

    const handleMarkDone = async () => {
        if (!activeLead) return
        try {
            await supabase.from('leads').update({ last_task_completed_at: new Date().toISOString() }).eq('id', activeLead.id)
            showCrmToast('✅ Tarefa concluída!')
        } catch (err) {
            console.error('[Inbox] markDone error:', err)
            showCrmToast('Erro ao salvar.', 'error')
        }
    }

    const handleBlacklistLead = async () => {
        if (!activeLead) return
        try {
            await supabase.from('leads').update({ is_blacklisted: true }).eq('id', activeLead.id)
            showCrmToast('🚫 Lead adicionado à lista negra.')
        } catch (err) {
            console.error('[Inbox] blacklist error:', err)
            showCrmToast('Erro ao salvar.', 'error')
        }
    }

    // AI Copilot chat handler
    const handleAiChat = async () => {
        const userMsg = aiInput.trim()
        if (!userMsg || !activeLead) return

        const newHistory = [...aiChatHistory, { role: 'user', content: userMsg }]
        setAiChatHistory(newHistory)
        setAiInput('')
        setAiLoading(true)

        try {
            const conversationHistory = interactions
                .slice().reverse()
                .map(msg => ({ is_sender: !!msg.is_sender, content: msg.content || '' }))

            const payload = {
                user_id: selectedClientId,
                lead_id: activeLead.id,
                lead_name: activeLead.nome || '',
                lead_headline: activeLead.headline || '',
                lead_location: activeLead.location || '',
                lead_reasoning: activeLead.analysis_reasoning || '',
                lead_icp_reason: activeLead.icp_reason || '',
                conversation_history: conversationHistory,
                is_icebreaker: interactions.length === 0,
                ai_chat_history: newHistory
            }

            const response = await fetch(N8N_GENERATE_REPLY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!response.ok) throw new Error('Erro na requisição')
            const data = await response.json()
            setAiChatHistory(prev => [...prev, { role: 'assistant', content: data.reply || 'Sem resposta.' }])
        } catch {
            setAiChatHistory(prev => [...prev, { role: 'assistant', content: 'Erro ao gerar resposta.' }])
        } finally {
            setAiLoading(false)
        }
    }

    // Sidebar Tabs: Conversas | Tarefas do Dia
    const [sidebarTab, setSidebarTab] = useState('conversas')
    const [sidebarTasks, setSidebarTasks] = useState([])
    const [loadingTasks, setLoadingTasks] = useState(false)
    const [pendingTaskCount, setPendingTaskCount] = useState(0)

    // Eager fetch: task count badge (always visible, regardless of active tab)
    useEffect(() => {
        if (!selectedClientId) return
        const fetchCount = async () => {
            const { data } = await supabase
                .from('tasks')
                .select('id, leads!inner(client_id)')
                .eq('leads.client_id', selectedClientId)
                .eq('status', 'PENDING')
            setPendingTaskCount(data?.length || 0)
        }
        fetchCount()
    }, [selectedClientId])

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
                let lastDateMap = {}
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
                                lastDateMap[row.lead_id] = row.interaction_date
                            }
                        })
                    }
                }

                const processedLeads = (data || []).map(lead => ({
                    ...lead,
                    total_interactions_count: lead.total_interactions_count || 0,
                    last_interaction_date: lastDateMap[lead.id] || lead.last_interaction_date || null,
                    // is_sender=true → I sent last msg | is_sender=false → lead sent last msg
                    _lastMsgIsSender: lead.id in lastSenderMap ? lastSenderMap[lead.id] : null
                })).sort((a, b) => {
                    const dateA = a.last_interaction_date ? new Date(a.last_interaction_date).getTime() : 0
                    const dateB = b.last_interaction_date ? new Date(b.last_interaction_date).getTime() : 0
                    return dateB - dateA
                })

                setLeads(processedLeads)

                // Auto-select lead from URL param (e.g. /sales/inbox?leadId=xxx)
                const targetLeadId = searchParams.get('leadId')
                if (targetLeadId) {
                    let targetLead = processedLeads.find(l => String(l.id) === targetLeadId)

                    // Lead not in top 50 — fetch individually and prepend
                    if (!targetLead) {
                        const { data: singleLead } = await supabase
                            .from('leads')
                            .select('*')
                            .eq('id', targetLeadId)
                            .single()

                        if (singleLead) {
                            targetLead = {
                                ...singleLead,
                                total_interactions_count: singleLead.total_interactions_count || 0,
                                _lastMsgIsSender: null
                            }
                            setLeads(prev => [targetLead, ...prev])
                        }
                    }

                    if (targetLead) {
                        setActiveLead(targetLead)
                        setCockpitLeadId(String(targetLeadId)) // mark as cockpit-originated
                    }

                    // Store taskId for auto-complete after sending message
                    const taskId = searchParams.get('taskId')
                    if (taskId) setPendingTaskId(taskId)

                    // Clear the params so they don't re-trigger
                    setSearchParams({}, { replace: true })
                }
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
        // Always reset copilot history when switching leads
        setAiChatHistory([])
        setAiInput('')

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

    // Global Search Effect
    useEffect(() => {
        if (!selectedClientId) return

        const debounceTimer = setTimeout(async () => {
            const term = searchTerm.trim()
            if (term.length >= 3) {
                setIsSearchingGlobal(true)
                try {
                    const { data, error } = await supabase
                        .from('leads')
                        .select('*')
                        .eq('client_id', selectedClientId)
                        .or(`nome.ilike.%${term}%,headline.ilike.%${term}%,empresa.ilike.%${term}%`)
                        .order('total_interactions_count', { ascending: false })
                        .limit(100)

                    if (error) throw error

                    const leadIds = (data || []).map(l => l.id)
                    let lastSenderMap = {}
                    let lastDateMap = {}

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
                                    lastDateMap[row.lead_id] = row.interaction_date
                                }
                            })
                        }
                    }

                    const processedLeads = (data || []).map(lead => ({
                        ...lead,
                        total_interactions_count: lead.total_interactions_count || 0,
                        last_interaction_date: lastDateMap[lead.id] || lead.last_interaction_date || null,
                        _lastMsgIsSender: lead.id in lastSenderMap ? lastSenderMap[lead.id] : null
                    })).sort((a, b) => {
                        const dateA = a.last_interaction_date ? new Date(a.last_interaction_date).getTime() : 0
                        const dateB = b.last_interaction_date ? new Date(b.last_interaction_date).getTime() : 0
                        return dateB - dateA
                    })

                    setGlobalSearchResults(processedLeads)
                } catch (err) {
                    console.error('Erro na busca global:', err)
                } finally {
                    setIsSearchingGlobal(false)
                }
            } else {
                setGlobalSearchResults(null)
            }
        }, 500)

        return () => clearTimeout(debounceTimer)
    }, [searchTerm, selectedClientId])

    const baseLeads = globalSearchResults !== null ? globalSearchResults : leads
    const filteredLeads = searchTerm.trim() && globalSearchResults === null
        ? baseLeads.filter(lead => {
            const term = searchTerm.toLowerCase()
            return (
                (lead.nome || '').toLowerCase().includes(term) ||
                (lead.headline || '').toLowerCase().includes(term) ||
                (lead.company || '').toLowerCase().includes(term)
            )
        })
        : baseLeads


    // Fetch tasks when sidebar tab is active
    const fetchSidebarTasks = useCallback(async () => {
        if (!selectedClientId) return
        setLoadingTasks(true)
        try {
            const { data } = await supabase
                .from('tasks')
                .select('*, leads!inner(id, client_id, nome, empresa, headline, cadence_stage, avatar_url, linkedin_profile_url, total_interactions_count)')
                .eq('leads.client_id', selectedClientId)
                .eq('status', 'PENDING')
                .order('created_at', { ascending: true })

            // Sort by temperature: HOT (G4/G5) > WARM (G2/G3) > COLD (G1)
            const stagePriority = { G5: 0, G4: 1, G3: 2, G2: 3, G1: 4 }
            const sorted = (data || []).sort((a, b) => {
                const pa = stagePriority[a.leads?.cadence_stage] ?? 5
                const pb = stagePriority[b.leads?.cadence_stage] ?? 5
                return pa - pb
            })
            setSidebarTasks(sorted)
        } catch (err) {
            console.error('Error fetching sidebar tasks:', err)
        } finally {
            setLoadingTasks(false)
        }
    }, [selectedClientId])

    useEffect(() => {
        if (sidebarTab === 'tarefas') fetchSidebarTasks()
    }, [sidebarTab, fetchSidebarTasks])

    const handleTaskClick = async (task) => {
        const taskLead = task.leads
        if (!taskLead?.id) return

        // Try to find the lead in the already-loaded list
        let lead = leads.find(l => l.id === taskLead.id)

        if (!lead) {
            // Fetch individual lead
            const { data } = await supabase.from('leads').select('*').eq('id', taskLead.id).single()
            if (data) {
                lead = { ...data, total_interactions_count: data.total_interactions_count || 0, _lastMsgIsSender: null }
                setLeads(prev => [lead, ...prev])
            }
        }

        if (lead) {
            setActiveLead(lead)
            setCockpitLeadId(String(lead.id)) // mark as task-originated → show CRM action buttons
            setPendingTaskId(task.id)
        }
    }

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    const completeTaskIfPending = async () => {
        if (!pendingTaskId) return
        try {
            await supabase
                .from('tasks')
                .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
                .eq('id', pendingTaskId)
            setPendingTaskId(null)
            showToast('✅ Tarefa do Cockpit concluída automaticamente!')
        } catch (err) {
            console.error('[Auto-complete] Error:', err)
        }
    }

    const sendToWebhook = async (messageText) => {
        // Fetch the Unipile account_id from the clients table
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('unipile_account_id')
            .eq('id', activeLead.client_id)
            .single()

        if (clientError || !client?.unipile_account_id) {
            throw new Error('Não foi possível obter o account_id da Unipile para este cliente.')
        }

        const response = await fetch(N8N_SEND_MESSAGE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account_id: client.unipile_account_id,
                provider_id: activeLead.provider_id,
                chat_id: activeLead.chat_id || null,
                message_text: messageText
            })
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response
    }

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeLead || isSending) return

        const messageText = newMessage.trim()
        setIsSending(true)

        try {
            await sendToWebhook(messageText)

            const tempMsg = {
                id: Date.now(),
                content: messageText,
                is_sender: true,
                interaction_date: new Date().toISOString()
            }
            setInteractions(prev => [tempMsg, ...prev])
            setNewMessage('')
            showToast('Mensagem enviada!')
            await completeTaskIfPending()
        } catch (err) {
            console.error('[Send] Error:', err)
            showToast('Erro ao enviar mensagem. Tente novamente.', 'error')
        } finally {
            setIsSending(false)
        }
    }

    const generateAISuggestion = async () => {
        if (!activeLead || !selectedClientId) return

        setGeneratingReply(true)
        setSdrSeniorGenerated(false)
        setGeneratedReasoning(null)
        try {
            const conversationHistory = interactions
                .slice().reverse()
                .map(msg => ({
                    is_sender: !!msg.is_sender,
                    content: msg.content || ''
                }))

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
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                    {isSearchingGlobal ? (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary">
                            <Loader2 size={14} className="animate-spin" />
                        </div>
                    ) : searchTerm ? (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    ) : null}
                </div>
            </div>

            {/* LIST / DETAIL VIEW */}
            <div className="flex-1 flex gap-4 lg:gap-6 overflow-hidden">
                {/* LEFT: Lead List */}
                <div className="hidden md:flex w-72 lg:w-80 flex-col bg-charcoal rounded-2xl border border-glass-border overflow-hidden shrink-0">
                    {/* Sidebar Tabs */}
                    <div className="p-2 border-b border-glass-border bg-black/20">
                        <div className="flex bg-black/30 rounded-lg p-0.5 gap-0.5">
                            <button
                                onClick={() => setSidebarTab('conversas')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${sidebarTab === 'conversas'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <MessageSquare size={13} />
                                Conversas
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${sidebarTab === 'conversas' ? 'bg-white/20' : 'bg-white/10'
                                    }`}>
                                    {filteredLeads.length}
                                </span>
                            </button>
                            <button
                                onClick={() => setSidebarTab('tarefas')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${sidebarTab === 'tarefas'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <ClipboardList size={13} />
                                Tarefas
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${sidebarTab === 'tarefas' ? 'bg-white/20' : 'bg-white/10'
                                    }`}>
                                    {pendingTaskCount}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* TAB CONTENT */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">

                        {/* ── CONVERSAS TAB ── */}
                        {sidebarTab === 'conversas' && (
                            <>
                                {loadingLeads ? (
                                    <div className="p-8 text-center text-text-muted text-sm">Carregando...</div>
                                ) : filteredLeads.map(lead => (
                                    <div
                                        key={lead.id}
                                        onClick={() => setActiveLead(lead)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${activeLead?.id === lead.id
                                            ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/5'
                                            : 'border-transparent hover:bg-glass hover:border-glass-border'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`font-semibold text-sm truncate max-w-[140px] lg:max-w-[160px] text-text-heading`}>
                                                {lead.nome || 'Sem Nome'}
                                            </span>
                                            <span className="text-[10px] text-text-muted">
                                                {lead.last_interaction ? new Date(lead.last_interaction).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                            </span>
                                        </div>
                                        <div className="text-xs text-text-body mb-2 truncate">
                                            {lead.headline || 'Lead qualificado'}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px]">
                                            <span className={`font-bold px-1.5 py-0.5 rounded ${lead.icp_score === 'A' ? 'bg-emerald-500/20 text-emerald-400' :
                                                lead.icp_score === 'B' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                ICP {lead.icp_score || 'C'}
                                            </span>
                                            <span className="text-text-muted">
                                                {(() => {
                                                    const d = lead.last_interaction_date
                                                    if (!d) return 'Sem interação'
                                                    const diff = Date.now() - new Date(d).getTime()
                                                    const mins = Math.floor(diff / 60000)
                                                    if (mins < 60) return `💬 há ${mins}m`
                                                    const hrs = Math.floor(mins / 60)
                                                    if (hrs < 24) return `💬 há ${hrs}h`
                                                    const days = Math.floor(hrs / 24)
                                                    return `💬 há ${days}d`
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {!loadingLeads && filteredLeads.length === 0 && (
                                    <div className="p-8 text-center text-text-muted text-sm">
                                        {searchTerm ? 'Nenhum lead encontrado.' : 'Nenhum lead com engajamento.'}
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── TAREFAS DO DIA TAB ── */}
                        {sidebarTab === 'tarefas' && (
                            <>
                                {loadingTasks ? (
                                    <div className="p-8 text-center text-text-muted text-sm flex flex-col items-center gap-2">
                                        <Loader2 size={18} className="animate-spin text-primary" />
                                        Carregando tarefas...
                                    </div>
                                ) : sidebarTasks.length === 0 ? (
                                    <div className="p-8 text-center text-text-muted text-sm flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                            <Check size={20} className="text-emerald-400" />
                                        </div>
                                        <span>Nenhuma tarefa pendente! 🎉</span>
                                    </div>
                                ) : sidebarTasks.map(task => {
                                    const tLead = task.leads || {}
                                    const stage = tLead.cadence_stage || ''
                                    const stageColor = stage === 'G4' || stage === 'G5' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                        : stage === 'G2' || stage === 'G3' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'

                                    const interactionCount = tLead.total_interactions_count || 0
                                    const isFirstContact = interactionCount === 0
                                    const actionLabel = isFirstContact ? '✉️ Enviar Icebreaker' : '💬 Continuar Conversa'
                                    const actionColor = isFirstContact
                                        ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'

                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => handleTaskClick(task)}
                                            className="p-3 rounded-xl border border-transparent hover:bg-glass hover:border-glass-border cursor-pointer transition-all group"
                                        >
                                            <div className="flex items-center gap-2 mb-1.5">
                                                {tLead.avatar_url ? (
                                                    <img src={tLead.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-glass-border" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-glass border border-glass-border flex items-center justify-center text-[10px] font-bold text-text-heading">
                                                        {tLead.nome?.charAt(0) || '?'}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-semibold text-text-heading truncate block">{tLead.nome || 'Lead'}</span>
                                                </div>
                                                {stage && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${stageColor}`}>
                                                        {stage}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Action label */}
                                            <div className="pl-9 mb-1">
                                                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${actionColor}`}>
                                                    {actionLabel}
                                                </span>
                                            </div>
                                            {task.instruction && (
                                                <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2 pl-9">
                                                    💡 {task.instruction}
                                                </p>
                                            )}
                                        </div>
                                    )
                                })}
                            </>
                        )}
                    </div>
                </div>

                {/* MIDDLE: Chat Area */}
                {activeLead ? (
                    <div className="flex-1 flex flex-col bg-charcoal rounded-2xl border border-glass-border overflow-hidden relative">
                        {/* Header */}
                        <div className="p-4 border-b border-glass-border bg-black/20 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-gray-800 to-black border border-glass-border flex items-center justify-center text-white font-bold shadow-inner overflow-hidden">
                                    {activeLead.avatar_url ? (
                                        <img src={activeLead.avatar_url} alt={activeLead.nome} className="w-full h-full object-cover" />
                                    ) : (
                                        activeLead.nome?.charAt(0)
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-text-heading text-sm truncate">{activeLead.nome}</div>
                                    <div className="text-xs text-text-muted truncate">{activeLead.headline || activeLead.company}</div>
                                </div>
                            </div>

                            {/* CRM Quick Actions — only for Cockpit-originated leads or overdue follow-ups */}
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {(cockpitLeadId === String(activeLead?.id) || isCockpitPendingStrict(activeLead)) && (
                                    <>
                                        <button
                                            onClick={handleMarkDone}
                                            title="Marcar tarefa como Concluída"
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-emerald-400 border border-emerald-400/30 hover:bg-emerald-500/10 hover:border-emerald-400/60 transition-all"
                                        >
                                            <CheckCircle2 size={13} /> Concluído
                                        </button>
                                        <button
                                            onClick={handleBlacklistLead}
                                            title="Adicionar à Lista Negra"
                                            className="flex items-center justify-center w-8 h-8 rounded-lg text-red-400/60 border border-red-400/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/40 transition-all"
                                        >
                                            <Ban size={13} />
                                        </button>
                                    </>
                                )}
                                <button className="p-2 rounded-lg hover:bg-glass text-text-muted hover:text-text-heading transition-colors">
                                    <MoreVertical size={18} />
                                </button>
                            </div>

                            {/* CRM Toast */}
                            {crmToast && (
                                <div className={`absolute top-16 right-4 z-50 px-3 py-2 rounded-lg text-xs font-semibold shadow-lg border ${crmToast.type === 'error'
                                    ? 'bg-red-900/80 border-red-500/40 text-red-200'
                                    : 'bg-gray-900/90 border-emerald-500/40 text-emerald-300'
                                    }`}>
                                    {crmToast.msg}
                                </div>
                            )}
                        </div>

                        {/* Timeline */}
                        <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col-reverse gap-4 custom-scrollbar bg-black/10">
                            {loadingChat ? (
                                <div className="text-center text-text-muted text-sm py-10">Carregando histórico...</div>
                            ) : interactions.length === 0 ? (
                                <div className="text-center text-text-muted text-sm py-10 flex flex-col items-center gap-2">
                                    <MessageSquare size={24} className="opacity-20" />
                                    Nenhuma mensagem trocada ainda.
                                </div>
                            ) : (() => {
                                // Build date label helper
                                const getDateLabel = (dateStr) => {
                                    const date = new Date(dateStr)
                                    const now = new Date()
                                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                                    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                                    const diffDays = Math.round((today - msgDay) / (1000 * 60 * 60 * 24))

                                    if (diffDays === 0) return 'HOJE'
                                    if (diffDays === 1) return 'ONTEM'
                                    if (diffDays < 7) {
                                        return date.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase()
                                    }
                                    const day = date.getDate()
                                    const month = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '')
                                    return `${day} DE ${month}.`
                                }

                                const getDateKey = (dateStr) => {
                                    const d = new Date(dateStr)
                                    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
                                }

                                // interactions are sorted desc (newest first), rendered with flex-col-reverse
                                const elements = []
                                let lastDateKey = null

                                interactions.forEach((msg, idx) => {
                                    const dateKey = getDateKey(msg.interaction_date)

                                    // When date changes, insert divider BEFORE the message bubble
                                    // (in reversed layout, this renders ABOVE the group)
                                    if (dateKey !== lastDateKey) {
                                        // Look at next message — if it's a different day, the divider goes here
                                        // For the first message (newest), always show divider
                                        if (lastDateKey !== null) {
                                            elements.push(
                                                <div key={`divider-${lastDateKey}`} className="flex items-center gap-3 my-2 self-stretch">
                                                    <div className="flex-1 h-px bg-glass-border" />
                                                    <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase">
                                                        {getDateLabel(interactions[idx - 1].interaction_date)}
                                                    </span>
                                                    <div className="flex-1 h-px bg-glass-border" />
                                                </div>
                                            )
                                        }
                                        lastDateKey = dateKey
                                    }

                                    elements.push(
                                        <div key={msg.id} className={`flex flex-col max-w-[85%] lg:max-w-[80%] ${msg.is_sender === true ? 'self-end items-end' : 'self-start items-start'}`}>
                                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.is_sender === true
                                                ? 'bg-primary text-white rounded-br-sm shadow-lg shadow-primary/10'
                                                : 'bg-glass text-text-body rounded-bl-sm border border-glass-border'
                                                }`}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[10px] text-text-muted mt-1 px-1">
                                                {new Date(msg.interaction_date).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    )
                                })

                                // Add divider for the last (oldest) group
                                if (lastDateKey !== null) {
                                    elements.push(
                                        <div key={`divider-${lastDateKey}`} className="flex items-center gap-3 my-2 self-stretch">
                                            <div className="flex-1 h-px bg-glass-border" />
                                            <span className="text-[10px] font-bold text-text-muted tracking-widest uppercase">
                                                {getDateLabel(interactions[interactions.length - 1].interaction_date)}
                                            </span>
                                            <div className="flex-1 h-px bg-glass-border" />
                                        </div>
                                    )
                                }

                                return elements
                            })()}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-glass-border bg-black/20">
                            <div className="relative">
                                <textarea
                                    className="w-full bg-black/40 border border-glass-border rounded-xl pl-4 pr-12 py-3 text-white placeholder-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    rows="1"
                                    placeholder={isSending ? 'Enviando...' : 'Digite sua resposta... (Ctrl+Enter para enviar)'}
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    disabled={isSending}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                            e.preventDefault()
                                            handleSendMessage()
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isSending || !newMessage.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-primary hover:bg-primary/80 text-white shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-charcoal rounded-2xl border border-glass-border text-text-muted gap-4">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                            <Zap size={32} className="text-primary/50" />
                        </div>
                        <p className="text-sm text-text-muted">Selecione um lead para iniciar o atendimento.</p>
                    </div>
                )}

                {/* RIGHT: Context & AI — Tabbed Sidebar */}
                <div className="hidden xl:flex w-80 flex-col shrink-0 overflow-hidden">
                    {activeLead ? (
                        <div className="flex flex-col h-full bg-charcoal rounded-2xl border border-glass-border overflow-hidden">
                            {/* Tab Switcher */}
                            <div className="p-2 border-b border-glass-border bg-black/20 shrink-0">
                                <div className="flex bg-black/30 rounded-lg p-0.5 gap-0.5">
                                    <button
                                        onClick={() => setRightTab('detalhes')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${rightTab === 'detalhes'
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <ClipboardList size={13} /> Detalhes
                                    </button>
                                    <button
                                        onClick={() => setRightTab('copiloto')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${rightTab === 'copiloto'
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <Sparkles size={13} /> Copiloto IA
                                    </button>
                                </div>
                            </div>

                            {/* ═══ TAB: DETALHES ═══ */}
                            {rightTab === 'detalhes' && (
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                                    {/* Lead Info Card */}
                                    <div>
                                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Dados do Lead</h4>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className={`flex-1 text-center py-2 px-3 rounded-lg border ${activeLead.icp_score === 'A' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : activeLead.icp_score === 'B' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-slate-500/20 border-slate-500/50 text-text-muted'}`}>
                                                <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">ICP</div>
                                                <div className="text-lg font-bold">{activeLead.icp_score || 'C'}</div>
                                            </div>
                                            <div className="flex-1 text-center py-2 px-3 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-400">
                                                <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Interações</div>
                                                <div className="text-lg font-bold">{activeLead.total_interactions_count || activeLead.total_interactions || 0}</div>
                                            </div>
                                            {(() => {
                                                const stage = activeLead.cadence_stage || ''
                                                const match = stage?.toString().match(/(\d+)/)
                                                const level = match ? parseInt(match[1], 10) : 0
                                                const cStyle = level >= 5 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                                    : level >= 3 ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                                        : level >= 1 ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                                            : 'bg-slate-500/20 border-slate-500/50 text-text-muted'
                                                return (
                                                    <div className={`flex-1 text-center py-2 px-3 rounded-lg border ${cStyle}`}>
                                                        <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Cadência</div>
                                                        <div className="text-lg font-bold">{stage || '—'}</div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </div>

                                    {/* Raio-X da Negociação */}
                                    <StrategicContextCard lead={activeLead} isIcebreaker={interactions.length === 0} />
                                </div>
                            )}

                            {/* ═══ TAB: COPILOTO IA ═══ */}
                            {rightTab === 'copiloto' && (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    {/* Chat Messages Area */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                                        {aiChatHistory.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                                                    <Sparkles size={20} className="text-primary/60" />
                                                </div>
                                                <p className="text-xs text-text-muted max-w-[200px] leading-relaxed">
                                                    Peça para a IA gerar, reescrever ou ajustar mensagens para este lead.
                                                </p>
                                                {/* Quick start button */}
                                                <button
                                                    onClick={() => {
                                                        const prompt = interactions.length === 0 ? 'Gere um icebreaker para este lead.' : 'Gere uma resposta para a última mensagem deste lead.'
                                                        setAiInput(prompt)
                                                    }}
                                                    className="mt-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[11px] font-bold transition-all"
                                                >
                                                    <Sparkles size={12} className="inline mr-1.5" />
                                                    {interactions.length === 0 ? 'Gerar Icebreaker' : 'Gerar Resposta'}
                                                </button>
                                            </div>
                                        ) : (
                                            aiChatHistory.map((msg, idx) => (
                                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${msg.role === 'user'
                                                        ? 'bg-primary/20 border border-primary/30 text-text-heading'
                                                        : 'bg-white/5 border border-glass-border text-text-heading'
                                                        }`}>
                                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                                        {msg.role === 'assistant' && msg.content !== 'Erro ao gerar resposta.' && (
                                                            <button
                                                                onClick={() => {
                                                                    setNewMessage(msg.content)
                                                                    setSelectedSuggestionIdx(0)
                                                                }}
                                                                className="mt-2 w-full py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
                                                            >
                                                                <Check size={11} /> Usar esta mensagem
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {aiLoading && (
                                            <div className="flex justify-start">
                                                <div className="px-4 py-3 rounded-xl bg-white/5 border border-glass-border text-text-muted text-xs flex items-center gap-2">
                                                    <Loader2 size={12} className="animate-spin text-primary" /> Gerando...
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input Bar */}
                                    <div className="p-3 border-t border-glass-border bg-black/20 shrink-0">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={aiInput}
                                                onChange={e => setAiInput(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && aiInput.trim()) { e.preventDefault(); handleAiChat() } }}
                                                disabled={aiLoading}
                                                placeholder="Ex: Refaça mais amigável..."
                                                className="w-full bg-black/40 border border-glass-border rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-50"
                                            />
                                            <button
                                                onClick={handleAiChat}
                                                disabled={aiLoading || !aiInput.trim()}
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-primary hover:bg-primary/80 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-charcoal rounded-2xl border border-glass-border p-8 text-center text-text-muted text-sm h-40 flex items-center justify-center">
                            Contexto do lead aparecerá aqui.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SalesInboxPage
