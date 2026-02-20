import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import {
    Crosshair,
    Flame,
    Trophy,
    PartyPopper,
    Loader2,
    RefreshCw,
    AlertTriangle,
    Sparkles,
    TrendingUp,
    Users,
    DollarSign,
    HandMetal,
    MessageCircle,
    CheckCircle2,
    Hammer,
    Zap
} from 'lucide-react'

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const HOT_STAGES = ['G4', 'G5']

// Light theme cadence styles
const CADENCE_STYLES = {
    G1: 'bg-gray-100 text-gray-600 border-gray-300',
    G2: 'bg-blue-50 text-blue-600 border-blue-200',
    G3: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    G4: 'bg-orange-50 text-orange-600 border-orange-200',
    G5: 'bg-red-50 text-red-600 border-red-200',
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT — ADMIN PANEL (Command Center)
// ═══════════════════════════════════════════════

const AdminPanel = () => {
    const { user, profile } = useAuth()
    const { selectedClientId } = useClientSelection()

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [stats, setStats] = useState({
        doneToday: 0,
        pendingTotal: 0,
        hotLeads: 0
    })
    const [criticalTasks, setCriticalTasks] = useState([])
    const [radarLeads, setRadarLeads] = useState([])
    const [completingIds, setCompletingIds] = useState(new Set())

    // ───────────────────────────────────────────
    // DATA FETCHING
    // ───────────────────────────────────────────

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!user?.id) return
        if (isRefresh) setRefreshing(true)
        else setLoading(true)

        try {
            const today = new Date().toISOString().split('T')[0]

            // 1. Stats: Done Today
            let doneQuery = supabase
                .from('tasks')
                .select('id, leads!inner(client_id)', { count: 'exact', head: true })
                .eq('status', 'DONE')
                .gte('updated_at', `${today}T00:00:00`)

            if (selectedClientId) doneQuery = doneQuery.eq('leads.client_id', selectedClientId)

            // 2. Stats: Pending Total
            let pendingStatsQuery = supabase
                .from('tasks')
                .select('id, leads!inner(client_id)', { count: 'exact', head: true })
                .eq('status', 'PENDING')

            if (selectedClientId) pendingStatsQuery = pendingStatsQuery.eq('leads.client_id', selectedClientId)

            // 3. Critical Tasks (Focus) - G4/G5
            let pendingQuery = supabase
                .from('tasks')
                .select('*, leads!inner(id, client_id, nome, empresa, headline, linkedin_profile_url, cadence_stage, total_interactions_count, avatar_url)')
                .eq('status', 'PENDING')
                .order('created_at', { ascending: true })

            if (selectedClientId) pendingQuery = pendingQuery.eq('leads.client_id', selectedClientId)

            // 4. Radar Leads (Responding/Hot)
            let radarQuery = supabase
                .from('leads')
                .select('id, nome, empresa, headline, cadence_stage, total_interactions_count, updated_at, linkedin_profile_url, avatar_url')
                .gt('total_interactions_count', 0)
                .order('updated_at', { ascending: false })
                .limit(10)

            if (selectedClientId) radarQuery = radarQuery.eq('client_id', selectedClientId)

            // Execute all
            const [doneRes, pendingStatsRes, tasksRes, radarRes] = await Promise.all([
                doneQuery,
                pendingStatsQuery,
                pendingQuery,
                radarQuery
            ])

            if (tasksRes.error) throw tasksRes.error
            if (radarRes.error) throw radarRes.error

            const allPending = tasksRes.data || []
            const g4g5 = allPending.filter(t => HOT_STAGES.includes(t.leads?.cadence_stage))

            // If we have G4/G5, show them. If not, show G1/G2/G3 (up to 3)
            const focusTasks = g4g5.length > 0 ? g4g5.slice(0, 3) : allPending.slice(0, 3)

            setStats({
                doneToday: doneRes.count || 0,
                pendingTotal: pendingStatsRes.count || 0,
                hotLeads: g4g5.length
            })

            setCriticalTasks(focusTasks)
            setRadarLeads(radarRes.data || [])

        } catch (err) {
            console.error('Error fetching command center data:', err)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [user?.id, selectedClientId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // ───────────────────────────────────────────
    // ACTIONS
    // ───────────────────────────────────────────

    const handleComplete = async (taskId) => {
        setCompletingIds(prev => new Set(prev).add(taskId))

        // Optimistic update
        setCriticalTasks(prev => prev.filter(t => t.id !== taskId))
        setStats(prev => ({
            ...prev,
            doneToday: prev.doneToday + 1,
            pendingTotal: Math.max(0, prev.pendingTotal - 1)
        }))

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ status: 'DONE' })
                .eq('id', taskId)

            if (error) throw error
        } catch (err) {
            console.error('Error completing task:', err)
            fetchData(true) // Revert on error
        } finally {
            setCompletingIds(prev => {
                const next = new Set(prev)
                next.delete(taskId)
                return next
            })
        }
    }

    const navigate = useNavigate()

    const handleExecute = (leadId) => {
        if (leadId) {
            navigate(`/sales/inbox?leadId=${leadId}`)
        }
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Bom dia'
        if (hour < 18) return 'Boa tarde'
        return 'Boa noite'
    }

    const progressPercent = useMemo(() => {
        const total = stats.doneToday + stats.pendingTotal
        if (total === 0) return 0
        return Math.round((stats.doneToday / total) * 100)
    }, [stats])

    // ───────────────────────────────────────────
    // RENDER
    // ───────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                            <Crosshair size={20} className="text-orange-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                                {getGreeting()}, {profile?.name?.split(' ')[0] || 'Comandante'} 🎯
                            </h1>
                            <p className="text-sm text-gray-500">Command Center · Onde você ganha dinheiro agora</p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchData(true)}
                        className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                        disabled={refreshing}
                    >
                        <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* PLACAR DO DIA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Ring Chart */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Meta Diária</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-gray-900">{progressPercent}%</span>
                                <span className="text-sm text-gray-400">concluído</span>
                            </div>
                        </div>
                        <ProgressRing percent={progressPercent} size={80} stroke={6} />
                    </div>

                    {/* Stats */}
                    <div className="col-span-2 grid grid-cols-3 gap-4">
                        <KpiCard
                            icon={<CheckCircle2 size={18} />}
                            label="Concluídas Hoje"
                            value={stats.doneToday}
                            accent="text-green-600"
                        />
                        <KpiCard
                            icon={<Loader2 size={18} />}
                            label="Pendentes"
                            value={stats.pendingTotal}
                            accent="text-gray-900"
                        />
                        <KpiCard
                            icon={<Flame size={18} />}
                            label="Leads Quentes"
                            value={stats.hotLeads}
                            accent="text-orange-500"
                        />
                    </div>
                </div>

                {/* FOCO TOTAL (HERO SECTION) */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="text-orange-500" size={20} />
                        <h2 className="text-lg font-bold text-gray-900">Foco Total</h2>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                            Prioridade Máxima
                        </span>
                    </div>

                    {criticalTasks.length > 0 ? (
                        <div className="space-y-3">
                            {criticalTasks.map((task, idx) => (
                                <HeroTaskCard
                                    key={task.id}
                                    task={task}
                                    index={idx}
                                    completing={completingIds.has(task.id)}
                                    onComplete={handleComplete}
                                    onExecute={handleExecute}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center flex flex-col items-center justify-center dashed-border">
                            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                                <PartyPopper className="text-green-500" size={24} />
                            </div>
                            <h3 className="text-gray-900 font-bold mb-1">Tudo limpo por aqui!</h3>
                            <p className="text-gray-500 text-sm">Nenhuma tarefa crítica pendente no momento.</p>
                        </div>
                    )}
                </div>

                {/* RADAR DE OPORTUNIDADES */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="text-blue-500" size={20} />
                            <h2 className="text-lg font-bold text-gray-900">Radar de Oportunidades</h2>
                        </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                        {radarLeads.length > 0 ? (
                            radarLeads.map(lead => (
                                <RadarLeadCard key={lead.id} lead={lead} />
                            ))
                        ) : (
                            <div className="text-sm text-gray-400 italic p-4">Nenhuma atividade recente no radar.</div>
                        )}
                    </div>
                </div>

            </div>

            {/* Quick Actions Bar (Bottom) */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-gray-200 shadow-xl rounded-full px-6 py-3 flex items-center gap-4 z-50">
                <button
                    onClick={() => window.location.href = '/campaigns'}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-orange-600 transition-colors"
                >
                    <Users size={16} />
                    Novo Lead Manual
                </button>
                <div className="w-px h-4 bg-gray-300" />
                <button
                    onClick={() => window.location.href = '/missions'}
                    className="flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors"
                >
                    <Trophy size={16} />
                    Abrir Cockpit Completo
                </button>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════

const ProgressRing = ({ percent, size = 110, stroke = 8 }) => {
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percent / 100) * circumference
    const color = percent === 100 ? '#16a34a' : '#f97316' // green-600 : orange-500

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="#f3f4f6" // gray-100
                    strokeWidth={stroke}
                />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease' }}
                />
            </svg>
        </div>
    )
}

const KpiCard = ({ icon, label, value, accent = 'text-gray-900' }) => (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md hover:border-gray-300 transition-all duration-300">
        <div className="flex items-center gap-2 text-gray-400">
            {icon}
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        </div>
        <span className={`text-3xl font-bold ${accent} tracking-tight`}>{value}</span>
    </div>
)

const HeroTaskCard = ({ task, index, completing, onComplete, onExecute }) => {
    const lead = task.leads || {}
    const initial = lead.nome?.charAt(0)?.toUpperCase() || '?'
    const stage = lead.cadence_stage || ''
    const stageStyle = CADENCE_STYLES[stage] || 'bg-gray-100 text-gray-500 border-gray-200'
    const interactionCount = lead.total_interactions_count || 0
    const isFirstContact = interactionCount === 0

    const borderColors = ['border-l-red-500', 'border-l-orange-500', 'border-l-amber-500']
    const borderColor = borderColors[index] || borderColors[2]

    return (
        <div
            className={`
                bg-white rounded-2xl border border-gray-200 p-5 border-l-[4px] ${borderColor}
                transition-all duration-300 ease-out
                hover:shadow-lg hover:border-gray-300
                ${completing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}
            `}
        >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Lead Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {lead.avatar_url ? (
                        <img
                            src={lead.avatar_url}
                            alt={lead.nome}
                            className="w-11 h-11 rounded-xl shrink-0 object-cover border border-gray-200"
                        />
                    ) : (
                        <div className="w-11 h-11 rounded-xl shrink-0 bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-700">{initial}</span>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-sm font-bold text-gray-900 truncate">{lead.nome || 'Lead'}</h4>
                            {stage && (
                                <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-md border ${stageStyle}`}>
                                    {stage}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                            {lead.headline || ''}
                            {lead.empresa && lead.headline ? ` · ${lead.empresa}` : lead.empresa || ''}
                        </p>
                    </div>
                </div>

                {/* AI Instruction */}
                {task.instruction && (
                    <div className="flex-1 min-w-0 hidden md:block">
                        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            <span className="mr-1">💡</span>{task.instruction}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {lead?.id && (
                        <button
                            onClick={() => onExecute(lead.id)}
                            className={`
                                flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200
                                ${isFirstContact
                                    ? 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100'
                                    : 'bg-orange-500 text-white border border-orange-500 hover:bg-orange-600'
                                }
                            `}
                        >
                            {isFirstContact ? <><HandMetal size={13} /> Icebreaker</> : <><MessageCircle size={13} /> Conversar</>}
                        </button>
                    )}
                    <button
                        onClick={() => onComplete(task.id)}
                        disabled={completing}
                        className="p-2.5 rounded-xl bg-gray-50 text-gray-400 border border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all duration-200"
                        title="Concluir tarefa"
                    >
                        {completing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    </button>
                </div>
            </div>

            {/* Mobile instruction */}
            {task.instruction && (
                <div className="mt-3 md:hidden">
                    <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                        <span className="mr-1">💡</span>{task.instruction}
                    </p>
                </div>
            )}
        </div>
    )
}

const RadarLeadCard = ({ lead }) => {
    const initial = lead.nome?.charAt(0)?.toUpperCase() || '?'
    const stage = lead.cadence_stage || ''
    const stageStyle = CADENCE_STYLES[stage] || 'bg-gray-100 text-gray-500 border-gray-200'

    const timeAgo = (dateStr) => {
        if (!dateStr) return ''
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 60) return `${mins}min`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `${hours}h`
        const days = Math.floor(hours / 24)
        return `${days}d`
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-[200px] max-w-[240px] shrink-0 hover:shadow-md hover:border-gray-300 transition-all duration-300 cursor-default">
            <div className="flex items-center gap-3 mb-3">
                {lead.avatar_url ? (
                    <img
                        src={lead.avatar_url}
                        alt={lead.nome}
                        className="w-9 h-9 rounded-lg shrink-0 object-cover border border-gray-200"
                    />
                ) : (
                    <div className="w-9 h-9 rounded-lg shrink-0 bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-gray-600">{initial}</span>
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-gray-900 truncate">{lead.nome || 'Lead'}</h4>
                    <p className="text-[10px] text-gray-500 truncate">{lead.empresa || lead.headline || ''}</p>
                </div>
            </div>

            <div className="flex items-center justify-between mb-3">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${stageStyle}`}>
                    {stage || 'Novo'}
                </span>
                <span className="text-[9px] text-gray-400 flex items-center gap-1">
                    <MessageCircle size={10} /> {lead.total_interactions_count || 0}
                </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-[10px] text-gray-400">{timeAgo(lead.updated_at)} atrás</span>
                {lead.linkedin_profile_url && (
                    <a
                        href={lead.linkedin_profile_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-orange-600 hover:text-orange-700 hover:underline"
                    >
                        Ver perfil
                    </a>
                )}
            </div>
        </div>
    )
}

export default AdminPanel
