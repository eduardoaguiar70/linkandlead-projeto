import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import { Search, Send, MoreVertical, Phone, Mail, MapPin, Briefcase, Zap, Star, Sparkles, MessageSquare, Check, LayoutGrid, List, Loader2, X, ClipboardList, CheckCircle2, Ban } from 'lucide-react'
import SafeImage from '../components/SafeImage'
const N8N_GENERATE_REPLY_URL = 'https://n8n-n8n-start.kfocge.easypanel.host/webhook/generate-reply'
const N8N_SEND_MESSAGE_URL = 'https://n8n-n8n-start.kfocge.easypanel.host/webhook/send-linkedin-message'
import StrategicContextCard from '../components/StrategicContextCard'

// Returns true if lead meets the strict conditions to be considered a task
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const isLeadTask = (lead) => {
    if (!lead) return false
    if (lead.is_blacklisted) return false
    if (lead.crm_stage === 'Ganho') return false
    if (!lead.last_task_completed_at) return true // NULL is a task

    const overdue = new Date(lead.last_task_completed_at).getTime() < Date.now() - SEVEN_DAYS_MS
    return overdue && !lead.has_engaged
}

const SalesInboxPage = () => {
    const { selectedClientId, setActiveLeadId } = useClientSelection()
    const [searchParams, setSearchParams] = useSearchParams()
    const [leads, setLeads] = useState([])
    const [loadingLeads, setLoadingLeads] = useState(false)
    const [activeLead, setActiveLead] = useState(null)

    // Sync activeLeadId to context for global notification listener
    useEffect(() => {
        setActiveLeadId(activeLead?.id ? String(activeLead.id) : null)
        return () => setActiveLeadId(null)
    }, [activeLead?.id, setActiveLeadId])

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

            // Sync with Cockpit's tasks table
            await supabase.from('tasks').update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
                .eq('lead_id', activeLead.id).eq('status', 'PENDING')

            setActiveTaskLeadIds(prev => {
                const n = new Set(prev)
                n.delete(String(activeLead.id))
                return n
            })
            setPendingTaskCount(p => Math.max(0, p - 1))
            setSidebarTasks(prev => prev.filter(t => t.leads?.id !== activeLead.id))

            showCrmToast('✅ Task completed!')
        } catch (err) {
            console.error('[Inbox] markDone error:', err)
            showCrmToast('Error saving.', 'error')
        }
    }

    const handleBlacklistLead = async () => {
        if (!activeLead) return
        try {
            await supabase.from('leads').update({ is_blacklisted: true }).eq('id', activeLead.id)

            // Remove pending tasks for blacklisted lead
            await supabase.from('tasks').update({ status: 'CANCELLED', completed_at: new Date().toISOString() })
                .eq('lead_id', activeLead.id).eq('status', 'PENDING')

            setActiveTaskLeadIds(prev => {
                const n = new Set(prev)
                n.delete(String(activeLead.id))
                return n
            })
            setPendingTaskCount(p => Math.max(0, p - 1))
            setSidebarTasks(prev => prev.filter(t => t.leads?.id !== activeLead.id))

            showCrmToast('🚫 Lead added to blacklist.')
        } catch (err) {
            console.error('[Inbox] blacklist error:', err)
            showCrmToast('Error saving.', 'error')
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
                .map(msg => ({
                    is_sender: !!msg.is_sender,
                    content: msg.content || '',
                    interaction_date: msg.interaction_date || null
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
                is_icebreaker: interactions.length === 0,
                ai_chat_history: newHistory
            }

            const response = await fetch(N8N_GENERATE_REPLY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!response.ok) throw new Error('Request error')
            const data = await response.json()
            setAiChatHistory(prev => [...prev, { role: 'assistant', content: data.reply || 'No response.' }])
        } catch {
            setAiChatHistory(prev => [...prev, { role: 'assistant', content: 'Error generating response.' }])
        } finally {
            setAiLoading(false)
        }
    }

    // Sidebar Tabs: Conversas | Tarefas do Dia
    const [sidebarTab, setSidebarTab] = useState('conversas')
    const [sidebarTasks, setSidebarTasks] = useState([])
    const [loadingTasks, setLoadingTasks] = useState(false)
    const [pendingTaskCount, setPendingTaskCount] = useState(0)
    const [activeTaskLeadIds, setActiveTaskLeadIds] = useState(new Set())

    // Eager fetch: task count badge (always visible, regardless of active tab)
    useEffect(() => {
        if (!selectedClientId) return
        const fetchCount = async () => {
            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)

            const { data, count } = await supabase
                .from('tasks')
                .select('id, leads!inner(client_id, id)', { count: 'exact' })
                .eq('leads.client_id', selectedClientId)
                .eq('status', 'PENDING')
                .gte('created_at', todayStart.toISOString())
                .limit(30)

            if (count !== null) {
                setPendingTaskCount(count)
            }
            if (data) {
                setActiveTaskLeadIds(new Set(data.filter(t => t.leads?.id).map(t => String(t.leads.id))))
            }
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
                    // Sort purely by last interaction date DESC
                    const dateA = new Date(a.last_interaction_date || 0).getTime()
                    const dateB = new Date(b.last_interaction_date || 0).getTime()
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
                        if ((targetLead.unread_count || 0) > 0) markLeadAsRead(targetLead.id)
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
                        const dateA = new Date(a.last_interaction_date || 0).getTime()
                        const dateB = new Date(b.last_interaction_date || 0).getTime()
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
            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)

            const { data } = await supabase
                .from('tasks')
                .select('id, instruction, leads!inner(id, client_id, nome, empresa, headline, cadence_stage, avatar_url, linkedin_profile_url, total_interactions_count, is_blacklisted, crm_stage, last_task_completed_at, has_engaged, last_interaction_date)')
                .eq('leads.client_id', selectedClientId)
                .eq('status', 'PENDING')
                .gte('created_at', todayStart.toISOString())
                .order('created_at', { ascending: true })
                .limit(30)

            setSidebarTasks(data || [])
        } catch (err) {
            console.error('Error fetching sidebar tasks:', err)
        } finally {
            setLoadingTasks(false)
        }
    }, [selectedClientId])

    useEffect(() => {
        if (sidebarTab === 'tarefas') fetchSidebarTasks()
    }, [sidebarTab, fetchSidebarTasks])

    // Realtime implementation for task sidebar
    useEffect(() => {
        if (!selectedClientId) return

        const channel = supabase.channel('public:leads:tasks')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'leads', filter: `client_id=eq.${selectedClientId}` },
                (payload) => {
                    const updatedLead = payload.new

                    setSidebarTasks((prevTasks) => {
                        const existingTaskIndex = prevTasks.findIndex(t => t.leads?.id === updatedLead.id)
                        const isValidTask = isLeadTask(updatedLead)

                        let newTasks = [...prevTasks]

                        if (!isValidTask && existingTaskIndex !== -1) {
                            // Lead is no longer a task, remove from sidebar IMMEDIATELY
                            newTasks.splice(existingTaskIndex, 1)
                        } else if (isValidTask && existingTaskIndex === -1 && sidebarTab === 'tarefas') {
                            // Lead became a task, add to sidebar
                            const newTask = { id: updatedLead.id, leads: updatedLead }
                            newTasks.push(newTask)
                            // Re-sort
                            newTasks.sort((a, b) => {
                                const timeA = a.leads?.last_interaction_date ? new Date(a.leads.last_interaction_date).getTime() : 0
                                const timeB = b.leads?.last_interaction_date ? new Date(b.leads.last_interaction_date).getTime() : 0
                                return timeB - timeA
                            })
                        } else if (isValidTask && existingTaskIndex !== -1) {
                            // Update existing task details
                            newTasks[existingTaskIndex].leads = { ...newTasks[existingTaskIndex].leads, ...updatedLead }
                            // Re-sort
                            newTasks.sort((a, b) => {
                                const timeA = a.leads?.last_interaction_date ? new Date(a.leads.last_interaction_date).getTime() : 0
                                const timeB = b.leads?.last_interaction_date ? new Date(b.leads.last_interaction_date).getTime() : 0
                                return timeB - timeA
                            })
                        }

                        // Also update the global badge count to stay in sync
                        // We do this by adjusting the delta
                        setPendingTaskCount(current => {
                            if (!isValidTask && existingTaskIndex !== -1) return Math.max(0, current - 1)
                            if (isValidTask && existingTaskIndex === -1) return current + 1
                            return current
                        })

                        return newTasks
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedClientId, sidebarTab])

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
            if ((lead.unread_count || 0) > 0) markLeadAsRead(lead.id)
        }
    }

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    // Mark a lead as read: optimistic local update + persist to Supabase
    const markLeadAsRead = useCallback(async (leadId) => {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, unread_count: 0 } : l))
        setActiveLead(prev => prev?.id === leadId ? { ...prev, unread_count: 0 } : prev)
        supabase.from('leads').update({ unread_count: 0 }).eq('id', leadId)
            .then(({ error }) => { if (error) console.error('[markLeadAsRead]', error) })
    }, [])

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

        // Moment 2: Ensure unread is cleared when user sends a message
        if ((activeLead.unread_count || 0) > 0) markLeadAsRead(activeLead.id)

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
                    content: msg.content || '',
                    interaction_date: msg.interaction_date || null
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
            <p className="text-gray-300">Select a client to access the Inbox.</p>
        </div>
    )

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] p-2 gap-4 overflow-hidden">

            {/* HEADER & TOGGLE */}
            <div className="flex flex-wrap justify-between items-center px-4 gap-3 shrink-0">
                <h1 className="text-xl font-bold text-black flex items-center gap-2">
                    <LayoutGrid size={20} className="text-primary" /> Intelligent Inbox
                </h1>

                {/* Search Input */}
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search lead..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                    {isSearchingGlobal ? (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary">
                            <Loader2 size={14} className="animate-spin" />
                        </div>
                    ) : searchTerm ? (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    ) : null}
                </div>
            </div>

            {/* LIST / DETAIL VIEW */}
            <div className="flex-1 flex gap-4 lg:gap-6 overflow-hidden">
                {/* LEFT: Lead List */}
                <div className="hidden md:flex w-72 lg:w-80 flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden shrink-0 shadow-sm">
                    {/* Sidebar Tabs */}
                    <div className="p-2 border-b border-gray-200 bg-gray-50">
                        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                            <button
                                onClick={() => setSidebarTab('conversas')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${sidebarTab === 'conversas'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
                                    }`}
                            >
                                <MessageSquare size={13} />
                                Chat
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${sidebarTab === 'conversas' ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {filteredLeads.length}
                                </span>
                            </button>
                            <button
                                onClick={() => setSidebarTab('tarefas')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${sidebarTab === 'tarefas'
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
                                    }`}
                            >
                                <ClipboardList size={13} />
                                Tasks
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${sidebarTab === 'tarefas' ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
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
                                    <div className="p-8 text-center text-text-muted text-sm">Loading...</div>
                                ) : filteredLeads.map(lead => (
                                    <div
                                        key={lead.id}
                                        onClick={() => {
                                            setActiveLead(lead)
                                            // Moment 1: mark as read when user opens the conversation
                                            if ((lead.unread_count || 0) > 0) markLeadAsRead(lead.id)
                                        }}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${activeLead?.id === lead.id
                                            ? 'bg-orange-50 border-orange-300 shadow-sm'
                                            : (lead.unread_count || 0) > 0
                                                ? 'border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300'
                                                : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-sm truncate max-w-[120px] lg:max-w-[140px] ${(lead.unread_count || 0) > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
                                                }`}>
                                                {lead.nome || 'No Name'}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {(lead.unread_count || 0) > 0 && (
                                                    <span className="min-w-[18px] h-[18px] bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                                        {lead.unread_count}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-gray-400">
                                                    {lead.last_interaction ? new Date(lead.last_interaction).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`text-xs mb-2 truncate ${(lead.unread_count || 0) > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'
                                            }`}>
                                            {lead.headline || 'Qualified lead'}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px]">
                                            <span className={`font-bold px-1.5 py-0.5 rounded ${lead.icp_score === 'A' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                lead.icp_score === 'B' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                    'bg-gray-100 text-gray-500 border border-gray-200'
                                                }`}>
                                                ICP {lead.icp_score || 'C'}
                                            </span>
                                            <span className="text-gray-400">
                                                {(() => {
                                                    const d = lead.last_interaction_date
                                                    if (!d) return 'No interaction'
                                                    const diff = Date.now() - new Date(d).getTime()
                                                    const mins = Math.floor(diff / 60000)
                                                    if (mins < 60) return `💬 ${mins}m ago`
                                                    const hrs = Math.floor(mins / 60)
                                                    if (hrs < 24) return `💬 ${hrs}h ago`
                                                    const days = Math.floor(hrs / 24)
                                                    return `💬 ${days}d ago`
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {!loadingLeads && filteredLeads.length === 0 && (
                                    <div className="p-8 text-center text-text-muted text-sm">
                                        {searchTerm ? 'No leads found.' : 'No engaged leads.'}
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── TAREFAS DO DIA TAB ── */}
                        {sidebarTab === 'tarefas' && (
                            <>
                                {loadingTasks ? (
                                    <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                                        <Loader2 size={18} className="animate-spin text-primary" />
                                        Loading tasks...
                                    </div>
                                ) : sidebarTasks.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                                            <Check size={20} className="text-emerald-600" />
                                        </div>
                                        <span>No pending tasks! 🎉</span>
                                    </div>
                                ) : sidebarTasks.map(task => {
                                    const tLead = task.leads || {}
                                    const stage = tLead.cadence_stage || ''
                                    const stageColor = stage === 'G4' || stage === 'G5' ? 'bg-red-50 text-red-600 border-red-200'
                                        : stage === 'G2' || stage === 'G3' ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                            : 'bg-blue-50 text-blue-600 border-blue-200'

                                    const interactionCount = tLead.total_interactions_count || 0
                                    const isFirstContact = interactionCount === 0
                                    const actionLabel = isFirstContact ? '✉️ Send Icebreaker' : '💬 Continue Chat'
                                    const actionColor = isFirstContact
                                        ? 'bg-orange-50 text-orange-600 border-orange-200'
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'

                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => handleTaskClick(task)}
                                            className="p-3 rounded-xl border border-transparent hover:bg-gray-50 hover:border-gray-200 cursor-pointer transition-all group"
                                        >
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <SafeImage
                                                    src={tLead.avatar_url}
                                                    alt={tLead.nome}
                                                    className="w-7 h-7 rounded-full object-cover border border-gray-200"
                                                    fallbackText={tLead.nome?.charAt(0) || '?'}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-semibold text-gray-900 truncate block">{tLead.nome || 'Lead'}</span>
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
                                                <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 pl-9">
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
                    <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden relative shadow-sm">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 shrink-0 rounded-full border border-gray-200 flex items-center justify-center bg-gray-100 text-gray-500 font-bold shadow-inner overflow-hidden">
                                    <SafeImage
                                        src={activeLead.avatar_url}
                                        alt={activeLead.nome}
                                        className="w-full h-full object-cover"
                                        fallbackText={activeLead.nome?.charAt(0)}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-900 text-sm truncate">{activeLead.nome}</div>
                                    <div className="text-xs text-gray-500 truncate">{activeLead.headline || activeLead.company}</div>
                                </div>
                            </div>

                            {/* CRM Quick Actions — only for pending tasks */}
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {activeTaskLeadIds.has(String(activeLead?.id)) && (
                                    <>
                                        <button
                                            onClick={handleMarkDone}
                                            title="Mark task as Completed"
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-emerald-600 border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                                        >
                                            <CheckCircle2 size={13} /> Completed
                                        </button>
                                        <button
                                            onClick={handleBlacklistLead}
                                            title="Add to Blacklist"
                                            className="flex items-center justify-center w-8 h-8 rounded-lg text-red-400 border border-red-200 hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-all"
                                        >
                                            <Ban size={13} />
                                        </button>
                                    </>
                                )}
                                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                                    <MoreVertical size={18} />
                                </button>
                            </div>

                            {/* CRM Toast */}
                            {crmToast && (
                                <div className={`absolute top-16 right-4 z-50 px-3 py-2 rounded-lg text-xs font-semibold shadow-lg border ${crmToast.type === 'error'
                                    ? 'bg-red-50 border-red-200 text-red-600'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                    }`}>
                                    {crmToast.msg}
                                </div>
                            )}
                        </div>

                        {/* Timeline */}
                        <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col-reverse gap-4 custom-scrollbar bg-gray-50/50">
                            {loadingChat ? (
                                <div className="text-center text-gray-400 text-sm py-10">Loading history...</div>
                            ) : interactions.length === 0 ? (
                                <div className="text-center text-gray-400 text-sm py-10 flex flex-col items-center gap-2">
                                    <MessageSquare size={24} className="opacity-20" />
                                    No messages exchanged yet.
                                </div>
                            ) : (() => {
                                // Build date label helper
                                const getDateLabel = (dateStr) => {
                                    const date = new Date(dateStr)
                                    const now = new Date()
                                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                                    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                                    const diffDays = Math.round((today - msgDay) / (1000 * 60 * 60 * 24))

                                    if (diffDays === 0) return 'TODAY'
                                    if (diffDays === 1) return 'YESTERDAY'
                                    if (diffDays < 7) {
                                        return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
                                    }
                                    const day = date.getDate()
                                    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase().replace('.', '')
                                    return `${month} ${day}`
                                }

                                const getDateKey = (dateStr) => {
                                    const d = new Date(dateStr)
                                    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
                                }

                                // interactions are sorted desc (newest first), rendered with flex-col-reverse
                                const elements = []

                                interactions.forEach((msg, idx) => {
                                    const dateKey = getDateKey(msg.interaction_date)

                                    // Render the message first
                                    elements.push(
                                        <div key={msg.id} className={`flex flex-col max-w-[85%] lg:max-w-[80%] ${msg.is_sender === true ? 'self-end items-end' : 'self-start items-start'}`}>
                                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.is_sender === true
                                                ? 'bg-primary text-white rounded-br-sm shadow-lg shadow-primary/10'
                                                : 'bg-gray-100 text-gray-700 rounded-bl-sm border border-gray-200'
                                                }`}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                                                {new Date(msg.interaction_date).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    )

                                    // Check if the NEXT message (older one) is on a different day.
                                    // If so (or if there is no next message), we insert a divider ABOVE the current message
                                    // Because it's flex-col-reverse, this divider will appear visually above this day's block
                                    const nextMsg = interactions[idx + 1]
                                    const nextDateKey = nextMsg ? getDateKey(nextMsg.interaction_date) : null

                                    if (dateKey !== nextDateKey) {
                                        elements.push(
                                            <div key={`divider-${dateKey}`} className="flex items-center gap-3 my-2 self-stretch">
                                                <div className="flex-1 h-px bg-gray-200" />
                                                <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
                                                    {getDateLabel(msg.interaction_date)}
                                                </span>
                                                <div className="flex-1 h-px bg-gray-200" />
                                            </div>
                                        )
                                    }
                                })

                                return elements
                            })()}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <div className="relative">
                                <textarea
                                    className="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    rows="1"
                                    placeholder={isSending ? 'Sending...' : 'Type your reply... (Ctrl+Enter to send)'}
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

                        {/* Toast Notification */}
                        {toast && (
                            <div className={`absolute bottom-[80px] left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl backdrop-blur-md border transition-all animate-fade-in z-50 ${toast.type === 'error'
                                ? 'bg-red-50 border-red-200 text-red-600'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                }`}>
                                {toast.type === 'error' ? '❌' : '✅'} {toast.message}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200 text-gray-400 gap-4 shadow-sm">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                            <Zap size={32} className="text-primary/50" />
                        </div>
                        <p className="text-sm text-gray-400">Select a lead to start chatting.</p>
                    </div>
                )}

                {/* RIGHT: Context & AI — Tabbed Sidebar */}
                <div className="hidden xl:flex w-80 flex-col shrink-0 overflow-hidden">
                    {activeLead ? (
                        <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            {/* Tab Switcher */}
                            <div className="p-2 border-b border-gray-200 bg-gray-50 shrink-0">
                                <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                                    <button
                                        onClick={() => setRightTab('detalhes')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${rightTab === 'detalhes'
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
                                            }`}
                                    >
                                        <ClipboardList size={13} /> Details
                                    </button>
                                    <button
                                        onClick={() => setRightTab('copiloto')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${rightTab === 'copiloto'
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
                                            }`}
                                    >
                                        <Sparkles size={13} /> AI Copilot
                                    </button>
                                </div>
                            </div>

                            {/* ═══ TAB: DETALHES ═══ */}
                            {rightTab === 'detalhes' && (
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                                    {/* Lead Info Card */}
                                    <div>
                                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Lead Data</h4>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className={`flex-1 text-center py-2 px-3 rounded-lg border ${activeLead.icp_score === 'A' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : activeLead.icp_score === 'B' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                                <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">ICP</div>
                                                <div className="text-lg font-bold">{activeLead.icp_score || 'C'}</div>
                                            </div>
                                            <div className="flex-1 text-center py-2 px-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
                                                <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Interactions</div>
                                                <div className="text-lg font-bold">{activeLead.total_interactions_count || activeLead.total_interactions || 0}</div>
                                            </div>
                                            {(() => {
                                                const stage = activeLead.cadence_stage || ''
                                                const match = stage?.toString().match(/(\d+)/)
                                                const level = match ? parseInt(match[1], 10) : 0
                                                const cStyle = level >= 5 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                    : level >= 3 ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                        : level >= 1 ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                            : 'bg-gray-50 border-gray-200 text-gray-500'
                                                return (
                                                    <div className={`flex-1 text-center py-2 px-3 rounded-lg border ${cStyle}`}>
                                                        <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Cadence</div>
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
                                                <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
                                                    Ask AI to generate, rewrite, or tweak messages for this lead.
                                                </p>
                                                {/* Quick start button */}
                                                <button
                                                    onClick={() => {
                                                        const prompt = interactions.length === 0 ? 'Generate an icebreaker for this lead.' : 'Generate a reply to the last message.'
                                                        setAiInput(prompt)
                                                    }}
                                                    className="mt-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[11px] font-bold transition-all"
                                                >
                                                    <Sparkles size={12} className="inline mr-1.5" />
                                                    {interactions.length === 0 ? 'Generate Icebreaker' : 'Generate Reply'}
                                                </button>
                                            </div>
                                        ) : (
                                            aiChatHistory.map((msg, idx) => (
                                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${msg.role === 'user'
                                                        ? 'bg-orange-50 border border-orange-200 text-gray-800'
                                                        : 'bg-gray-50 border border-gray-200 text-gray-700'
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
                                                                <Check size={11} /> Use this message
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        {aiLoading && (
                                            <div className="flex justify-start">
                                                <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-xs flex items-center gap-2">
                                                    <Loader2 size={12} className="animate-spin text-primary" /> Generating...
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input Bar */}
                                    <div className="p-3 border-t border-gray-200 bg-gray-50 shrink-0">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={aiInput}
                                                onChange={e => setAiInput(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && aiInput.trim()) { e.preventDefault(); handleAiChat() } }}
                                                disabled={aiLoading}
                                                placeholder="Ex: Make it friendlier..."
                                                className="w-full bg-white border border-gray-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-50"
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
                        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm h-40 flex items-center justify-center shadow-sm">
                            Lead context will appear here.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SalesInboxPage
