import React, { useState } from 'react'
import { ShieldAlert, Brain, Radio, Target, TrendingUp, Loader2, Sparkles, RefreshCw } from 'lucide-react'

// Cadence level configurations
const CADENCE_LEVELS = {
    G1: { label: 'Cold', desc: 'Lead just approached. No emotional connection yet.', color: 'from-slate-400 to-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', percent: 20 },
    G2: { label: 'Receptive', desc: 'Lead recognizes you and is open to listening.', color: 'from-blue-400 to-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', percent: 40 },
    G3: { label: 'Contextualized', desc: 'Lead understands your proposal and is evaluating.', color: 'from-amber-400 to-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', percent: 60 },
    G4: { label: 'Interested', desc: 'Lead shows active interest. Increasing engagement.', color: 'from-orange-400 to-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', percent: 80 },
    G5: { label: 'Hot', desc: 'Lead trusts you. Ready for conversion action.', color: 'from-emerald-400 to-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', percent: 100 },
}

const getTimeAgo = (dateStr) => {
    if (!dateStr) return null;
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

const getCadenceConfig = (level) => {
    if (!level) return null
    const key = level.toString().toUpperCase().trim()
    return CADENCE_LEVELS[key] || CADENCE_LEVELS['G1']
}

const StrategicContextCard = ({ lead, isIcebreaker = false, ...props }) => {
    const [showTooltip, setShowTooltip] = useState(false)

    if (!lead) return null

    // Extra Fields
    const isAnalyzing = props.isAnalyzing
    const onAnalyzeNow = props.onAnalyzeNow
    const forbidden = null // You can map this if needed

    // Base Strategic Columns mapping
    const cadenceLevel = lead?.cadence_stage
    const signal = lead?.stage_reasoning
    const strategy = lead?.next_action
    const psychological = null // Not provided in new db schema
    
    // Map the boolean column ready_for_analysis as an indicator that analysis has run 
    // We will use updated_at or another timestamp if available, but for now we can just check if data exists
    // The timestamp will be "Updated" text without a date if we don't have analyzed_at, or we can use lead?.updated_at
    const analyzedAt = lead?.updated_at || lead?.last_interaction_date || null;

    // Derived states
    const hasAnyData = !!(cadenceLevel || signal || psychological || forbidden || strategy)

    if (!hasAnyData) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                        <TrendingUp size={14} className="text-primary" />
                    </div>
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Negotiation X-Ray</h4>
                </div>
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                    {isAnalyzing ? (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                                <Loader2 size={24} className="text-primary animate-spin relative" />
                            </div>
                            <p className="text-xs text-primary font-medium text-center leading-relaxed">
                                Analyzing history...
                            </p>
                            <p className="text-[10px] text-gray-400 text-center">This might take a few seconds.</p>
                        </>
                    ) : isIcebreaker ? (
                        <>
                            <Sparkles size={24} className="text-amber-400/70" />
                            <p className="text-xs text-gray-400 text-center leading-relaxed">
                                Generate the Icebreaker to activate<br />the strategic analysis.
                            </p>
                        </>
                    ) : (
                        <>
                            <Loader2 size={24} className="text-gray-500 animate-spin" />
                            <p className="text-xs text-gray-500 text-center leading-relaxed">
                                Awaiting AI Analysis...<br />
                                <span className="text-gray-600">Available after the next processing.</span>
                            </p>
                            {onAnalyzeNow && (
                                <button
                                    onClick={onAnalyzeNow}
                                    className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[11px] font-bold transition-all hover:shadow-md hover:shadow-primary/10 active:scale-[0.97]"
                                >
                                    <RefreshCw size={12} />
                                    Analyze Now
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        )
    }

    const config = getCadenceConfig(cadenceLevel)

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                        <TrendingUp size={14} className="text-primary" />
                    </div>
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Negotiation X-Ray</h4>
                </div>

                {/* Timestamp and Refresh button */}
                <div className="flex items-center gap-3">
                    {analyzedAt && !isAnalyzing && (
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                            Updated {getTimeAgo(analyzedAt)}
                        </span>
                    )}

                    {onAnalyzeNow && (
                        <button
                            onClick={onAnalyzeNow}
                            disabled={isAnalyzing}
                            title="Re-analyze lead"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex shrink-0"
                        >
                            <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>
            </div>

            {/* Loading overlay when re-analyzing */}
            {isAnalyzing && (
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                    <Loader2 size={12} className="text-primary animate-spin shrink-0" />
                    <span className="text-[11px] text-primary font-medium">Re-analyzing history...</span>
                </div>
            )}

            {/* A. Cadence Level Badge */}
            {config && (
                <div className="relative">
                    <div
                        className={`relative overflow-hidden rounded-xl ${config.bg} border ${config.border} p-3 cursor-default`}
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        {/* Progress bar behind */}
                        <div
                            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${config.color} opacity-10`}
                            style={{ width: `${config.percent}%`, transition: 'width 0.6s ease' }}
                        />

                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className={`text-lg font-black ${config.text}`}>
                                    {cadenceLevel}
                                </span>
                                <div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${config.text} opacity-80`}>
                                        {config.label}
                                    </span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        {[1, 2, 3, 4, 5].map(i => {
                                            const levelNum = parseInt(cadenceLevel?.replace(/\D/g, '') || '0')
                                            return (
                                                <div
                                                    key={i}
                                                    className={`h-1 w-4 rounded-full transition-colors ${i <= levelNum
                                                        ? `bg-gradient-to-r ${config.color}`
                                                        : 'bg-gray-200'
                                                        }`}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tooltip */}
                    {showTooltip && (
                        <div className="absolute z-50 -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-xl max-w-[220px]">
                            <p className="text-[11px] text-gray-600 leading-relaxed">{config.desc}</p>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-gray-200" />
                        </div>
                    )}
                </div>
            )}

            {/* B. Forbidden Action - DANGER ZONE */}
            {forbidden && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <ShieldAlert size={14} className="text-red-500 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">Danger Zone</span>
                    </div>
                    <p className="text-xs text-red-600 leading-relaxed font-medium pl-[22px]">
                        {forbidden}
                    </p>
                </div>
            )}

            {/* C. Lead Analysis (Signal + Psychological) */}
            {(signal || psychological) && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Lead Analysis</span>

                    {signal && (
                        <div className="flex items-start gap-2">
                            <Radio size={13} className="text-cyan-600 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-[9px] uppercase tracking-widest text-cyan-600 font-bold">Detected Signal</span>
                                <p className="text-xs text-gray-600 leading-relaxed">{signal}</p>
                            </div>
                        </div>
                    )}

                    {psychological && (
                        <div className="flex items-start gap-2">
                            <Brain size={13} className="text-fuchsia-600 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-[9px] uppercase tracking-widest text-fuchsia-600 font-bold">Psychological Factor</span>
                                <p className="text-xs text-gray-600 leading-relaxed">{psychological}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* D. Recommended Tactic */}
            {strategy && (
                <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Target size={14} className="text-primary shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Recommended Tactic</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed pl-[22px]">
                        {strategy}
                    </p>
                </div>
            )}
        </div>
    )
}

export default StrategicContextCard
