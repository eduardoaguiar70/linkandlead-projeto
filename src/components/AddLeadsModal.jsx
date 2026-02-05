import React, { useState } from 'react'

import {
    X,
    Linkedin,
    Users,
    Search,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    Link as LinkIcon
} from 'lucide-react'

const AddLeadsModal = ({ isOpen, onClose, campaignId, clientId, onImportConnections }) => {
    const [view, setView] = useState('selection') // 'selection' | 'post-form'
    const [postUrl, setPostUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    if (!isOpen) return null

    const handleBack = () => {
        setView('selection')
        setPostUrl('')
        setSuccess(false)
    }

    const handleImportFromPost = async (e) => {
        e.preventDefault()
        if (!postUrl) return

        setLoading(true)
        try {
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/import-post-leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    post_url: postUrl,
                    campaign_id: campaignId,
                    client_id: clientId
                })
            })

            if (response.ok) {
                setSuccess(true)
                setTimeout(() => {
                    onClose()
                    // Reset after close
                    setTimeout(() => {
                        setSuccess(false)
                        setPostUrl('')
                        setView('selection')
                    }, 300)
                }, 2000)
            } else {
                console.error('Webhook error')
                // Handle error visual state if needed
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // NEW: Trigger History Import (Backend Logic Requirement)
    const triggerHistoryScan = async (leadId, accountId) => {
        try {
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/import-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: leadId,
                    account_id: accountId
                })
            })
            if (!response.ok) {
                // Feedback only on error
                console.error('Falha no trigger de histórico')
                // If we had a toast system here: toast.error("Erro ao iniciar sincronização de histórico")
                alert("Erro ao iniciar sincronização de histórico")
            }
        } catch (e) {
            console.error(e)
            alert("Erro ao iniciar sincronização de histórico")
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">

                {/* HEADER */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {view === 'post-form' && (
                            <button onClick={handleBack} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Adicionar Leads</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {view === 'selection' ? 'Escolha uma fonte de importação' : 'Importar engajamento de Post'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="p-6 overflow-y-auto">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Importação Iniciada!</h3>
                            <p className="text-gray-500 max-w-xs mx-auto">
                                O robô está processando o post. Os leads aparecerão na campanha em breve.
                            </p>
                        </div>
                    ) : view === 'selection' ? (
                        <div className="grid gap-4">
                            {/* Option 1: LinkedIn Post */}
                            <button
                                onClick={() => setView('post-form')}
                                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left group"
                            >
                                <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Linkedin size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 group-hover:text-blue-700">Importar de Post do LinkedIn</h3>
                                    <p className="text-xs text-gray-500 mt-1">Extraia perfis que curtiram ou comentaram em um post viral.</p>
                                </div>
                            </button>

                            {/* Option 2: Connections (Active) */}
                            <button
                                onClick={() => {
                                    if (onImportConnections) onImportConnections()
                                    onClose()
                                }}
                                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left group w-full"
                            >
                                <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Users size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 group-hover:text-blue-700">Suas Conexões</h3>
                                        <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full uppercase">Novo</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Importe suas conexões recentes para qualificação.</p>
                                </div>
                            </button>

                            {/* Option 3: Search (Disabled) */}
                            <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 opacity-60 cursor-not-allowed">
                                <div className="w-12 h-12 rounded-lg bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                                    <Search size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-slate-400">Sales Navigator Search</h3>
                                        <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full uppercase">Em Breve</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Cole uma URL de pesquisa do Sales Nav.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // FORM VIEW
                        <form onSubmit={handleImportFromPost} className="animate-fade-in">
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">URL do Post do LinkedIn</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <LinkIcon size={18} />
                                    </div>
                                    <input
                                        autoFocus
                                        type="url"
                                        required
                                        value={postUrl}
                                        onChange={e => setPostUrl(e.target.value)}
                                        placeholder="https://www.linkedin.com/posts/..."
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Certifique-se de que o post é público. O robô irá verificar likes e comentários.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !postUrl}
                                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Linkedin size={20} />}
                                {loading ? 'Importando...' : 'Importar e Analisar'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AddLeadsModal
