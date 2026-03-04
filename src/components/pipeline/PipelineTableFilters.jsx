import React from 'react'
import { Filter, X, Search } from 'lucide-react'

const btn = (active) => ({
    padding: '5px 11px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, lineHeight: 1,
    border: active ? '1.5px solid #ff4d00' : '1px solid #d1d5db',
    background: active ? '#fff3ee' : '#fff', color: active ? '#ff4d00' : '#6b7280', cursor: 'pointer',
})
const label = { fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }
const sep = () => ({ width: '1px', height: '22px', background: '#e5e7eb', flexShrink: 0 })
const inp = { width: '56px', padding: '5px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#111827', outline: 'none' }

const PipelineTableFilters = ({ filters, setFilters }) => {
    const toggle = (key, val) => setFilters(p => {
        const arr = p[key] || []
        return { ...p, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })

    const hasActive = !!filters.search || filters.icp?.length > 0 || filters.cadence?.length > 0 || filters.engagement !== 'all' || filters.minInteractions > 0 || filters.maxInteractions < 9999 || filters.hasProposal !== 'all'
    const clear = () => setFilters({ search: '', icp: [], cadence: [], engagement: 'all', minInteractions: 0, maxInteractions: 9999, hasProposal: 'all' })

    return (
        <div className="flex flex-wrap items-center gap-3" style={{ padding: '10px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 10px', minWidth: '180px' }}>
                <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={filters.search || ''}
                    onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#111827', width: '100%', fontFamily: 'inherit' }}
                />
            </div>
            <div style={sep()} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af' }}><Filter size={13} /><span style={label}>Filtros</span></div>
            <div style={sep()} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={label}>ICP:</span>
                {['A', 'B', 'C'].map(v => <button key={v} onClick={() => toggle('icp', v)} style={btn(filters.icp?.includes(v))}>{v}</button>)}
            </div>
            <div style={sep()} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={label}>Cadência:</span>
                {['G1', 'G2', 'G3', 'G4', 'G5'].map(v => <button key={v} onClick={() => toggle('cadence', v)} style={btn(filters.cadence?.includes(v))}>{v}</button>)}
            </div>
            <div style={sep()} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={label}>Engajamento:</span>
                {[{ v: 'all', l: 'Todos' }, { v: 'engaged', l: 'Respondeu' }, { v: 'ignored', l: 'Ignorou' }].map(o => <button key={o.v} onClick={() => setFilters(p => ({ ...p, engagement: o.v }))} style={btn(filters.engagement === o.v)}>{o.l}</button>)}
            </div>
            <div style={sep()} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={label}>Proposta:</span>
                {[{ v: 'all', l: 'Todas' }, { v: 'with', l: 'Com' }, { v: 'without', l: 'Sem' }].map(o => <button key={o.v} onClick={() => setFilters(p => ({ ...p, hasProposal: o.v }))} style={btn(filters.hasProposal === o.v)}>{o.l}</button>)}
            </div>
            <div style={sep()} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={label}>Interações:</span>
                <input type="number" min="0" placeholder="Min" value={filters.minInteractions === 0 ? '' : filters.minInteractions} onChange={e => setFilters(p => ({ ...p, minInteractions: parseInt(e.target.value) || 0 }))} style={inp} />
                <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>
                <input type="number" min="0" placeholder="Max" value={filters.maxInteractions >= 9999 ? '' : filters.maxInteractions} onChange={e => setFilters(p => ({ ...p, maxInteractions: parseInt(e.target.value) || 9999 }))} style={inp} />
            </div>
            {hasActive && (<><div style={sep()} /><button onClick={clear} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 11px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#fff1f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer' }}><X size={12} /> Limpar</button></>)}
        </div>
    )
}

export default PipelineTableFilters
