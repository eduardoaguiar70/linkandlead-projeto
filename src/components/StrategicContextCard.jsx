import React, { useState } from 'react'
import { ShieldAlert, Brain, Radio, Target, TrendingUp, Loader2 } from 'lucide-react'

// Cadence level configurations
const CADENCE_LEVELS = {
    G1: { label: 'Frio', desc: 'Lead acabou de ser abordado. Sem conexão emocional ainda.', color: 'from-slate-400 to-slate-500', bg: 'bg-slate-500/15', border: 'border-slate-500/40', text: 'text-slate-300', percent: 20 },
    G2: { label: 'Receptivo', desc: 'Lead reconhece você e está aberto a ouvir.', color: 'from-blue-400 to-blue-500', bg: 'bg-blue-500/15', border: 'border-blue-500/40', text: 'text-blue-300', percent: 40 },
    G3: { label: 'Contextualizado', desc: 'Lead entende sua proposta e está avaliando.', color: 'from-amber-400 to-amber-500', bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-300', percent: 60 },
    G4: { label: 'Interessado', desc: 'Lead demonstra interesse ativo. Engajamento crescente.', color: 'from-orange-400 to-orange-500', bg: 'bg-orange-500/15', border: 'border-orange-500/40', text: 'text-orange-300', percent: 80 },
    G5: { label: 'Quente', desc: 'Lead confia em você. Pronto para ação de conversão.', color: 'from-emerald-400 to-emerald-500', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300', percent: 100 },
}

const getCadenceConfig = (level) => {
    if (!level) return null
    const key = level.toString().toUpperCase().trim()
    return CADENCE_LEVELS[key] || CADENCE_LEVELS['G1']
}

const StrategicContextCard = ({ lead }) => {
    const [showTooltip, setShowTooltip] = useState(false)

    if (!lead) return null

    const cadenceLevel = lead.last_cadence_level
    const signal = lead.last_signal_detected
    const psychological = lead.last_psychological_factor
    const forbidden = lead.last_forbidden_action
    const strategy = lead.last_strategy_used

    // If ALL fields are null → show "awaiting analysis" state
    const hasAnyData = cadenceLevel || signal || psychological || forbidden || strategy

    if (!hasAnyData) {
        return (
            <div className="bg-[#0d0d0d] rounded-2xl border border-white/10 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                        <TrendingUp size={14} className="text-primary" />
                    </div>
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Raio-X da Negociação</h4>
                </div>
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                    <Loader2 size={24} className="text-gray-500 animate-spin" />
                    <p className="text-xs text-gray-500 text-center leading-relaxed">
                        Aguardando Análise da IA...<br />
                        <span className="text-gray-600">Disponível após o próximo processamento.</span>
                    </p>
                </div>
            </div>
        )
    }

    const config = getCadenceConfig(cadenceLevel)

    return (
        <div className="bg-[#0d0d0d] rounded-2xl border border-white/10 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                        <TrendingUp size={14} className="text-primary" />
                    </div>
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Raio-X da Negociação</h4>
                </div>
            </div>

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
                                                        : 'bg-white/10'
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
                        <div className="absolute z-50 -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-gray-900 border border-white/20 rounded-lg px-3 py-2 shadow-xl max-w-[220px]">
                            <p className="text-[11px] text-gray-200 leading-relaxed">{config.desc}</p>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 border-r border-b border-white/20" />
                        </div>
                    )}
                </div>
            )}

            {/* B. Forbidden Action - DANGER ZONE */}
            {forbidden && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <ShieldAlert size={14} className="text-red-400 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Zona de Perigo</span>
                    </div>
                    <p className="text-xs text-red-300/90 leading-relaxed font-medium pl-[22px]">
                        {forbidden}
                    </p>
                </div>
            )}

            {/* C. Lead Analysis (Signal + Psychological) */}
            {(signal || psychological) && (
                <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Análise do Lead</span>

                    {signal && (
                        <div className="flex items-start gap-2">
                            <Radio size={13} className="text-cyan-400 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-[9px] uppercase tracking-widest text-cyan-400/70 font-bold">Sinal Detectado</span>
                                <p className="text-xs text-gray-300 leading-relaxed">{signal}</p>
                            </div>
                        </div>
                    )}

                    {psychological && (
                        <div className="flex items-start gap-2">
                            <Brain size={13} className="text-purple-400 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-[9px] uppercase tracking-widest text-purple-400/70 font-bold">Fator Psicológico</span>
                                <p className="text-xs text-gray-300 leading-relaxed">{psychological}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* D. Recommended Tactic */}
            {strategy && (
                <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Target size={14} className="text-primary shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Tática Recomendada</span>
                    </div>
                    <p className="text-xs text-gray-200 leading-relaxed pl-[22px]">
                        {strategy}
                    </p>
                </div>
            )}
        </div>
    )
}

export default StrategicContextCard
