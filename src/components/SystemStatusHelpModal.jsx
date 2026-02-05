import React from 'react'
import { X, RefreshCw, History, Info } from 'lucide-react'

const SystemStatusHelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Info size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Ajuda e Status do Sistema</h2>
                            <p className="text-xs text-gray-500 font-medium">Entenda como mantemos seus dados atualizados</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white hover:shadow-sm text-gray-400 hover:text-slate-600 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Block 1: Real-time Sync */}
                    <div className="flex gap-4">
                        <div className="shrink-0 mt-1">
                            <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 border border-green-100 flex items-center justify-center shadow-sm">
                                <RefreshCw size={20} className="animate-spin-slow" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                                🟢 Sincronização em Tempo Real (O "Repórter")
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                "Para manter suas conversas fluindo, o sistema verifica novas mensagens automaticamente várias vezes ao dia. Assim que seu lead responder no LinkedIn, a mensagem aparecerá na plataforma e a IA analisará o contexto imediato para sugerir a próxima ação. (Janela de leitura: Últimas 50 mensagens)."
                            </p>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full" />

                    {/* Block 2: History Import */}
                    <div className="flex gap-4">
                        <div className="shrink-0 mt-1">
                            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shadow-sm">
                                <History size={20} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                                🟡 Importação de Histórico (O "Arqueólogo")
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                "Para garantir que a IA conheça seu cliente a fundo, ao cadastrar um novo lead, iniciamos uma varredura segura para recuperar o histórico de conversas antigas (até 1 ano). Isso permite que o sistema entenda dores passadas e negociações anteriores. (Execução única no cadastro)."
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400">
                        O sistema opera em segundo plano. Você pode continuar navegando normalmente.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default SystemStatusHelpModal
