import React, { useState } from 'react'
import { ShieldAlert, Brain, Radio, Target, TrendingUp, Loader2, Sparkles, RefreshCw, AlertOctagon, Lightbulb } from 'lucide-react'

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
    if (!lead) return null

    // Extra Fields
    const isAnalyzing = props.isAnalyzing
    const onAnalyzeNow = props.onAnalyzeNow

    // Data Mapping from real DB columns
    const psychological = lead?.last_psychological_factor
    const signal = lead?.last_signal_detected
    const strategy = lead?.last_strategy_used
    const forbidden = lead?.last_forbidden_action

    const analyzedAt = lead?.updated_at || null;
    const hasAnyAnalysis = !!(psychological || signal || strategy || forbidden)

    // Derived states (old ones for compatibility if needed, but we focus on hasAnyAnalysis)
    const hasAnyData = hasAnyAnalysis

    if (!hasAnyAnalysis) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
                        <TrendingUp size={16} className="text-orange-500" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Negotiation X-Ray</h4>
                </div>
                <div className="flex flex-col items-center justify-center py-10 gap-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    {isAnalyzing ? (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping" />
                                <Loader2 size={32} className="text-orange-500 animate-spin relative" />
                            </div>
                            <p className="text-sm text-gray-600 font-semibold">Análise profunda em andamento...</p>
                        </>
                    ) : (
                        <>
                            <Sparkles size={32} className="text-orange-300" />
                            <div className="text-center">
                                <p className="text-sm text-gray-500 font-medium">Análise de IA pendente</p>
                                <p className="text-[11px] text-gray-400 mt-1">Envie uma mensagem ou sincronize o histórico para ativar.</p>
                            </div>
                            {onAnalyzeNow && (
                                <button
                                    onClick={onAnalyzeNow}
                                    className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                                >
                                    <RefreshCw size={14} />
                                    Analisar Agora
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 space-y-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <TrendingUp size={18} className="text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest leading-none mb-1">Negotiation X-Ray</h4>
                        {analyzedAt && (
                            <span className="text-[10px] text-gray-400 font-medium lowercase">
                                • última atualização {getTimeAgo(analyzedAt)}
                            </span>
                        )}
                    </div>
                </div>

                {onAnalyzeNow && (
                    <button
                        onClick={onAnalyzeNow}
                        disabled={isAnalyzing}
                        title="Re-analisar lead"
                        className="p-2 rounded-xl text-gray-400 hover:text-orange-500 hover:bg-orange-50 border border-transparent hover:border-orange-100 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isAnalyzing ? 'animate-spin' : ''} />
                    </button>
                )}
            </div>

            {/* Analysis Stack */}
            <div className="flex flex-col gap-4">
                
                {/* Psychological Factor */}
                {psychological && (
                    <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4 flex flex-col gap-3 h-fit">
                        <div className="flex items-center gap-2 text-blue-600">
                            <Brain size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Psychological Profile</span>
                        </div>
                        <p className="text-[13px] text-slate-700 leading-relaxed font-medium break-words h-auto">
                            {psychological}
                        </p>
                    </div>
                )}

                {/* Intent Signal */}
                {signal && (
                    <div className="bg-cyan-50/30 border border-cyan-100 rounded-2xl p-4 flex flex-col gap-3 h-fit">
                        <div className="flex items-center gap-2 text-cyan-600">
                            <Target size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Intent Signal</span>
                        </div>
                        <p className="text-[13px] text-slate-700 leading-relaxed font-medium break-words h-auto">
                            {signal}
                        </p>
                    </div>
                )}

                {/* Recommended Tactic */}
                {strategy && (
                    <div className="bg-amber-50/30 border border-amber-100 rounded-2xl p-4 flex flex-col gap-3 h-fit">
                        <div className="flex items-center gap-2 text-amber-600">
                            <Lightbulb size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Winning Strategy</span>
                        </div>
                        <p className="text-[13px] text-slate-700 leading-relaxed font-medium break-words h-auto">
                            {strategy}
                        </p>
                    </div>
                )}

                {/* Forbidden Action - DANGER ZONE */}
                {forbidden && (
                    <div className="bg-red-50 border-l-4 border-red-500 rounded-r-2xl p-4 flex flex-col gap-3 h-fit">
                        <div className="flex items-center gap-2 text-red-600">
                            <AlertOctagon size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Danger Zone</span>
                        </div>
                        <p className="text-[13px] text-red-700 leading-relaxed font-bold break-words h-auto">
                            {forbidden}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default StrategicContextCard
