import React from 'react'
import { Search, Star, DollarSign } from 'lucide-react'

const btn = (active) => ({
    padding: '5px 11px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, lineHeight: 1,
    border: active ? '1.5px solid #ff4d00' : '1px solid #d1d5db',
    background: active ? '#fff3ee' : '#fff', color: active ? '#ff4d00' : '#6b7280', cursor: 'pointer',
})

const PipelineKanbanFilters = ({ filters, setFilters }) => {
    return (
        <div className="flex flex-wrap items-center gap-3" style={{ padding: '10px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 10px', minWidth: '200px' }}>
                <Search size={14} style={{ color: '#9ca3af' }} />
                <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={filters.search || ''}
                    onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#111827', width: '100%', padding: '2px 0', fontFamily: 'inherit' }}
                />
            </div>

            <div style={{ width: '1px', height: '22px', background: '#e5e7eb', flexShrink: 0 }} />

            {/* Tier filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Star size={13} style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Tier:</span>
                {[1, 2, 3, 4, 5].map(t => (
                    <button
                        key={t}
                        onClick={() => setFilters(p => ({ ...p, tier: p.tier === t ? null : t }))}
                        style={btn(filters.tier === t)}
                    >
                        {t}★
                    </button>
                ))}
            </div>

            <div style={{ width: '1px', height: '22px', background: '#e5e7eb', flexShrink: 0 }} />

            {/* Proposal toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={13} style={{ color: '#10b981' }} />
                <button
                    onClick={() => setFilters(p => ({ ...p, hasProposal: !p.hasProposal }))}
                    style={btn(filters.hasProposal)}
                >
                    Com proposta
                </button>
            </div>
        </div>
    )
}

export default PipelineKanbanFilters
