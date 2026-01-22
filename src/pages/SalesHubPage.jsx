import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale' // Ensure locale import
import './SalesHub.css'
import {
    Search,
    Filter,
    MessageCircle,
    Check,
    X,
    Clock,
    MoreHorizontal,
    Copy,
    Calendar,
    ArrowRight,
    RefreshCw,
    Loader2,
    Sparkles,
    Briefcase,
    MapPin,
    Hash,
    GraduationCap
} from 'lucide-react'

// Mock Data for KPI if DB is empty
const MOCK_STATS = {
    total: 1240,
    hot: 85,
    interactions: 12
}

const SalesHubPage = () => {
    const { selectedClientId } = useClientSelection()
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedLead, setSelectedLead] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [stats, setStats] = useState({ total: 0, hot: 0, interactions: 0 })

    // Pagination State
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const ITEMS_per_PAGE = 50

    // Sync Logic State
    const [syncLoading, setSyncLoading] = useState(false)
    const [notification, setNotification] = useState(null) // { message, type: 'success'|'error' }

    // Strategy Logic State
    const [strategyLoading, setStrategyLoading] = useState(false)
    const [sendingMessage, setSendingMessage] = useState(false)

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // Interactions Logic
    const [interactions, setInteractions] = useState([])
    const [interactionsLoading, setInteractionsLoading] = useState(false)

    useEffect(() => {
        if (!selectedLead) {
            setInteractions([])
            return
        }

        const fetchInteractions = async () => {
            setInteractionsLoading(true)
            try {
                const { data, error } = await supabase
                    .from('interactions')
                    .select('*')
                    .eq('lead_id', selectedLead.id)
                    .order('interaction_date', { ascending: false })

                if (error) throw error
                setInteractions(data || [])
            } catch (err) {
                console.error('Erro ao buscar interações:', err)
            } finally {
                setInteractionsLoading(false)
            }
        }

        fetchInteractions()
    }, [selectedLead])

    const handleSync = async () => {
        if (!selectedClientId) return
        setSyncLoading(true)

        try {
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/sync-connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_id: selectedClientId })
            })

            if (response.ok) {
                setNotification({ message: 'A mineração começou! Os leads aparecerão na tela automaticamente.', type: 'info' })
                // We do NOT stop loading here. We wait for Realtime event.
            } else {
                setNotification({ message: 'Erro ao iniciar sincronização (Webhook).', type: 'error' })
                setSyncLoading(false) // Stop on error
            }
        } catch (error) {
            console.error(error)
            setNotification({ message: 'Erro de conexão.', type: 'error' })
            setSyncLoading(false) // Stop on error
        }

        // Auto-dismiss notification after 5s but keep loading state
        setTimeout(() => setNotification(null), 5000)
    }

    const fetchStats = async () => {
        if (!selectedClientId) return

        try {
            // 1. Total Leads
            const { count: totalCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('client_id', selectedClientId)

            // 2. Hot Leads (ICP A)
            const { count: hotCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('client_id', selectedClientId)
                .eq('icp_score', 'A')

            // 3. Recent Interactions (Last 7 Days)
            // Assuming interactions are linked to leads. We use !inner join to filter by client_id on leads table.
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

            const { count: interactionsCount } = await supabase
                .from('interactions')
                .select('*, leads!inner(client_id)', { count: 'exact', head: true })
                .eq('leads.client_id', selectedClientId)
                .gte('interaction_date', sevenDaysAgo.toISOString())

            setStats({
                total: totalCount || 0,
                hot: hotCount || 0,
                interactions: interactionsCount || 0
            })

        } catch (error) {
            console.error('Erro ao buscar KPIs:', error)
        }
    }

    // Reset pagination when Client or Search changes
    useEffect(() => {
        if (selectedClientId) {
            setLeads([])
            setPage(0)
            setHasMore(true)
            fetchLeads(0, true)
            fetchStats() // Fetch KPIs
        } else {
            setLeads([])
            setStats({ total: 0, hot: 0, interactions: 0 })
        }
    }, [selectedClientId, debouncedSearch])

    // Realtime Listener
    useEffect(() => {
        if (!selectedClientId) return
        const channel = supabase.channel('leads-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads', filter: `client_id=eq.${selectedClientId}` }, () => {
                setNotification({ message: 'Novos leads encontrados!', type: 'success' })
                fetchLeads(0, true) // Refresh list on new lead
                fetchStats() // Refresh KPIs
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [selectedClientId])

    const fetchLeads = async (pageIndex = 0, isRefresh = false) => {
        if (!selectedClientId) return

        try {
            if (pageIndex === 0) setLoading(true)
            else setLoadingMore(true)

            const from = pageIndex * ITEMS_per_PAGE
            const to = from + ITEMS_per_PAGE - 1

            let query = supabase
                .from('leads')
                .select('*', { count: 'exact' })
                .eq('client_id', selectedClientId)
                .range(from, to)

            if (debouncedSearch) {
                query = query.or(`nome.ilike.%${debouncedSearch}%,company.ilike.%${debouncedSearch}%`)
            }

            // SIMPLIFIED DEBUG MODE: Sort by created_at DESC, no other filters
            const { data, count, error } = await query.order('created_at', { ascending: false })

            if (error) throw error

            if (data) {
                if (isRefresh || pageIndex === 0) {
                    setLeads(data)
                } else {
                    setLeads(prev => [...prev, ...data])
                }

                // Update stats only on first load/refresh to keep it accurate-ish
                if (pageIndex === 0 && count !== null) {
                    setStats(prev => ({ ...prev, total: count }))
                }

                setHasMore(data.length === ITEMS_per_PAGE)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1
            setPage(nextPage)
            fetchLeads(nextPage, false)
        }
    }

    // Intersection Observer for Infinite Scroll
    const observerTarget = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                    loadMore();
                }
            },
            { threshold: 1.0 }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, leads]); // Re-attach when list changes logic

    const filteredLeads = leads // Filtering handled by Server side now

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text)
        // Add toast notification logic here if desired
    }

    const handleStatusChange = async (leadId, newStatus) => {
        // MAPPING: Label/Input -> Database Enum Value
        const STATUS_MAPPING = {
            'Novos': 'TO_CONTACT',
            'Contatados': 'CONTACTED',
            'Em Conversa': 'IN_CONVERSATION',
            'Reunião': 'MEETING_SCHEDULED',
            'Desqualificado': 'DISQUALIFIED',
            // Fallbacks for internal (lowercase) codes if used elsewhere
            'to_contact': 'TO_CONTACT',
            'contacted': 'CONTACTED',
            'in_conversation': 'IN_CONVERSATION',
            'meeting_scheduled': 'MEETING_SCHEDULED',
            'disqualified': 'DISQUALIFIED',
        }

        const dbStatus = STATUS_MAPPING[newStatus] || newStatus

        // Optimistic update
        setLeads(leads.map(l => l.id === leadId ? { ...l, status: dbStatus } : l))
        if (selectedLead && selectedLead.id === leadId) {
            setSelectedLead({ ...selectedLead, status: dbStatus })
        }

        try {
            const { error } = await supabase.from('leads').update({ status_pipeline: dbStatus }).eq('id', leadId)

            if (error) {
                console.error('Erro ao atualizar status no Supabase:', error)
                // Revert optimistic update if needed or notify user
                setNotification({ message: `Erro ao atualizar status: ${error.message}`, type: 'error' })
            }
        } catch (err) {
            console.error('Erro inesperado:', err)
            setNotification({ message: 'Erro de conexão ao atualizar status.', type: 'error' })
        }
    }

    const handleGenerateStrategy = async () => {
        if (!selectedLead) return
        setStrategyLoading(true)

        try {
            // Using the same n8n host but different path - placeholder logic as per plan
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook-test/generate-strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: selectedLead.id,
                    client_id: selectedClientId
                })
            })

            if (response.ok) {
                // Mocking the response update locally since webhook is async usually
                // In real world, we would wait for realtime or response body
                // For this task, assuming the webhook returns the strategies immediately or we mock it
                // Let's assume response json has the strategies
                // const data = await response.json()

                // MOCK UPDATE for UX demonstration if backend doesn't respond with data immediately
                const mockStrategies = {
                    funny: "Fala [Nome]! Vi que você curte [Interesse]. Se sua empresa fosse uma banda, seria Rock ou Jazz? Haha, brincadeiras à parte...",
                    moderate: "Olá [Nome], notei sua trajetória na [Empresa]. Acredito que temos sinergia em...",
                    intentional: "[Nome], li seu post sobre [Tema] e concordo plenamente. Como você vê isso afetando o mercado de..."
                }

                const updatedLead = { ...selectedLead, icebreaker_options: mockStrategies }
                setSelectedLead(updatedLead)
                // Also update in list
                setLeads(leads.map(l => l.id === selectedLead.id ? updatedLead : l))

                setNotification({ message: 'Estratégias geradas com sucesso!', type: 'success' })
            } else {
                setNotification({ message: 'Erro ao gerar estratégias.', type: 'error' })
            }
        } catch (error) {
            console.error(error)
            setNotification({ message: 'Erro de conexão.', type: 'error' })
        } finally {
            setStrategyLoading(false)
            setTimeout(() => setNotification(null), 3000)
        }
    }

    const handleAutoSend = async () => {
        if (!selectedLead) return
        setSendingMessage(true)

        try {
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook-test/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: selectedLead.id,
                    client_id: selectedClientId,
                    message: selectedLead.suggested_message
                })
            })

            if (response.ok) {
                // Success Flow
                setNotification({ message: 'Mensagem enviada com sucesso!', type: 'success' })

                // Show follow-up toast after a brief delay
                setTimeout(() => {
                    setNotification({ message: '📅 Follow-up agendado para daqui a 3 dias.', type: 'info' })
                }, 1500)

                await handleStatusChange(selectedLead.id, 'contacted')

                // Close modal after showing success
                setTimeout(() => {
                    setSelectedLead(null)
                    setNotification(null)
                }, 3500)
            } else {
                setNotification({ message: 'Não foi possível enviar automaticamente. Tente conectar primeiro ou envie manualmente.', type: 'error' })
            }
        } catch (error) {
            console.error(error)
            setNotification({ message: 'Erro de conexão.', type: 'error' })
        } finally {
            setSendingMessage(false)
            if (notification?.type === 'error') {
                setTimeout(() => setNotification(null), 5000)
            }
        }
    }

    return (
        <div className="sales-hub-container">
            {/* Header */}
            <div className="sales-header">
                <div className="sales-title">
                    <h1>Mineração de Base & Cadência</h1>
                    <p>Identifique oportunidades ocultas na sua rede e inicie conversas com contexto.</p>
                </div>

                <div className="kpi-grid">
                    <div className="kpi-card">
                        <span className="kpi-label">Total na Base</span>
                        <span className="kpi-value">{stats.total}</span>
                    </div>
                    <div className="kpi-card">
                        <span className="kpi-label" style={{ color: '#dc2626' }}>Oportunidades ICP A</span>
                        <span className="kpi-value" style={{ color: '#dc2626' }}>{stats.hot}</span>
                    </div>
                    <div className="kpi-card">
                        <span className="kpi-label" style={{ color: '#2563eb' }}>Interações (7d)</span>
                        <span className="kpi-value" style={{ color: '#2563eb' }}>{stats.interactions}</span>
                    </div>
                </div>
            </div>

            {!selectedClientId ? (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'white',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    color: '#64748b'
                }}>
                    <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                        <Search size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>Nenhum Cliente Selecionado</h3>
                    <p>Selecione um cliente no topo da página para gerenciar a prospecção.</p>
                </div>
            ) : (
                <div className="table-container">
                    <div className="table-controls">
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Buscar por nome, cargo ou empresa..."
                                style={{ paddingLeft: '2.5rem' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div>
                            <button
                                className="action-btn-sm"
                                onClick={handleSync}
                                disabled={syncLoading}
                                style={{ display: 'flex', gap: '0.5rem', marginRight: '0.5rem', background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}
                            >
                                {syncLoading ? <Loader2 size={16} className="spinner" /> : <RefreshCw size={16} />}
                                {syncLoading ? 'Sincronizando...' : 'Sincronizar Conexões'}
                            </button>
                            <button className="action-btn-sm" style={{ display: 'flex', gap: '0.5rem' }}>
                                <Filter size={16} /> Filtros
                            </button>
                        </div>
                    </div>

                    <div className="smart-table-wrapper">
                        <table className="smart-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40%' }}>Perfil</th>
                                    <th style={{ width: '15%' }}>Score ICP</th>
                                    <th style={{ width: '10%' }}>Status</th>
                                    <th style={{ width: '15%' }}>Interação</th>
                                    <th style={{ width: '20%' }}>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Carregando dados...</td></tr>
                                ) : filteredLeads.map(lead => (
                                    <tr key={lead.id}>
                                        <td>
                                            <div className="profile-cell">
                                                {lead.avatar_url ? (
                                                    <img src={lead.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                                                ) : (
                                                    <div className="avatar-placeholder">
                                                        {lead.nome ? lead.nome.charAt(0) : '?'}
                                                    </div>
                                                )}
                                                <div className="profile-info-text">
                                                    <span className="profile-name">{lead.nome || 'Sem Nome'}</span>
                                                    <span className="profile-headline">
                                                        {lead.headline || 'Cargo N/A'} {lead.company ? `@ ${lead.company}` : ''}
                                                    </span>
                                                    {lead.work_history && (
                                                        <span className="history-text">
                                                            Histórico: {(() => {
                                                                try {
                                                                    const history = typeof lead.work_history === 'string' ? JSON.parse(lead.work_history) : lead.work_history
                                                                    return history.slice(0, 2).map(h => h.company).join(', ')
                                                                } catch (e) { return '' }
                                                            })()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <ScoreBadge score={lead.icp_score} reason={lead.icp_reason} />
                                        </td>
                                        <td>
                                            <span className={`status-text ${lead.status_pipeline === 'Conexão' ? 'status-connected' : ''}`} style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: lead.status_pipeline === 'Conexão' ? '#dbeafe' : '#f1f5f9',
                                                color: lead.status_pipeline === 'Conexão' ? '#2563eb' : '#64748b',
                                                fontWeight: 600,
                                                fontSize: '0.75rem'
                                            }}>
                                                {lead.status_pipeline === 'Conexão' ? 'Conexão' : 'Seguidor'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {(() => {
                                                    const score = lead.engagement_score || 0
                                                    // New simple rule: > 0 is Fire/Hot, 0 is Gray
                                                    const isHot = score > 0
                                                    const color = isHot ? '#dc2626' : '#94a3b8'
                                                    const icon = isHot ? '🔥' : ''

                                                    if (!isHot) {
                                                        return <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>-</span>
                                                    }

                                                    return (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color }}>
                                                            <span>{icon}</span>
                                                            <span>{score} pts</span>
                                                        </div>
                                                    )
                                                })()}
                                                {lead.engagement_score > 0 && lead.last_interaction && (
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {formatDistanceToNow(new Date(lead.last_interaction), { addSuffix: true, locale: ptBR })}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="action-btn-sm"
                                                    onClick={() => setSelectedLead(lead)}
                                                    style={{ color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }}
                                                >
                                                    Abordar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && filteredLeads.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                            Nenhum lead encontrado para este cliente.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table >

                        {/* Sentinel for Infinite Scroll */}
                        < div ref={observerTarget} style={{ height: '20px', margin: '10px 0', textAlign: 'center' }}>
                            {loadingMore && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#64748b' }}>
                                    <Loader2 className="spinner" size={20} /> Carregando mais leads...
                                </div>
                            )}
                            {!hasMore && leads.length > 0 && <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>Você chegou ao fim da lista.</span>}
                        </div >
                    </div >
                </div >
            )}

            {/* Action Drawer */}
            {
                selectedLead && (
                    <div className="drawer-overlay" onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedLead(null)
                    }}>
                        <div className="drawer-panel">
                            <div className="drawer-header">
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
                                    Cadência de Venda
                                </h2>
                                <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X size={24} color="#64748b" />
                                </button>
                            </div>

                            <div className="drawer-body">
                                {/* Profile Summary */}
                                <div className="drawer-section">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                        <div className="avatar-placeholder" style={{ width: 48, height: 48, fontSize: '1.2rem', background: '#3b82f6', color: 'white' }}>
                                            {selectedLead.nome ? selectedLead.nome.charAt(0) : '?'}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{selectedLead.nome}</h3>
                                            <p style={{ margin: 0, color: '#64748b' }}>{selectedLead.headline}</p>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                {selectedLead.location && (
                                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        <MapPin size={12} /> {selectedLead.location}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Skills */}
                                    {selectedLead.skills && (
                                        <div className="drawer-tags" style={{ marginTop: '1rem' }}>
                                            {(() => {
                                                try {
                                                    const tags = typeof selectedLead.skills === 'string' ? JSON.parse(selectedLead.skills) : selectedLead.skills
                                                    return tags.slice(0, 5).map((t, i) => {
                                                        const skillName = typeof t === 'string' ? t : (t.name || 'Skill')
                                                        return (
                                                            <span key={i} className="tag"><Hash size={10} style={{ marginRight: 2 }} />{skillName}</span>
                                                        )
                                                    })
                                                } catch (e) { return null }
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Work History */}
                                {selectedLead.work_history && (
                                    <div className="drawer-section">
                                        <h4><Briefcase size={14} style={{ display: 'inline', marginRight: 4 }} /> Experiência Profissional</h4>
                                        <div className="timeline-list">
                                            {(() => {
                                                try {
                                                    const history = typeof selectedLead.work_history === 'string' ? JSON.parse(selectedLead.work_history) : selectedLead.work_history
                                                    return history.slice(0, 3).map((job, idx) => (
                                                        <div key={idx} className="timeline-item">
                                                            <div className="timeline-role">{job.role || job.title}</div>
                                                            <div className="timeline-company">{job.company}</div>
                                                            <div className="timeline-date">{job.date_range || job.duration}</div>
                                                        </div>
                                                    ))
                                                } catch (e) { return <span style={{ color: '#cbd5e1' }}>Dados inválidos</span> }
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {/* Why ICP? */}
                                <div className="drawer-section">
                                    <h4>Por que é um bom lead? (IA)</h4>
                                    <div className="highlight-box">
                                        {selectedLead.icp_reason || "Este lead possui cargo de decisão e atua em um setor compatível com sua oferta (Tecnologia/SaaS)."}
                                    </div>
                                </div>

                                {/* Suggested Message */}
                                <div className="drawer-section">
                                    <h4>Icebreaker Gerado</h4>
                                    <div className="message-box">
                                        <button className="copy-icon-btn" title="Copiar" onClick={() => handleCopy(selectedLead.suggested_message)}>
                                            <Copy size={16} />
                                        </button>
                                        <div className="message-text">
                                            {selectedLead.suggested_message || `Oi ${selectedLead.nome ? selectedLead.nome.split(' ')[0] : ''}, vi que você comentou sobre Reforma Tributária. Também tenho acompanhado as mudanças...\n\nComo está sendo a adaptação aí na ${selectedLead.company}?`}
                                        </div>
                                    </div>

                                    {/* Strategy Button or Tabs */}
                                    {!selectedLead.icebreaker_options ? (
                                        <button
                                            className="strategy-btn"
                                            onClick={handleGenerateStrategy}
                                            disabled={strategyLoading}
                                        >
                                            {strategyLoading ? <Loader2 className="spinner" size={16} /> : <Sparkles size={16} />}
                                            {strategyLoading ? 'Gerando estratégias...' : '✨ Gerar Estratégia Avançada (3 Variações)'}
                                        </button>
                                    ) : (
                                        <div style={{ animation: 'fadeIn 0.5s ease' }}>
                                            <div className="strategy-tabs">
                                                {['Descontraída', 'Moderada', 'Intencional'].map((type) => (
                                                    <button
                                                        key={type}
                                                        className={`tab-item ${selectedLead.activeStrategy === type ? 'active' : ''}`}
                                                        onClick={() => {
                                                            const key = type === 'Descontraída' ? 'funny' : type === 'Moderada' ? 'moderate' : 'intentional'
                                                            const newMsg = selectedLead.icebreaker_options[key]
                                                            setSelectedLead({
                                                                ...selectedLead,
                                                                activeStrategy: type,
                                                                suggested_message: newMsg
                                                            })
                                                        }}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Interaction History Timeline */}
                                <div className="drawer-section">
                                    <h4><MessageCircle size={14} style={{ display: 'inline', marginRight: 4 }} /> Histórico de Interações</h4>
                                    <div className="timeline-container" style={{ marginTop: '1rem', position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid #e2e8f0' }}>
                                        {interactionsLoading ? (
                                            <div style={{ padding: '1rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Loader2 size={16} className="spinner" /> Carregando histórico...
                                            </div>
                                        ) : interactions.length === 0 ? (
                                            <div style={{ padding: '1rem 0', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>
                                                Nenhuma interação recente.
                                            </div>
                                        ) : (
                                            interactions.map(interaction => (
                                                <div key={interaction.id} className="timeline-node" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                                    {/* Dot */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: '-1.35rem',
                                                        top: '0.25rem',
                                                        width: '10px',
                                                        height: '10px',
                                                        borderRadius: '50%',
                                                        background: interaction.direction === 'inbound' ? '#22c55e' : '#3b82f6',
                                                        border: '2px solid white',
                                                        boxShadow: '0 0 0 1px #cbd5e1'
                                                    }} />

                                                    {/* Date */}
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span>{new Date(interaction.interaction_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            background: interaction.direction === 'inbound' ? '#dcfce7' : '#dbeafe',
                                                            color: interaction.direction === 'inbound' ? '#166534' : '#1e40af',
                                                            fontWeight: 'bold',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {interaction.direction === 'inbound' ? 'Resposta' : 'Enviada'}
                                                        </span>
                                                    </div>

                                                    {/* Content Bubble */}
                                                    <div style={{
                                                        background: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px',
                                                        padding: '0.75rem',
                                                        fontSize: '0.9rem',
                                                        color: '#334155',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        {interaction.content}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                            </div>

                            <div className="drawer-footer">
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                                    <button
                                        className="primary-btn"
                                        onClick={handleAutoSend}
                                        disabled={sendingMessage}
                                        style={{ background: sendingMessage ? '#93c5fd' : '#0a66c2' }} // LinkedIn Blue
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                            {sendingMessage ? <Loader2 size={18} className="spinner" /> : <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" alt="In" style={{ width: 16, height: 16, filter: 'brightness(0) invert(1)' }} />}
                                            {sendingMessage ? 'Enviando mensagem...' : 'Enviar no LinkedIn Automaticamente'}
                                        </div>
                                    </button>
                                    <button
                                        className="secondary-btn"
                                        onClick={() => {
                                            handleCopy(selectedLead.suggested_message || '')
                                            handleStatusChange(selectedLead.id, 'contacted')
                                            setSelectedLead(null)
                                        }}
                                        disabled={sendingMessage}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                            <Copy size={18} /> Copiar
                                        </div>
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button className="secondary-btn" title="Agendar Follow-up">
                                        <Calendar size={18} style={{ display: 'block', margin: '0 auto' }} />
                                    </button>
                                    <button
                                        className="secondary-btn"
                                        style={{ color: '#ef4444', borderColor: '#fecaca' }}
                                        onClick={() => {
                                            handleStatusChange(selectedLead.id, 'disqualified')
                                            setSelectedLead(null)
                                        }}
                                    >
                                        Descartar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Toast Notification */}
            {
                notification && (
                    <div style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        background: notification.type === 'success' ? '#22c55e' : (notification.type === 'info' ? '#3b82f6' : '#ef4444'),
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        zIndex: 9999,
                        animation: 'slideIn 0.3s ease'
                    }}>
                        {notification.type === 'error' ? <X size={20} /> : <Check size={20} />}
                        <span style={{ fontWeight: 600 }}>{notification.message}</span>
                    </div>
                )
            }
        </div >
    )
}
// Add simple spinner animation style if not global
const style = document.createElement('style');
style.textContent = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .spinner { animation: spin 1s linear infinite; }
  @keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;
document.head.appendChild(style);

const ScoreBadge = ({ score, reason }) => {
    if (!score) return <span style={{ color: '#cbd5e1' }}>N/A</span>

    let className = 'badge-score'
    if (score === 'A') className += ' score-a'
    else if (score === 'B') className += ' score-b'
    else className += ' score-c'

    const label = score === 'A' ? 'Alta Prioridade' : score === 'B' ? 'Média' : 'Baixa'

    return (
        <span className={className} title={reason || 'Sem motivo identificado'}>
            {score === 'A' ? '🔥' : score === 'B' ? '⚠️' : '❄️'} {label}
        </span>
    )
}

export default SalesHubPage
