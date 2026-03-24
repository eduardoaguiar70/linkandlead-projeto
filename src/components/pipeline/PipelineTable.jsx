import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, ArrowRightToLine, CheckSquare, Square, MinusSquare } from 'lucide-react'

const PAGE_SIZE = 50

const TH = { fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', background: '#f9fafb', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', position: 'sticky', top: 0, zIndex: 2 }
const TD = { fontSize: '13px', color: '#111827', padding: '10px 12px', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }
const ICP_BG = { A: '#ecfdf5', B: '#fffbeb', C: '#f3f4f6' }
const ICP_COLOR = { A: '#059669', B: '#d97706', C: '#6b7280' }

// Custom sort value mappers — return a numeric rank so sort is meaningful
const ICP_RANK = { A: 0, B: 1, C: 2 }          // asc → A first (best first)
const CAD_RANK = { G1: 1, G2: 2, G3: 3, G4: 4, G5: 5 } // desc → G5 first (most advanced first)

const getSortValue = (lead, field) => {
    if (field === 'icp_score') return ICP_RANK[lead.icp_score] ?? 99
    if (field === 'cadence_stage') return CAD_RANK[lead.cadence_stage] ?? 0
    if (field === 'total_interactions_count') return lead.total_interactions_count ?? 0
    const v = lead[field]
    if (v == null) return ''
    if (typeof v === 'string') return v.toLowerCase()
    return v
}

const SortIcon = ({ field, sortField, sortDir }) => {
    if (sortField !== field) return <ChevronsUpDown size={12} style={{ color: '#d1d5db' }} />
    return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: '#ff4d00' }} /> : <ChevronDown size={12} style={{ color: '#ff4d00' }} />
}

