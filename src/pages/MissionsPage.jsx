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
    Hammer
} from 'lucide-react'

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════

const HOT_STAGES = ['G4', 'G5']
const VISIBLE_COLD_CARDS = 8

const CADENCE_LABELS = {
    G1: 'Primeiro Contato',
    G2: 'Networking',
    G3: 'Nutrição',
    G4: 'Aquecido',
    G5: 'Pronto p/ Fechar',
}

const CADENCE_STYLES = {
    G1: 'bg-gray-100 text-gray-600 border-gray-300',
    G2: 'bg-blue-50 text-blue-600 border-blue-200',
    G3: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    G4: 'bg-orange-50 text-orange-600 border-orange-200',
    G5: 'bg-red-50 text-red-600 border-red-200',
}

const ICP_STYLES = {
    'ICP A': 'bg-green-50 text-green-700 border-green-300 font-bold',
    'ICP B': 'bg-blue-50 text-blue-600 border-blue-200 font-bold',
    'ICP C': 'bg-gray-100 text-gray-500 border-gray-300 font-bold',
}

const COLUMN_THEMES = {
    hot: {
        borderTop: 'linear-gradient(90deg, #ef4444, #f97316)',
        headerBg: 'bg-orange-50',
        headerBorder: 'border-orange-200',
        countBg: 'bg-orange-100',
        countText: 'text-orange-600',
        countBorder: 'border-orange-200',
        iconColor: 'text-orange-500',
        cardBorder: 'border-l-orange-400',
        columnBg: '#ffffff',
        emptyBg: 'bg-orange-50',
        emptyBorder: 'border-orange-200',
    },
    cold: {
        borderTop: 'linear-gradient(90deg, #3b82f6, #94a3b8)',
        headerBg: 'bg-blue-50',
        headerBorder: 'border-blue-200',
        countBg: 'bg-blue-100',
        countText: 'text-blue-600',
        countBorder: 'border-blue-200',
        iconColor: 'text-blue-500',
        cardBorder: 'border-l-blue-300',
        columnBg: '#ffffff',
        emptyBg: 'bg-blue-50',
        emptyBorder: 'border-blue-200',
    }
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT — COCKPIT DE VENDAS
// ═══════════════════════════════════════════════

const SalesCockpitPage = () => {
    const { user } = useAuth()
    const { selectedClientId } = useClientSelection()

    const [pendingTasks, setPendingTasks] = useState([])
    const [doneCount, setDoneCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(null)
    const [completingIds, setCompletingIds] = useState(new Set())
    const [showAllCold, setShowAllCold] = useState(false)

    // ───────────────────────────────────────────
    // DATA FETCHING
    // ───────────────────────────────────────────

    const fetchTasks = useCallback(async (isRefresh = false) => {
        if (!user?.id) return
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        setError(null)

        try {
            let pendingQuery = supabase
                .from('tasks')
                .select('*, leads!inner(id, client_id, nome, empresa, headline, linkedin_profile_url, cadence_stage, total_interactions_count, icp_score, avatar_url)')
                .eq('status', 'PENDING')
                .order('created_at', { ascending: true })

            if (selectedClientId) {
                pendingQuery = pendingQuery.eq('leads.client_id', selectedClientId)
            }

            let doneQuery = supabase
                .from('tasks')
                .select('id, leads!inner(client_id)', { count: 'exact' })
                .eq('status', 'DONE')

            if (selectedClientId) {
                doneQuery = doneQuery.eq('leads.client_id', selectedClientId)
            }

            doneQuery = doneQuery.limit(1)

            const [pendingResult, doneResult] = await Promise.all([pendingQuery, doneQuery])

            if (pendingResult.error) throw pendingResult.error

            setPendingTasks(pendingResult.data || [])
            setDoneCount(doneResult.count || 0)
        } catch (err) {
            console.error('Error fetching cockpit tasks:', err)
            setError('Falha ao carregar tarefas. Tente novamente.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [user?.id, selectedClientId])

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    // ───────────────────────────────────────────
    // TASK ACTIONS
    // ───────────────────────────────────────────

    const handleComplete = async (taskId) => {
        setCompletingIds(prev => new Set(prev).add(taskId))
        setPendingTasks(prev => prev.filter(t => t.id !== taskId))
        setDoneCount(prev => prev + 1)

        try {
            const { error: updateError } = await supabase
                .from('tasks')
                .update({ status: 'DONE' })
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

    // ───────────────────────────────────────────
    // DERIVED STATE
    // ───────────────────────────────────────────

    const { hotTasks, coldTasks } = useMemo(() => {
        const hot = []
        const cold = []
        pendingTasks.forEach(task => {
            const stage = task.leads?.cadence_stage
            if (HOT_STAGES.includes(stage)) {
                hot.push(task)
            } else {
                cold.push(task)
            }
        })
        return { hotTasks: hot, coldTasks: cold }
    }, [pendingTasks])

    const totalMissions = pendingTasks.length + doneCount
    const progressPercent = totalMissions > 0 ? Math.round((doneCount / totalMissions) * 100) : 0
    const allDone = pendingTasks.length === 0 && !loading
    const visibleColdTasks = showAllCold ? coldTasks : coldTasks.slice(0, VISIBLE_COLD_CARDS)
    const hiddenColdCount = coldTasks.length - VISIBLE_COLD_CARDS

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Bom dia'
        if (hour < 18) return 'Boa tarde'
        return 'Boa noite'
    }

    // ───────────────────────────────────────────
    // LOADING STATE
    // ───────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    <span className="tracking-wide uppercase text-xs font-bold text-gray-400">Carregando cockpit...</span>
                </div>
            </div>
        )
    }

    // ───────────────────────────────────────────
    // RENDER
    // ───────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">

                {/* ═══════════════════════════════════ */}
                {/* HEADER + PROGRESS                  */}
                {/* ═══════════════════════════════════ */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 mb-6">
                    <div className="flex items-start justify-between gap-4 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                                <Crosshair size={20} className="text-orange-500" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-1">
                                    {getGreeting()}! 🎯
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {hotTasks.length > 0
                                        ? <><span className="text-orange-500 font-semibold">{hotTasks.length} lead(s) quente(s)</span> · {coldTasks.length} em prospecção</>
                                        : pendingTasks.length > 0
                                            ? <>{pendingTasks.length} tarefas aguardando execução.</>
                                            : 'Nenhuma tarefa pendente!'
                                    }
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => fetchTasks(true)}
                            disabled={refreshing}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700"
                            title="Atualizar tarefas"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Progresso do dia</span>
                            <span className="text-sm font-bold text-gray-700">{doneCount}/{totalMissions} concluídas</span>
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

                {/* ═══════════════════════════════════ */}
                {/* ERROR STATE                        */}
                {/* ═══════════════════════════════════ */}
                {error && (
                    <div className="bg-white rounded-2xl border border-red-200 p-8 mb-6">
                        <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                                <AlertTriangle size={28} className="text-red-500" />
                            </div>
                            <p className="text-sm text-gray-600">{error}</p>
                            <button
                                onClick={() => fetchTasks()}
                                className="px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium border border-gray-200 transition-all"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════ */}
                {/* ZERO INBOX — ALL DONE              */}
                {/* ═══════════════════════════════════ */}
                {allDone && !error && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-10 sm:p-16 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center">
                                {doneCount > 0
                                    ? <Trophy size={32} className="text-green-500" />
                                    : <PartyPopper size={32} className="text-green-500" />
                                }
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {doneCount > 0 ? 'Cockpit Limpo! 🏆' : 'Tudo em dia! 🎉'}
                        </h2>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            {doneCount > 0
                                ? `Você completou ${doneCount} tarefas hoje. Excelente trabalho!`
                                : 'Nenhuma tarefa gerada no momento. Quando a IA identificar oportunidades, elas aparecerão aqui.'
                            }
                        </p>
                    </div>
                )}

                {/* ═══════════════════════════════════ */}
                {/* KANBAN BOARD — 2 COLUMNS           */}
                {/* ═══════════════════════════════════ */}
                {!allDone && !error && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* LEFT: 🔥 PRIORIDADES (G4, G5) */}
                        <KanbanColumn
                            title="Prioridades"
                            emoji="🔥"
                            icon={<DollarSign size={15} />}
                            count={hotTasks.length}
                            themeKey="hot"
                            emptyIcon={<Sparkles size={28} className="text-orange-300" />}
                            emptyTitle="Pipeline limpo"
                            emptyText="Nenhum lead em estágio avançado (G4/G5). Foque na prospecção →"
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
                        </KanbanColumn>

                        {/* RIGHT: 🔨 MODERADAS */}
                        <KanbanColumn
                            title="Moderadas"
                            emoji="🔨"
                            icon={<Users size={15} />}
                            count={coldTasks.length}
                            themeKey="cold"
                            emptyIcon={<TrendingUp size={28} className="text-blue-300" />}
                            emptyTitle="Tudo em dia"
                            emptyText="Nenhuma tarefa de prospecção pendente."
                            footer={
                                hiddenColdCount > 0 && !showAllCold ? (
                                    <button
                                        onClick={() => setShowAllCold(true)}
                                        className="w-full py-3 text-center text-xs font-semibold text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-t border-blue-200 transition-colors rounded-b-2xl"
                                    >
                                        Mostrar mais {hiddenColdCount} tarefas
                                    </button>
                                ) : showAllCold && coldTasks.length > VISIBLE_COLD_CARDS ? (
                                    <button
                                        onClick={() => setShowAllCold(false)}
                                        className="w-full py-3 text-center text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border-t border-gray-200 transition-colors rounded-b-2xl"
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
                        </KanbanColumn>
                    </div>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════
// KANBAN COLUMN
// ═══════════════════════════════════════════════

const KanbanColumn = ({ title, emoji, icon, count, themeKey, children, emptyIcon, emptyTitle, emptyText, footer }) => {
    const theme = COLUMN_THEMES[themeKey]
    const isEmpty = React.Children.count(children) === 0

    return (
        <div
            className="rounded-2xl overflow-hidden border border-gray-200 flex flex-col shadow-sm"
            style={{ background: theme.columnBg }}
        >
            {/* Gradient accent bar */}
            <div className="h-[3px] w-full shrink-0" style={{ background: theme.borderTop }} />

            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${theme.headerBg} border-b ${theme.headerBorder}`}>
                <div className="flex items-center gap-2">
                    <span className={theme.iconColor}>{icon}</span>
                    <h3 className="text-xs font-bold text-gray-700 tracking-wider uppercase">
                        {emoji} {title}
                    </h3>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${theme.countBg} ${theme.countText} border ${theme.countBorder}`}>
                    {count}
                </span>
            </div>

            {/* Cards area */}
            <div
                className="flex-1 p-3 space-y-2.5 overflow-y-auto"
                style={{ maxHeight: '600px', minHeight: '140px' }}
            >
                {isEmpty ? (
                    <div className={`flex flex-col items-center justify-center py-10 gap-2 rounded-xl ${theme.emptyBg} border ${theme.emptyBorder}`}>
                        {emptyIcon}
                        <p className="text-sm font-semibold text-gray-500">{emptyTitle}</p>
                        <p className="text-[11px] text-gray-400 text-center px-6">{emptyText}</p>
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
    const lead = task.leads || {}
    const theme = COLUMN_THEMES[themeKey]
    const initial = lead.nome?.charAt(0)?.toUpperCase() || '?'

    const stage = lead.cadence_stage || ''
    const stageStyle = CADENCE_STYLES[stage] || 'bg-gray-100 text-gray-500 border-gray-200'

    const interactionCount = lead.total_interactions_count || 0
    const isFirstContact = interactionCount === 0

    return (
        <div
            className={`
                rounded-xl p-3.5 group
                transition-all duration-300 ease-out
                bg-white border border-gray-200
                hover:shadow-md hover:border-gray-300
                border-l-[3px] ${theme.cardBorder}
                ${completing
                    ? 'opacity-0 scale-95 translate-x-4 pointer-events-none'
                    : 'opacity-100 scale-100 translate-x-0'
                }
            `}
        >
            {/* Row 1: Avatar + Lead Info + Stage Badge */}
            <div className="flex items-start gap-3 mb-2">
                {lead?.avatar_url ? (
                    <img
                        src={lead.avatar_url}
                        alt={lead.nome || 'Lead'}
                        className="w-9 h-9 rounded-lg shrink-0 object-cover border border-gray-200"
                    />
                ) : (
                    <div className="w-9 h-9 rounded-lg shrink-0 bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-600">{initial}</span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">{lead.nome || 'Lead'}</h4>
                        {stage && (
                            <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border ${stageStyle}`}>
                                {stage}
                            </span>
                        )}
                        {lead.icp_score && (
                            <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border ${ICP_STYLES[lead.icp_score] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                {lead.icp_score}
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
                    <p className="text-[11px] text-gray-500 leading-relaxed bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
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
                                ? 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100'
                                : 'bg-orange-500 text-white border border-orange-500 hover:bg-orange-600'
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
                        shrink-0 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-[11px] font-semibold
                        bg-gray-50 text-gray-400 border border-gray-200
                        hover:bg-green-50 hover:text-green-600 hover:border-green-200
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    title="Marcar como concluída"
                >
                    {completing ? (
                        <Loader2 size={13} className="animate-spin" />
                    ) : (
                        <CheckCircle2 size={13} />
                    )}
                </button>
            </div>
        </div>
    )
}

export default SalesCockpitPage
