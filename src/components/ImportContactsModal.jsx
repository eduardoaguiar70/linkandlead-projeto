import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { X, Linkedin, Download, Loader2, AlertCircle } from 'lucide-react'

const ImportContactsModal = ({ isOpen, onClose, listId, clientId, accountId, onSuccess }) => {
    const [searchUrl, setSearchUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!searchUrl.trim() || !clientId || !listId) return

        // Validate Account ID
        if (!accountId) {
            setError('Esta lista não está vinculada a uma conta do LinkedIn. (Account ID ausente).')
            return
        }

        setLoading(true)
        setError(null)

        try {
            // Call n8n Webhook
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/import-linkedin-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    search_url: searchUrl,
                    list_id: listId,
                    client_id: clientId,
                    account_id: accountId
                })
            })

            if (!response.ok) throw new Error('Falha na comunicação com o servidor de importação.')

            // Update List Status to PROCESSING
            await supabase
                .from('contact_lists')
                .update({
                    status: 'PROCESSING',
                })
                .eq('id', listId)

            onSuccess()
            onClose()
            setSearchUrl('')

        } catch (err) {
            console.error(err)
            setError(err.message || 'Erro desconhecido ao iniciar importação.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Importar Contatos</h2>
                        <p className="text-xs text-gray-500 mt-1">Adicione leads a esta lista automaticamente.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Source Selection - For now just LinkedIn Search */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fonte de Dados</label>
                        <div className="border-2 border-indigo-100 bg-indigo-50/50 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-indigo-300 transition-all">
                            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                                <Linkedin size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">LinkedIn Search</h3>
                                <p className="text-xs text-slate-500">Extrair leads de uma busca salva.</p>
                            </div>
                            <div className="ml-auto">
                                <input type="radio" checked readOnly className="w-4 h-4 text-indigo-600" />
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">LinkedIn Search URL</label>
                            <input
                                autoFocus
                                type="url"
                                required
                                value={searchUrl}
                                onChange={e => setSearchUrl(e.target.value)}
                                placeholder="https://www.linkedin.com/search/results/people/..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm"
                            />
                            <p className="text-xs text-slate-400 mt-2">Cole a URL completa da página de resultados de busca do LinkedIn.</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-gray-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !searchUrl.trim()}
                                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                                {loading ? 'Iniciando...' : 'Extrair e Importar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ImportContactsModal
