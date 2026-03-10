import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import SafeImage from '../components/SafeImage'
import {
    Crosshair, Flame, TrendingUp, Snowflake,
    Loader2, RefreshCw, AlertTriangle, Trophy, PartyPopper,
    MessageCircle, CheckCircle2, HandMetal, Ban
} from 'lucide-react'

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const VISIBLE_COLD_CARDS = 8
const ICP_PRIORITY = { A: 0, B: 1, C: 2 }

const CADENCE_STYLES = {
    G1: 'bg-gray-100 text-gray-600 border-gray-300',
    G2: 'bg-blue-50 text-blue-600 border-blue-200',
    G3: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    G4: 'bg-orange-50 text-orange-600 border-orange-200',
    G5: 'bg-red-50 text-red-600 border-red-200',
}

const ICP_STYLES = {
    A: 'bg-green-50 text-green-700 border-green-300 font-bold',
    B: 'bg-blue-50 text-blue-600 border-blue-200 font-bold',
    C: 'bg-gray-100 text-gray-500 border-gray-300 font-bold',
}

const COLUMN_THEMES = {
    hot: {
        borderTop: 'linear-gradient(90deg, #ef4444, #f97316)',
        headerBg: 'bg-orange-50', headerBorder: 'border-orange-200',
        countBg: 'bg-orange-100', countText: 'text-orange-600', countBorder: 'border-orange-200',
        iconColor: 'text-orange-500', cardBorder: 'border-l-orange-400',
        emptyBg: 'bg-orange-50', emptyBorder: 'border-orange-200',
    },
    warm: {
        borderTop: 'linear-gradient(90deg, #eab308, #f59e0b)',
        headerBg: 'bg-yellow-50', headerBorder: 'border-yellow-200',
        countBg: 'bg-yellow-100', countText: 'text-yellow-600', countBorder: 'border-yellow-200',
        iconColor: 'text-yellow-500', cardBorder: 'border-l-yellow-400',
        emptyBg: 'bg-yellow-50', emptyBorder: 'border-yellow-200',
    },
    cold: {
        borderTop: 'linear-gradient(90deg, #3b82f6, #94a3b8)',
        headerBg: 'bg-blue-50', headerBorder: 'border-blue-200',
        countBg: 'bg-blue-100', countText: 'text-blue-600', countBorder: 'border-blue-200',
        iconColor: 'text-blue-500', cardBorder: 'border-l-blue-300',
        emptyBg: 'bg-blue-50', emptyBorder: 'border-blue-200',
    },
}

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const needsFollowup = (lead) => {
    if (!lead.last_task_completed_at) return false
    return new Date(lead.last_task_completed_at) < new Date(Date.now() - SEVEN_DAYS_MS) && !lead.has_engaged
}

const isNewLead = (lead) => !lead.total_interactions_count || parseInt(lead.total_interactions_count, 10) === 0

// ═══════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════

