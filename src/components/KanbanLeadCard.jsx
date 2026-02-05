import React from 'react'
import { Clock, MessageCircle, ExternalLink, Zap } from 'lucide-react'

/**
 * Compact Lead Card for Kanban view
 * @param {object} lead - Lead data object
 * @param {function} onClick - Handler when card is clicked
 */
const KanbanLeadCard = ({ lead, onClick }) => {
    // Calculate time since last interaction
    const getTimeSince = (date) => {
        if (!date) return 'Sem interação'
        const now = new Date()
        const lastDate = new Date(date)
        const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Hoje'
        if (diffDays === 1) return 'Ontem'
        if (diffDays < 7) return `${diffDays} dias`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem`
        return `${Math.floor(diffDays / 30)} mês`
    }

    // Get score color
    const getScoreColor = (score) => {
        if (score >= 70) return 'bg-emerald-500'
        if (score >= 40) return 'bg-amber-500'
        return 'bg-red-500'
    }

    // Get ICP badge style
    const getIcpStyle = (icp) => {
        if (icp === 'A') return 'bg-emerald-100 text-emerald-700 border-emerald-300'
        if (icp === 'B') return 'bg-amber-100 text-amber-700 border-amber-300'
        return 'bg-slate-100 text-slate-600 border-slate-300'
    }

    const trustScore = lead?.trust_score || 0
    const icpScore = lead?.icp_score || 'C'
    const totalInteractions = lead?.total_interactions_count || lead?.total_interactions || 0
    const lastInteractionDate = lead?.last_interaction_date
    const hasAiSuggestions = (lead?.ai_suggested_replies?.length || 0) > 0

    return (
        <div
            className="bg-white rounded-xl border border-slate-200 p-3 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group"
            onClick={() => onClick(lead)}
        >
            {/* Top Row: Avatar + Name + Score */}
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                    {lead?.avatar_url ? (
                        <img src={lead.avatar_url} alt={lead.nome} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-sm font-bold text-slate-500">{lead?.nome?.charAt(0) || '?'}</span>
                    )}
                </div>

                {/* Name + Headline */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm truncate">{lead?.nome || 'Lead'}</h4>
                    <p className="text-xs text-slate-500 truncate">{lead?.headline || lead?.empresa || '—'}</p>
                </div>

                {/* Trust Score Badge */}
                <div className={`${getScoreColor(trustScore)} text-white text-xs font-bold px-2 py-1 rounded-lg shrink-0`}>
                    {trustScore}
                </div>
            </div>

            {/* Bottom Row: Meta Info */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                {/* ICP Badge */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getIcpStyle(icpScore)}`}>
                    ICP {icpScore}
                </span>

                {/* Interaction Count */}
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <MessageCircle size={12} />
                    <span>{totalInteractions}</span>
                </div>

                {/* Time Since */}
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Clock size={12} />
                    <span>{getTimeSince(lastInteractionDate)}</span>
                </div>

                {/* AI Ready Indicator */}
                {hasAiSuggestions && (
                    <div className="text-amber-500" title="Sugestões de IA prontas">
                        <Zap size={14} />
                    </div>
                )}
            </div>
        </div>
    )
}

export default KanbanLeadCard
