import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import {
    Flame,
    Send,
    MessageSquare,
    FileText,
    ExternalLink,
    CheckCircle2,
    Trophy,
    PartyPopper,
    Loader2,
    RefreshCw,
    AlertTriangle,
    Rocket,
    Zap,
    Target,
    Hammer,
    Linkedin,
    Sparkles,
    TrendingUp,
    HandMetal,
    MessageCircle,
    Users,
    DollarSign
} from 'lucide-react'

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const HOT_STAGES = ['G4', 'G5']

const CADENCE_LABELS = {
    G1: 'Primeiro Contato',
    G2: 'Networking',
    G3: 'Nutrição',
    G4: 'Aquecido',
    G5: 'Pronto p/ Fechar',
}

const CADENCE_STYLES = {
    G1: 'bg-slate-800 text-slate-300 border-slate-600',
    G2: 'bg-blue-900/50 text-blue-300 border-blue-700',
    G3: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
    G4: 'bg-orange-900/50 text-orange-300 border-orange-700',
    G5: 'bg-red-900/50 text-red-300 border-red-700',
}

const COLUMN_THEMES = {
    hot: {
        borderTop: 'linear-gradient(90deg, #ef4444, #f97316)',
        headerBg: 'bg-red-500/[0.06]',
        headerBorder: 'border-red-500/15',
        countBg: 'bg-red-900/40',
        countText: 'text-red-400',
        countBorder: 'border-red-700/50',
        iconColor: 'text-red-400',
        cardBorder: 'border-l-orange-500/60',
        columnBg: 'rgba(239, 68, 68, 0.015)',
        emptyBg: 'bg-red-500/5',
        emptyBorder: 'border-red-500/10',
    },
    cold: {
        borderTop: 'linear-gradient(90deg, #3b82f6, #64748b)',
        headerBg: 'bg-blue-500/[0.06]',
        headerBorder: 'border-blue-500/15',
        countBg: 'bg-blue-900/40',
        countText: 'text-blue-400',
        countBorder: 'border-blue-700/50',
        iconColor: 'text-blue-400',
        cardBorder: 'border-l-blue-500/30',
        columnBg: 'rgba(59, 130, 246, 0.015)',
        emptyBg: 'bg-blue-500/5',
        emptyBorder: 'border-blue-500/10',
    },
    warm: {
        borderTop: 'linear-gradient(90deg, #eab308, #f59e0b)',
        headerBg: 'bg-yellow-500/[0.06]',
        headerBorder: 'border-yellow-500/15',
        countBg: 'bg-yellow-900/40',
        countText: 'text-yellow-400',
        countBorder: 'border-yellow-700/50',
        iconColor: 'text-yellow-400',
        cardBorder: 'border-l-yellow-500/50',
        columnBg: 'rgba(234, 179, 8, 0.015)',
        emptyBg: 'bg-yellow-500/5',
        emptyBorder: 'border-yellow-500/10',
    }
}

const VISIBLE_COLD_CARDS = 8

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