const FeedSection = ({ title, icon, count, themeKey, children, footer, emptyText }) => {
    const theme = COLUMN_THEMES[themeKey]
    const isEmpty = React.Children.count(children) === 0
    return (
        <div className="rounded-2xl overflow-hidden border border-gray-200 flex flex-col shadow-sm bg-white">
            <div className="h-[3px] w-full shrink-0" style={{ background: theme.borderTop }} />
            <div className={`flex items-center justify-between px-4 py-3 ${theme.headerBg} border-b ${theme.headerBorder}`}>
                <div className="flex items-center gap-2">
                    <span className={theme.iconColor}>{icon}</span>
                    <h3 className="text-xs font-bold text-gray-700 tracking-wider uppercase">{title}</h3>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${theme.countBg} ${theme.countText} border ${theme.countBorder}`}>
                    {count}
                </span>
            </div>
            <div className="flex-1 p-3 space-y-3 overflow-y-auto" style={{ maxHeight: '70vh', minHeight: '120px' }}>
                {isEmpty ? (
                    <div className={`flex items-center justify-center py-10 px-4 rounded-xl ${theme.emptyBg} border ${theme.emptyBorder}`}>
                        <p className="text-xs text-gray-400 text-center">{emptyText}</p>
                    </div>
                ) : children}
            </div>
            {footer}
        </div>
    )
}

const LeadCard = ({ lead, themeKey, completing, blacklisting, onComplete, onBlacklist, onInbox }) => {
    const theme = COLUMN_THEMES[themeKey]
    const initial = lead.nome?.charAt(0)?.toUpperCase() || '?'
    const stage = lead.cadence_stage || ''
    const stageStyle = CADENCE_STYLES[stage] || 'bg-gray-100 text-gray-500 border-gray-200'
    const isRemoving = completing || blacklisting
    const followup = needsFollowup(lead)

    return (
        <div className={`rounded-xl group transition-all duration-300 ease-out bg-white border border-gray-200 hover:shadow-md hover:border-gray-300 border-l-[3px] ${theme.cardBorder} ${isRemoving ? 'opacity-0 scale-95 translate-x-4 pointer-events-none' : 'opacity-100 scale-100 translate-x-0'}`}>
            <div className="p-4">
                {/* Row 1: Avatar + Lead Info */}
                <div className="flex items-start gap-3 mb-3">
                    {lead.avatar_url ? (
                        <SafeImage
                            src={lead.avatar_url}
                            alt={lead.nome || 'Lead'}
                            className="w-10 h-10 rounded-lg shrink-0 object-cover border border-gray-200 shadow-sm"
                            fallbackText={initial}
                            containerClassName="w-10 h-10 rounded-lg shrink-0 bg-gray-100 border border-gray-200 shadow-sm"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg shrink-0 bg-gray-100 border border-gray-200 flex items-center justify-center shadow-sm">
                            <span className="text-sm font-bold text-gray-600">{initial}</span>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">{lead.nome || 'Lead'}</h4>
                            {stage && (
                                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${stageStyle}`}>{stage}</span>
                            )}
                            {lead.icp_score && (
                                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${ICP_STYLES[lead.icp_score] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                    {lead.icp_score}
                                </span>
                            )}
                            {followup && (
                                <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-orange-50 text-orange-600 border-orange-200 flex items-center gap-1">
                                    <AlertTriangle size={9} /> Follow-up
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 leading-tight">
                            {lead.headline || ''}
                            {lead.empresa && lead.headline ? ` · ${lead.empresa}` : lead.empresa || ''}
                        </p>
                    </div>
                </div>

                {/* Row 2: Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onInbox(lead.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-semibold transition-all duration-200 shadow-sm bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 hover:shadow-md"
                        title={isNewLead(lead) ? 'Send first contact' : 'Continue chat'}
                    >
                        {isNewLead(lead) ? <><HandMetal size={14} /><span>Icebreaker</span></> : <><MessageCircle size={14} /><span>Continue Chat</span></>}
                    </button>

                    <button
                        onClick={() => onComplete(lead.id)}
                        disabled={isRemoving}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[12px] font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-500 hover:text-white hover:border-green-500 hover:shadow-md transition-all duration-200 shadow-sm disabled:opacity-50"
                        title="Mark as Completed"
                    >
                        {completing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        <span>Complete</span>
                    </button>

                    <button
                        onClick={() => onBlacklist(lead.id)}
                        disabled={isRemoving}
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 bg-white border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all duration-200 shadow-sm disabled:opacity-50"
                        title="Blacklist"
                    >
                        {blacklisting ? <Loader2 size={13} className="animate-spin" /> : <Ban size={14} />}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════

const MissionsPage = () => {
    const navigate = useNavigate()
    const { selectedClientId } = useClientSelection()

    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(null)
    const [actionState, setActionState] = useState({}) // { [id]: 'completing' | 'blacklisting' }
    const [showAllCold, setShowAllCold] = useState(false)
    const [doneToday, setDoneToday] = useState(0)

    const fetchTasks = useCallback(async (isRefresh = false) => {
        if (!selectedClientId) { setLoading(false); return }
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        setError(null)

        try {
            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)

            const [pendingResult, doneResult] = await Promise.all([
                supabase
                    .from('tasks')
                    .select('*, lead:leads!inner(id, client_id, nome, empresa, headline, avatar_url, icp_score, cadence_stage, has_engaged, last_task_completed_at, total_interactions_count, linkedin_profile_url, crm_stage)')
                    .eq('leads.client_id', selectedClientId)
                    .eq('status', 'PENDING')
                    .gte('created_at', todayStart.toISOString())
                    .order('created_at', { ascending: true })
                    .limit(30),
                supabase
                    .from('tasks')
                    .select('id, leads!inner(client_id)', { count: 'exact' })
                    .eq('leads.client_id', selectedClientId)
                    .eq('status', 'COMPLETED')
                    .gte('completed_at', `${new Date().toISOString().split('T')[0]}T00:00:00`)
                    .limit(1)
            ])

            if (pendingResult.error) throw pendingResult.error

            // Active tasks need sort applying the existing ICP metric priority on the inner lead object
            const activeTasks = (pendingResult.data || []).sort((a, b) => {
                const aIcp = ICP_PRIORITY[a.lead?.icp_score] ?? 3
                const bIcp = ICP_PRIORITY[b.lead?.icp_score] ?? 3
                return aIcp - bIcp
            })

            setTasks(activeTasks)
            setDoneToday(doneResult.count || 0)
        } catch (err) {
            console.error('[Cockpit] fetch error:', err)
            setError('Failed to load tasks. Please try again.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [selectedClientId])

    useEffect(() => { fetchTasks() }, [fetchTasks])

    const removeOptimistically = (taskId) => setTasks(prev => prev.filter(t => t.id !== taskId))

    const handleComplete = async (taskId) => {
        setActionState(prev => ({ ...prev, [taskId]: 'completing' }))

        const taskObj = tasks.find(t => t.id === taskId)

        setTimeout(() => {
            removeOptimistically(taskId)
            setDoneToday(d => d + 1)
        }, 300)

        try {
            await supabase.from('tasks').update({ status: 'COMPLETED', completed_at: new Date().toISOString() }).eq('id', taskId)
            if (taskObj?.lead?.id) {
                await supabase.from('leads').update({ last_task_completed_at: new Date().toISOString() }).eq('id', taskObj.lead.id)
            }
        } catch (err) {
            console.error('[Cockpit] complete error:', err)
            fetchTasks(true)
        } finally {
            setActionState(prev => { const n = { ...prev }; delete n[taskId]; return n })
        }
    }

    const handleBlacklist = async (taskId) => {
        setActionState(prev => ({ ...prev, [taskId]: 'blacklisting' }))

        const taskObj = tasks.find(t => t.id === taskId)

        setTimeout(() => removeOptimistically(taskId), 300)
        try {
            await supabase.from('tasks').update({ status: 'CANCELLED', completed_at: new Date().toISOString() }).eq('id', taskId)
            if (taskObj?.lead?.id) {
                await supabase.from('leads').update({ is_blacklisted: true }).eq('id', taskObj.lead.id)
            }
        } catch (err) {
            console.error('[Cockpit] blacklist error:', err)
            fetchTasks(true)
        } finally {
            setActionState(prev => { const n = { ...prev }; delete n[taskId]; return n })
        }
    }

    const handleInbox = (leadId) => navigate(`/sales/inbox?leadId=${leadId}`)

    // Split valid tasks into columns by getting the cadence_stage from the inner lead object
    const { hotTasks, warmTasks, coldTasks } = useMemo(() => {
        return {
            hotTasks: tasks.filter(t => t.lead?.cadence_stage === 'G4' || t.lead?.cadence_stage === 'G5'),
            warmTasks: tasks.filter(t => t.lead?.cadence_stage === 'G2' || t.lead?.cadence_stage === 'G3'),
            coldTasks: tasks.filter(t => t.lead?.cadence_stage === 'G1' || !t.lead?.cadence_stage),
        }
    }, [tasks])

    const visibleColdTasks = showAllCold ? coldTasks : coldTasks.slice(0, VISIBLE_COLD_CARDS)
    const hiddenColdCount = coldTasks.length - VISIBLE_COLD_CARDS
    const allDone = tasks.length === 0 && !loading

    const getGreeting = () => {
        const h = new Date().getHours()
        if (h < 12) return 'Good morning'
        if (h < 18) return 'Good afternoon'
        return 'Good evening'
    }

    const totalMissions = tasks.length + doneToday
    const progressPercent = totalMissions > 0 ? Math.round((doneToday / totalMissions) * 100) : 0

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="tracking-wide uppercase text-xs font-bold text-gray-400">Loading cockpit...</span>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">

                {/* HEADER + PROGRESS */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 mb-6">
                    <div className="flex items-start justify-between gap-4 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                                <Crosshair size={20} className="text-orange-500" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-1 leading-tight">
                                    {getGreeting()}! Complete your daily tasks and hit your goals! 🎯
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {hotTasks.length > 0
                                        ? <><span className="text-orange-500 font-semibold">{hotTasks.length} hot</span> · {warmTasks.length} nurturing · {coldTasks.length} new contacts</>
                                        : tasks.length > 0
                                            ? <>{tasks.length} tasks waiting execution.</>
                                            : 'No pending tasks!'
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => fetchTasks(true)}
                            disabled={refreshing}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Today's Progress</span>
                            <span className="text-sm font-bold text-gray-700">{doneToday}/{totalMissions} completed</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                            <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                    width: `${progressPercent}%`,
                                    background: progressPercent === 100
                                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                                        : 'linear-gradient(90deg, #ff4d00, #ff8800)',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* ERROR */}
                {error && (
                    <div className="bg-white rounded-2xl border border-red-200 p-8 mb-6">
                        <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                            <AlertTriangle size={28} className="text-red-500" />
                            <p className="text-sm text-gray-600">{error}</p>
                            <button onClick={() => fetchTasks()} className="px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium border border-gray-200 transition-all">
                                Try again
                            </button>
                        </div>
                    </div>
                )}

                {/* ALL DONE */}
                {allDone && !error && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-10 sm:p-16 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center">
                                {doneToday > 0 ? <Trophy size={32} className="text-green-500" /> : <PartyPopper size={32} className="text-green-500" />}
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {doneToday > 0 ? 'Empty Cockpit! 🏆' : 'All caught up! 🎉'}
                        </h2>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            {doneToday > 0
                                ? `You completed ${doneToday} tasks today. Excellent work!`
                                : 'No pending tasks. When there are leads to reach out to, they will appear here.'
                            }
                        </p>
                    </div>
                )}

                {/* 3-COLUMN BOARD */}
                {!allDone && !error && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* HOT G4/G5 */}
                        <FeedSection title="HOT (G4/G5)" icon={<Flame size={15} />} count={hotTasks.length} themeKey="hot" emptyText="No hot leads for today.">
                            {hotTasks.map(task => (
                                <LeadCard key={task.id} lead={task.lead} themeKey="hot"
                                    completing={actionState[task.id] === 'completing'}
                                    blacklisting={actionState[task.id] === 'blacklisting'}
                                    onComplete={() => handleComplete(task.id)} onBlacklist={() => handleBlacklist(task.id)} onInbox={() => handleInbox(task.lead.id)} />
                            ))}
                        </FeedSection>

                        {/* MORNOS G2/G3 */}
                        <FeedSection title="MORNOS (G2/G3)" icon={<TrendingUp size={15} />} count={warmTasks.length} themeKey="warm" emptyText="No nurturing tasks.">
                            {warmTasks.map(task => (
                                <LeadCard key={task.id} lead={task.lead} themeKey="warm"
                                    completing={actionState[task.id] === 'completing'}
                                    blacklisting={actionState[task.id] === 'blacklisting'}
                                    onComplete={() => handleComplete(task.id)} onBlacklist={() => handleBlacklist(task.id)} onInbox={() => handleInbox(task.lead.id)} />
                            ))}
                        </FeedSection>

                        {/* FRIOS G1 */}
                        <FeedSection
                            title="FRIOS (G1)"
                            icon={<Snowflake size={15} />}
                            count={coldTasks.length}
                            themeKey="cold"
                            emptyText="No pending prospecting."
                            footer={
                                hiddenColdCount > 0 && !showAllCold ? (
                                    <button onClick={() => setShowAllCold(true)} className="w-full py-3 text-center text-xs font-semibold text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-t border-blue-200 transition-colors rounded-b-2xl">
                                        Show {hiddenColdCount} more tasks
                                    </button>
                                ) : showAllCold && coldTasks.length > VISIBLE_COLD_CARDS ? (
                                    <button onClick={() => setShowAllCold(false)} className="w-full py-3 text-center text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border-t border-gray-200 transition-colors rounded-b-2xl">
                                        Show less
                                    </button>
                                ) : null
                            }
                        >
                            {visibleColdTasks.map(task => (
                                <LeadCard key={task.id} lead={task.lead} themeKey="cold"
                                    completing={actionState[task.id] === 'completing'}
                                    blacklisting={actionState[task.id] === 'blacklisting'}
                                    onComplete={() => handleComplete(task.id)} onBlacklist={() => handleBlacklist(task.id)} onInbox={() => handleInbox(task.lead.id)} />
                            ))}
                        </FeedSection>

                    </div>
                )}
            </div>
        </div>
    )
}

export default MissionsPage
