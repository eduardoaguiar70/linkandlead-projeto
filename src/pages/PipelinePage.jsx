import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import { Kanban, Table2, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import PipelineTable from '../components/pipeline/PipelineTable'
import PipelineTableFilters from '../components/pipeline/PipelineTableFilters'
import PipelineKanbanBoard from '../components/pipeline/PipelineKanbanBoard'
import PipelineKanbanFilters from '../components/pipeline/PipelineKanbanFilters'
import UnifiedLeadModal from '../components/UnifiedLeadModal'

const DEFAULT_TABLE_FILTERS = { search: '', icp: [], cadence: [], engagement: 'all', minInteractions: 0, maxInteractions: 9999, hasProposal: 'all' }
const DEFAULT_KANBAN_FILTERS = { search: '', tier: null, hasProposal: false }

const toggleBtnStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    border: 'none',
    background: active ? '#ff4d00' : '#fff',
    color: active ? '#fff' : '#6b7280',
    boxShadow: active ? '0 1px 4px rgba(255,77,0,0.3)' : 'none',
    transition: 'all 0.15s',
})

const PipelinePage = () => {
    const { selectedClientId } = useClientSelection()
    const [viewMode, setViewMode] = useState('table')
    const [allLeads, setAllLeads] = useState([])
    const [funnelLeads, setFunnelLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [tableFilters, setTableFilters] = useState(DEFAULT_TABLE_FILTERS)
    const [kanbanFilters, setKanbanFilters] = useState(DEFAULT_KANBAN_FILTERS)
    const [selectedLead, setSelectedLead] = useState(null)

    // Fetch ALL leads for Table — paginated loop to bypass Supabase 1000-row limit
    const fetchAllLeads = useCallback(async () => {
        if (!selectedClientId) return
        setLoading(true)
        const BATCH = 1000
        const SELECT = 'id, nome, empresa, headline, avatar_url, linkedin_profile_url, icp_score, icp_reason, cadence_stage, stage_reasoning, crm_stage, has_engaged, tier, proposal_value, is_blacklisted, total_interactions_count, last_interaction_date, client_id, call_status, call_scheduled_at'
        let all = []
        let from = 0
        try {
            while (true) {
                const { data, error } = await supabase
                    .from('leads')
                    .select(SELECT)
                    .eq('client_id', selectedClientId)
                    .neq('is_blacklisted', true)
                    .order('last_interaction_date', { ascending: false, nullsFirst: false })
                    .range(from, from + BATCH - 1)
                if (error) throw error
                if (!data || data.length === 0) break
                all = all.concat(data)
                if (data.length < BATCH) break   // last page reached
                from += BATCH
            }
            setAllLeads(all)
        } catch (err) {
            console.error('[Pipeline] Error fetching all leads:', err)
        } finally {
            setLoading(false)
        }
    }, [selectedClientId])

    const fetchFunnelLeads = useCallback(async () => {
        if (!selectedClientId) return
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('id, nome, empresa, headline, avatar_url, linkedin_profile_url, icp_score, icp_reason, cadence_stage, stage_reasoning, crm_stage, has_engaged, tier, proposal_value, is_blacklisted, total_interactions_count, last_interaction_date, last_task_completed_at, client_id, call_status, call_scheduled_at')
                .eq('client_id', selectedClientId)
                .neq('is_blacklisted', true)
                .not('crm_stage', 'is', null)
                .neq('crm_stage', '')
                .order('last_interaction_date', { ascending: false, nullsFirst: false })
            if (error) throw error
            setFunnelLeads(data || [])
        } catch (err) {
            console.error('[Pipeline] Error fetching funnel leads:', err)
        }
    }, [selectedClientId])

    useEffect(() => {
        fetchAllLeads()
        fetchFunnelLeads()
    }, [fetchAllLeads, fetchFunnelLeads])

    // Batch move to funnel
    const handleMoveToFunnel = async (ids) => {
        try {
            await supabase.from('leads').update({ crm_stage: 'Frio' }).in('id', ids)
            fetchAllLeads()
            fetchFunnelLeads()
            toast.success(`${ids.length} leads movidos para o Funil!`)
        } catch (err) {
            console.error('[Pipeline] Error moving to funnel:', err)
            toast.error('Erro ao mover para o funil.')
        }
    }

    // Batch create tasks
    const handleCreateTasks = async (ids) => {
        try {
            const tasksToInsert = ids.map(id => ({
                client_id: selectedClientId,
                lead_id: id,
                status: 'PENDING',
                instruction: 'Tarefa manual solicitada via Pipeline'
            }))
            const { error } = await supabase.from('tasks').insert(tasksToInsert)
            if (error) throw error
            toast.success(`${ids.length} tasks criadas com sucesso!`)
        } catch (err) {
            console.error('[Pipeline] Error creating tasks:', err)
            toast.error('Erro ao criar tasks.')
        }
    }

    // Modal update
    const handleLeadUpdated = (updatedLead) => {
        setAllLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
        setFunnelLeads(prev => {
            const exists = prev.find(l => l.id === updatedLead.id)
            if (updatedLead.crm_stage && updatedLead.crm_stage !== '') {
                return exists ? prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l) : [...prev, updatedLead]
            } else {
                return prev.filter(l => l.id !== updatedLead.id)
            }
        })
        setSelectedLead(prev => prev?.id === updatedLead.id ? { ...prev, ...updatedLead } : prev)
    }

    // Apply table filters
    const filteredTableLeads = allLeads.filter(lead => {
        if (tableFilters.search && !lead.nome?.toLowerCase().includes(tableFilters.search.toLowerCase())) return false
        if (tableFilters.icp.length > 0 && !tableFilters.icp.includes(lead.icp_score)) return false
        if (tableFilters.cadence.length > 0 && !tableFilters.cadence.includes(lead.cadence_stage)) return false
        if (tableFilters.engagement === 'engaged' && !lead.has_engaged) return false
        if (tableFilters.engagement === 'ignored' && lead.has_engaged) return false
        const n = lead.total_interactions_count || 0
        if (n < tableFilters.minInteractions || n > tableFilters.maxInteractions) return false
        const pv = parseFloat(lead.proposal_value) || 0
        if (tableFilters.hasProposal === 'with' && pv <= 0) return false
        if (tableFilters.hasProposal === 'without' && pv > 0) return false
        return true
    })

    // Apply kanban filters
    const filteredKanbanLeads = funnelLeads.filter(lead => {
        if (kanbanFilters.search && !lead.nome?.toLowerCase().includes(kanbanFilters.search.toLowerCase())) return false
        if (kanbanFilters.tier && lead.tier !== kanbanFilters.tier) return false
        if (kanbanFilters.hasProposal && !(parseFloat(lead.proposal_value) > 0)) return false
        return true
    })

    if (!selectedClientId) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', background: '#f4f5f7', gap: '12px' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff3ee', border: '2px solid #ffd4c2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Kanban size={24} style={{ color: '#ff4d00' }} />
                </div>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Select a client to view the Pipeline.</p>
            </div>
        )
    }

    return (
        <div style={{ background: '#f4f5f7', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', padding: '20px', gap: '14px', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Kanban size={20} style={{ color: '#ff4d00' }} />
                    Sales Pipeline
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Toggle */}
                    <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '8px', padding: '3px', border: '1px solid #e5e7eb' }}>
                        <button onClick={() => setViewMode('table')} style={toggleBtnStyle(viewMode === 'table')}>
                            <Table2 size={15} /> Table
                        </button>
                        <button onClick={() => setViewMode('kanban')} style={toggleBtnStyle(viewMode === 'kanban')}>
                            <Kanban size={15} /> Kanban
                        </button>
                    </div>

                    {/* Count */}
                    <span style={{ fontSize: '12px', color: '#9ca3af', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '20px', padding: '4px 12px', fontWeight: 600 }}>
                        <Users size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                        {viewMode === 'table' ? `${filteredTableLeads.length} leads` : `${filteredKanbanLeads.length} in the funnel`}
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div style={{ flexShrink: 0 }}>
                {viewMode === 'table' ? (
                    <PipelineTableFilters filters={tableFilters} setFilters={setTableFilters} />
                ) : (
                    <PipelineKanbanFilters filters={kanbanFilters} setFilters={setKanbanFilters} />
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
                    <Loader2 size={28} className="animate-spin" style={{ color: '#ff4d00' }} />
                    <span style={{ fontSize: '14px', color: '#9ca3af' }}>Loading...</span>
                </div>
            ) : (
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {viewMode === 'table' ? (
                        <PipelineTable
                            leads={filteredTableLeads}
                            onOpenLead={setSelectedLead}
                            onMoveToFunnel={handleMoveToFunnel}
                            onCreateTasks={handleCreateTasks}
                        />
                    ) : (
                        <PipelineKanbanBoard
                            leads={filteredKanbanLeads}
                            setLeads={setFunnelLeads}
                            onCardClick={setSelectedLead}
                        />
                    )}
                </div>
            )}

            {/* Modal */}
            {selectedLead && (
                <UnifiedLeadModal
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onLeadUpdated={handleLeadUpdated}
                    showPipelineFields={true}
                />
            )}
        </div>
    )
}

export default PipelinePage