const SalesCockpit = () => {
    const { selectedClientId } = useClientSelection()
    const [tasks, setTasks] = useState([])
    const [doneCount, setDoneCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [refreshing, setRefreshing] = useState(false)
    const [completingIds, setCompletingIds] = useState(new Set())
    const [showAllCold, setShowAllCold] = useState(false)

    const fetchTasks = useCallback(async (isRefresh = false) => {
        if (!selectedClientId) {
            setTasks([])
            setDoneCount(0)
            setLoading(false)
            return
        }

        if (isRefresh) setRefreshing(true)
        else setLoading(true)

        setError(null)

        try {
            const [pendingResult, doneResult] = await Promise.all([
                supabase
                    .from('tasks')
                    .select('*, lead:leads!inner(id, client_id, nome, empresa, headline, linkedin_profile_url, cadence_stage, total_interactions_count, avatar_url)')
                    .eq('leads.client_id', selectedClientId)
                    .eq('status', 'PENDING')
                    .order('created_at', { ascending: true }),
                supabase
                    .from('tasks')
                    .select('id, leads!inner(client_id)', { count: 'exact' })
                    .eq('leads.client_id', selectedClientId)
                    .eq('status', 'COMPLETED')
                    .gte('completed_at', `${new Date().toISOString().split('T')[0]}T00:00:00`)
                    .limit(1)
            ])

            if (pendingResult.error) throw pendingResult.error

            const activeTasks = pendingResult.data || []
            console.log('Tarefas carregadas:', activeTasks)
            setTasks(activeTasks)
            setDoneCount(doneResult.count || 0)
        } catch (err) {
            console.error('Error fetching cockpit tasks:', err)
            setError('Falha ao carregar tarefas. Tente novamente.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [selectedClientId])

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    const handleComplete = async (taskId) => {
        setCompletingIds(prev => new Set(prev).add(taskId))
        setTasks(prev => prev.filter(t => t.id !== taskId))
        setDoneCount(prev => prev + 1)

        try {
            const { error: updateError } = await supabase
                .from('tasks')
                .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
                .eq('id', taskId)

            if (updateError) throw updateError
        } catch (err) {
            console.error('Error completing task:', err)
            fetchTasks(true)
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

    // Split by cadence_stage (HOT: G4/G5, WARM: G2/G3, COLD: G1)
    const { hotTasks, warmTasks, coldTasks } = useMemo(() => {
        const hot = tasks.filter(t =>
            t.lead?.cadence_stage === 'G4' || t.lead?.cadence_stage === 'G5'
        );

        const warm = tasks.filter(t =>
            t.lead?.cadence_stage === 'G2' || t.lead?.cadence_stage === 'G3'
        );

        const cold = tasks.filter(t =>
            t.lead?.cadence_stage === 'G1'
        );

        return { hotTasks: hot, warmTasks: warm, coldTasks: cold }
    }, [tasks])

    const totalMissions = tasks.length + doneCount
    const progressPercent = totalMissions > 0 ? Math.round((doneCount / totalMissions) * 100) : 0
    const allDone = tasks.length === 0 && !loading

    // Cold column: show first N or all
    const visibleColdTasks = showAllCold ? coldTasks : coldTasks.slice(0, VISIBLE_COLD_CARDS)
    const hiddenColdCount = coldTasks.length - VISIBLE_COLD_CARDS

    // --- LOADING STATE ---
    if (loading) {
        return (
            <div className="glass-panel rounded-2xl p-8 mb-8 animate-fade-in-up">
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="tracking-wide uppercase text-xs font-bold text-gray-400">
                        Carregando cockpit...
                    </span>
                </div>
            </div>
        )
    }

    // --- ERROR STATE ---
    if (error) {
        return (
            <div className="glass-panel rounded-2xl p-8 mb-8 border-red-500/20 animate-fade-in-up">
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <AlertTriangle size={28} className="text-red-400" />
                    </div>
                    <p className="text-sm text-gray-400">{error}</p>
                    <button
                        onClick={() => fetchTasks()}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium border border-glass-border transition-all"
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        )
    }

    // --- NO CLIENT ---
    if (!selectedClientId) {
        return (
            <div className="glass-panel rounded-2xl p-8 mb-8 animate-fade-in-up">
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                    <Target size={32} className="text-gray-600" />
                    <p className="text-sm text-gray-400">Selecione um cliente para ver o Cockpit.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="mb-8 animate-fade-in-up">
            {/* ═══════════════════════════════════════ */}
            {/* HEADER + PROGRESS                      */}
            {/* ═══════════════════════════════════════ */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 mb-5">
                <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Rocket size={20} className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-0.5">
                                Sales Cockpit 🚀
                            </h2>
                            <p className="text-sm text-gray-400">
                                {hotTasks.length > 0
                                    ? <><span className="text-red-400 font-semibold">{hotTasks.length} quente(s)</span> · {warmTasks.length} em nutrição · {coldTasks.length} novos contatos</>
                                    : tasks.length > 0
                                        ? <>{tasks.length} tarefa(s) pendente(s)</>
                                        : 'Nenhuma tarefa pendente!'
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchTasks(true)}
                        disabled={refreshing}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-white"
                        title="Atualizar"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Progresso do dia</span>
                        <span className="text-sm font-bold text-gray-300">{doneCount}/{totalMissions} concluídas</span>
                    </div>
                    <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden border border-white/[0.08]">
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                                width: `${progressPercent}%`,
                                background: progressPercent === 100
                                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                                    : 'linear-gradient(90deg, #ff4d00, #ff8800)',
                                boxShadow: progressPercent === 100
                                    ? '0 0 16px rgba(16, 185, 129, 0.6)'
                                    : '0 0 16px rgba(255, 77, 0, 0.5)',
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════ */}
            {/* ZERO INBOX                             */}
            {/* ═══════════════════════════════════════ */}
            {allDone && (
                <div className="glass-panel rounded-2xl p-10 sm:p-16 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-900/30 border border-emerald-500/20 flex items-center justify-center">
                            {doneCount > 0
                                ? <Trophy size={32} className="text-emerald-400" />
                                : <PartyPopper size={32} className="text-emerald-400" />
                            }
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {doneCount > 0 ? 'Todas concluídas! 🏆' : 'Zero Inbox! 🎉'}
                    </h2>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto">
                        {doneCount > 0
                            ? `Você completou ${doneCount} tarefas hoje. Excelente trabalho!`
                            : 'Nenhuma tarefa gerada. Quando a IA identificar oportunidades, elas aparecerão aqui.'
                        }
                    </p>
                </div>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* 3-COLUMN GRID TASK BOARD                */}
            {/* ═══════════════════════════════════════ */}
            {!allDone && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* COL 1: 🔥 HOT (G4/G5) */}
                    <FeedSection
                        title="HOT (G4/G5)"
                        emoji="🔥"
                        icon={<DollarSign size={15} />}
                        count={hotTasks.length}
                        themeKey="hot"
                        emptyText="Nenhum lead quente para hoje."
                    >
                        {hotTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                themeKey="hot"
                                completing={completingIds.has(task.id)}
                                onComplete={handleComplete}
                                onExecute={handleExecute}
                            />
                        ))}
                    </FeedSection>

                    {/* COL 2: 🟡 MORNOS (G2/G3) */}
                    <FeedSection
                        title="MORNOS (G2/G3)"
                        emoji="🟡"
                        icon={<Users size={15} />}
                        count={warmTasks.length}
                        themeKey="warm"
                        emptyText="Nenhuma tarefa de nutrição."
                    >
                        {warmTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                themeKey="warm"
                                completing={completingIds.has(task.id)}
                                onComplete={handleComplete}
                                onExecute={handleExecute}
                            />
                        ))}
                    </FeedSection>

                    {/* COL 3: 🧊 FRIOS (G1) */}
                    <FeedSection
                        title="FRIOS (G1)"
                        emoji="🧊"
                        icon={<Sparkles size={15} />}
                        count={coldTasks.length}
                        themeKey="cold"
                        emptyText="Nenhuma prospecção pendente."
                        footer={
                            hiddenColdCount > 0 && !showAllCold ? (
                                <button
                                    onClick={() => setShowAllCold(true)}
                                    className="w-full py-3 text-center text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/[0.04] hover:bg-blue-500/[0.08] border-t border-blue-500/10 transition-colors"
                                >
                                    Mostrar mais {hiddenColdCount} tarefas
                                </button>
                            ) : showAllCold && coldTasks.length > VISIBLE_COLD_CARDS ? (
                                <button
                                    onClick={() => setShowAllCold(false)}
                                    className="w-full py-3 text-center text-xs font-semibold text-gray-500 hover:text-gray-300 bg-white/[0.02] hover:bg-white/[0.04] border-t border-white/[0.06] transition-colors"
                                >
                                    Mostrar menos
                                </button>
                            ) : null
                        }
                    >
                        {visibleColdTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                themeKey="cold"
                                completing={completingIds.has(task.id)}
                                onComplete={handleComplete}
                                onExecute={handleExecute}
                            />
                        ))}
                    </FeedSection>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════
// COLUMN SECTION (3-Column Grid)
// ═══════════════════════════════════════════════

const FeedSection = ({ title, emoji, icon, count, themeKey, children, footer, emptyText }) => {
    const theme = COLUMN_THEMES[themeKey]
    const isEmpty = React.Children.count(children) === 0

    return (
        <div
            className="rounded-2xl overflow-hidden border border-white/[0.06] flex flex-col shadow-lg shadow-black/10"
            style={{ background: theme.columnBg, backdropFilter: 'blur(12px)' }}
        >
            {/* Gradient accent bar */}
            <div className="h-[3px] w-full shrink-0" style={{ background: theme.borderTop }} />

            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${theme.headerBg} border-b ${theme.headerBorder}`}>
                <div className="flex items-center gap-2">
                    <span className={theme.iconColor}>{icon}</span>
                    <h3 className="text-xs font-bold text-gray-300 tracking-wider uppercase">
                        {emoji} {title}
                    </h3>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${theme.countBg} ${theme.countText} border ${theme.countBorder}`}>
                    {count}
                </span>
            </div>

            {/* Cards area with internal scroll */}
            <div
                className="flex-1 p-3 space-y-3 overflow-y-auto"
                style={{ maxHeight: '70vh', minHeight: '120px' }}
            >
                {isEmpty ? (
                    <div className={`flex items-center justify-center py-10 px-4 rounded-xl ${theme.emptyBg} border ${theme.emptyBorder}`}>
                        <p className="text-xs text-gray-500 text-center">{emptyText}</p>
                    </div>
                ) : children}
            </div>

            {/* Optional footer */}
            {footer}
        </div>
    )
}

// ═══════════════════════════════════════════════
// TASK CARD — Smart Action Button
// ═══════════════════════════════════════════════

const TaskCard = ({ task, themeKey, completing, onComplete, onExecute }) => {
    const lead = task.lead || {}
    const theme = COLUMN_THEMES[themeKey]
    const initial = lead.nome?.charAt(0)?.toUpperCase() || '?'

    const stage = lead.cadence_stage || ''
    const stageLabel = CADENCE_LABELS[stage] || stage
    const stageStyle = CADENCE_STYLES[stage] || 'bg-gray-800 text-gray-400 border-gray-700'

    const messageCount = lead.total_interactions_count || 0
    const isFirstContact = messageCount === 0

    return (
        <div
            className={`
                rounded-xl p-3.5 group
                transition-all duration-300 ease-out
                bg-white/[0.025] border border-white/[0.06]
                hover:bg-white/[0.055] hover:border-white/[0.13]
                hover:shadow-lg hover:shadow-black/20
                border-l-[3px] ${theme.cardBorder}
                ${completing
                    ? 'opacity-0 scale-95 translate-x-4 pointer-events-none'
                    : 'opacity-100 scale-100 translate-x-0'
                }
            `}
            style={{ backdropFilter: 'blur(8px)' }}
        >
            {/* Row 1: Avatar + Lead Info + Stage Badge */}
            <div className="flex items-start gap-3 mb-2">
                {lead?.avatar_url ? (
                    <img
                        src={lead.avatar_url}
                        alt={lead.nome || 'Lead'}
                        className="w-9 h-9 rounded-lg shrink-0 object-cover border border-white/[0.1]"
                    />
                ) : (
                    <div className="w-9 h-9 rounded-lg shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 border border-white/[0.08] flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-300">{initial}</span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-semibold text-white truncate">{lead.nome || 'Lead'}</h4>
                        {stage && (
                            <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border ${stageStyle}`}>
                                {stage}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight">
                        {lead.headline || ''}
                        {lead.empresa && lead.headline ? ` · ${lead.empresa}` : lead.empresa || ''}
                    </p>
                </div>
            </div>

            {/* Row 2: AI Instruction */}
            {task.instruction && (
                <div className="mb-3">
                    <p className="text-[11px] text-gray-400 leading-relaxed bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.04]">
                        <span className="mr-1">💡</span>{task.instruction}
                    </p>
                </div>
            )}

            {/* Row 3: Smart Action Buttons */}
            <div className="flex items-center gap-2">
                {/* PRIMARY: Smart LinkedIn Action */}
                {lead.linkedin_profile_url && (
                    <button
                        onClick={() => onExecute(lead?.id)}
                        className={`
                            flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold
                            transition-all duration-200
                            ${isFirstContact
                                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/25 hover:border-indigo-500/40'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/35'
                            }
                        `}
                        title={isFirstContact ? 'Enviar primeiro contato' : 'Continuar conversa'}
                    >
                        {isFirstContact ? (
                            <>
                                <HandMetal size={13} />
                                <span>Enviar Icebreaker</span>
                            </>
                        ) : (
                            <>
                                <MessageCircle size={13} />
                                <span>Continuar Conversa</span>
                            </>
                        )}
                    </button>
                )}

                {/* SECONDARY: Concluir */}
                <button
                    onClick={() => onComplete(task.id)}
                    disabled={completing}
                    className="
                        shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold
                        bg-white/[0.08] text-gray-300 border border-white/[0.12]
                        hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30 hover:shadow-md
                        transition-all duration-200 shadow-sm
                        disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    title="Marcar como concluída"
                >
                    {completing ? (
                        <Loader2 size={15} className="animate-spin" />
                    ) : (
                        <>
                            <CheckCircle2 size={15} />
                            <span>Concluir</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

export default SalesCockpit
