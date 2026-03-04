import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import PipelineLeadCard from './PipelineLeadCard'
import { DollarSign } from 'lucide-react'

const ACCENTS = {
    Frio: { dot: '#94a3b8', iconBg: '#f1f5f9', iconColor: '#64748b' },
    Engajado: { dot: '#3b82f6', iconBg: '#eff6ff', iconColor: '#3b82f6' },
    Qualificado: { dot: '#f59e0b', iconBg: '#fffbeb', iconColor: '#f59e0b' },
    Agendado: { dot: '#8b5cf6', iconBg: '#f5f3ff', iconColor: '#8b5cf6' },
    Proposta: { dot: '#ff4d00', iconBg: '#fff3ee', iconColor: '#ff4d00' },
    Ganho: { dot: '#10b981', iconBg: '#ecfdf5', iconColor: '#10b981' },
    Perdido: { dot: '#ef4444', iconBg: '#fff1f2', iconColor: '#ef4444' },
}

const PipelineColumn = ({ id, title, icon: Icon, leads, onCardClick }) => { // eslint-disable-line no-unused-vars
    const { setNodeRef, isOver } = useDroppable({ id })
    const accent = ACCENTS[id] || ACCENTS.Frio
    const totalProposal = leads.reduce((sum, l) => sum + (parseFloat(l.proposal_value) || 0), 0)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '280px', minWidth: '280px', flexShrink: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#fff', borderRadius: '8px 8px 0 0', border: '1px solid #e5e7eb', borderBottom: 'none', borderLeft: `3px solid ${accent.dot}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '6px', background: accent.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={13} style={{ color: accent.iconColor }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{title}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '999px', background: '#f3f4f6', color: '#6b7280' }}>{leads.length}</span>
                </div>
                {totalProposal > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
                        <DollarSign size={10} /> {totalProposal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </span>
                )}
            </div>

            {/* Drop zone */}
            <div
                ref={setNodeRef}
                style={{
                    flex: 1, overflowY: 'auto', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px',
                    borderRadius: '0 0 8px 8px', border: '1px solid #e5e7eb', borderTop: 'none',
                    borderLeft: isOver ? `3px solid ${accent.dot}` : '1px solid #e5e7eb',
                    background: isOver ? accent.iconBg : '#f9fafb',
                    minHeight: '120px', maxHeight: 'calc(100vh - 320px)',
                    transition: 'all 0.15s', scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent',
                }}
            >
                <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    {leads.map(lead => <PipelineLeadCard key={lead.id} lead={lead} onClick={onCardClick} />)}
                </SortableContext>
                {leads.length === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px', fontSize: '12px', color: '#d1d5db' }}>Arraste leads aqui</div>
                )}
            </div>
        </div>
    )
}

export default PipelineColumn