const PipelineTable = ({ leads, onOpenLead, onMoveToFunnel, onCreateTasks }) => {
    const [selected, setSelected] = useState(new Set())
    const [sortField, setSortField] = useState('nome')
    const [sortDir, setSortDir] = useState('asc')
    const [page, setPage] = useState(0)

    // Columns — defaultDir controls direction on FIRST click
    const columns = [
        { key: 'nome', label: 'Name', w: '180px', defaultDir: 'asc' },
        { key: 'empresa', label: 'Company', w: '150px', defaultDir: 'asc' },
        { key: 'icp_score', label: 'ICP', w: '60px', defaultDir: 'asc' }, // A first
        { key: 'cadence_stage', label: 'Cadence', w: '80px', defaultDir: 'desc' }, // G5 first
        { key: 'total_interactions_count', label: 'Interactions', w: '90px', defaultDir: 'desc' }, // highest first
        { key: 'has_engaged', label: 'Engaged?', w: '80px', defaultDir: 'desc' },
        { key: 'tier', label: 'Tier', w: '50px', defaultDir: 'desc' },
        { key: 'proposal_value', label: 'Proposal', w: '100px', defaultDir: 'desc' },
        { key: 'crm_stage', label: 'Stage', w: '90px', defaultDir: 'asc' },
    ]

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            const col = columns.find(c => c.key === field)
            setSortField(field)
            setSortDir(col?.defaultDir || 'asc')
        }
        setPage(0)
    }

    const sorted = useMemo(() => {
        // Deduplicate by ID (paginated fetch may produce overlapping rows)
        const unique = [...new Map(leads.map(l => [l.id, l])).values()]
        unique.sort((a, b) => {
            const va = getSortValue(a, sortField)
            const vb = getSortValue(b, sortField)
            if (va < vb) return sortDir === 'asc' ? -1 : 1
            if (va > vb) return sortDir === 'asc' ? 1 : -1
            return 0
        })
        return unique
    }, [leads, sortField, sortDir])

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
    const pageLeads = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    const allOnPageSelected = pageLeads.length > 0 && pageLeads.every(l => selected.has(l.id))
    const someOnPageSelected = pageLeads.some(l => selected.has(l.id))

    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(prev => { const n = new Set(prev); pageLeads.forEach(l => n.delete(l.id)); return n })
        } else {
            setSelected(prev => { const n = new Set(prev); pageLeads.forEach(l => n.add(l.id)); return n })
        }
    }

    const toggleOne = (id) => {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    }

    const handleMoveToFunnel = () => {
        if (selected.size === 0) return
        onMoveToFunnel([...selected])
        setSelected(new Set())
    }

    const handleCreateTasks = () => {
        if (selected.size === 0) return
        onCreateTasks([...selected])
        setSelected(new Set())
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: '#fff3ee', border: '1px solid #ffd4c2', borderRadius: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                        {selected.size} lead{selected.size > 1 ? 's' : ''} selected
                    </span>
                    <button
                        onClick={handleMoveToFunnel}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: '#ff4d00', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                        <ArrowRightToLine size={14} /> Move to Funnel
                    </button>
                    <button
                        onClick={handleCreateTasks}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                        <CheckSquare size={14} /> Create Daily Tasks
                    </button>
                </div>
            )}

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr>
                            <th style={{ ...TH, width: '40px', cursor: 'default' }} onClick={toggleAll}>
                                {allOnPageSelected ? <CheckSquare size={16} style={{ color: '#ff4d00' }} /> : someOnPageSelected ? <MinusSquare size={16} style={{ color: '#ff4d00' }} /> : <Square size={16} style={{ color: '#d1d5db' }} />}
                            </th>
                            {columns.map(col => (
                                <th key={col.key} style={{ ...TH, width: col.w }} onClick={() => toggleSort(col.key)}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {col.label} <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageLeads.map(lead => {
                            const isSelected = selected.has(lead.id)
                            return (
                                <tr
                                    key={lead.id}
                                    style={{ cursor: 'pointer', transition: 'background 0.1s', background: isSelected ? '#fff7f3' : '#fff' }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#fff7f3' : '#fff' }}
                                >
                                    <td style={{ ...TD, width: '40px' }} onClick={() => toggleOne(lead.id)}>
                                        {isSelected ? <CheckSquare size={16} style={{ color: '#ff4d00' }} /> : <Square size={16} style={{ color: '#d1d5db' }} />}
                                    </td>
                                    <td style={{ ...TD, fontWeight: 600, color: '#111827', cursor: 'pointer' }} onClick={() => onOpenLead(lead)}>
                                        {lead.nome || '—'}
                                    </td>
                                    <td style={{ ...TD, color: '#6b7280' }} onClick={() => onOpenLead(lead)}>{lead.empresa || '—'}</td>
                                    <td style={TD} onClick={() => onOpenLead(lead)}>
                                        <span title={lead.icp_reason || ''} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: ICP_BG[lead.icp_score] || '#f3f4f6', color: ICP_COLOR[lead.icp_score] || '#6b7280', border: '1px solid transparent', cursor: lead.icp_reason ? 'help' : 'default' }}>
                                            {lead.icp_score || '—'}
                                        </span>
                                    </td>
                                    <td style={{ ...TD, color: '#6b7280' }} onClick={() => onOpenLead(lead)} title={lead.stage_reasoning || ''}>{lead.cadence_stage || '—'}</td>
                                    <td style={{ ...TD, textAlign: 'center' }} onClick={() => onOpenLead(lead)}>{lead.total_interactions_count || 0}</td>
                                    <td style={{ ...TD, textAlign: 'center' }} onClick={() => onOpenLead(lead)}>
                                        {lead.has_engaged ? <span style={{ color: '#059669', fontWeight: 700, fontSize: '11px' }}>Yes</span> : <span style={{ color: '#d1d5db', fontSize: '11px' }}>No</span>}
                                    </td>
                                    <td style={{ ...TD, textAlign: 'center' }} onClick={() => onOpenLead(lead)}>{lead.tier || '—'}</td>
                                    <td style={TD} onClick={() => onOpenLead(lead)}>
                                        {parseFloat(lead.proposal_value) > 0 ? (
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>${parseFloat(lead.proposal_value).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                                        ) : <span style={{ color: '#d1d5db' }}>—</span>}
                                    </td>
                                    <td style={TD} onClick={() => onOpenLead(lead)}>
                                        {lead.crm_stage ? <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: '#f3f4f6', color: '#374151' }}>{lead.crm_stage}</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                                    </td>
                                </tr>
                            )
                        })}
                        {pageLeads.length === 0 && (
                            <tr><td colSpan={10} style={{ ...TD, textAlign: 'center', color: '#9ca3af', padding: '40px' }}>No leads found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #e5e7eb', background: '#fff', color: page === 0 ? '#d1d5db' : '#374151', cursor: page === 0 ? 'default' : 'pointer' }}>Previous</button>
                        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #e5e7eb', background: '#fff', color: page >= totalPages - 1 ? '#d1d5db' : '#374151', cursor: page >= totalPages - 1 ? 'default' : 'pointer' }}>Next</button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default PipelineTable
