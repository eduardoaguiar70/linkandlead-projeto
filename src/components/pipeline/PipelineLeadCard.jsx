import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Star, DollarSign, MessageSquare, AlertTriangle } from 'lucide-react'

const ICP_STYLES = {
    A: { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' },
    B: { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' },
    C: { background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb' },
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const isFollowupOverdue = (lead) => {
    if (!lead.last_task_completed_at || lead.has_engaged) return false
    return new Date(lead.last_task_completed_at).getTime() < Date.now() - SEVEN_DAYS_MS
}

const PipelineLeadCard = ({ lead, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
    }

    const proposalValue = parseFloat(lead.proposal_value) || 0
    const interactionCount = lead.total_interactions_count || 0
    const icpScore = lead.icp_score || 'C'
    const cadenceStage = lead.cadence_stage || ''
    const icp = ICP_STYLES[icpScore] || ICP_STYLES.C
    const tier = lead.tier || 0

    const followupOverdue = isFollowupOverdue(lead)

    const handleClick = () => {
        if (isDragging) return
        if (onClick) onClick(lead)
    }

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                background: '#fff',
                border: isDragging ? '1.5px solid #ff4d00' : '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '10px 12px',
                cursor: 'grab',
                boxShadow: isDragging ? '0 4px 16px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={e => { if (!isDragging) e.currentTarget.style.borderColor = '#d1d5db' }}
            onMouseLeave={e => { if (!isDragging) e.currentTarget.style.borderColor = '#e5e7eb' }}
            {...attributes}
            {...listeners}
            onClick={handleClick}
        >
            {/* Follow-up overdue badge — shown at top for immediate visibility */}
            {followupOverdue && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '7px', padding: '3px 7px', borderRadius: '5px', background: '#fff3ee', border: '1px solid #ffd4c2', width: 'fit-content' }}>
                    <AlertTriangle size={11} style={{ color: '#ff4d00', flexShrink: 0 }} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#ff4d00', letterSpacing: '0.02em' }}>Follow-up</span>
                </div>
            )}

            {/* Name + Empresa */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>
                    {lead.avatar_url ? <img src={lead.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : lead.nome?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.nome || 'Sem Nome'}</p>
                    {lead.empresa && <p style={{ fontSize: '11px', color: '#9ca3af', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.empresa}</p>}
                </div>
            </div>

            {/* Tags row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <span title={lead.icp_reason || ''} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', cursor: lead.icp_reason ? 'help' : 'default', ...icp }}>ICP {icpScore}</span>

                {cadenceStage && (
                    <span title={lead.stage_reasoning || ''} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', cursor: lead.stage_reasoning ? 'help' : 'default', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>{cadenceStage}</span>
                )}

                {tier > 0 && (
                    <span style={{ display: 'flex', gap: '1px' }}>
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={10} style={i <= tier ? { color: '#f59e0b', fill: '#f59e0b' } : { color: '#e5e7eb', fill: '#e5e7eb' }} />)}
                    </span>
                )}

                {proposalValue > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', fontWeight: 700, color: '#059669' }}>
                        <DollarSign size={10} /> {proposalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </span>
                )}

                {interactionCount > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', color: '#9ca3af' }}>
                        <MessageSquare size={9} /> {interactionCount}
                    </span>
                )}

                {lead.has_engaged && (
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: '#fff3ee', color: '#ff4d00', border: '1px solid #ffd4c2' }}>Resp.</span>
                )}
            </div>
        </div>
    )
}

export default PipelineLeadCard
