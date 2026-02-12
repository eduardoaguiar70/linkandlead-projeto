import React from 'react'
import { MessageCircle, Clock, Zap } from 'lucide-react'

/**
 * KanbanLeadCard - A compact lead card for the Kanban board
 * @param {Object} lead - Lead data object
 * @param {Function} onClick - Click handler
 */
const KanbanLeadCard = ({ lead, onClick }) => {
    // Helper: Time since last interaction
    const getTimeSince = (dateString) => {
        if (!dateString) return '—'
        const now = new Date()
        const date = new Date(dateString)
        const diffMs = now - date
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)

        if (diffDays > 0) return `${diffDays}d`
        if (diffHours > 0) return `${diffHours}h`
        return 'agora'
    }

    // Helper: Cadence stage styling (trust-gradient based on level)
    const getCadenceStyle = (stage) => {
        const match = stage?.toString().match(/(\d+)/)
        const level = match ? parseInt(match[1], 10) : 0

        if (level >= 7) return 'bg-yellow-100 text-yellow-700 border border-yellow-300'
        if (level >= 6) return 'bg-green-100 text-green-700 border border-green-300'
        if (level >= 5) return 'bg-emerald-100 text-emerald-700 border border-emerald-300'
        if (level >= 4) return 'bg-orange-100 text-orange-700 border border-orange-300'
        if (level >= 3) return 'bg-amber-100 text-amber-700 border border-amber-300'
        if (level >= 2) return 'bg-cyan-100 text-cyan-700 border border-cyan-300'
        if (level >= 1) return 'bg-blue-100 text-blue-700 border border-blue-300'
        return 'bg-gray-100 text-gray-600 border border-gray-300'
    }

    // Helper: ICP tier styling
    const getIcpStyle = (tier) => {
        switch (tier) {
            case 'A': return 'bg-emerald-100 text-emerald-700 border-emerald-300'
            case 'B': return 'bg-blue-100 text-blue-700 border-blue-300'
            case 'C': return 'bg-gray-100 text-gray-600 border-gray-300'
            default: return 'bg-gray-100 text-gray-600 border-gray-300'
        }
    }

    // Extract lead data (handle both direct and nested structures)
    const leadData = lead?.leads || lead
    const cadenceStage = leadData?.cadence_stage || ''
    const icpTier = leadData?.qualification_tier || leadData?.icp_score || 'C'
    const totalInteractions = leadData?.total_interactions_count || leadData?.total_interactions || 0
    const lastInteractionDate = leadData?.last_interaction_date
    const hasAiSuggestions = (leadData?.ai_suggested_replies?.length || 0) > 0
    const nome = leadData?.nome || 'Lead'
    const headline = leadData?.headline || leadData?.empresa || ''
    const avatarUrl = leadData?.avatar_url

    return (
        <div
            className="bg-white rounded-xl border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all group"
            onClick={() => onClick(lead)}
        >
            {/* Top Row: Avatar + Name + Score */}
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={nome} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-sm font-bold text-gray-500">{nome?.charAt(0) || '?'}</span>
                    )}
                </div>

                {/* Name + Headline */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 text-sm truncate">{nome}</h4>
                    <p className="text-xs text-gray-500 truncate">{headline || '—'}</p>
                </div>

                {/* Cadence Stage Badge */}
                {cadenceStage && (
                    <div className={`${getCadenceStyle(cadenceStage)} text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0`}>
                        {cadenceStage}
                    </div>
                )}
            </div>

            {/* Bottom Row: Meta Info */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                {/* ICP Badge */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getIcpStyle(icpTier)}`}>
                    ICP {icpTier}
                </span>

                {/* Interaction Count */}
                <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <MessageCircle size={12} />
                    <span>{totalInteractions}</span>
                </div>

                {/* Time Since */}
                <div className="flex items-center gap-1 text-gray-500 text-xs">
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
