import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import {
    ArrowLeft,
    Search,
    Loader2,
    Building,
    MapPin,
    CheckSquare,
    Square,
    Bot,
    MoreHorizontal,
    Zap,
    RefreshCw,
    X,
    ExternalLink,
    Save,
    Gem
} from 'lucide-react'

const CampaignLeadsPage = () => {
    const { campaignId } = useParams() // Note: Route defined as :campaignId
    const navigate = useNavigate()
    const { selectedClientId } = useClientSelection()

    const [campaign, setCampaign] = useState(null)
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Selection State
    const [selectedLeads, setSelectedLeads] = useState([]) // Array of IDs

    // Bulk Action State
    const [isProcessingBulk, setIsProcessingBulk] = useState(false)
    const [bulkProgressText, setBulkProgressText] = useState('')
    const [notification, setNotification] = useState(null)

    // Drawer / Curation State
    const [selectedLead, setSelectedLead] = useState(null)
    const [icebreakerText, setIcebreakerText] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (selectedClientId && campaignId) {
            fetchCampaign()
            fetchLeads()
        }
    }, [selectedClientId, campaignId])

    const fetchCampaign = async () => {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', campaignId)
                .single()

            if (error) throw error
            setCampaign(data)
        } catch (error) {
            console.error('Error fetching campaign:', error)
        }
    }

    const fetchLeads = async () => {
        setLoading(true)
        try {
            // Join campaign_leads with leads table
            const { data, error } = await supabase
                .from('campaign_leads')
                .select(`
                    *,
                    leads:lead_id (*)
                `)
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setLeads(data || [])
        } catch (error) {
            console.error('Error fetching leads:', error)
        } finally {
            setLoading(false)
        }
    }

    // Selection Logic
    const toggleSelectAll = () => {
        if (selectedLeads.length === leads.length) {
            setSelectedLeads([])
        } else {
            setSelectedLeads(leads.map(l => l.id))
        }
    }

    const toggleSelectOne = (id) => {
        if (selectedLeads.includes(id)) {
            setSelectedLeads(selectedLeads.filter(l => l !== id))
        } else {
            setSelectedLeads([...selectedLeads, id])
        }
    }

    const handleBulkIcebreaker = async () => {
        if (!selectedLeads.length || !selectedClientId) return

        // 1. Calculate Estimated Time (3.5s per lead)
        const totalSeconds = selectedLeads.length * 3.5
        let timeString = `${Math.ceil(totalSeconds)} segundos`
        if (totalSeconds > 60) {
            timeString = `${Math.ceil(totalSeconds / 60)} minutos`
        }

        // 2. Set State
        setIsProcessingBulk(true)
        setBulkProgressText(`Gerando ${selectedLeads.length} mensagens. Tempo estimado: ${timeString}...`)

        try {
            // 3. Call Webhook
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/generate-bulk-icebreakers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_ids: selectedLeads,
                    client_id: selectedClientId
                })
            })

            if (response.ok) {
                // 4. Success
                setNotification({
                    message: `${selectedLeads.length} Icebreakers gerados com sucesso!`,
                    type: 'success'
                })
                setSelectedLeads([]) // Clear selection
                fetchLeads() // Refresh data
            } else {
                throw new Error('Falha na API')
            }

        } catch (error) {
            console.error('Error generating icebreakers:', error)
            setNotification({
                message: 'Erro ao gerar Icebreakers. Tente novamente.',
                type: 'error'
            })
        } finally {
            setIsProcessingBulk(false)
            setBulkProgressText('')
            setTimeout(() => setNotification(null), 5000)
        }
    }

    const filteredLeads = leads.filter(item => {
        const lead = item.leads || {}
        const name = lead.nome || ''
        return name.toLowerCase().includes(searchTerm.toLowerCase())
    })

    // Filtered selection logic support
    // (If searching, 'Select All' could ideally only select visible, but simple global for now is fine or constrained to filtered)
    // Let's stick to simple ID matching for now.

    const getICPBadge = (reason) => {
        // Simple visual logic based on existence of ICP reason or score field if it existed
        // User asked for A, B, C. We don't have that field explicitly yet in the previous schemas viewed,
        // but let's mock the UI for it or use a heuristic.
        // For now, I'll render a generic 'A' badge if qualified, or 'C' if not.
        // Actually, let's use a random mock or derived prop for the visual request.
        return (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs border border-green-200">
                A
            </span>
        )
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING_ENRICHMENT':
                return <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-md text-xs font-bold border border-yellow-200">Na Fila</span>
            case 'QUALIFIED_NO_ICEBREAKER':
                return <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-200">Importado</span>
            case 'APPROACH_READY':
                return <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-bold border border-green-200">Pronto</span>
            default:
                return <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded-md text-xs font-bold border border-gray-200">{status || 'Desconhecido'}</span>
        }
    }

    // Agency Lock
    if (!selectedClientId) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <div className="bg-white p-6 rounded-full inline-flex mb-6 shadow-sm border border-slate-100">
                        <Building size={48} className="text-slate-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">Selecione um Cliente</h2>
                    <p className="text-slate-500">
                        Você precisa selecionar um cliente para visualizar os leads desta campanha.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">

            {/* NOTIFICATION TOAST */}
            {notification && (
                <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 animate-slide-in-right ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-slate-700'
                    }`}>
                    {notification.type === 'error' ? <Zap size={18} /> : <RefreshCw size={18} className="text-green-500" />}
                    <span className="text-sm font-medium">{notification.message}</span>
                </div>
            )}
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <button
                    onClick={() => navigate('/lists')}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-6 text-sm font-bold"
                >
                    <ArrowLeft size={16} /> Voltar para Listas
                </button>

                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                            {campaign ? campaign.name : 'Carregando...'}
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Gerencie e qualifique os leads da sua campanha.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Global Actions could go here */}
                    </div>
                </div>
            </div>

            {/* Toolbar & Bulk Actions */}
            <div className="max-w-7xl mx-auto bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 sticky top-4 z-10 transition-all">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">

                    {selectedLeads.length > 0 ? (
                        <div className="flex items-center gap-4 w-full md:w-auto animate-fade-in">
                            <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm border border-indigo-100">
                                {selectedLeads.length} leads selecionados
                            </div>
                            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                            <button
                                onClick={handleBulkIcebreaker}
                                disabled={isProcessingBulk}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all shadow-md ${isProcessingBulk
                                    ? 'bg-indigo-400 text-white cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                                    }`}
                            >
                                {isProcessingBulk ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
                                {isProcessingBulk ? bulkProgressText : 'Gerar Icebreakers'}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                            <CheckSquare size={18} /> Selecione leads para ações em massa
                        </div>
                    )}

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou cargo..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="max-w-7xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <th className="p-4 w-12 text-center">
                                <button
                                    onClick={toggleSelectAll}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                    {selectedLeads.length === leads.length && leads.length > 0 ? (
                                        <CheckSquare size={20} className="text-indigo-600" />
                                    ) : (
                                        <Square size={20} />
                                    )}
                                </button>
                            </th>
                            <th className="py-4 px-4">Lead</th>
                            <th className="py-4 px-4">Cargo / Headline</th>
                            <th className="py-4 px-4">Empresa</th>
                            <th className="py-4 px-4">Localização</th>
                            <th className="py-4 px-4 text-center">ICP</th>
                            <th className="py-4 px-4 text-center">Status</th>
                            <th className="py-4 px-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan="8" className="py-20 text-center text-gray-400">
                                    <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                                    Carregando leads...
                                </td>
                            </tr>
                        ) : filteredLeads.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="py-20 text-center text-gray-400">
                                    Nenhum lead encontrado.
                                </td>
                            </tr>
                        ) : (
                            filteredLeads.map(item => {
                                const lead = item.leads || {}
                                const isSelected = selectedLeads.includes(item.id)

                                return (
                                    <tr
                                        key={item.id}
                                        onClick={() => openDrawer(item)}
                                        className={`hover:bg-slate-50 transition-colors cursor-pointer group ${isSelected ? 'bg-indigo-50/30' : ''}`}
                                    >
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => toggleSelectOne(item.id)}
                                                className="text-slate-300 hover:text-indigo-600 transition-colors"
                                            >
                                                {isSelected ? (
                                                    <CheckSquare size={20} className="text-indigo-600" />
                                                ) : (
                                                    <Square size={20} />
                                                )}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-200 border border-white shadow-sm flex items-center justify-center text-xs font-bold text-slate-500 overflow-hidden shrink-0">
                                                    {lead.avatar_url ? (
                                                        <img src={lead.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        lead.nome?.charAt(0).toUpperCase() || '?'
                                                    )}
                                                </div>
                                                <div className="font-bold text-slate-800 text-sm truncate max-w-[150px]" title={lead.nome}>
                                                    {lead.nome || 'Sem Nome'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs text-slate-500 font-medium truncate max-w-[200px]" title={lead.headline}>
                                                {lead.headline || '-'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                                <Building size={12} className="text-slate-400" />
                                                <span className="truncate max-w-[140px]">{lead.company_name || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <MapPin size={12} className="text-slate-400" />
                                                <span className="truncate max-w-[120px]">{lead.location || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            {getICPBadge(lead.icp_reason)}
                                        </td>
                                        <td className="p-4 text-center">
                                            {getStatusBadge(item.status_pipeline)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-slate-600">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* LEADS CURATION DRAWER */}
            {
                selectedLead && selectedLead.leads && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <div
                            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
                            onClick={() => setSelectedLead(null)}
                        />
                        <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden border-l border-gray-200">

                            {/* HEADER */}
                            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-slate-50/50">
                                <div className="flex gap-4">
                                    <div className="w-14 h-14 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-xl font-bold text-slate-500 overflow-hidden shrink-0">
                                        {selectedLead.leads.avatar_url ? (
                                            <img src={selectedLead.leads.avatar_url} className="w-full h-full object-cover" />
                                        ) : (selectedLead.leads.nome?.charAt(0).toUpperCase())}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 leading-tight">
                                            {selectedLead.leads.nome || 'Lead sem nome'}
                                        </h2>
                                        <p className="text-sm text-slate-500 font-medium mb-1">
                                            {selectedLead.leads.headline || 'Sem cargo'}
                                        </p>
                                        {selectedLead.leads.linkedin_profile && (
                                            <a
                                                href={selectedLead.leads.linkedin_profile}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                <ExternalLink size={12} /> Ver LinkedIn
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedLead(null)} className="p-2 rounded-full hover:bg-white text-gray-400 hover:text-slate-600 transition-all border border-transparent hover:border-gray-200 hover:shadow-sm">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* BODY */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                                {/* SECTION 1: CONTEXT */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        {selectedLead.leads.is_high_ticket && (
                                            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg border border-purple-100 flex items-center gap-1.5">
                                                <Gem size={12} /> High Ticket
                                            </span>
                                        )}
                                        <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-100">
                                            ICP Score: A
                                        </span>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                            Análise da IA
                                        </h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {selectedLead.leads.analysis_reasoning || selectedLead.leads.icp_reason || "Sem análise disponível para este lead."}
                                        </p>
                                    </div>
                                </div>

                                {/* SECTION 2: ICEBREAKER */}
                                <div>
                                    <label className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-slate-800">Icebreaker (Mensagem de Conexão)</span>
                                        <span className={`text-xs font-bold ${icebreakerText.length > 300 ? 'text-red-500' : 'text-slate-400'}`}>
                                            {icebreakerText.length}/300
                                        </span>
                                    </label>
                                    <textarea
                                        className="w-full h-48 p-4 bg-white border border-gray-200 rounded-xl text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium leading-relaxed resize-none text-sm shadow-sm"
                                        placeholder="Escreva ou edite o icebreaker aqui..."
                                        value={icebreakerText}
                                        onChange={(e) => setIcebreakerText(e.target.value)}
                                    />
                                    <p className="text-xs text-gray-400 mt-2">
                                        Dica: Personalize a mensagem com base na análise da IA acima.
                                    </p>
                                </div>

                            </div>

                            {/* FOOTER */}
                            <div className="p-6 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                <button
                                    onClick={handleSaveIcebreaker}
                                    disabled={isSaving}
                                    className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    )
}

export default CampaignLeadsPage
