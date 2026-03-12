import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { X, Star, MessageCircle, Briefcase, MapPin, Target } from 'lucide-react'

const STAGES = [
    { id: 'Frio', label: 'Cold' },
    { id: 'Engajado', label: 'Engaged' },
    { id: 'Qualificado', label: 'Qualified' },
    { id: 'Agendado', label: 'Scheduled' },
    { id: 'Proposta', label: 'Proposal' },
    { id: 'Ganho', label: 'Won' },
    { id: 'Perdido', label: 'Lost' }
]

// ICP color map
const ICP_COLOR = { A: '#10b981', B: '#f59e0b', C: '#ef4444' }


// Cadence color map
const CAD_COLOR = { G1: '#3b82f6', G2: '#3b82f6', G3: '#f59e0b', G4: '#ef4444', G5: '#ef4444' }
const CAD_LABEL = { G1: 'First Contact', G2: 'Second Touch', G3: 'Follow-up', G4: 'Urgency', G5: 'Last Contact' }

// SVG arc gauge — renders a partial arc from bottom-left to bottom-right (220° sweep)
const ArcGauge = ({ color }) => {
    const r = 36
    const cx = 52
    const cy = 52
    const startAngle = 145
    const endAngle = 35
    // Full track arc
    const toRad = (d) => (d * Math.PI) / 180
    const polar = (angle, radius) => ({
        x: cx + radius * Math.cos(toRad(angle)),
        y: cy + radius * Math.sin(toRad(angle)),
    })
    const trackStart = polar(startAngle, r)
    const trackEnd = polar(endAngle, r)
    const trackD = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 1 1 ${trackEnd.x} ${trackEnd.y}`

    return (
        <svg width={cx * 2} height={cy * 2 - 18} viewBox={`0 0 ${cx * 2} ${cy * 2 - 10}`} style={{ display: 'block' }}>
            {/* Track */}
            <path d={trackD} fill="none" stroke="#e5e7eb" strokeWidth={5} strokeLinecap="round" />
            {/* Value arc (always same end point, just styled) */}
            <path d={trackD} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
                strokeDasharray="80 200" />
        </svg>
    )
}

const MetricColumn = ({ label, value, color, sub }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 8px' }}>
        <div style={{ position: 'relative', width: 104, height: 56 }}>
            <ArcGauge color={color} />
            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -30%)', fontSize: '22px', fontWeight: 800, color }}>
                {value}
            </span>
        </div>
        <span style={{ marginTop: '6px', fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
        {sub && <span style={{ fontSize: '11px', fontWeight: 600, color, marginTop: '2px' }}>{sub}</span>}
    </div>
)

const ReasoningRow = ({ question, text }) => {
    if (!text) return null
    return (
        <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
            <strong style={{ color: '#111827' }}>{question}</strong>{' '}{text}
        </div>
    )
}

const LeadDetailModal = ({ lead, onClose, onLeadUpdated }) => {
    const navigate = useNavigate()
    const [tier, setTier] = useState(lead?.tier || 0)
    const [proposalValue, setProposalValue] = useState(lead?.proposal_value || '')
    const [crmStage, setCrmStage] = useState(lead?.crm_stage || '')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (lead) {
            setTier(lead.tier || 0)
            setProposalValue(lead.proposal_value || '')
            setCrmStage(lead.crm_stage || '')
        }
    }, [lead])

    if (!lead) return null

    const save = async (field, value) => {
        setSaving(true)
        try {
            await supabase.from('leads').update({ [field]: value }).eq('id', lead.id)
            if (onLeadUpdated) onLeadUpdated({ ...lead, [field]: value })
        } catch (err) {
            console.error('[LeadDetail] Error updating:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleTier = (val) => { setTier(val); save('tier', val) }
    const handleProposal = () => { save('proposal_value', parseFloat(proposalValue) || 0) }
    const handleStage = (val) => { setCrmStage(val); save('crm_stage', val || null) }
    const goToInbox = () => navigate(`/sales/inbox?leadId=${lead.id}`)

    const icpScore = lead.icp_score || '—'
    const cadStage = lead.cadence_stage || '—'
    const icpColor = ICP_COLOR[lead.icp_score] || '#6b7280'
    const cadColor = CAD_COLOR[lead.cadence_stage] || '#6b7280'
    const cadSub = CAD_LABEL[lead.cadence_stage] || null

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }} />
            <div
                onClick={e => e.stopPropagation()}
                style={{ position: 'relative', width: '520px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', border: '1px solid #e5e7eb' }}
            >
                {/* ── DARK HEADER ── */}
                <div style={{ background: '#1e2433', padding: '24px 24px 20px', position: 'relative' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                        <X size={20} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: 56, height: 56, shrink: 0 }}>
                            <LeadAvatar
                                lead={lead}
                                className="w-full h-full shadow-lg"
                            />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>{lead.nome || 'No Name'}</h2>
                                {lead.linkedin_profile_url && (
                                    <a href={lead.linkedin_profile_url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', flexShrink: 0 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                    </a>
                                )}
                            </div>
                            {lead.headline && (
                                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <Briefcase size={11} /> {lead.headline}
                                </p>
                            )}
                            {lead.empresa && (
                                <p style={{ fontSize: '12px', color: '#6b7280', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <MapPin size={11} /> {lead.empresa}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── WHITE BODY ── */}
                <div style={{ background: '#fff' }}>
                    {/* 3-column metrics */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
                        <MetricColumn label="ICP Qualification" value={icpScore} color={icpColor} />
                        <div style={{ width: '1px', background: '#f3f4f6', margin: '16px 0' }} />
                        <MetricColumn label="Interactions" value={lead.total_interactions_count ?? 0} color={lead.total_interactions_count > 0 ? '#ff4d00' : '#ef4444'} />
                        <div style={{ width: '1px', background: '#f3f4f6', margin: '16px 0' }} />
                        <MetricColumn label="Cadence" value={cadStage} color={cadColor} sub={cadSub} />
                    </div>

                    {/* Reasoning rows */}
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid #f3f4f6' }}>
                        <ReasoningRow question={`Why ICP ${icpScore}?`} text={lead.icp_reason} />
                        <ReasoningRow question={`Cadence Level (${cadStage}):`} text={lead.stage_reasoning} />
                    </div>

                    {/* CRM Actions */}
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* Tier */}
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>Priority (Tier)</label>
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <button key={i} onClick={() => handleTier(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                                        <Star size={22} style={i <= tier ? { color: '#f59e0b', fill: '#f59e0b' } : { color: '#e5e7eb', fill: '#e5e7eb' }} />
                                    </button>
                                ))}
                                {tier > 0 && <button onClick={() => handleTier(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#9ca3af', marginLeft: '6px' }}>Clear</button>}
                            </div>
                        </div>

                        {/* Proposal */}
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>Proposal Value ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={proposalValue}
                                onChange={e => setProposalValue(e.target.value)}
                                onBlur={handleProposal}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', color: '#111827', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* Stage */}
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                                <Target size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                Funnel Stage
                            </label>
                            <select
                                value={crmStage}
                                onChange={e => handleStage(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', color: '#111827', background: '#fff', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                            >
                                <option value="">— No stage —</option>
                                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '0 20px 20px', display: 'flex', gap: '10px' }}>
                        <button
                            onClick={goToInbox}
                            style={{ flex: 1, padding: '11px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, background: '#ff4d00', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            <MessageCircle size={16} /> Go to Inbox
                        </button>
                        <button onClick={onClose} style={{ padding: '11px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', cursor: 'pointer' }}>
                            Close
                        </button>
                    </div>
                </div>

                {saving && (
                    <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', fontSize: '11px', fontWeight: 600, color: '#ff4d00', background: '#fff3ee', padding: '4px 12px', borderRadius: '6px', border: '1px solid #ffd4c2', zIndex: 3 }}>
                        Saving...
                    </div>
                )}
            </div>
        </div>
    )
}

export default LeadDetailModal
