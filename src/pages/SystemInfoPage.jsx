import React from 'react'
import { RefreshCw, History, Info, Server, ShieldCheck, Activity } from 'lucide-react'

const SystemInfoPage = () => {
    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in-up">

            {/* Header */}
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Info className="text-blue-600" size={32} />
                    Informações do Sistema
                </h1>
                <p className="text-slate-500 text-lg">
                    Entenda como o Link&Lead opera seus processos de sincronização e segurança.
                </p>
            </div>

            {/* SYNC STATUS SECTION */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <Activity size={20} className="text-slate-500" />
                    <h2 className="text-xl font-bold text-slate-800">Status da Sincronização</h2>
                </div>

                <div className="p-8 grid gap-8 md:grid-cols-2">

                    {/* Block 1: Real-time Sync */}
                    <div className="flex flex-col gap-4 p-6 rounded-xl bg-green-50/50 border border-green-100/50 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center shadow-sm">
                            <RefreshCw size={24} className="animate-spin-slow" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                🟢 Sincronização em Tempo Real (O "Repórter")
                            </h3>
                            <p className="text-slate-600 leading-relaxed">
                                "Para manter suas conversas fluindo, o sistema verifica novas mensagens automaticamente várias vezes ao dia. Assim que seu lead responder no LinkedIn, a mensagem aparecerá na plataforma e a IA analisará o contexto imediato para sugerir a próxima ação. (Janela de leitura: Últimas 50 mensagens)."
                            </p>
                        </div>
                    </div>

                    {/* Block 2: History Import */}
                    <div className="flex flex-col gap-4 p-6 rounded-xl bg-amber-50/50 border border-amber-100/50 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
                            <History size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                                🟡 Importação de Histórico (O "Arqueólogo")
                            </h3>
                            <p className="text-slate-600 leading-relaxed">
                                "Para garantir que a IA conheça seu cliente a fundo, ao cadastrar um novo lead, iniciamos uma varredura segura para recuperar o histórico de conversas antigas (até 1 ano). Isso permite que o sistema entenda dores passadas e negociações anteriores. (Execução única no cadastro)."
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            {/* SERVER SECTION */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <Server size={20} className="text-slate-500" />
                    <h2 className="text-xl font-bold text-slate-800">Infraestrutura & Segurança</h2>
                </div>
                <div className="p-8">
                    <div className="flex gap-4 items-start">
                        <div className="mt-1">
                            <ShieldCheck size={24} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Dados e Privacidade</h3>
                            <p className="text-slate-600 leading-relaxed max-w-2xl">
                                Todos os dados de leads e mensagens são processados em servidores seguros. Utilizamos conexões criptografadas (SSL) para toda a comunicação com o LinkedIn e gateways de pagamento. Seus dados nunca são compartilhados com terceiros.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default SystemInfoPage
