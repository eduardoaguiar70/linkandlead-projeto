import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import LeadAvatar from './LeadAvatar'
import ScheduleMessageModal from './ScheduleMessageModal'
import { supabase } from '../services/supabaseClient'
import {
    X, Briefcase, MapPin, ExternalLink, Star, Target,
    MessageCircle, DollarSign, UserPlus, UserCheck,
    ChevronDown, ChevronUp, Bell, Clock, Kanban, FileText,
    History, Loader2, Ban, BotOff, Bot, Calendar,
    Heart, Activity, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

// ── Color Maps ────────────────────────────────────────────────────────────────

const ICP_CONFIG = {
    A: { color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-600', label: 'A' },
    B: { color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-600', label: 'B' },
    C: { color: '#ef4444', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-500', label: 'C' },
}

const CAD_COLOR = {
    G1: '#3b82f6', G2: '#06b6d4', G3: '#f59e0b', G4: '#f97316', G5: '#ef4444',
}
const CAD_LABEL = {
    G1: 'First Contact', G2: 'Recognition', G3: 'Consideration',
    G4: 'Active Interest', G5: 'Relationship',
}

const STAGES = [
    { id: 'Frio', label: 'Cold' },
    { id: 'Engajado', label: 'Engaged' },
    { id: 'Qualificado', label: 'Qualified' },
    { id: 'Agendado', label: 'Scheduled' },
    { id: 'Proposta', label: 'Proposal' },
    { id: 'Ganho', label: 'Won' },
    { id: 'Perdido', label: 'Lost' },
]
// ── Activity Timeline ─────────────────────────────────────────────────────────

const ACTIVITY_CONFIG = {
    FIRST_MESSAGE: {
        icon: MessageCircle,
        color: '#2563eb',
        bg: '#eff6ff',
        border: '#bfdbfe',
        label: 'Initial Message',
    },
    COMMENT: {
        icon: Activity,
        color: '#16a34a',
        bg: '#f0fdf4',
        border: '#bbf7d0',
        label: 'Comment',
    },
    REACTION: {
        icon: Heart,
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
        label: 'Reaction',
    },
}

const formatRelTime = (dateStr) => {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' })
}

const ActivityTimeline = ({ leadId }) => {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!leadId) return
        let cancelled = false
        const load = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('lead_activity_timeline')
                    .select('activity_type, description, occurred_at, post_id')
                    .eq('lead_id', leadId)
                    .order('occurred_at', { ascending: false })
                    .limit(80)
                if (!cancelled) {
                    if (!error) setEvents(data || [])
                }
            } catch (err) {
                console.error('[ActivityTimeline]', err)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [leadId])

    if (loading) return (
        <div className="flex items-center justify-center py-10 gap-2">
            <Loader2 size={18} className="animate-spin text-slate-400" />
            <span className="text-xs text-slate-400">Loading timeline…</span>
        </div>
    )

    if (events.length === 0) return (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Activity size={18} className="text-slate-300" />
            </div>
            <p className="text-xs text-slate-400">No activity recorded yet.</p>
        </div>
    )

    return (
        <div className="relative">
            {/* Spine */}
            <div className="absolute left-[36px] top-4 bottom-4 w-px bg-slate-100" aria-hidden />

            <ul>
                {events.map((evt, i) => {
                    const cfg = ACTIVITY_CONFIG[evt.activity_type] || ACTIVITY_CONFIG.FIRST_MESSAGE
                    const Icon = cfg.icon
                    return (
                        <li
                            key={i}
                            className="group flex gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0"
                        >
                            {/* Icon bubble */}
                            <div
                                className="relative z-10 shrink-0 mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-sm transition-transform group-hover:scale-110"
                                style={{ background: cfg.bg, borderColor: cfg.border }}
                            >
                                <Icon size={13} style={{ color: cfg.color }} strokeWidth={2.5} />
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        {/* Type label */}
                                        <span
                                            className="inline-block text-[9px] font-black uppercase tracking-widest rounded px-1.5 py-0.5 mb-1"
                                            style={{ color: cfg.color, background: cfg.bg }}
                                        >
                                            {cfg.label}
                                        </span>
                                        {evt.description && (
                                            <p className="text-[12px] text-slate-600 leading-relaxed">
                                                {evt.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Meta */}
                                    <div className="shrink-0 flex flex-col items-end gap-1 pl-2">
                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                            {formatRelTime(evt.occurred_at)}
                                        </span>
                                        {evt.post_id && (
                                            <a
                                                href={`https://www.linkedin.com/feed/update/urn:li:activity:${evt.post_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                                                title="View LinkedIn post"
                                            >
                                                <ExternalLink size={9} />
                                                View Post
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

// ── Sub-Components ────────────────────────────────────────────────────────────

const StatBadge = ({ value, label, sublabel, colorClass, bgClass, borderClass }) => (
    <div className={`flex flex-col items-center gap-1 py-3 px-3 rounded-2xl border-2 ${bgClass} ${borderClass} flex-1 min-w-0`}>
        <span className={`text-2xl font-black ${colorClass}`}>{value || '—'}</span>
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center leading-tight">{label}</span>
        {sublabel && <span className={`text-[9px] font-medium ${colorClass} text-center leading-tight`}>{sublabel}</span>}
    </div>
)

const ReasoningBlock = ({ title, text, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen)
    if (!text) return null
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
            >
                <span className="text-xs font-bold text-slate-700">{title}</span>
                {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </button>
            {open && (
                <div className="px-3 pb-3">
                    <p className="text-xs text-slate-600 leading-relaxed">{text}</p>
                </div>
            )}
        </div>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────

const UnifiedLeadModal = ({ lead, onClose, onLeadUpdated }) => {
    const navigate = useNavigate()
    const [saving, setSaving] = useState(false)
    const [bodyTab, setBodyTab] = useState('details') // 'details' | 'timeline'
    const [proposalValue, setProposalValue] = useState(lead?.proposal_value || '')
    const [isFollowup, setIsFollowup] = useState(lead?.is_followup || false)
    const [followupInterval, setFollowupInterval] = useState(lead?.followup_interval_days || 7)
    const [customInterval, setCustomInterval] = useState('')
    const [showCustomInterval, setShowCustomInterval] = useState(false)
    const [showScheduleMessage, setShowScheduleMessage] = useState(false)
    const [followupUntilResponded, setFollowupUntilResponded] = useState(lead?.followup_until_responded !== false)
    const [showFollowupSettings, setShowFollowupSettings] = useState(false)
    const [observations, setObservations] = useState(lead?.observations || '')
    const [enrichedData, setEnrichedData] = useState(null)
    const [lastReceivedMsg, setLastReceivedMsg] = useState(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const [isSavingObs, setIsSavingObs] = useState(false)

    // Pipeline-only state
    const [tier, setTier] = useState(lead?.tier || 0)
    const [crmStage, setCrmStage] = useState(lead?.crm_stage || '')
    const [callStatus, setCallStatus] = useState(lead?.call_status || null)
    const [callScheduledAt, setCallScheduledAt] = useState(lead?.call_scheduled_at || '')
    const [pauseAutomatedTasks, setPauseAutomatedTasks] = useState(lead?.pause_automated_tasks || false)

    // Fetch fresh enriched data
    const fetchEnriched = useCallback(async () => {
        if (!lead?.id) return
        try {
            const [{ data }, { data: lastMsg }] = await Promise.all([
                supabase
                    .from('leads')
                    .select('cadence_stage, icp_reason, stage_reasoning, conversation_summary, is_followup, followup_interval_days, followup_started_at, followup_until_responded, proposal_value, tier, crm_stage, created_at, total_interactions_count, observations, pause_automated_tasks, call_status, call_scheduled_at')
                    .eq('id', lead.id)
                    .single(),
                supabase
                    .from('interactions')
                    .select('interaction_date')
                    .eq('lead_id', lead.id)
                    .eq('is_sender', false)
                    .order('interaction_date', { ascending: false })
                    .limit(1)
                    .maybeSingle()
            ])
            if (data) {
                setEnrichedData(data)
                setIsFollowup(data.is_followup || false)
                setFollowupInterval(data.followup_interval_days || 7)
                setFollowupUntilResponded(data.followup_until_responded !== false)
                setProposalValue(data.proposal_value || 0)
                setTier(data.tier || 0)
                setCrmStage(data.crm_stage || '')
                setCallStatus(data.call_status || null)
                setCallScheduledAt(data.call_scheduled_at || '')
                setPauseAutomatedTasks(data.pause_automated_tasks || false)
            }
            setLastReceivedMsg(lastMsg || null)
        } catch (err) {
            console.error('[UnifiedLeadModal] fetch error:', err)
        }
    }, [lead?.id])

    useEffect(() => {
        fetchEnriched()
    }, [fetchEnriched])

    useEffect(() => {
        if (lead) {
            setProposalValue(lead.proposal_value || '')
            setIsFollowup(lead.is_followup || false)
            setFollowupInterval(lead.followup_interval_days || 7)
            setFollowupUntilResponded(lead.followup_until_responded !== false)
            setObservations(lead.observations || '')
            setTier(lead.tier || 0)
            setCrmStage(lead.crm_stage || '')
            setCallStatus(lead.call_status || null)
            setCallScheduledAt(lead.call_scheduled_at || '')
            setPauseAutomatedTasks(lead.pause_automated_tasks || false)
        }
    }, [lead])

    if (!lead) return null

    // ── Save helper ──────────────────────────────────────────────────────────

    const save = async (field, value) => {
        setSaving(true)
        try {
            await supabase.from('leads').update({ [field]: value }).eq('id', lead.id)
            if (onLeadUpdated) onLeadUpdated({ ...lead, [field]: value })
        } catch (err) {
            console.error('[UnifiedLeadModal] save error:', err)
        } finally {
            setSaving(false)
        }
    }

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSaveObservations = async () => {
        setIsSavingObs(true)
        try {
            await supabase.from('leads').update({ observations }).eq('id', lead.id)
            if (onLeadUpdated) onLeadUpdated({ ...lead, observations })
            toast.success("Observation saved!")
        } catch (err) {
            console.error('[UnifiedLeadModal] save error:', err)
            toast.error("Error saving observation.")
        } finally {
            setIsSavingObs(false)
        }
    }

    const handleDeepSync = async () => {
        if (!lead?.id) return
        setIsSyncing(true)
        try {
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/import-deep-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: lead.id })
            })
            if (!response.ok) throw new Error('Request error')
            toast.success("Busca profunda iniciada! As mensagens mais antigas aparecerão aqui na tela em alguns minutos.")
        } catch (err) {
            console.error('[UnifiedLeadModal] deep sync error:', err)
            toast.error("Não foi possível iniciar a sincronização. Tente novamente mais tarde.")
        } finally {
            setIsSyncing(false)
        }
    }

    const handleFollowupToggle = () => {
        const next = !isFollowup
        setIsFollowup(next)
        const updates = {
            is_followup: next,
            followup_started_at: next ? new Date().toISOString() : null,
            followup_interval_days: followupInterval,
            followup_until_responded: followupUntilResponded,
        }
        setSaving(true)
        supabase.from('leads').update(updates).eq('id', lead.id)
            .then(() => { if (onLeadUpdated) onLeadUpdated({ ...lead, ...updates }) })
            .catch(err => console.error(err))
            .finally(() => setSaving(false))
    }

    const handleIntervalChange = (days) => {
        setFollowupInterval(days)
        setShowCustomInterval(false)
        if (isFollowup) save('followup_interval_days', days)
    }

    const handleCustomIntervalSave = () => {
        const val = parseInt(customInterval)
        if (!val || val < 1) return
        setFollowupInterval(val)
        setShowCustomInterval(false)
        if (isFollowup) save('followup_interval_days', val)
    }

    const handleUntilRespondedToggle = () => {
        const next = !followupUntilResponded
        setFollowupUntilResponded(next)
        if (isFollowup) save('followup_until_responded', next)
    }

    const handleAddToKanban = () => {
        handleStage('Frio')
        if (tier === 0) {
            handleTier(1) // Default to tier 1 when adding to kanban
        }
    }

    const handleProposalBlur = () => save('proposal_value', parseFloat(proposalValue) || 0)
    const handleTier = (val) => { setTier(val); save('tier', val) }
    
    const handleStage = async (val) => {
        setCrmStage(val)
        const payload = { crm_stage: val || null }
        
        // Automation: Call Scheduled
        const triggerStages = ['Agendado', 'Proposta', 'Ganho', 'Perdido']
        if (triggerStages.includes(val) && !callScheduledAt) {
            const nowIso = new Date().toISOString()
            payload.call_status = 'scheduled'
            payload.call_scheduled_at = nowIso
            setCallStatus('scheduled')
            setCallScheduledAt(nowIso)
        }

        try {
            await supabase.from('leads').update(payload).eq('id', lead.id)
            if (onLeadUpdated) {
                onLeadUpdated({ ...lead, ...payload })
            }
        } catch (err) {
            console.error('Error saving crm_stage:', err)
        }
    }
    
    const goToInbox = () => { navigate(`/sales/inbox?leadId=${lead.id}`); onClose() }

    const handlePauseTasksToggle = () => {
        const next = !pauseAutomatedTasks
        setPauseAutomatedTasks(next)
        save('pause_automated_tasks', next)
    }

    // ── Derived data ─────────────────────────────────────────────────────────

    const icpScore = lead.icp_score || '—'
    const icpConfig = ICP_CONFIG[lead.icp_score] || { color: '#6b7280', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', label: icpScore }

    const cadStage = enrichedData?.cadence_stage || lead.cadence_stage || '—'
    const interactionCount = enrichedData?.total_interactions_count ?? lead.total_interactions_count ?? 0
    const interactionColor = interactionCount > 5 ? 'text-emerald-500' : interactionCount > 0 ? 'text-amber-500' : 'text-red-400'
    const interactionBg = interactionCount > 5 ? 'bg-emerald-50' : interactionCount > 0 ? 'bg-amber-50' : 'bg-red-50'
    const interactionBorder = interactionCount > 5 ? 'border-emerald-200' : interactionCount > 0 ? 'border-amber-200' : 'border-red-200'

    const cadText = cadStage.startsWith?.('G') ? (parseInt(cadStage.slice(1)) >= 4 ? 'text-orange-500' : 'text-blue-500') : 'text-slate-500'
    const cadBg = cadStage.startsWith?.('G') ? (parseInt(cadStage.slice(1)) >= 4 ? 'bg-orange-50' : 'bg-blue-50') : 'bg-slate-50'
    const cadBorder = cadStage.startsWith?.('G') ? (parseInt(cadStage.slice(1)) >= 4 ? 'border-orange-200' : 'border-blue-200') : 'border-slate-200'
    const cadLabel = CAD_LABEL[cadStage] || null

    const icpReason = enrichedData?.icp_reason || lead.icp_reason || null
    const stageReasoning = enrichedData?.stage_reasoning || lead.stage_reasoning || null

    // Days since last received message
    const getDaysAgo = (dateStr) => {
        if (!dateStr) return null
        const diff = Date.now() - new Date(dateStr).getTime()
        const days = Math.floor(diff / 86400000)
        if (days === 0) return 'Today'
        if (days === 1) return '1 day ago'
        return `${days} days ago`
    }

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <div
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-lg max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200 shadow-2xl flex flex-col"
            >
                {/* Saving indicator */}
                {saving && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 text-[11px] font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                        Saving...
                    </div>
                )}

                {/* ═══ HEADER (Dark) ═══ */}
                <div className="bg-gradient-to-b from-slate-900 to-slate-800 px-5 pt-5 pb-4 shrink-0">
                    <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/10 transition text-slate-400 hover:text-white z-10">
                        <X size={18} />
                    </button>

                    <div className="flex items-center gap-3.5">
                        {/* Avatar */}
                        <div className="w-14 h-14 shrink-0">
                            <LeadAvatar
                                lead={lead}
                                className="w-full h-full border-2 border-slate-700 shadow-xl"
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white truncate">{lead.nome || 'Lead'}</h2>
                                {lead.linkedin_profile_url && (
                                    <a href={lead.linkedin_profile_url} target="_blank" rel="noopener noreferrer"
                                        className="shrink-0 p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-sky-400 transition"
                                        title="View LinkedIn Profile">
                                        <ExternalLink size={14} />
                                    </a>
                                )}
                                <button
                                    onClick={handleDeepSync}
                                    disabled={isSyncing}
                                    className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Fetches the entire old message history for this lead. It might take a few minutes."
                                >
                                    {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <History size={14} />}
                                    <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">Deep Sync</span>
                                </button>
                            </div>
                            {lead.headline && (
                                <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5 truncate">
                                    <Briefcase size={12} className="shrink-0" /> {lead.headline}
                                </p>
                            )}
                            {lead.empresa && (
                                <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                                    <MapPin size={11} className="shrink-0" /> {lead.empresa}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ═══ BODY (Light, Scrollable) ═══ */}
                <div className="flex-1 overflow-y-auto bg-white">

                    {/* ── Tab toggle ── */}
                    <div className="flex border-b border-slate-100 bg-slate-50 px-5 pt-3 gap-4 shrink-0">
                        {[
                            { id: 'details', label: 'Details' },
                            { id: 'timeline', label: 'Activity Timeline' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setBodyTab(tab.id)}
                                className={`pb-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
                                    bodyTab === tab.id
                                        ? 'border-orange-500 text-orange-500'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Timeline Tab ── */}
                    {bodyTab === 'timeline' && <ActivityTimeline leadId={lead?.id} />}

                    {/* ── Details Tab ── */}
                    {bodyTab === 'details' && (
                    <React.Fragment>

                    {/* ── Stats Row ── */}
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                        <div className="grid grid-cols-3 gap-2.5">
                            <StatBadge
                                value={icpConfig.label}
                                label="ICP Score"
                                colorClass={icpConfig.text}
                                bgClass={icpConfig.bg}
                                borderClass={icpConfig.border}
                            />
                            <StatBadge
                                value={interactionCount}
                                label="Interactions"
                                colorClass={interactionColor}
                                bgClass={interactionBg}
                                borderClass={interactionBorder}
                            />
                            <StatBadge
                                value={cadStage}
                                label="Cadence"
                                sublabel={cadLabel}
                                colorClass={cadText}
                                bgClass={cadBg}
                                borderClass={cadBorder}
                            />
                        </div>
                    </div>

                    {/* ── Reasonings ── */}
                    {(icpReason || stageReasoning) && (
                        <div className="px-5 py-3 space-y-2 border-b border-slate-100">
                            <ReasoningBlock title={`Why ICP ${icpConfig.label}?`} text={icpReason} defaultOpen={true} />
                            <ReasoningBlock title={`Cadence Level (${cadStage}):`} text={stageReasoning} />
                        </div>
                    )}

                    {/* ── Info Row: Connection Date + Proposal ── */}
                    <div className="px-5 py-4 border-b border-slate-100">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Last Received Message */}
                            <div>
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                    <Clock size={11} /> Last Msg. Received
                                </label>
                                {lastReceivedMsg?.interaction_date ? (
                                    <div>
                                        <span className="text-sm font-bold text-slate-700 block">
                                            {getDaysAgo(lastReceivedMsg.interaction_date)}
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            {new Date(lastReceivedMsg.interaction_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-400">None</span>
                                )}
                            </div>

                            {/* Call Booked Date */}
                            <div>
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                    <Calendar size={11} /> Call Booked Date
                                </label>
                                <input
                                    type="date"
                                    value={callScheduledAt ? callScheduledAt.split('T')[0] : ''}
                                    onChange={e => {
                                        const dateVal = e.target.value ? new Date(e.target.value).toISOString() : ''
                                        setCallScheduledAt(dateVal)
                                    }}
                                    onBlur={() => save('call_scheduled_at', callScheduledAt || null)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition shadow-sm bg-white"
                                />
                            </div>

                            {/* Proposal Value */}
                            <div>
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                    <DollarSign size={11} /> Proposal Value
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={proposalValue}
                                    onChange={e => setProposalValue(e.target.value)}
                                    onBlur={handleProposalBlur}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition shadow-sm bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Observations */}
                    <div className="px-5 py-4 border-b border-slate-100">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                            <FileText size={11} /> Observations
                        </label>
                        <div className="relative group">
                            <textarea
                                value={observations}
                                onChange={e => setObservations(e.target.value)}
                                placeholder="Write important details, company pain points, confidential notes..."
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200 resize-y min-h-[100px] custom-scrollbar transition pr-4 pb-10"
                            />
                            <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                <button
                                    onClick={handleSaveObservations}
                                    disabled={isSavingObs}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-orange-600 transition shadow-sm disabled:opacity-50"
                                >
                                    {isSavingObs ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                                    Save Observation
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Pipeline & Standard Fields ── */}
                    <div className="px-5 py-4 border-b border-slate-100 space-y-4">
                        {/* Tier (Priority) */}
                            <div>
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                                    <Star size={11} /> Priority Tier
                                </label>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <button key={i} onClick={() => handleTier(i)} className="p-0.5 hover:scale-110 transition-transform">
                                            <Star size={20} style={i <= tier ? { color: '#f59e0b', fill: '#f59e0b' } : { color: '#e5e7eb', fill: '#e5e7eb' }} />
                                        </button>
                                    ))}
                                    {tier > 0 && (
                                        <button onClick={() => handleTier(0)} className="text-[10px] text-slate-400 ml-2 hover:text-slate-600 transition">
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Funnel Stage */}
                            <div>
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                                    <Target size={11} /> Funnel Stage
                                </label>
                                <select
                                    value={crmStage}
                                    onChange={e => handleStage(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200 cursor-pointer transition"
                                >
                                    <option value="">— No stage —</option>
                                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </React.Fragment>)}

                </div>
                {/* ═══ FOOTER (Actions) ═══ */}
                <div className="shrink-0 bg-slate-50 border-t border-slate-200">

                    {/* Follow-up config panel — shown when active */}
                    {isFollowup && (
                        <div className="px-5 py-3 border-b border-slate-200">
                            {/* Accordion Header */}
                            <button
                                onClick={() => setShowFollowupSettings(!showFollowupSettings)}
                                className="w-full flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <Bell size={13} className="text-orange-500" />
                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Follow-up Settings</span>
                                </div>
                                {showFollowupSettings ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                            </button>

                            {/* Accordion Body */}
                            {showFollowupSettings && (
                                <div className="mt-3 space-y-3">
                                    {/* Interval selector */}
                                    <div>
                                        <p className="text-[11px] text-slate-400 mb-2">Contact every:</p>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {[3, 7, 14].map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => handleIntervalChange(d)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${followupInterval === d && !showCustomInterval
                                                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                                                        }`}
                                                >
                                                    {d}d
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setShowCustomInterval(!showCustomInterval)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${showCustomInterval || (![3, 7, 14].includes(followupInterval))
                                                    ? 'bg-orange-500 text-white border-orange-500'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                                                    }`}
                                            >
                                                Custom
                                            </button>
                                            {showCustomInterval && (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="90"
                                                        placeholder="days"
                                                        value={customInterval}
                                                        onChange={e => setCustomInterval(e.target.value)}
                                                        className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:border-orange-300"
                                                    />
                                                    <button
                                                        onClick={handleCustomIntervalSave}
                                                        className="px-2 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition"
                                                    >OK</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Until responded toggle */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleUntilRespondedToggle}
                                            className={`relative inline-flex shrink-0 items-center w-9 h-5 rounded-full transition-colors ${followupUntilResponded ? 'bg-orange-500' : 'bg-slate-200'
                                                }`}
                                        >
                                            <span className={`inline-block w-4 h-4 rounded-full bg-white shadow transition-transform ${followupUntilResponded ? 'translate-x-[18px]' : 'translate-x-[2px]'
                                                }`} />
                                        </button>
                                        <span className="text-xs text-slate-600">Stop when lead replies</span>
                                    </div>

                                    {/* Summary line */}
                                    <p className="text-[10px] text-slate-400 italic">
                                        <Clock size={10} className="inline mr-1" />
                                        Contacting every <strong className="text-slate-600">{followupInterval} days</strong>{followupUntilResponded ? ', until they reply' : ''}.
                                    </p>

                                    {/* Schedule follow-up message button */}
                                    <div className="pt-2 border-t border-slate-100 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowScheduleMessage(true)}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 font-bold text-xs hover:bg-orange-100 hover:border-orange-300 transition-all shadow-sm"
                                        >
                                            <Calendar size={13} /> Schedule Follow-up Message
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action row */}
                    <div className="px-5 py-3.5 flex flex-wrap items-center gap-2.5">
                        {/* Follow-up Toggle */}
                        <button
                            onClick={handleFollowupToggle}
                            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${isFollowup
                                ? 'bg-orange-50 text-orange-600 border-orange-300 hover:bg-orange-100'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-orange-300 hover:text-orange-600'
                                }`}
                        >
                            {isFollowup ? <UserCheck size={14} /> : <UserPlus size={14} />}
                            {isFollowup ? 'Follow-up ON' : 'Add to Follow-up'}
                        </button>

                        {/* Pause Tasks Toggle */}
                        <button
                            onClick={handlePauseTasksToggle}
                            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${pauseAutomatedTasks
                                ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-red-300 hover:text-red-600'
                                }`}
                        >
                            {pauseAutomatedTasks ? <BotOff size={14} /> : <Bot size={14} />}
                            {pauseAutomatedTasks ? 'Daily Tasks Paused' : 'Pause Daily Tasks'}
                        </button>

                        {/* Add to Kanban */}
                        {!crmStage && (
                            <button
                                onClick={handleAddToKanban}
                                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-all"
                            >
                                <Kanban size={14} />
                                Add to Kanban
                            </button>
                        )}

                        {/* Go to Inbox */}
                        <button
                            onClick={goToInbox}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm min-w-[120px]"
                        >
                            <MessageCircle size={15} /> Go to Inbox
                        </button>

                        {/* Close */}
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Schedule Message Modal Layer */}
            {showScheduleMessage && (
                <div onClick={e => e.stopPropagation()}>
                    <ScheduleMessageModal
                        lead={lead}
                        clientId={lead.client_id}
                        onClose={() => setShowScheduleMessage(false)}
                        onSuccess={(msg) => {
                            toast.success(msg)
                            setShowScheduleMessage(false)
                        }}
                        onError={(msg) => toast.error(msg)}
                    />
                </div>
            )}
        </div>
    )
}

export default UnifiedLeadModal
