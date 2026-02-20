import React from 'react'
import { X, History, CheckCircle2, AlertCircle, Loader2, Ban } from 'lucide-react'

const HistorySyncModal = ({
    isOpen,
    onClose,
    onCancel,
    syncProgress = null, // { status, current, total, failures }
}) => {
    if (!isOpen) return null

    const { status = 'idle', current = 0, total = 0, failures = 0 } = syncProgress || {}
    const isRunning = status === 'running'
    const isCompleted = status === 'completed'
    const isCancelled = status === 'cancelled'
    const isError = status === 'error'
    const isDone = isCompleted || isCancelled || isError

    const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0
    const estimateMinutes = Math.ceil(total * 2 / 60)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={isDone ? onClose : undefined} />

            <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <History size={20} className={`text-amber-600 ${isRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-sm">O Arqueólogo</h2>
                            <p className="text-xs text-slate-500">Importação de histórico de mensagens</p>
                        </div>
                    </div>
                    {isDone && (
                        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" aria-label="Fechar">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Status message */}
                    {isRunning && (
                        <div className="flex items-start gap-3">
                            <Loader2 size={20} className="animate-spin text-amber-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-slate-800 text-sm">
                                    Processando lead {current} de {total}...
                                </p>
                                <p className="text-slate-500 text-xs mt-1">
                                    Cada lead leva ~2 segundos. Estimativa total: ~{estimateMinutes} minuto{estimateMinutes > 1 ? 's' : ''}.
                                </p>
                            </div>
                        </div>
                    )}

                    {isCompleted && (
                        <div className="flex items-start gap-3">
                            <CheckCircle2 size={20} className="text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-slate-800 text-sm">
                                    ✅ Importação concluída — {total} leads enviados para processamento
                                </p>
                                {failures > 0 && (
                                    <p className="text-amber-600 text-xs mt-1">
                                        ⚠️ {failures} lead{failures > 1 ? 's' : ''} falharam no envio (registrado no console).
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {isCancelled && (
                        <div className="flex items-start gap-3">
                            <Ban size={20} className="text-slate-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-slate-800 text-sm">
                                    Importação cancelada pelo usuário
                                </p>
                                <p className="text-slate-500 text-xs mt-1">
                                    {current} de {total} leads foram enviados antes do cancelamento.
                                </p>
                            </div>
                        </div>
                    )}

                    {isError && (
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
                            <p className="font-semibold text-red-700 text-sm">
                                Erro durante a importação — tente novamente.
                            </p>
                        </div>
                    )}

                    {/* Progress bar */}
                    {(isRunning || isDone) && total > 0 && (
                        <div>
                            <div className="flex justify-between text-[11px] text-slate-500 mb-1.5 font-medium">
                                <span>{current} / {total} leads</span>
                                <span>{progressPercent}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ease-out ${isCompleted ? 'bg-emerald-500' :
                                            isCancelled ? 'bg-slate-400' :
                                                isError ? 'bg-red-400' :
                                                    'bg-amber-500'
                                        }`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            {failures > 0 && isRunning && (
                                <p className="text-[11px] text-amber-600 mt-1">{failures} falha{failures > 1 ? 's' : ''} até agora</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 flex gap-3">
                    {isRunning && (
                        <button
                            onClick={onCancel}
                            className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm transition-colors"
                        >
                            Cancelar importação
                        </button>
                    )}
                    {isDone && (
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors"
                        >
                            Fechar
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default HistorySyncModal
