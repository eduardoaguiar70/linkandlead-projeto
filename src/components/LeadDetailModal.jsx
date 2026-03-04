import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import {
    X,
    Briefcase,
    MapPin,
    ExternalLink,
    Copy,
    Check,
    Sparkles,
    MessageCircle,
    ArrowRight,
    ArrowLeft,
    Info,
    Brain,
    Send
} from 'lucide-react'

const LeadDetailModal = ({ lead, campaignLead, onClose }) => {
    const [interactions, setInteractions] = useState([])
    const [loadingInteractions, setLoadingInteractions] = useState(false)
    const [copiedIdx, setCopiedIdx] = useState(null)
    const [enrichedData, setEnrichedData] = useState(null) // Local state for fresh DB data
    const [draftMessage, setDraftMessage] = useState('') // Human-in-the-loop message editing
    const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(null)

    useEffect(() => {
        if (lead?.id) fetchInteractions()
    }, [lead?.id])

    const fetchInteractions = async () => {
        setLoadingInteractions(true)
        try {
            // 1. Fetch Interactions
            const { data: interactionsData, error: interactionsError } = await supabase
                .from('interactions')
                .select('*')
                .eq('lead_id', lead.id)
                .order('interaction_date', { ascending: false })
                .limit(5)

            if (interactionsError) throw interactionsError
            setInteractions(interactionsData || [])

            // 2. FETCH MISSING DATA (Trust Score, Sentiment, AI Replies, Summary)
            // Since the main view can't join, we fetch fresh data here
            const { data: leadData, error: leadError } = await supabase
                .from('leads')
                .select('cadence_stage, sentiment, sentiment_reasoning, ai_suggested_replies, conversation_summary, icp_reason')
                .eq('id', lead.id)
                .single()

            if (leadData) {
                console.log('[LeadDetailModal] Fetched fresh enriched data:', leadData)
                // Merge fresh data into the local lead object mechanism
                // We'll update a local state or ref, but since 'lead' is a prop, 
                // we might need a local state for the enriched fields.
                setEnrichedData(leadData)
            }

        } catch (err) {
            console.error('Error fetching details:', err)
        } finally {
            setLoadingInteractions(false)
        }
    }

    const copyToClipboard = (text, idx) => {
        navigator.clipboard.writeText(text)
        setCopiedIdx(idx)
        setTimeout(() => setCopiedIdx(null), 2000)
    }

    // ============ DATA TRIAD LOGIC ============

    // 1. QUALITY (A/B/C tier)
    const getQualityData = () => {
        const tier = lead?.icp_score?.toUpperCase() || 'C'
        const configs = {
            'A': { label: 'A', percent: 100, color: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-400' },
            'B': { label: 'B', percent: 66, color: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-400' },
            'C': { label: 'C', percent: 33, color: '#ef4444', bg: 'bg-red-500', text: 'text-red-400' }
        }
        return configs[tier] || configs['C']
    }

    // 2. INTERACTION (message volume)
    const getInteractionData = () => {
        const count = lead?.total_interactions || 0
        if (count >= 10) return { percent: 100, color: '#10b981', label: count, text: 'text-emerald-400' }
        if (count >= 5) return { percent: 66, color: '#f59e0b', label: count, text: 'text-amber-400' }
        return { percent: Math.max(10, count * 10), color: '#ef4444', label: count, text: 'text-red-400' }
    }

    // 3. CADENCE STAGE → Trust/Proximity Level
    // In outbound prospecting, cadence stages reflect growing trust:
    // G1 (first contact) → G7+ (high trust / ready to close)
    const getCadenceData = () => {
        const stage = enrichedData?.cadence_stage
            ?? lead?.cadence_stage
            ?? lead?.leads?.cadence_stage
            ?? ''

        // Extract numeric level from stage (e.g. "G5" → 5, "G1" → 1)
        const match = stage?.toString().match(/(\d+)/)
        const level = match ? parseInt(match[1], 10) : 0

        // Map level to trust progression (outbound context)
        const trustLevels = [
            { max: 0, label: 'Sem Cadência', desc: 'Este lead ainda não iniciou a cadência de prospecção.', percent: 5, color: '#94a3b8', text: 'text-slate-400' },
            { max: 1, label: 'Primeiro Contato', desc: 'Lead recebeu o primeiro toque. Nível de confiança inicial.', percent: 15, color: '#3b82f6', text: 'text-blue-400' },
            { max: 2, label: 'Reconhecimento', desc: 'Lead começa a reconhecer você. Confiança em construção.', percent: 30, color: '#06b6d4', text: 'text-cyan-400' },
            { max: 3, label: 'Consideração', desc: 'Lead demonstra abertura para conversar. Confiança em crescimento.', percent: 45, color: '#f59e0b', text: 'text-amber-400' },
            { max: 4, label: 'Interesse Ativo', desc: 'Lead engajado e interessado. Boa confiança estabelecida.', percent: 60, color: '#f97316', text: 'text-orange-400' },
            { max: 5, label: 'Relacionamento', desc: 'Lead confia em você como referência. Relação sólida.', percent: 75, color: '#10b981', text: 'text-emerald-400' },
            { max: 6, label: 'Alta Confiança', desc: 'Lead altamente engajado. Pronto para proposta.', percent: 90, color: '#22c55e', text: 'text-green-400' },
            { max: Infinity, label: 'Pronto p/ Fechar', desc: 'Máxima confiança atingida. Momento ideal para conversão.', percent: 100, color: '#eab308', text: 'text-yellow-400' }
        ]

        const config = trustLevels.find(t => level <= t.max) || trustLevels[0]

        return { ...config, stage, level }
    }

    const quality = getQualityData()
    const interaction = getInteractionData()
    const cadence = getCadenceData()
    // Prioritize fresh AI replies
    const aiReplies = enrichedData?.ai_suggested_replies || lead?.ai_suggested_replies || []

    if (!lead) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={onClose}>
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden border border-slate-200"
                onClick={e => e.stopPropagation()}
            >
                {/* ========== HEADER: Identity (Keep Dark) ========== */}
                <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-slate-900 to-slate-800 rounded-t-3xl">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition text-slate-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 p-0.5 shrink-0">
                            <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                                {lead.avatar_url ? (
                                    <img src={lead.avatar_url} alt={lead.nome} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-white">{lead.nome?.charAt(0) || '?'}</span>
                                )}
                            </div>
                        </div>

                        {/* Name + Headline */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-white truncate">{lead.nome || 'Lead'}</h2>
                            <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5 truncate">
                                <Briefcase size={14} className="shrink-0" />
                                {lead.headline || 'Sem cargo informado'}
                            </p>
                            {lead.location && (
                                <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                                    <MapPin size={12} /> {lead.location}
                                </p>
                            )}
                        </div>

                        {lead.linkedin_url && (
                            <a
                                href={lead.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            >
                                <ExternalLink size={18} />
                            </a>
                        )}
                    </div>
                </div>

                {/* ========== TRUST TRIAD: 3 Stat Badges ========== */}
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                    <div className="grid grid-cols-3 gap-3">
                        {/* Badge 1: Qualificação ICP */}
                        <div className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 ${quality.label === 'A' ? 'bg-emerald-50 border-emerald-300' :
                                quality.label === 'B' ? 'bg-amber-50 border-amber-300' :
                                    'bg-red-50 border-red-300'
                            }`}>
                            <span className={`text-2xl font-black ${quality.text}`}>{quality.label}</span>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center leading-tight">Qualificação ICP</span>
                        </div>

                        {/* Badge 2: Interações */}
                        <div className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 ${interaction.percent === 100 ? 'bg-emerald-50 border-emerald-300' :
                                interaction.percent === 66 ? 'bg-amber-50 border-amber-300' :
                                    'bg-red-50 border-red-300'
                            }`}>
                            <span className={`text-2xl font-black ${interaction.text}`}>{interaction.label}</span>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center leading-tight">Interações</span>
                        </div>

                        {/* Badge 3: Cadência */}
                        <div className="flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 bg-blue-50 border-blue-200">
                            <span className={`text-2xl font-black ${cadence.text}`}>{cadence.stage || '—'}</span>
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-center leading-tight">Cadência</span>
                            {cadence.label && <span className={`text-[9px] font-medium ${cadence.text} leading-tight text-center`}>{cadence.label}</span>}
                        </div>
                    </div>

                    {/* ICP Reasoning */}
                    <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-600">
                            <span className="font-bold text-slate-800 mr-1">Por que ICP {quality.label}?</span>
                            {enrichedData?.icp_reason || lead?.icp_reason || "Sem justificativa disponível."}
                        </p>
                    </div>

                    {/* Cadence Stage Explanation */}
                    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-600">
                            <span className="font-bold text-slate-800 mr-1">Nível de Cadência ({cadence.stage || '—'}):</span>
                            {cadence.desc}
                        </p>
                    </div>
                </div>

                {/* ========== SCROLLABLE CONTENT (Light Theme) ========== */}
                <div className="px-6 pb-6 pt-4 overflow-y-auto max-h-[calc(92vh-340px)] space-y-5 bg-white">

                    {/* ========== AI BRIEFING (Context) ========== */}
                    {(enrichedData?.conversation_summary || lead?.conversation_summary) && (
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Brain size={16} className="text-blue-600" />
                                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Resumo da Conversa</span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {enrichedData?.conversation_summary || lead?.conversation_summary}
                            </p>
                        </div>
                    )}

                    {/* ========== ACTION ENGINE: AI Suggestions (Enhanced) ========== */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-amber-500" />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Motor de Ação</span>
                        </div>

                        {aiReplies.length > 0 ? (
                            <div className="space-y-3">
                                {aiReplies.map((reply, idx) => {
                                    // Support both old string format and new object format
                                    const text = typeof reply === 'object' ? reply.text : reply
                                    const strategy = typeof reply === 'object' ? reply.strategy : null
                                    const isSelected = selectedSuggestionIdx === idx

                                    return (
                                        <div
                                            key={idx}
                                            className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${isSelected
                                                ? 'ring-2 ring-violet-500 border-violet-400 bg-violet-50'
                                                : idx === 0
                                                    ? 'bg-gradient-to-r from-violet-100 to-indigo-100 border-violet-300 hover:border-violet-400'
                                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                                }`}
                                            onClick={() => {
                                                setDraftMessage(text)
                                                setSelectedSuggestionIdx(idx)
                                            }}
                                        >
                                            {idx === 0 && (
                                                <span className="absolute -top-2 left-3 px-2 py-0.5 bg-violet-600 text-white text-[10px] font-bold uppercase rounded-full">
                                                    Recomendada
                                                </span>
                                            )}
                                            <p className="text-sm text-slate-700 leading-relaxed pr-10">
                                                "{text}"
                                            </p>
                                            {/* Strategy Explanation */}
                                            {strategy && (
                                                <p className="text-xs text-slate-500 italic mt-2 border-t border-slate-200 pt-2">
                                                    💡 <span className="font-medium">Estratégia:</span> {strategy}
                                                </p>
                                            )}
                                            <button
                                                className="absolute top-4 right-4 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition opacity-0 group-hover:opacity-100"
                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(text, idx) }}
                                            >
                                                {copiedIdx === idx ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                    )
                                })}

                                {/* ========== HUMAN-IN-THE-LOOP EDITOR ========== */}
                                {draftMessage && (
                                    <div className="mt-4 p-4 bg-white rounded-xl border-2 border-dashed border-blue-300 space-y-3">
                                        <div className="flex items-center gap-2 text-xs text-blue-600 font-bold uppercase tracking-wider">
                                            <MessageCircle size={14} />
                                            Editar Mensagem Antes de Enviar
                                        </div>
                                        <textarea
                                            className="w-full h-28 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
                                            value={draftMessage}
                                            onChange={(e) => setDraftMessage(e.target.value)}
                                            placeholder="Edite a mensagem aqui..."
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => copyToClipboard(draftMessage, -1)}
                                                className="flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 transition flex items-center justify-center gap-2"
                                            >
                                                <Copy size={14} />
                                                Copiar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    console.log('[LinkedIn Send] Simulating send:', draftMessage)
                                                    alert('✅ Mensagem pronta para envio! (Simulação)')
                                                    setDraftMessage('')
                                                    setSelectedSuggestionIdx(null)
                                                }}
                                                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                                            >
                                                <Send size={14} />
                                                Enviar via LinkedIn
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center">
                                <Sparkles size={24} className="mx-auto text-slate-400 mb-2" />
                                <p className="text-sm text-slate-500">
                                    Nenhuma sugestão disponível ainda.<br />
                                    <span className="text-slate-400">Sincronize as mensagens para gerar.</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ========== RECENT MESSAGES ========== */}
                    {interactions.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <MessageCircle size={16} className="text-slate-500" />
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Últimas Mensagens</span>
                            </div>
                            <div className="space-y-2">
                                {interactions.slice(0, 3).map((msg, idx) => (
                                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${msg.direction === 'outbound' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                                                    }`}>
                                                    {msg.direction === 'outbound' ? <ArrowRight size={10} /> : <ArrowLeft size={10} />}
                                                </span>
                                                <span className={`text-xs font-semibold ${msg.direction === 'outbound' ? 'text-blue-600' : 'text-emerald-600'
                                                    }`}>
                                                    {msg.direction === 'outbound' ? 'Enviada' : 'Recebida'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(msg.interaction_date).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-700 line-clamp-2">{msg.content || '—'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!loadingInteractions && interactions.length === 0 && (
                        <div className="text-center py-6 text-slate-600 text-sm">
                            <MessageCircle size={24} className="mx-auto mb-2 opacity-50" />
                            Nenhuma mensagem registrada
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default LeadDetailModal
