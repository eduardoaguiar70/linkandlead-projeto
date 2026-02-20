import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
    MessageSquare,
    AlertTriangle,
    UserPlus,
    Sprout,
    Crosshair,
    Clock,
    ChevronRight
} from 'lucide-react'

const TYPE_CONFIG = {
    GHOSTING: { icon: AlertTriangle, label: 'Ghosting', color: 'text-red-400' },
    NEW_CONNECTION: { icon: UserPlus, label: 'Nova Conexão', color: 'text-cyan-400' },
    NURTURING: { icon: Sprout, label: 'Nutrição', color: 'text-emerald-400' },
    CLOSING: { icon: Crosshair, label: 'Fechamento', color: 'text-amber-400' },
}

const getCadenceStyle = (level) => {
    if (!level) return 'bg-gray-800 text-gray-400 border-gray-700'
    const num = parseInt(level?.toString().replace(/\D/g, ''), 10) || 0
    if (num >= 5) return 'bg-emerald-900/60 text-emerald-300 border-emerald-700'
    if (num >= 3) return 'bg-amber-900/60 text-amber-300 border-amber-700'
    return 'bg-cyan-900/60 text-cyan-300 border-cyan-700'
}

const getIcpStyle = (tier) => {
    switch (tier) {
        case 'A': return 'bg-emerald-900/60 text-emerald-300 border-emerald-700'
        case 'B': return 'bg-blue-900/60 text-blue-300 border-blue-700'
        default: return 'bg-gray-800 text-gray-400 border-gray-700'
    }
}

const MissionCard = ({ task, isHighPriority = false }) => {
    const navigate = useNavigate()
    const lead = task.leads || {}
    const typeConfig = TYPE_CONFIG[task.type] || TYPE_CONFIG.NURTURING
    const TypeIcon = typeConfig.icon

    const handleOpenChat = (e) => {
        e.stopPropagation()
        if (task.lead_id) {
            navigate(`/sales/inbox?lead=${task.lead_id}`)
        }
    }

    return (
        <div
            className={`
                rounded-xl p-4 group cursor-pointer
                transition-all duration-200
                bg-white/[0.03] border border-white/[0.08]
                hover:bg-white/[0.06] hover:border-white/[0.15]
                ${isHighPriority
                    ? 'border-l-[3px] border-l-red-500/70'
                    : ''
                }
            `}
            onClick={handleOpenChat}
            style={{ backdropFilter: 'blur(8px)' }}
        >
            <div className="flex items-start gap-3 sm:gap-4">
                {/* Lead Avatar */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-gray-800 to-black border border-white/[0.1] flex items-center justify-center">
                    {lead.avatar_url ? (
                        <img src={lead.avatar_url} alt={lead.nome} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-sm font-bold text-gray-300">
                            {lead.nome?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Row 1: Name + Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-white truncate max-w-[160px] sm:max-w-[240px]">
                            {lead.nome || 'Lead'}
                        </h4>

                        {lead.last_cadence_level && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getCadenceStyle(lead.last_cadence_level)}`}>
                                {lead.last_cadence_level}
                            </span>
                        )}
                        {lead.icp_score && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getIcpStyle(lead.icp_score)}`}>
                                ICP {lead.icp_score}
                            </span>
                        )}

                        {task.days_overdue > 0 && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-700 flex items-center gap-0.5">
                                <Clock size={10} />
                                {task.days_overdue}d
                            </span>
                        )}
                    </div>

                    {/* Row 2: Headline */}
                    {lead.headline && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{lead.headline}</p>
                    )}

                    {/* Row 3: Reasoning */}
                    <div className="flex items-start gap-1.5 mt-2">
                        <TypeIcon size={14} className={`${typeConfig.color} shrink-0 mt-0.5`} />
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                            {task.reasoning || `Missão de ${typeConfig.label}`}
                        </p>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={handleOpenChat}
                    className="
                        shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
                        bg-primary text-white
                        hover:shadow-glow hover:-translate-y-0.5
                        transition-all duration-200
                        opacity-70 group-hover:opacity-100
                    "
                >
                    <MessageSquare size={14} />
                    <span className="hidden sm:inline">Abrir Chat</span>
                    <ChevronRight size={14} className="sm:hidden" />
                </button>
            </div>
        </div>
    )
}

export default MissionCard
