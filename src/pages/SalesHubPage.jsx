import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import {
    CheckCircle2, Ban, MessageCircle, Loader2, AlertTriangle,
    Users,
    DollarSign,
    Target
} from 'lucide-react'
import SafeImage from '../components/SafeImage'

// ── helpers ──────────────────────────────────────────────────────────────────
const ICP_BG = { A: '#ecfdf5', B: '#fffbeb', C: '#f3f4f6' }
const ICP_COLOR = { A: '#059669', B: '#d97706', C: '#6b7280' }
const CAD_COLOR = { G1: '#3b82f6', G2: '#3b82f6', G3: '#f59e0b', G4: '#ef4444', G5: '#ef4444' }

const isFollowupDue = (lead) => {
    if (!lead.last_task_completed_at) return false
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return new Date(lead.last_task_completed_at) < sevenDaysAgo && !lead.has_engaged
}

// ── sub-components ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const KpiCard = ({ icon: Icon, label, value, color }) => (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ width: 40, height: 40, borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} style={{ color }} />
        </div>
        <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>{label}</div>
        </div>
    </div>
)

const LeadRow = ({ lead, onComplete, onBlacklist, onInbox, completing, blacklisting }) => {
    const followup = isFollowupDue(lead)
    const isLoading = completing || blacklisting

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px 20px',
            background: '#fff',
            borderBottom: '1px solid #f3f4f6',
            opacity: isLoading ? 0.5 : 1,
            transition: 'opacity 0.2s, background 0.1s',
        }}
            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = '#fafafa' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
        >
            {/* Avatar */}
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f3f4f6', border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#6b7280' }}>
                <SafeImage
                    src={lead.avatar_url}
                    alt={lead.nome}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    fallbackText={lead.nome?.charAt(0)?.toUpperCase()}
                />
            </div>

            {/* Main info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{lead.nome || 'Sem Nome'}</span>
                    {lead.empresa && <span style={{ fontSize: '12px', color: '#9ca3af' }}>· {lead.empresa}</span>}

                    {/* ICP badge */}
                    {lead.icp_score && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '4px', background: ICP_BG[lead.icp_score] || '#f3f4f6', color: ICP_COLOR[lead.icp_score] || '#6b7280' }}>
                            ICP {lead.icp_score}
                        </span>
                    )}

                    {/* Cadence badge */}
                    {lead.cadence_stage && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '4px', background: '#eff6ff', color: CAD_COLOR[lead.cadence_stage] || '#3b82f6', border: `1px solid ${CAD_COLOR[lead.cadence_stage] || '#3b82f6'}30` }}>
                            {lead.cadence_stage}
                        </span>
                    )}

                    {/* Follow-up tag */}
                    {followup && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#fff3ee', color: '#ff4d00', border: '1px solid #ffd4c2' }}>
                            <AlertTriangle size={10} /> Follow-up Necessário
                        </span>
                    )}

                    {/* Stage */}
                    {lead.crm_stage && (
                        <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 7px', borderRadius: '4px', background: '#f3f4f6', color: '#374151' }}>
                            {lead.crm_stage}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                    onClick={() => onInbox(lead.id)}
                    title="Ir para o Inbox"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: '#fff', border: '1px solid #e5e7eb', color: '#374151', cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4d00'; e.currentTarget.style.color = '#ff4d00' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151' }}
                >
                    <MessageCircle size={13} /> Inbox
                </button>

                <button
                    onClick={() => onComplete(lead.id)}
                    disabled={isLoading}
                    title="Marcar como Concluído"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: completing ? '#f0fdf4' : '#fff', border: `1px solid ${completing ? '#86efac' : '#e5e7eb'}`, color: '#059669', cursor: isLoading ? 'default' : 'pointer' }}
                    onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#86efac' } }}
                    onMouseLeave={e => { if (!isLoading) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb' } }}
                >
                    {completing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={13} />}
                    Concluído
                </button>

                <button
                    onClick={() => onBlacklist(lead.id)}
                    disabled={isLoading}
                    title="Mover para Lista Negra"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: '#fff', border: '1px solid #e5e7eb', color: '#9ca3af', cursor: isLoading ? 'default' : 'pointer' }}
                    onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = '#ef4444' } }}
                    onMouseLeave={e => { if (!isLoading) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#9ca3af' } }}
                >
                    {blacklisting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Ban size={14} />}
                </button>
            </div>
        </div>
    )
}

