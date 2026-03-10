import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import SafeImage from '../components/SafeImage'
import {
    Search,
    Loader2,
    RotateCcw,
    Plus,
    X,
    ShieldBan,
    Users,
    Building2,
    Check
} from 'lucide-react'

const BlacklistPage = () => {
    const { selectedClientId } = useClientSelection()

    // Blacklisted leads state
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [restoringIds, setRestoringIds] = useState(new Set())

    // Add-to-blacklist modal state
    const [showAddModal, setShowAddModal] = useState(false)
    const [addSearch, setAddSearch] = useState('')
    const [addResults, setAddResults] = useState([])
    const [addLoading, setAddLoading] = useState(false)
    const [addingIds, setAddingIds] = useState(new Set())

    // Toast
    const [toast, setToast] = useState(null)
    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // Fetch blacklisted leads
    const fetchBlacklist = useCallback(async () => {
        if (!selectedClientId) {
            setLeads([])
            return
        }

        setLoading(true)
        try {
            let query = supabase
                .from('leads')
                .select('id, nome, empresa, headline, avatar_url, location, icp_score, created_at')
                .eq('client_id', selectedClientId)
                .eq('is_blacklisted', true)
                .order('nome', { ascending: true })

            if (debouncedSearch) {
                query = query.or(`nome.ilike.%${debouncedSearch}%,empresa.ilike.%${debouncedSearch}%`)
            }

            const { data, error } = await query
            if (error) throw error
            setLeads(data || [])
        } catch (err) {
            console.error('[Blacklist] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [selectedClientId, debouncedSearch])

    useEffect(() => {
        fetchBlacklist()
    }, [fetchBlacklist])

    // Restore lead (remove from blacklist)
    const handleRestore = async (id) => {
        setRestoringIds(prev => new Set(prev).add(id))
        try {
            const { error } = await supabase
                .from('leads')
                .update({ is_blacklisted: false })
                .eq('id', id)

            if (error) throw error

            setLeads(prev => prev.filter(l => l.id !== id))
            showToast('Lead restored successfully!')
        } catch (err) {
            console.error('[Blacklist] restore error:', err)
            showToast('Error restoring lead.', 'error')
        } finally {
            setRestoringIds(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
        }
    }

    // Search active leads for "Add to blacklist"
    const searchActiveLeads = async (term) => {
        if (!term.trim() || !selectedClientId) {
            setAddResults([])
            return
        }

        setAddLoading(true)
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('id, nome, empresa, headline, avatar_url')
                .eq('client_id', selectedClientId)
                .neq('is_blacklisted', true)
                .or(`nome.ilike.%${term}%,empresa.ilike.%${term}%`)
                .order('nome', { ascending: true })
                .limit(15)

            if (error) throw error
            setAddResults(data || [])
        } catch (err) {
            console.error('[Blacklist] search active error:', err)
        } finally {
            setAddLoading(false)
        }
    }

    // Debounce for add-modal search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (showAddModal) searchActiveLeads(addSearch)
        }, 400)
        return () => clearTimeout(timer)
    }, [addSearch, showAddModal])

    // Add lead to blacklist
    const handleAddToBlacklist = async (lead) => {
        setAddingIds(prev => new Set(prev).add(lead.id))
        try {
            const { error } = await supabase
                .from('leads')
                .update({ is_blacklisted: true })
                .eq('id', lead.id)

            if (error) throw error

            // Remove from add results, add to main list
            setAddResults(prev => prev.filter(l => l.id !== lead.id))
            setLeads(prev => [...prev, { ...lead, is_blacklisted: true }].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')))
            showToast(`${lead.nome} added to blacklist.`)
        } catch (err) {
            console.error('[Blacklist] add error:', err)
            showToast('Error adding to blacklist.', 'error')
        } finally {
            setAddingIds(prev => {
                const next = new Set(prev)
                next.delete(lead.id)
                return next
            })
        }
    }

    return (
        <div style={{ padding: '28px', background: '#f9fafb', minHeight: '100vh' }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
                    color: toast.type === 'error' ? '#dc2626' : '#16a34a',
                    border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                }}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: '#fef2f2', border: '1px solid #fecaca',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <ShieldBan size={22} style={{ color: '#dc2626' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0 }}>Blacklist</h1>
                        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '2px 0 0' }}>
                            Hidden leads — {leads.length} lead{leads.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { setShowAddModal(true); setAddSearch(''); setAddResults([]) }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                        background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                        transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#b91c1c' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#dc2626' }}
                >
                    <Plus size={15} /> Add to Blacklist
                </button>
            </div>

            {/* Search Bar */}
            <div style={{
                background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb',
                padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <Search size={18} style={{ color: '#9ca3af', flexShrink: 0 }} />
                <input
                    type="text"
                    placeholder="Search blacklist by name or company..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                        flex: 1, border: 'none', outline: 'none', fontSize: '14px',
                        color: '#111827', background: 'transparent'
                    }}
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <X size={16} style={{ color: '#9ca3af' }} />
                    </button>
                )}
            </div>

            {/* Content */}
            {!selectedClientId ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>
                    Select a client to view the blacklist.
                </div>
            ) : loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />
                    <span style={{ fontSize: '13px' }}>Loading blacklist...</span>
                </div>
            ) : leads.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px', background: '#fff',
                    borderRadius: '12px', border: '1px solid #e5e7eb'
                }}>
                    <ShieldBan size={40} style={{ color: '#d1d5db', margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>
                        {debouncedSearch ? 'No results found.' : 'Empty blacklist.'}
                    </p>
                    <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
                        {debouncedSearch ? 'Try another search term.' : 'Leads added to the blacklist will appear here.'}
                    </p>
                </div>
            ) : (
                <div style={{
                    background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb',
                    overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 180px 120px 100px',
                        padding: '10px 20px', background: '#f9fafb', borderBottom: '2px solid #e5e7eb',
                        fontSize: '11px', fontWeight: 700, color: '#6b7280',
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                        <span>Lead</span>
                        <span>Company</span>
                        <span>Location</span>
                        <span style={{ textAlign: 'right' }}>Actions</span>
                    </div>

                    {/* Rows */}
                    {leads.map(lead => (
                        <div
                            key={lead.id}
                            style={{
                                display: 'grid', gridTemplateColumns: '1fr 180px 120px 100px',
                                alignItems: 'center', padding: '12px 20px',
                                borderBottom: '1px solid #f3f4f6',
                                transition: 'background 0.1s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fafafa' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                        >
                            {/* Lead Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6',
                                    border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '14px', fontWeight: 700, color: '#6b7280'
                                }}>
                                    <SafeImage
                                        src={lead.avatar_url}
                                        alt={lead.nome}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        fallbackText={lead.nome?.charAt(0)?.toUpperCase()}
                                    />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {lead.nome || 'No Name'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {lead.headline || '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Empresa */}
                            <div style={{ fontSize: '13px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {lead.empresa || '—'}
                            </div>

                            {/* Location */}
                            <div style={{ fontSize: '12px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {lead.location || '—'}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => handleRestore(lead.id)}
                                    disabled={restoringIds.has(lead.id)}
                                    title="Restore lead (remove from blacklist)"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                        background: '#fff', border: '1px solid #e5e7eb', color: '#059669',
                                        cursor: restoringIds.has(lead.id) ? 'default' : 'pointer',
                                        opacity: restoringIds.has(lead.id) ? 0.5 : 1,
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={e => { if (!restoringIds.has(lead.id)) { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac' } }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb' }}
                                >
                                    <RotateCcw size={13} /> Restore
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ ADD TO BLACKLIST MODAL ═══ */}
            {showAddModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9000,
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px'
                    }}
                    onClick={() => setShowAddModal(false)}
                >
                    <div
                        style={{
                            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px',
                            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid #e5e7eb',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: '#fef2f2', border: '1px solid #fecaca',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <ShieldBan size={18} style={{ color: '#dc2626' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>
                                        Add to Blacklist
                                    </h3>
                                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                                        Search for an active lead to hide from the system
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={20} style={{ color: '#9ca3af' }} />
                            </button>
                        </div>

                        {/* Search */}
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 14px', borderRadius: '10px',
                                background: '#f9fafb', border: '1px solid #e5e7eb'
                            }}>
                                <Search size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
                                <input
                                    type="text"
                                    placeholder="Type lead name or company..."
                                    value={addSearch}
                                    onChange={e => setAddSearch(e.target.value)}
                                    autoFocus
                                    style={{
                                        flex: 1, border: 'none', outline: 'none', fontSize: '14px',
                                        color: '#111827', background: 'transparent'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Results */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                            {!addSearch.trim() ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                                    <Users size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                                    <p style={{ fontSize: '13px', margin: 0 }}>Type to search active leads</p>
                                </div>
                            ) : addLoading ? (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 6px', display: 'block' }} />
                                    <span style={{ fontSize: '12px' }}>Searching...</span>
                                </div>
                            ) : addResults.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                                    <p style={{ fontSize: '13px', margin: 0 }}>No active lead found.</p>
                                </div>
                            ) : (
                                addResults.map(lead => (
                                    <div
                                        key={lead.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 24px', transition: 'background 0.1s', cursor: 'default'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb' }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%', background: '#f3f4f6',
                                                border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '12px', fontWeight: 700, color: '#6b7280'
                                            }}>
                                                <SafeImage
                                                    src={lead.avatar_url}
                                                    alt={lead.nome}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    fallbackText={lead.nome?.charAt(0)?.toUpperCase()}
                                                />
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {lead.nome}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {lead.empresa || lead.headline || '—'}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddToBlacklist(lead)}
                                            disabled={addingIds.has(lead.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                                background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                                                cursor: addingIds.has(lead.id) ? 'default' : 'pointer',
                                                opacity: addingIds.has(lead.id) ? 0.5 : 1,
                                                transition: 'all 0.15s', flexShrink: 0
                                            }}
                                            onMouseEnter={e => { if (!addingIds.has(lead.id)) { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff' } }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626' }}
                                        >
                                            <ShieldBan size={11} /> Block
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Spin animation */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

export default BlacklistPage
