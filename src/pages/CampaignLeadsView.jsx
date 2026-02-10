import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import { useParams, useNavigate } from 'react-router-dom'
import {
    Search,
    Loader2,
    Sparkles,
    Briefcase,
    Gem,
    Building2,
    Globe,
    Send,
    Bot,
    Plus,
    Check,
    Zap,
    RefreshCw,
    X,
    Trash2,
    MapPin,
    Copy,
    ExternalLink,
    ArrowUpDown,
    Filter,
    ChevronsUpDown,
    ArrowLeft,
    Users,
    MessageSquare,
    History,
    Clock,
    ChevronLeft,
    ChevronRight,
    MessageCircle,
    Trophy,
    Medal,
    Brain
} from 'lucide-react'
import AddLeadsModal from '../components/AddLeadsModal'
import LeadDetailModal from '../components/LeadDetailModal'

const CampaignLeadsView = () => {
    const { id: campaignId } = useParams()
    const navigate = useNavigate()
    const { selectedClientId } = useClientSelection()

    const [campaign, setCampaign] = useState(null)
    const [leads, setLeads] = useState([]) // Stores the JOINED object: { ...campaign_lead, leads: { ...lead_data } }
    const [loading, setLoading] = useState(false)
    const [selectedLead, setSelectedLead] = useState(null) // This will store the full enriched object for the drawer
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [stats, setStats] = useState({ total: 0, hot: 0, interactions: 0 })
    const [totalMessages, setTotalMessages] = useState(0)
    const [topLeads, setTopLeads] = useState([])

    // Chat/Interactions State
    const [interactions, setInteractions] = useState([])
    const [loadingChat, setLoadingChat] = useState(false)

    // Data Table State
    const [selectedLeads, setSelectedLeads] = useState(new Set())
    const [sortConfig, setSortConfig] = useState({ key: 'added_at', direction: 'desc' })
    const [filters, setFilters] = useState({
        status: [],
        qualification: [],
        company: '',
        role: '',
        hasMessages: '' // 'yes', 'no', or ''
    })
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    // Pagination State
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const ITEMS_per_PAGE = 100

    // Logic State
    const [enrichmentLoading, setEnrichmentLoading] = useState(false)
    const [notification, setNotification] = useState(null)
    const [sendingMessage, setSendingMessage] = useState(false)
    const [icebreakerLoading, setIcebreakerLoading] = useState(null) // ID of lead being processed
    const [messageDraft, setMessageDraft] = useState('')
    const [isAddLeadsModalOpen, setIsAddLeadsModalOpen] = useState(false)
    const [syncLoading, setSyncLoading] = useState(false)
    const [clientSyncTimestamp, setClientSyncTimestamp] = useState(null) // from clients.last_sync_timestamp

    // NEW: Bulk History Import State
    const [importQueue, setImportQueue] = useState({
        active: false,
        current: 0,
        total: 0,
        failures: 0,
        currentLeadName: ''
    })
    const [showImportConfirm, setShowImportConfirm] = useState(false)



    // Helper function for delay (Safe Queue Pattern)
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))



    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    useEffect(() => {
        if (selectedLead && selectedLead.leads) {
            setMessageDraft(selectedLead.leads.suggested_message || '')
        }

        // Fetch Interactions (Chat History)
        if (!selectedLead?.leads?.id) {
            setInteractions([])
            return // Don't fetch if no lead
        }

        const fetchInteractions = async () => {
            setLoadingChat(true)
            try {
                const { data, error } = await supabase
                    .from('interactions')
                    .select('*')
                    .eq('lead_id', selectedLead.leads.id)
                    .order('interaction_date', { ascending: false })

                if (error) throw error
                setInteractions(data || [])
            } catch (err) {
                console.error('Erro ao buscar interações:', err)
            } finally {
                setLoadingChat(false)
            }
        }

        fetchInteractions()
    }, [selectedLead])



    // Realtime Subscription
    useEffect(() => {
        if (!campaignId) return

        const channel = supabase
            .channel(`campaign_leads_changes_${campaignId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'campaign_leads',
                    filter: `campaign_id=eq.${campaignId}`
                },
                (payload) => {
                    // Refresh data on any change for now to be safe
                    // Optimization: handle INSERT/UPDATE locally
                    console.log('Realtime update:', payload)
                    fetchLeads(0, true) // Specific refresh might be better but this ensures consistency
                    fetchStats()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [campaignId])


    const fetchCampaignDetails = async () => {
        const { data } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .single()
        setCampaign(data)
    }

    const fetchClientSyncTimestamp = async () => {
        if (!selectedClientId) return
        try {
            const { data } = await supabase
                .from('clients')
                .select('last_sync_timestamp')
                .eq('id', selectedClientId)
                .single()

            if (data?.last_sync_timestamp) {
                setClientSyncTimestamp(data.last_sync_timestamp)
            }
        } catch (err) {
            console.error('Error fetching client sync timestamp:', err)
        }
    }

    const fetchStats = async () => {
        if (!selectedClientId || !campaignId) return

        try {
            const { count: totalCount } = await supabase
                .from('campaign_leads')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_id', campaignId)

            setStats(prev => ({ ...prev, total: totalCount || 0 }))

        } catch (error) {
            console.error('Erro ao buscar KPIs:', error)
        }
    }

    // Fetch Total Messages (Global Counter)
    const fetchTotalMessages = async () => {
        try {
            const { count, error } = await supabase
                .from('interactions')
                .select('*', { count: 'exact', head: true })

            if (error) throw error
            setTotalMessages(count || 0)
        } catch (err) {
            console.error('Erro ao buscar total de mensagens:', err)
        }
    }

    // Fetch Top Leads (Engagement Ranking)
    const fetchTopLeads = async () => {
        try {
            const { data, error } = await supabase
                .from('leads_with_stats')
                .select('id, nome, avatar_url, total_interactions, empresa')
                .gt('total_interactions', 0)
                .order('total_interactions', { ascending: false })
                .limit(5)

            if (error) throw error
            setTopLeads(data || [])
        } catch (err) {
            console.error('Erro ao buscar top leads:', err)
        }
    }

    // SIMPLIFIED FETCH: Query campaign_leads view directly (flat structure)
    const fetchLeads = async (pageIndex = 0, isRefresh = false) => {
        if (!selectedClientId || !campaignId) return

        try {
            if (pageIndex === 0) setLoading(true)
            else setLoadingMore(true)

            const from = pageIndex * ITEMS_per_PAGE
            const to = from + ITEMS_per_PAGE - 1

            // FIXED: Reverted to simple select to fix PGRST200 error (view relationship missing)
            let query = supabase
                .from('campaign_leads')
                .select('*', { count: 'exact' })
                .eq('campaign_id', campaignId)
                .range(from, to)

            // FIXED: Direct sorting (no foreignTable needed)
            if (sortConfig.key) {
                query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' })
            } else {
                query = query.order('added_at', { ascending: false })
            }

            // FIXED: Direct search on view columns
            if (debouncedSearch) {
                query = query.or(`nome.ilike.%${debouncedSearch}%,empresa.ilike.%${debouncedSearch}%,headline.ilike.%${debouncedSearch}%`)
            }

            // FIXED: Direct filters on view columns
            if (filters.status.length > 0) {
                console.log('[Filter] Applying status filter:', filters.status)
                query = query.in('status_pipeline', filters.status)
            }

            if (filters.qualification.length > 0) {
                console.log('[Filter] Applying qualification filter:', filters.qualification)
                query = query.in('icp_score', filters.qualification)
            }

            if (filters.hasMessages === 'yes') {
                console.log('[Filter] Applying hasMessages filter: with messages')
                query = query.gt('total_interactions', 0)
            } else if (filters.hasMessages === 'no') {
                console.log('[Filter] Applying hasMessages filter: no messages')
                query = query.eq('total_interactions', 0)
            }

            const { data, error, count } = await query

            console.log('[Fetch Results] Data:', data)
            console.log('[Fetch Results] Count:', count)
            console.log('[Fetch Results] Error:', error)

            if (error) throw error

            if (data) {
                console.log(`[Fetch Success] Retrieved ${data.length} leads`)
                setLeads(data) // Pagination: always replace
                setHasMore(data.length === ITEMS_per_PAGE)
            }
        } catch (err) {
            console.error('Erro ao buscar leads:', err)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    useEffect(() => {
        if (campaignId && selectedClientId) {
            // Only fetch details once or if campaignId changes
            if (page === 0) {
                fetchCampaignDetails()
                fetchClientSyncTimestamp()
            }
        }
    }, [campaignId, selectedClientId])

    useEffect(() => {
        if (campaignId && selectedClientId) {
            setLeads([])
            setPage(0)
            setHasMore(true)
            fetchLeads(0, true)
            fetchStats()
        }
    }, [campaignId, selectedClientId, debouncedSearch, sortConfig, filters])

    // Fetch total messages and top leads once on mount
    useEffect(() => {
        fetchTotalMessages()
        fetchTopLeads()
    }, [])

    // --- HANDLERS ---
    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const toggleSelectAll = () => {
        if (selectedLeads.size === leads.length && leads.length > 0) {
            setSelectedLeads(new Set())
        } else {
            setSelectedLeads(new Set(leads.map(l => l.id)))
        }
    }

    const toggleSelectRow = (id, e) => {
        e.stopPropagation()
        const newSet = new Set(selectedLeads)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedLeads(newSet)
    }

    const toggleFilterStatus = (statusValue) => {
        setFilters(prev => {
            const current = prev.status
            const newStatus = current.includes(statusValue)
                ? current.filter(s => s !== statusValue)
                : [...current, statusValue]
            return { ...prev, status: newStatus }
        })
    }



    const handleCopy = (text) => {
        navigator.clipboard.writeText(text)
        setNotification({ message: 'Copiado para a área de transferência', type: 'info' })
        setTimeout(() => setNotification(null), 2000)
    }

    const handleSendMessage = async () => {
        if (!selectedLead) return
        setSendingMessage(true)

        try {
            await new Promise(resolve => setTimeout(resolve, 1500))
            setNotification({ message: 'Conexão enviada com sucesso!', type: 'success' })
            setSelectedLead(null)
        } catch (e) {
            setNotification({ message: 'Erro ao enviar.', type: 'error' })
        } finally {
            setSendingMessage(false)
            setTimeout(() => setNotification(null), 3000)
        }
    }

    // UPDATED: Start Connections Sync (Queue Workflow A)
    const handleEnrichmentQueue = async () => {
        if (!selectedClientId) return
        setEnrichmentLoading(true)
        setNotification({ message: 'Iniciando coleta em segundo plano...', type: 'info' })

        try {
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/start-connections-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: selectedClientId,
                    campaign_id: campaignId
                })
            })

            if (response.ok) {
                setNotification({ message: 'Coleta iniciada! Os leads serão processados em breve.', type: 'success' })
            } else {
                throw new Error('Falha no webhook')
            }

        } catch (error) {
            console.error(error)
            setNotification({ message: 'Erro ao iniciar fila de enriquecimento.', type: 'error' })
        } finally {
            setEnrichmentLoading(false)
            setTimeout(() => setNotification(null), 5000)
        }
    }

    const handleSyncConnections = async () => {
        if (!selectedClientId || !campaignId) return

        try {
            // 1. Fetch Client Unipile ID
            const { data: client, error } = await supabase
                .from('clients')
                .select('unipile_account_id')
                .eq('id', selectedClientId)
                .single()

            if (error || !client?.unipile_account_id) {
                setNotification({ message: 'Erro: Cliente sem conta Unipile conectada.', type: 'error' })
                return
            }

            // 2. Call Webhook
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/sync-connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: selectedClientId,
                    unipile_account_id: client.unipile_account_id,
                    campaign_id: campaignId
                })
            })

            if (response.ok) {
                setNotification({ message: 'Iniciando captura e qualificação de leads...', type: 'info' })
            } else {
                throw new Error('Falha na API')
            }
        } catch (e) {
            console.error(e)
            setNotification({ message: 'Erro ao iniciar sincronização.', type: 'error' })
        }
        setTimeout(() => setNotification(null), 5000)
    }

    // NEW: Sync Messages Manual Trigger
    const handleSyncMessages = async () => {
        if (!selectedClientId) return

        setSyncLoading(true)
        setNotification({ message: 'Iniciando sincronização de mensagens...', type: 'info' })

        try {
            // 1. Fetch Client Unipile ID & Current User
            const { data: { user } } = await supabase.auth.getUser()

            const { data: client, error } = await supabase
                .from('clients')
                .select('unipile_account_id')
                .eq('id', selectedClientId)
                .single()

            if (error || !client?.unipile_account_id) {
                setNotification({ message: 'Erro: Cliente sem conta Unipile conectada.', type: 'error' })
                setSyncLoading(false)
                setTimeout(() => setNotification(null), 5000)
                return
            }

            // 2. Call Webhook with Enriched Payload
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook-test/sync-messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_id: client.unipile_account_id,
                    user_id: user?.id || 'system_user',
                    client_id: selectedClientId
                })
            })

            if (response.ok) {
                // Parse JSON response
                const result = await response.json()

                if (result.success) {
                    const messageCount = result.data?.messages_synced || 0
                    const timestamp = result.data?.last_sync_timestamp || new Date().toISOString()

                    // Update local timestamp (backend saves to DB)
                    setClientSyncTimestamp(timestamp)

                    // Show success with message count
                    setNotification({
                        message: `Sincronização concluída! ${messageCount} mensagens processadas.`,
                        type: 'success'
                    })

                    // Refresh data
                    fetchLeads(0, true)
                    fetchTotalMessages()
                } else {
                    throw new Error(result.message || 'Falha na sincronização')
                }
            } else {
                throw new Error('Erro ao sincronizar. Tente novamente.')
            }
        } catch (error) {
            console.error(error)
            setNotification({
                message: error.message || 'Erro ao sincronizar. Tente novamente.',
                type: 'error'
            })
        } finally {
            setSyncLoading(false)
            setTimeout(() => setNotification(null), 5000)
        }
    }

    // NEW: Generate Icebreaker (Workflow D)
    const handleGenerateIcebreaker = async (leadId, e) => {
        e.stopPropagation() // Prevent row click
        if (!selectedClientId || !leadId) return

        setIcebreakerLoading(leadId)
        setNotification({ message: 'Gerando Icebreaker personalizado...', type: 'info' })

        try {
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/generate-icebreaker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: leadId,
                    client_id: selectedClientId
                })
            })

            if (response.ok) {
                setNotification({ message: 'Icebreaker gerado com sucesso!', type: 'success' })
                // Realtime should update the UI
            } else {
                setNotification({ message: 'Erro ao gerar Icebreaker.', type: 'error' })
            }

        } catch (error) {
            console.error(error)
            setNotification({ message: 'Erro de conexão.', type: 'error' })
        } finally {
            setIcebreakerLoading(null)
            setTimeout(() => setNotification(null), 3000)
        }

    }

    const handleDeleteLead = async (id, e) => {
        e.stopPropagation()
        if (!confirm('Tem certeza que deseja remover este lead da campanha?')) return

        try {
            const { error } = await supabase
                .from('campaign_leads')
                .delete()
                .eq('id', id)

            if (error) throw error

            setLeads(prev => prev.filter(l => l.id !== id))
            setStats(prev => ({ ...prev, total: prev.total - 1 }))
            setNotification({ message: 'Lead removido com sucesso.', type: 'success' })
        } catch (error) {
            console.error('Error deleting lead:', error)
            setNotification({ message: 'Erro ao remover lead.', type: 'error' })
        }
    }

    // NEW: Force History Import (Workflow B - Manual Trigger)
    const handleForceHistoryImport = async (lead) => {
        if (!selectedClientId || !lead) return

        // Check if we have the client object to get unipile_account_id
        // Ideally we should have it from context or fetch it effectively.
        // We will fetch it again to be safe or assuming we have it.

        setNotification({ message: 'Solicitando importação de histórico...', type: 'info' })

        try {
            // 1. Fetch Client Unipile ID
            const { data: client, error } = await supabase
                .from('clients')
                .select('unipile_account_id')
                .eq('id', selectedClientId)
                .single()

            if (error || !client?.unipile_account_id) {
                setNotification({ message: 'Erro: Cliente sem conta Unipile conectada.', type: 'error' })
                return
            }

            // 2. Trigger Webhook
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/import-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: lead.id,
                    account_id: client.unipile_account_id
                })
            })

            if (response.ok) {
                setNotification({ message: 'Histórico sendo importado! Pode levar alguns minutos.', type: 'success' })
            } else {
                setNotification({ message: 'Erro ao acionar importação de histórico.', type: 'error' })
            }
        } catch (e) {
            console.error('Error importing history:', e)
            setNotification({ message: 'Erro de conexão.', type: 'error' })
        }
    }

    // NEW: Manual Sync Recent (Workflow A - Manual Trigger)
    const handleSyncRecent = async (lead, e) => {
        e.stopPropagation()
        if (!selectedClientId || !lead) return

        setNotification({ message: 'Verificando novas mensagens...', type: 'info' })

        try {
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/sync-recent-manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: lead.id,
                    action: 'quick_sync'
                })
            })

            if (response.ok) {
                setNotification({ message: 'Sincronização rápida iniciada!', type: 'success' })
            } else {
                setNotification({ message: 'Erro ao sincronizar.', type: 'error' })
            }
        } catch (e) {
            console.error('Error syncing recent:', e)
            setNotification({ message: 'Erro de conexão.', type: 'error' })
        }
    }

    // NEW: Manual Sync History (Workflow B - Manual Trigger from Table)
    const handleSyncHistory = async (lead, e) => {
        e.stopPropagation()
        if (!selectedClientId || !lead) return

        if (!confirm('Atenção: Essa ação fará uma varredura profunda no histórico de conversas do último ano.\\n\\nIsso pode levar alguns minutos. Deseja continuar?')) return

        setNotification({ message: 'Iniciando importação completa de histórico...', type: 'info' })

        try {
            // 1. Fetch Client Unipile Account ID (REQUIRED by webhook)
            const { data: client, error } = await supabase
                .from('clients')
                .select('unipile_account_id')
                .eq('id', selectedClientId)
                .single()

            if (error || !client?.unipile_account_id) {
                setNotification({
                    message: 'Conecte uma conta do LinkedIn nas configurações deste cliente.',
                    type: 'error'
                })
                return
            }

            console.log(`[Sync History] Sending request for lead_id: ${lead.id}, account_id: ${client.unipile_account_id}`)

            // 2. Call Webhook with REQUIRED account_id
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/import-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: lead.id,               // ID REAL do lead (da view leads_with_stats)
                    account_id: client.unipile_account_id
                })
            })

            if (response.ok) {
                setNotification({ message: 'Importação iniciada! O processo rodará em segundo plano.', type: 'success' })
            } else {
                const errorText = await response.text()
                console.error(`Webhook Error: ${response.status}`, errorText)
                setNotification({ message: `Erro ao iniciar importação: ${response.status}`, type: 'error' })
            }
        } catch (e) {
            console.error('Error importing history:', e)
            setNotification({ message: 'Erro de conexão.', type: 'error' })
        }
    }

    // NEW: Bulk History Import Logic (Workflow B - Mass Action)
    const handleBulkHistorySync = () => {
        setShowImportConfirm(true)
    }

    const cancelImport = () => {
        setShowImportConfirm(false)
    }

    const executeHistoryImport = async () => {
        setShowImportConfirm(false)
        if (!selectedClientId || !campaignId) return

        // 1. PREPARAÇÃO DO CLIENTE: Fetch Unipile Account ID (OBRIGATÓRIO antes de qualquer loop)
        let clientAccountId
        try {
            const { data: client, error } = await supabase
                .from('clients')
                .select('unipile_account_id')
                .eq('id', selectedClientId)
                .single()

            if (error || !client?.unipile_account_id) {
                setNotification({
                    message: 'Conecte uma conta do LinkedIn nas configurações deste cliente.',
                    type: 'error'
                })
                return
            }
            clientAccountId = client.unipile_account_id
        } catch (err) {
            console.error("Error fetching client account ID", err)
            setNotification({ message: 'Erro ao buscar conta Unipile do cliente.', type: 'error' })
            return
        }

        // 2. PREPARAÇÃO DOS LEADS: Buscar IDs REAIS diretamente do banco
        let realLeadIds = []
        setNotification({ message: 'Buscando IDs reais dos leads no banco...', type: 'info' })

        try {
            if (selectedLeads.size > 0) {
                // Se há seleção, buscar apenas os leads selecionados
                // Precisamos mapear os IDs selecionados (que são de campaign_leads) para os IDs reais dos leads
                const selectedCampaignLeadIds = Array.from(selectedLeads)

                const { data, error } = await supabase
                    .from('campaign_leads')
                    .select('lead_id, leads!inner(id, nome)')
                    .in('id', selectedCampaignLeadIds)
                    .eq('campaign_id', campaignId)

                if (error) throw error

                // Extrair os IDs REAIS da tabela leads
                realLeadIds = data.map(item => ({
                    id: item.leads.id,  // ID REAL do lead na tabela leads
                    nome: item.leads.nome
                }))
            } else {
                // Buscar TODOS os leads da campanha diretamente da tabela leads
                const { data, error } = await supabase
                    .from('campaign_leads')
                    .select('lead_id, leads!inner(id, nome)')
                    .eq('campaign_id', campaignId)

                if (error) throw error

                // Extrair os IDs REAIS
                realLeadIds = data.map(item => ({
                    id: item.leads.id,  // ID REAL do lead
                    nome: item.leads.nome
                }))
            }
        } catch (err) {
            console.error("Error fetching real lead IDs", err)
            setNotification({ message: 'Erro ao buscar IDs reais dos leads.', type: 'error' })
            return
        }

        if (realLeadIds.length === 0) {
            setNotification({ message: 'Nenhum lead encontrado para processar.', type: 'error' })
            return
        }

        console.log(`[Bulk Sync] Starting import for ${realLeadIds.length} leads with account ${clientAccountId}`)
        console.log(`[Bulk Sync] Lead IDs:`, realLeadIds.map(l => l.id))

        // 3. Initialize Queue
        setImportQueue({
            active: true,
            current: 0,
            total: realLeadIds.length,
            failures: 0,
            currentLeadName: ''
        })

        // 4. O LOOP DE ENVIO: Process Queue (Sequential Loop with Delay)
        let failures = 0

        for (let i = 0; i < realLeadIds.length; i++) {
            const lead = realLeadIds[i]
            const leadName = lead.nome || 'Lead #' + lead.id

            setImportQueue(prev => ({ ...prev, current: i + 1, currentLeadName: leadName }))

            try {
                console.log(`[Bulk Sync] Sending request for lead_id: ${lead.id}`)

                const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/import-history', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lead_id: lead.id,           // ID REAL do lead (ex: 480)
                        account_id: clientAccountId  // ID da conta Unipile do Cliente
                    })
                })

                if (!response.ok) {
                    throw new Error(`Webhook failed with status ${response.status}`)
                }
            } catch (error) {
                console.error(`Failed to import history for ${leadName} (ID: ${lead.id})`, error)
                failures++
                setImportQueue(prev => ({ ...prev, failures: prev.failures + 1 }))
            }

            // 4. PAUSA DE SEGURANÇA (3 segundos para evitar Rate Limit 429)
            if (i < realLeadIds.length - 1) {
                console.log(`[Bulk Sync] Waiting 3 seconds before next request...`)
                await sleep(3000)
            }
        }

        // 5. Finish
        setImportQueue(prev => ({ ...prev, active: false }))
        setNotification({
            message: `Processamento concluído! ${realLeadIds.length - failures} sucessos, ${failures} falhas.`,
            type: failures > 0 ? 'info' : 'success'
        })
        setTimeout(() => setNotification(null), 5000)
    }

    // --- HELPER COMPONENTS ---
    const QualificationBadge = ({ isHighTicket, isB2B, companySize }) => {
        return (
            <div className="flex flex-wrap gap-1.5 justify-start">
                {isHighTicket && (
                    <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shadow-sm" title="High Ticket Potential">
                        <Gem size={14} />
                    </div>
                )}
                {isB2B && (
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-100 flex items-center shadow-sm">
                        B2B
                    </span>
                )}
                {companySize && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center shadow-sm ${companySize === 'Enterprise'
                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                        : companySize === 'Mid-Market'
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}>
                        {companySize}
                    </span>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">

            {/* NOTIFICATION TOAST */}
            {notification && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-xl shadow-2xl border-2 flex items-center gap-3 animate-slide-in-right min-w-[300px] ${notification.type === 'error'
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : notification.type === 'success'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-blue-50 border-blue-300 text-blue-700'
                    }`}>
                    {notification.type === 'error' ? (
                        <X size={20} className="shrink-0" />
                    ) : notification.type === 'success' ? (
                        <Check size={20} className="shrink-0" />
                    ) : (
                        <RefreshCw size={20} className="animate-spin shrink-0" />
                    )}
                    <span className="text-sm font-semibold flex-1">{notification.message}</span>
                </div>
            )}

            {/* LEAD DETAIL MODAL */}
            {selectedLead && (
                <LeadDetailModal
                    lead={selectedLead.leads_with_stats}
                    campaignLead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                />
            )}

            {/* HEADER */}

            {/* BULK IMPORT PROGRESS BANNER */}
            {importQueue.active && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 animate-slide-up w-[90%] max-w-2xl border border-slate-700">
                    <Loader2 className="animate-spin text-orange-500 shrink-0" size={24} />
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <h3 className="font-bold text-sm">Importando Histórico...</h3>
                            <span className="text-xs text-slate-400">{importQueue.current} de {importQueue.total}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-orange-500 h-full transition-all duration-300 ease-out"
                                style={{ width: `${(importQueue.current / importQueue.total) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1 truncate">Processando: <span className="text-white">{importQueue.currentLeadName}</span></p>
                    </div>
                </div>
            )}

            {/* CONFIRMATION MODAL */}
            {showImportConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-scale-in">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
                                <History size={32} />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Importar Histórico em Massa</h3>
                        <p className="text-slate-600 text-center mb-6 text-sm">
                            {selectedLeads.size > 0
                                ? `Você selecionou ${selectedLeads.size} leads para atualização.`
                                : `Você não selecionou nenhum lead. Isso iniciará a importação para TODOS os ${stats.total} leads desta campanha.`}
                            <br /><br />
                            <span className="font-bold text-slate-800">Atenção:</span> O processo será feito sequencialmente (um por um) para evitar bloqueios, levando cerca de <span className="text-orange-600 font-bold">3 segundos por lead</span>.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={cancelImport}
                                className="flex-1 py-3 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={executeHistoryImport}
                                className="flex-1 py-3 rounded-lg bg-orange-600 font-bold text-white hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
                            >
                                Confirmar e Iniciar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-4 mb-6">
                <button
                    onClick={() => navigate('/campaigns')}
                    className="flex items-center gap-2 text-slate-500 hover:text-orange-600 transition-colors text-sm font-semibold mb-4"
                >
                    <ArrowLeft size={16} /> Voltar para Campanhas
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
                            {campaign ? campaign.name : 'Carregando campanha...'}
                        </h1>
                        <p className="text-slate-600 text-base font-medium">Gerencie os leads e cadência desta campanha.</p>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2 text-slate-600 text-sm font-bold uppercase tracking-wider">
                            <Users size={16} /> Leads na Campanha
                        </div>
                        <div className="text-3xl font-extrabold text-slate-900">{stats.total}</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2 text-slate-600 text-sm font-bold uppercase tracking-wider">
                            <MessageCircle size={16} /> Total de Mensagens na Base
                        </div>
                        <div className="text-3xl font-extrabold text-blue-600">{totalMessages.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-1">Interações registradas no sistema</div>
                    </div>

                    {/* TOP LEADS RANKING */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-4 text-slate-600 text-sm font-bold uppercase tracking-wider">
                            <Trophy size={16} className="text-amber-500" /> Top Leads (Engajamento)
                        </div>
                        {topLeads.length > 0 ? (
                            <div className="space-y-2">
                                {topLeads.map((lead, idx) => (
                                    <div key={lead.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                            idx === 1 ? 'bg-slate-100 text-slate-600' :
                                                idx === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-slate-50 text-slate-500'
                                            }`}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                        </div>
                                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold overflow-hidden shrink-0">
                                            {lead.avatar_url ? (
                                                <img src={lead.avatar_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                lead.nome?.charAt(0) || '?'
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-slate-800 truncate">{lead.nome}</div>
                                        </div>
                                        <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                            {lead.total_interactions} msg
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-4">Nenhum lead com interações</p>
                        )}
                    </div>
                </div>

                {/* CONTROLS */}
                {/* HEADER CONTROLS */}
                <div className="bg-white border-b border-gray-200 p-3 md:p-4 mb-4 rounded-xl shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        {/* SEARCH & FILTER */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-80">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar lead, cargo ou empresa..."
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`p-3 rounded-xl border transition-colors ${isFilterOpen ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-slate-200 text-slate-500 hover:border-orange-200 hover:text-orange-500'}`}>
                                <Filter size={20} />
                            </button>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                            {selectedLeads.size > 0 && (
                                <span className="text-xs font-bold text-orange-600 animate-fade-in mr-2">
                                    {selectedLeads.size} selecionados
                                </span>
                            )}


                            <div className="flex flex-col items-end gap-1">
                                {clientSyncTimestamp && !syncLoading && (
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                                        <Clock size={10} />
                                        <span>
                                            Última sync: {new Date(clientSyncTimestamp).toLocaleString('pt-BR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                )}
                                <button
                                    onClick={handleSyncMessages}
                                    disabled={syncLoading}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${syncLoading
                                        ? 'bg-blue-50 text-blue-400 cursor-not-allowed'
                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border border-blue-200'
                                        }`}
                                >
                                    <RefreshCw size={16} className={syncLoading ? "animate-spin" : ""} />
                                    {syncLoading ? 'Sincronizando...' : 'Sync Mensagens'}
                                </button>
                            </div>


                            <button
                                onClick={handleBulkHistorySync}
                                disabled={importQueue.active}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${importQueue.active
                                    ? 'bg-amber-50 text-amber-400 cursor-not-allowed'
                                    : 'bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 border border-amber-200'
                                    }`}
                            >
                                <History size={16} className={importQueue.active ? "animate-spin" : ""} />
                                {importQueue.active ? 'Processando...' : 'Sync Histórico'}
                            </button>

                            <button
                                onClick={() => setIsAddLeadsModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 text-white border border-orange-600 hover:bg-orange-700 font-bold text-sm transition-all shadow-md shadow-orange-100">
                                <Plus size={16} /> Adicionar Leads
                            </button>
                        </div>
                    </div>

                    {/* FILTER PANEL */}
                    {isFilterOpen && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in">
                            <div className="flex flex-wrap items-end gap-4">
                                {/* STATUS FILTER */}
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={filters.status[0] || ''}
                                        onChange={(e) => setFilters(prev => ({
                                            ...prev,
                                            status: e.target.value ? [e.target.value] : []
                                        }))}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-sm"
                                    >
                                        <option value="">Todos os Status</option>
                                        <option value="NOT_CONTACTED">Not Contacted</option>
                                        <option value="PENDING_ENRICHMENT">In Queue</option>
                                        <option value="PROCESSING">Processing</option>
                                        <option value="QUALIFIED_NO_ICEBREAKER">Qualified</option>
                                        <option value="QUALIFIED_WITH_ICEBREAKER">Icebreaker Ready</option>
                                        <option value="CONTACTED">Contacted</option>
                                        <option value="REPLIED">Replied</option>
                                        <option value="MEETING_SCHEDULED">Meeting</option>
                                        <option value="WON">Won</option>
                                        <option value="LOST">Lost</option>
                                    </select>
                                </div>

                                {/* QUALIFICATION FILTER */}
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Qualificação
                                    </label>
                                    <select
                                        value={filters.qualification[0] || ''}
                                        onChange={(e) => setFilters(prev => ({
                                            ...prev,
                                            qualification: e.target.value ? [e.target.value] : []
                                        }))}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-sm"
                                    >
                                        <option value="">Todas as Qualificações</option>
                                        <option value="A">A-Tier (High Ticket)</option>
                                        <option value="B">B-Tier (Enterprise)</option>
                                        <option value="C">C-Tier (Standard)</option>
                                    </select>
                                </div>

                                {/* HAS MESSAGES FILTER */}
                                <div className="flex-1 min-w-[180px]">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Mensagens
                                    </label>
                                    <select
                                        value={filters.hasMessages || ''}
                                        onChange={(e) => setFilters(prev => ({
                                            ...prev,
                                            hasMessages: e.target.value
                                        }))}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors text-sm"
                                    >
                                        <option value="">Todos</option>
                                        <option value="yes">Com mensagens</option>
                                        <option value="no">Sem mensagens</option>
                                    </select>
                                </div>

                                {/* CLEAR FILTERS */}
                                <button
                                    onClick={() => setFilters({ status: [], qualification: [], company: '', role: '', hasMessages: '' })}
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 hover:border-slate-300 font-medium text-sm transition-colors"
                                >
                                    Limpar Filtros
                                </button>
                            </div>

                            {/* Active Filters Tags */}
                            {(filters.status.length > 0 || filters.qualification.length > 0 || filters.hasMessages) && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {filters.status.map(s => (
                                        <span key={s} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                            Status: {s}
                                            <button onClick={() => setFilters(prev => ({ ...prev, status: prev.status.filter(x => x !== s) }))} className="hover:text-orange-900">
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                    {filters.qualification.map(q => (
                                        <span key={q} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                            Tier: {q}
                                            <button onClick={() => setFilters(prev => ({ ...prev, qualification: prev.qualification.filter(x => x !== q) }))} className="hover:text-purple-900">
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                    {filters.hasMessages && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                            {filters.hasMessages === 'yes' ? 'Com mensagens' : 'Sem mensagens'}
                                            <button onClick={() => setFilters(prev => ({ ...prev, hasMessages: '' }))} className="hover:text-blue-900">
                                                <X size={12} />
                                            </button>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <AddLeadsModal
                    isOpen={isAddLeadsModalOpen}
                    onClose={() => setIsAddLeadsModalOpen(false)}
                    campaignId={campaignId}
                    clientId={selectedClientId}
                    onImportConnections={handleSyncConnections}
                />





                {/* ========== TABLE/LIST VIEW ========== */}
                {
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-4 px-4 w-[40px] text-center">
                                            <div
                                                onClick={toggleSelectAll}
                                                className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors mx-auto ${selectedLeads.size > 0 && selectedLeads.size === leads.length ? 'bg-orange-500 border-orange-500' : 'bg-white border-slate-300'
                                                    }`}>
                                                {selectedLeads.size > 0 && selectedLeads.size === leads.length && <Check size={10} className="text-white" />}
                                                {selectedLeads.size > 0 && selectedLeads.size < leads.length && <div className="w-2 h-0.5 bg-orange-500 rounded-full" />}
                                            </div>
                                        </th>

                                        <th
                                            className="py-4 px-4 w-[30%] cursor-pointer hover:bg-slate-100 transition-colors group"
                                            onClick={() => handleSort('nome')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Lead
                                                <ArrowUpDown size={12} className={`text-slate-400 ${sortConfig.key === 'nome' ? 'opacity-100 text-orange-500' : 'opacity-0 group-hover:opacity-100'}`} />
                                            </div>
                                        </th>

                                        <th
                                            className="py-4 px-4 w-[15%] cursor-pointer hover:bg-slate-100 transition-colors group"
                                            onClick={() => handleSort('empresa')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Empresa
                                                <ArrowUpDown size={12} className={`text-slate-400 ${sortConfig.key === 'empresa' ? 'opacity-100 text-orange-500' : 'opacity-0 group-hover:opacity-100'}`} />
                                            </div>
                                        </th>

                                        <th className="py-4 px-4 w-[10%]">Qualificação</th>

                                        <th
                                            className="py-4 px-4 w-[15%] cursor-pointer hover:bg-slate-100 transition-colors group"
                                            onClick={() => handleSort('location')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Local
                                                <ArrowUpDown size={12} className={`text-slate-400 ${sortConfig.key === 'location' ? 'opacity-100 text-orange-500' : 'opacity-0 group-hover:opacity-100'}`} />
                                            </div>
                                        </th>

                                        <th
                                            className="py-4 px-4 w-[10%] text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                                            onClick={() => handleSort('status_pipeline')}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                Status
                                                <ArrowUpDown size={12} className={`text-slate-400 ${sortConfig.key === 'status_pipeline' ? 'opacity-100 text-orange-500' : 'opacity-0 group-hover:opacity-100'}`} />
                                            </div>
                                        </th>

                                        <th
                                            className="py-4 px-4 w-[10%] text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                                            onClick={() => handleSort('total_interactions')}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                Engagement
                                                <ArrowUpDown size={12} className={`text-slate-400 ${sortConfig.key === 'total_interactions' ? 'opacity-100 text-orange-500' : 'opacity-0 group-hover:opacity-100'}`} />
                                            </div>
                                        </th>

                                        <th
                                            className="py-4 px-4 w-[8%] text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                                            onClick={() => handleSort('sentiment')}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                <Brain size={14} className="text-violet-500" />
                                                IA
                                                <ArrowUpDown size={12} className={`text-slate-400 ${sortConfig.key === 'sentiment' ? 'opacity-100 text-orange-500' : 'opacity-0 group-hover:opacity-100'}`} />
                                            </div>
                                        </th>

                                        <th className="py-4 px-4 w-[8%] text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && leads.length === 0 ? (
                                        <tr><td colSpan="7" className="py-20 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" />Carregando Leads...</td></tr>
                                    ) : leads.map((item, index) => {
                                        console.log(`[Render ${index + 1}/${leads.length}] Full item:`, item)

                                        // FIXED: campaign_leads view is flat - all data is directly on item
                                        const lead = item
                                        console.log(`[Render ${index + 1}] Using lead data:`, lead)

                                        const campaignStatus = item.status_pipeline
                                        const totalInteractions = lead.total_interactions || 0

                                        // Dynamic Status based on interactions
                                        let statusLabel = 'A Contatar'
                                        let statusColor = 'text-slate-500 bg-slate-100'

                                        if (totalInteractions > 0) {
                                            statusLabel = 'Em Conversa'
                                            statusColor = 'text-blue-600 bg-blue-50'
                                        }

                                        // Override with pipeline status if disqualified
                                        if (campaignStatus === 'DISQUALIFIED') {
                                            statusLabel = 'Desqualificado'
                                            statusColor = 'text-red-600 bg-red-50'
                                        }

                                        const isDisqualified = campaignStatus === 'DISQUALIFIED'
                                        const needsIcebreaker = campaignStatus === 'QUALIFIED_NO_ICEBREAKER'
                                        const isSelected = selectedLeads.has(item.id)

                                        // Professional Zebra Striping
                                        let rowClass = "group cursor-pointer border-b border-slate-100 hover:brightness-95"
                                        if (index % 2 === 0) rowClass += " bg-white"
                                        else rowClass += " bg-slate-50/50"
                                        if (isSelected) rowClass += " !bg-blue-50"

                                        return (
                                            <tr key={item.id} onClick={() => !isDisqualified && setSelectedLead(item)} className={rowClass}>
                                                <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <div onClick={(e) => toggleSelectRow(item.id, e)} className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors mx-auto ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 hover:border-blue-400'}`}>
                                                        {isSelected && <Check size={10} className="text-white" />}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm border border-slate-300 overflow-hidden shrink-0">
                                                            {lead.avatar_url ? <img src={lead.avatar_url} className="w-full h-full object-cover" alt="" /> : (lead.nome?.charAt(0) || '?')}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-slate-900 text-sm truncate max-w-[220px]" title={lead.nome}>{lead.nome || 'Lead #' + item.id}</div>
                                                            <div className="text-xs text-slate-500 truncate max-w-[220px]" title={lead.headline}>{lead.headline || 'No headline'}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="text-sm text-slate-700 truncate max-w-[180px]" title={lead.empresa}>
                                                        {lead.empresa || 'None'}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="text-sm text-slate-600">
                                                        {lead.icp_score ? `${lead.icp_score}-Tier` : 'N/A'}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="text-sm text-slate-600 truncate max-w-[140px]" title={lead.location}>
                                                        {lead.location || 'N/A'}
                                                    </div>
                                                </td>

                                                {/* ENGAGEMENT HEAT INDICATOR */}
                                                <td className="py-3 px-4">
                                                    {(() => {
                                                        const count = lead.total_interactions || 0
                                                        const sentiment = lead.last_sentiment

                                                        // Determine heat level based on sentiment
                                                        let heatConfig = {
                                                            bars: 1,
                                                            color: 'bg-slate-300',
                                                            textColor: 'text-slate-500',
                                                            label: 'Cold'
                                                        }

                                                        if (count === 0) {
                                                            heatConfig = { bars: 0, color: 'bg-slate-200', textColor: 'text-slate-400', label: 'No Activity' }
                                                        } else if (sentiment === 'POSITIVE') {
                                                            heatConfig = { bars: 3, color: 'bg-emerald-500', textColor: 'text-emerald-600', label: 'Hot' }
                                                        } else if (sentiment === 'NEGATIVE') {
                                                            heatConfig = { bars: 1, color: 'bg-rose-400', textColor: 'text-rose-500', label: 'Cold' }
                                                        } else if (sentiment === 'NEUTRAL') {
                                                            heatConfig = { bars: 2, color: 'bg-amber-400', textColor: 'text-amber-600', label: 'Warm' }
                                                        } else if (count > 0) {
                                                            heatConfig = { bars: 2, color: 'bg-slate-400', textColor: 'text-slate-600', label: 'Active' }
                                                        }

                                                        return (
                                                            <div className="flex items-center justify-center gap-2">
                                                                {/* Signal Strength Bars */}
                                                                <div className="flex items-end gap-0.5 h-4" title={`Sentiment: ${sentiment || 'Unknown'}`}>
                                                                    <div className={`w-1 rounded-sm transition-all ${heatConfig.bars >= 1 ? heatConfig.color : 'bg-slate-200'}`} style={{ height: '6px' }} />
                                                                    <div className={`w-1 rounded-sm transition-all ${heatConfig.bars >= 2 ? heatConfig.color : 'bg-slate-200'}`} style={{ height: '10px' }} />
                                                                    <div className={`w-1 rounded-sm transition-all ${heatConfig.bars >= 3 ? heatConfig.color : 'bg-slate-200'}`} style={{ height: '14px' }} />
                                                                </div>

                                                                {/* Count Badge */}
                                                                <span className={`text-sm font-semibold ${heatConfig.textColor}`}>
                                                                    {count}
                                                                </span>
                                                            </div>
                                                        )
                                                    })()}
                                                </td>

                                                <td className="py-3 px-4 text-center">
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
                                                        {statusLabel}
                                                    </span>
                                                </td>

                                                {/* AI STATUS BADGE */}
                                                <td className="py-3 px-4 text-center">
                                                    {(() => {
                                                        // Loading state
                                                        if (lead.ready_for_analysis) {
                                                            return (
                                                                <div className="flex items-center justify-center" title="IA analisando...">
                                                                    <div className="px-2 py-1 rounded-full bg-violet-50 border border-violet-200 flex items-center gap-1">
                                                                        <Sparkles size={12} className="text-violet-500 animate-pulse" />
                                                                        <span className="text-xs text-violet-600 font-medium">Analisando</span>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }

                                                        const sentiment = lead.sentiment
                                                        const reasoning = lead.sentiment_reasoning

                                                        if (!sentiment) {
                                                            return (
                                                                <span className="text-xs text-slate-400">—</span>
                                                            )
                                                        }

                                                        let badgeConfig = {
                                                            bg: 'bg-slate-100',
                                                            border: 'border-slate-200',
                                                            text: 'text-slate-600',
                                                            label: '—',
                                                            icon: null
                                                        }

                                                        if (sentiment === 'POSITIVE') {
                                                            badgeConfig = {
                                                                bg: 'bg-emerald-50',
                                                                border: 'border-emerald-200',
                                                                text: 'text-emerald-700',
                                                                label: '🔥 Quente',
                                                                icon: null
                                                            }
                                                        } else if (sentiment === 'NEGATIVE') {
                                                            badgeConfig = {
                                                                bg: 'bg-rose-50',
                                                                border: 'border-rose-200',
                                                                text: 'text-rose-700',
                                                                label: '❄️ Frio',
                                                                icon: null
                                                            }
                                                        } else if (sentiment === 'NEUTRAL') {
                                                            badgeConfig = {
                                                                bg: 'bg-amber-50',
                                                                border: 'border-amber-200',
                                                                text: 'text-amber-700',
                                                                label: '🌡️ Morno',
                                                                icon: null
                                                            }
                                                        }

                                                        return (
                                                            <div className="relative group/tooltip inline-block">
                                                                <div className={`px-2 py-1 rounded-full ${badgeConfig.bg} border ${badgeConfig.border} cursor-help`}>
                                                                    <span className={`text-xs font-semibold ${badgeConfig.text}`}>
                                                                        {badgeConfig.label}
                                                                    </span>
                                                                </div>
                                                                {/* Tooltip */}
                                                                {reasoning && (
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 w-48 text-center shadow-lg">
                                                                        {reasoning}
                                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })()}
                                                </td>

                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                        <button onClick={(e) => handleSyncRecent(lead, e)} className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Sync Recente"><RefreshCw size={14} /></button>
                                                        <button onClick={(e) => handleSyncHistory(lead, e)} className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50" title="Importar Histórico"><History size={14} /></button>

                                                        <div className="w-px h-3 bg-slate-200 mx-1"></div>

                                                        {needsIcebreaker && (
                                                            <button onClick={(e) => handleGenerateIcebreaker(lead.id, e)} className="p-1.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100" title="Gerar Icebreaker">
                                                                {icebreakerLoading === lead.id ? <Loader2 className="animate-spin" size={14} /> : <Bot size={14} />}
                                                            </button>
                                                        )}
                                                        <button onClick={(e) => handleDeleteLead(item.id, e)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50" title="Remover"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINATION */}
                        <div className="border-t border-slate-200 bg-slate-50 p-4 flex justify-between items-center sticky bottom-0 z-10 w-full">
                            <span className="text-sm text-slate-600">
                                Showing {page * ITEMS_per_PAGE + 1} - {Math.min((page + 1) * ITEMS_per_PAGE, stats.total)} out of {stats.total} results
                            </span>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const newPage = Math.max(0, page - 1);
                                        setPage(newPage);
                                        fetchLeads(newPage, false);
                                    }}
                                    disabled={page === 0 || loading}
                                    className="p-2 rounded-lg border bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-sm font-bold text-slate-700 min-w-[20px] text-center">{page + 1}</span>
                                <button
                                    onClick={() => {
                                        const newPage = page + 1;
                                        setPage(newPage);
                                        fetchLeads(newPage, false);
                                    }}
                                    disabled={!hasMore || loading}
                                    className="p-2 rounded-lg border bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                }

            </div>

            {/* DRAWER (Slide-Over) */}
            {selectedLead && selectedLead.leads && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedLead(null)} />
                    <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden border-l border-gray-200">
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Cadência de Venda</h2>
                                <p className="text-xs text-gray-500 mt-1">Gerencie a interação com este lead</p>
                            </div>
                            <button onClick={() => setSelectedLead(null)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Drawer Body - Split into Context and Action */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-50/50">

                            {/* BLOCK 1: CONTEXT (Why is this lead here?) */}
                            <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-500 shrink-0 border border-gray-200">
                                        {selectedLead.leads.avatar_url ? <img src={selectedLead.leads.avatar_url} className="w-full h-full object-cover rounded-full" /> : (selectedLead.leads.nome?.charAt(0) || '?')}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-lg font-bold text-slate-900 leading-tight">{selectedLead.leads.nome}</h3>
                                            {selectedLead.leads.company_website && (
                                                <a href={selectedLead.leads.company_website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors" title="Visitar Site">
                                                    <Globe size={18} />
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mb-1">{selectedLead.leads.headline}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedLead.leads.is_high_ticket && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100 flex items-center gap-1"><Gem size={10} /> High Ticket</span>}
                                            {selectedLead.leads.company_size_type && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded border border-gray-200"><Building2 size={10} className="inline mr-1" />{selectedLead.leads.company_size_type}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* ICP REASON */}
                                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100/60">
                                    <h4 className="flex items-center gap-2 text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">
                                        <Sparkles size={12} /> Motivo da Qualificação
                                    </h4>
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                        {selectedLead.leads.icp_reason || "Este perfil apresenta alta aderência com seu ICP ideal, ocupando cargo de decisão em setor estratégico."}
                                    </p>
                                </div>
                            </div>

                            {/* Skills Tag Cloud (Collapsed/Secondary) */}
                            {selectedLead.leads.skills && (
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Habilidades Detectadas</h4>
                                    <div className="flex flex-wrap gap-2 px-2">
                                        {(() => {
                                            try {
                                                const tags = typeof selectedLead.leads.skills === 'string' ? JSON.parse(selectedLead.leads.skills) : selectedLead.leads.skills
                                                return tags.slice(0, 5).map((t, i) => (
                                                    <span key={i} className="px-2 py-1 rounded-md bg-white text-slate-500 text-xs font-medium border border-gray-200 shadow-sm">
                                                        {typeof t === 'string' ? t : t.name}
                                                    </span>
                                                ))
                                            } catch (e) { return null }
                                        })()}
                                    </div>
                                </div>
                            )}



                            {/* TIMELINE / INTERACTIONS */}
                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                                    <MessageSquare size={12} /> Histórico de Interações
                                </h4>
                                <div className="space-y-3 px-2">
                                    {loadingChat ? (
                                        <div className="text-center text-xs text-gray-400 py-4">
                                            <Loader2 className="animate-spin inline mr-1" size={12} /> Carregando...
                                        </div>
                                    ) : interactions.length === 0 ? (
                                        <div className="text-center text-xs text-gray-400 py-4 italic bg-slate-50 rounded-lg border border-slate-100">
                                            Nenhuma interação registrada.
                                        </div>
                                    ) : (
                                        interactions.map(msg => (
                                            <div key={msg.id} className={`flex flex-col max-w-[90%] ${msg.direction === 'inbound' ? 'self-start' : 'self-end ml-auto'}`}>
                                                <div className={`p-3 rounded-xl text-xs leading-relaxed shadow-sm ${msg.direction === 'inbound'
                                                    ? 'bg-white border border-gray-200 text-slate-700 rounded-bl-none'
                                                    : 'bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-br-none'
                                                    }`}>
                                                    {msg.content}
                                                </div>
                                                <span className="text-[10px] text-gray-400 mt-1 px-1 text-right">
                                                    {new Date(msg.interaction_date).toLocaleDateString()} {new Date(msg.interaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* BLOCK 2: ACTION (Bottom Fixed) */}
                        <div className="p-6 border-t border-gray-200 bg-white">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mensagem de Conexão</label>

                            <div className="relative mb-4">
                                <textarea
                                    className="w-full h-32 p-3 bg-slate-50 border border-gray-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none font-medium leading-relaxed"
                                    value={messageDraft}
                                    onChange={(e) => setMessageDraft(e.target.value)}
                                    placeholder="Escreva sua mensagem de conexão..."
                                />
                                <button
                                    onClick={() => handleCopy(messageDraft)}
                                    className="absolute top-2 right-2 p-1.5 rounded-md bg-white text-gray-400 hover:text-orange-600 border border-gray-200 shadow-sm transition-all"
                                    title="Copiar texto"
                                >
                                    <Copy size={14} />
                                </button>
                            </div>

                            <button
                                onClick={handleSendMessage}
                                disabled={sendingMessage}
                                className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${sendingMessage
                                    ? 'bg-orange-300 cursor-not-allowed'
                                    : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200 hover:shadow-orange-300'
                                    }`}
                            >
                                {sendingMessage ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />}
                                {sendingMessage ? 'Enviando...' : 'Enviar Conexão'}
                            </button>

                            <p className="text-center text-[10px] text-gray-400 mt-2">
                                Esta ação enviará um convite de conexão via LinkedIn.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* LEAD DETAIL MODAL - AI INSIGHTS */}
            {selectedLead && (
                <LeadDetailModal
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                />
            )}
        </div>
    )
}

export default CampaignLeadsView