// ── main page ─────────────────────────────────────────────────────────────────
const SalesHubPage = () => {
    const navigate = useNavigate()
    const { selectedClientId } = useClientSelection()
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [actionState, setActionState] = useState({}) // { [id]: 'completing' | 'blacklisting' }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const fetchLeads = useCallback(async () => {
        if (!selectedClientId) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('id, nome, empresa, avatar_url, icp_score, cadence_stage, crm_stage, has_engaged, last_task_completed_at, tier, last_interaction_date')
                .eq('client_id', selectedClientId)
                .neq('is_blacklisted', true)
                .neq('crm_stage', 'Ganho')
                .or(`last_task_completed_at.is.null,and(last_task_completed_at.lt.${sevenDaysAgo},has_engaged.eq.false)`)
                .order('last_interaction_date', { ascending: false, nullsFirst: false })
                .limit(30)
            if (error) throw error
            setLeads(data || [])
        } catch (err) {
            console.error('[Cockpit] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [selectedClientId]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchLeads()
    }, [fetchLeads])

    const removeOptimistically = (id) =>
        setLeads(prev => prev.filter(l => l.id !== id))

    const handleComplete = async (id) => {
        setActionState(prev => ({ ...prev, [id]: 'completing' }))
        removeOptimistically(id)
        try {
            await supabase.from('leads').update({ last_task_completed_at: new Date().toISOString() }).eq('id', id)
        } catch (err) {
            console.error('[Cockpit] complete error:', err)
        } finally {
            setActionState(prev => { const n = { ...prev }; delete n[id]; return n })
        }
    }

    const handleBlacklist = async (id) => {
        setActionState(prev => ({ ...prev, [id]: 'blacklisting' }))
        removeOptimistically(id)
        try {
            await supabase.from('leads').update({ is_blacklisted: true }).eq('id', id)
        } catch (err) {
            console.error('[Cockpit] blacklist error:', err)
        } finally {
            setActionState(prev => { const n = { ...prev }; delete n[id]; return n })
        }
    }

    const handleInbox = (id) => navigate(`/sales/inbox?leadId=${id}`)

    // KPI derived values
    const followupCount = leads.filter(isFollowupDue).length
    const newCount = leads.filter(l => !l.last_task_completed_at).length

    return (
        <div style={{ padding: '28px', background: '#f9fafb', minHeight: '100vh', fontFamily: 'inherit' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0 }}>Cockpit de Vendas</h1>
                    <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0' }}>Tarefas diárias de follow-up e prospecção</p>
                </div>
                <button
                    onClick={fetchLeads}
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: '#fff', border: '1px solid #e5e7eb', color: '#6b7280', cursor: loading ? 'default' : 'pointer' }}
                >
                    <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
                    Atualizar
                </button>
            </div>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                <KpiCard icon={Users} label="Pendentes Hoje" value={leads.length} color="#374151" />
                <KpiCard icon={AlertTriangle} label="Follow-up Atrasado" value={followupCount} color="#ff4d00" />
                <KpiCard icon={Zap} label="Nunca Abordados" value={newCount} color="#059669" />
            </div>

            {/* List */}
            {!selectedClientId ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', fontSize: '14px' }}>
                    Selecione um cliente para ver as tarefas.
                </div>
            ) : loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />
                    <span style={{ fontSize: '13px' }}>Carregando tarefas...</span>
                </div>
            ) : leads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <CheckCircle2 size={40} style={{ color: '#10b981', margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Tudo em dia! 🎉</p>
                    <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>Nenhuma tarefa pendente no momento.</p>
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    {/* Table header */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <span style={{ flex: 1, fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Lead — {leads.length} tarefa{leads.length !== 1 ? 's' : ''}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ width: '72px' }} />
                            <span style={{ width: '96px' }} />
                            <span style={{ width: '32px' }} />
                        </div>
                    </div>

                    {/* Rows */}
                    {leads.map(lead => (
                        <LeadRow
                            key={lead.id}
                            lead={lead}
                            onComplete={handleComplete}
                            onBlacklist={handleBlacklist}
                            onInbox={handleInbox}
                            completing={actionState[lead.id] === 'completing'}
                            blacklisting={actionState[lead.id] === 'blacklisting'}
                        />
                    ))}
                </div>
            )}

            {/* Spin keyframe */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

export default SalesHubPage
