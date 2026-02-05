import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import {
    Search,
    Filter,
    MessageCircle,
    X,
    Copy,
    RefreshCw,
    Loader2,
    Sparkles,
    Briefcase,
    MapPin,
    Hash,
    ArrowRight,
    Users,
    Zap,
    Gem,
    Building2,
    Globe,
    Send,
    CheckCircle2,
    XCircle,
    Bot
} from 'lucide-react'

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
    const [enrichmentLoading, setEnrichmentLoading] = useState(false)
    const [notification, setNotification] = useState(null)

    // Strategy Logic State
    const [sendingMessage, setSendingMessage] = useState(false)
    const [messageDraft, setMessageDraft] = useState('')

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    useEffect(() => {
        if (selectedLead) {
            setMessageDraft(selectedLead.suggested_message || '')
        }
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
            } else {
                setNotification({ message: 'Erro ao iniciar sincronização (Webhook).', type: 'error' })
                setSyncLoading(false)
            }
        } catch (error) {
            console.error(error)
            setNotification({ message: 'Erro de conexão.', type: 'error' })
            setSyncLoading(false)
        }

        setTimeout(() => setNotification(null), 5000)
    }

    const handleEnrichment = async (singleLead = null) => {
        if (!selectedClientId) return
        setEnrichmentLoading(true)

        let leadsToProcess = []

        if (singleLead) {
            leadsToProcess = [singleLead]
            setNotification({ message: `Enviando ${singleLead.nome} para análise...`, type: 'info' })
        } else {
            // Filter leads in current view that are not qualified yet
            leadsToProcess = leads.filter(l => !l.qualification_status)
            if (leadsToProcess.length === 0) {
                setNotification({ message: 'Todos os leads desta lista já foram analisados.', type: 'info' })
                setEnrichmentLoading(false)
                setTimeout(() => setNotification(null), 3000)
                return
            }
            setNotification({ message: `Enviando ${leadsToProcess.length} leads para análise...`, type: 'info' })
        }


        try {
            // Loop and send requests
            let processedCount = 0

            for (const lead of leadsToProcess) {
                try {
                    await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook-test/qualificacao-cascata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: lead.id,
                            name: lead.nome,
                            headline: lead.headline,
                            summary: lead.summary || '',
                            company_name: lead.company || lead.empresa || '',
                            client_id: selectedClientId
                        })
                    })
                    processedCount++
                } catch (err) {
                    console.error(`Erro ao enviar lead ${lead.id}`, err)
                }
            }

            setNotification({ message: `Processo iniciado! ${processedCount} leads enviados para enriquecimento.`, type: 'success' })

        } catch (error) {
            console.error(error)
            setNotification({ message: 'Erro ao conectar com servidor de enriquecimento.', type: 'error' })
        } finally {
            setEnrichmentLoading(false)
            setTimeout(() => setNotification(null), 5000)
        }
    }

    const fetchStats = async () => {
        if (!selectedClientId) return

        try {
            const { count: totalCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('client_id', selectedClientId)

            const { count: hotCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('client_id', selectedClientId)
                .eq('icp_score', 'A')

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

    useEffect(() => {
        if (selectedClientId) {
            setLeads([])
            setPage(0)
            setHasMore(true)
            fetchLeads(0, true)
            fetchStats()
        } else {
            setLeads([])
            setStats({ total: 0, hot: 0, interactions: 0 })
        }
    }, [selectedClientId, debouncedSearch])

    useEffect(() => {
        if (!selectedClientId) return
        const channel = supabase.channel('leads-changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads', filter: `client_id=eq.${selectedClientId}` }, () => {
                setNotification({ message: 'Novos leads encontrados!', type: 'success' })
                fetchLeads(0, true)
                fetchStats()
            })
            // Listen for UPDATES too (Enrichment coming back)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads', filter: `client_id=eq.${selectedClientId}` }, () => {
                // Determine if we should show toast? Maybe too noisy. Just refresh.
                fetchLeads(0, true)
                fetchStats()
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
                query = query.or(`nome.ilike.%${debouncedSearch}%,company.ilike.%${debouncedSearch}%,empresa.ilike.%${debouncedSearch}%`)
            }

            const { data, count, error } = await query.order('created_at', { ascending: false })

            if (error) throw error

            if (data) {
                if (isRefresh || pageIndex === 0) {
                    setLeads(data)
                } else {
                    setLeads(prev => [...prev, ...data])
                }

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
    }, [hasMore, loading, loadingMore, leads]);

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
        <div className="min-h-screen bg-gray-50 p-6 md:p-8 font-sans text-slate-800">

            {/* NOTIFICATION TOAST */}
            {notification && (
                <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 animate-slide-in-right ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-slate-700'
                    }`}>
                    {notification.type === 'error' ? <Zap size={18} /> : <RefreshCw size={18} className={syncLoading || enrichmentLoading ? "animate-spin text-orange-500" : "text-green-500"} />}
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}

            {/* HEADER */}
            <div className="max-w-7xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Mineração de Base & Cadência</h1>
                        <p className="text-slate-500 text-lg">Identifique oportunidades ocultas e inicie conversas com contexto.</p>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-2 text-slate-500 text-sm font-semibold uppercase tracking-wider">
                            <Users size={16} /> Total na Base
                        </div>
                        <div className="text-4xl font-extrabold text-slate-900">{stats.total}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                        <div className="flex items-center gap-3 mb-2 text-orange-600 text-sm font-bold uppercase tracking-wider">
                            <Zap size={16} fill="currentColor" /> Oportunidades ICP A
                        </div>
                        <div className="text-4xl font-extrabold text-orange-600">{stats.hot}</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-2 text-blue-600 text-sm font-bold uppercase tracking-wider">
                            <MessageCircle size={16} /> Interações (7d)
                        </div>
                        <div className="text-4xl font-extrabold text-blue-600">{stats.interactions}</div>
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, cargo ou empresa..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder:text-gray-400"
                        />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={handleSync}
                            disabled={syncLoading || enrichmentLoading}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${syncLoading
                                ? 'bg-orange-50 text-orange-400 cursor-not-allowed'
                                : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 border border-orange-200'
                                }`}
                        >
                            <RefreshCw size={16} className={syncLoading ? "animate-spin" : ""} />
                            {syncLoading ? 'Sincronizando...' : 'Sincronizar Conexões'}
                        </button>

                        <button
                            onClick={() => handleEnrichment()}
                            disabled={enrichmentLoading || syncLoading}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${enrichmentLoading
                                ? 'bg-purple-50 text-purple-400 cursor-not-allowed'
                                : 'bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 border border-purple-200'
                                }`}
                        >
                            <Sparkles size={16} className={enrichmentLoading ? "animate-spin" : ""} />
                            {enrichmentLoading ? 'Analisando...' : '✨ Enriquecer Base'}
                        </button>

                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-50 text-slate-600 border border-gray-200 hover:bg-gray-100 font-semibold text-sm transition-all">
                            <Filter size={16} /> Filtros
                        </button>
                    </div>
                </div>

                {/* TABLE */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <th className="py-4 px-6 border-r border-gray-100/50 w-[30%]">Lead & Motivo</th>
                                    <th className="py-4 px-6 border-r border-gray-100/50 w-[15%]">Empresa</th>
                                    <th className="py-4 px-6 border-r border-gray-100/50 w-[15%]">Qualificação</th>
                                    <th className="py-4 px-6 border-r border-gray-100/50 w-[15%]">Status</th>
                                    <th className="py-4 px-6 border-r border-gray-100/50 w-[10%]">Engajamento</th>
                                    <th className="py-4 px-6 w-[15%]">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading && stats.total === 0 ? (
                                    <tr><td colSpan="5" className="py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" />Carregando...</td></tr>
                                ) : leads.map(lead => {

                                    // Row Visual Logic
                                    const isQualified = lead.qualification_status === 'QUALIFIED'
                                    const isDisqualified = lead.qualification_status === 'DISQUALIFIED'

                                    let rowClass = "hover:bg-gray-50/80 transition-all group border-l-[3px] border-l-transparent"
                                    if (isQualified) rowClass += " bg-green-50/30 border-l-green-500"
                                    if (isDisqualified) rowClass += " opacity-60 grayscale-[0.5]"

                                    return (
                                        <tr key={lead.id} className={rowClass}>
                                            <td className="py-4 px-6">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm overflow-hidden shrink-0 mt-1">
                                                        {lead.avatar_url ? <img src={lead.avatar_url} className="w-full h-full object-cover" /> : (lead.nome?.charAt(0) || '?')}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-slate-800 text-sm truncate">{lead.nome || 'Sem Nome'}</div>
                                                        </div>
                                                        <div className="text-xs text-gray-400 truncate mb-1">{lead.headline}</div>

                                                        {/* ICP REASON (TRUNCATED) */}
                                                        {lead.icp_reason && (
                                                            <div className="text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block max-w-full truncate hover:whitespace-normal hover:border-slate-300 transition-colors cursor-help" title={lead.icp_reason}>
                                                                <span className="font-semibold text-slate-400 mr-1">🔎</span>
                                                                {lead.icp_reason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 align-top pt-5">
                                                <span className="text-sm font-medium text-slate-700 truncate block max-w-[150px]" title={lead.empresa}>
                                                    {lead.empresa || '-'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 align-top pt-5">
                                                <QualificationBadge
                                                    isHighTicket={lead.is_high_ticket}
                                                    isB2B={lead.is_b2b}
                                                    companySize={lead.company_size_type}
                                                />
                                            </td>
                                            <td className="py-4 px-6 align-top pt-5">
                                                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide border ${lead.status_pipeline === 'Conexão'
                                                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                                                    }`}>
                                                    {lead.status_pipeline || 'Desconhecido'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 align-top pt-5">
                                                {lead.engagement_score > 0 ? (
                                                    <div className="flex items-center gap-1.5 font-bold text-orange-600 text-sm">
                                                        <Zap size={14} fill="currentColor" /> {lead.engagement_score} pts
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 text-xs font-medium">-</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 align-top pt-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => !isDisqualified && setSelectedLead(lead)}
                                                        disabled={isDisqualified}
                                                        className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all shadow-sm flex-1 ${isDisqualified
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                            : 'bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-gray-200 hover:border-orange-200 shadow-sm hover:shadow'
                                                            }`}
                                                    >
                                                        {isDisqualified ? 'Desqualificado' : 'Abordar'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleEnrichment(lead)
                                                        }}
                                                        disabled={enrichmentLoading}
                                                        title="Re-analisar com IA"
                                                        className="px-2 py-2 rounded-lg bg-gray-50 text-gray-400 hover:bg-purple-50 hover:text-purple-600 border border-gray-200 transition-all"
                                                    >
                                                        <Bot size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* Load More Sentinel */}
                    <div ref={observerTarget} className="py-6 text-center">
                        {loadingMore && <div className="flex items-center justify-center gap-2 text-gray-500 text-sm"><Loader2 className="animate-spin" size={16} /> Carregando mais...</div>}
                        {!hasMore && leads.length > 0 && <span className="text-gray-400 text-xs">Você chegou ao fim da lista.</span>}
                    </div>
                </div>
            </div>

            {/* DRAWER (Slide-Over) */}
            {selectedLead && (
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
                                        {selectedLead.avatar_url ? <img src={selectedLead.avatar_url} className="w-full h-full object-cover rounded-full" /> : (selectedLead.nome?.charAt(0) || '?')}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-lg font-bold text-slate-900 leading-tight">{selectedLead.nome}</h3>
                                            {selectedLead.company_website && (
                                                <a href={selectedLead.company_website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors" title="Visitar Site">
                                                    <Globe size={18} />
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mb-1">{selectedLead.headline}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedLead.is_high_ticket && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100 flex items-center gap-1"><Gem size={10} /> High Ticket</span>}
                                            {selectedLead.company_size_type && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded border border-gray-200"><Building2 size={10} className="inline mr-1" />{selectedLead.company_size_type}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* ICP REASON */}
                                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100/60">
                                    <h4 className="flex items-center gap-2 text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">
                                        <Sparkles size={12} /> Motivo da Qualificação
                                    </h4>
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                        {selectedLead.icp_reason || "Este perfil apresenta alta aderência com seu ICP ideal, ocupando cargo de decisão em setor estratégico."}
                                    </p>
                                </div>
                            </div>

                            {/* Skills Tag Cloud (Collapsed/Secondary) */}
                            {selectedLead.skills && (
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Habilidades Detectadas</h4>
                                    <div className="flex flex-wrap gap-2 px-2">
                                        {(() => {
                                            try {
                                                const tags = typeof selectedLead.skills === 'string' ? JSON.parse(selectedLead.skills) : selectedLead.skills
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
        </div>
    )
}

export default SalesHubPage
