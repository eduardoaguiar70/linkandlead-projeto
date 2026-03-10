import React, { useState } from 'react'
import {
    X,
    Linkedin,
    Users,
    Search,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    Link as LinkIcon,
    AlertTriangle
} from 'lucide-react'

const AddLeadsModal = ({ isOpen, onClose, campaignId, clientId, onImportConnections }) => {
    const [view, setView] = useState('selection') // 'selection' | 'post-form' | 'connections-confirm'
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
                    setTimeout(() => {
                        setSuccess(false)
                        setPostUrl('')
                        setView('selection')
                    }, 300)
                }, 2000)
            } else {
                console.error('Webhook error')
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmConnections = () => {
        if (onImportConnections) onImportConnections()
        onClose()
    }

    const triggerHistoryScan = async (leadId, accountId) => {
        try {
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/import-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: leadId, account_id: accountId })
            })
            if (!response.ok) {
                console.error('History trigger failed')
                alert('Error starting history sync')
            }
        } catch (e) {
            console.error(e)
            alert('Error starting history sync')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">

                {/* HEADER */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {(view === 'post-form' || view === 'connections-confirm') && (
                            <button onClick={handleBack} className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Add Leads</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {view === 'selection' && 'Choose an import source'}
                                {view === 'post-form' && 'Import from LinkedIn Post'}
                                {view === 'connections-confirm' && 'Confirm import'}
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
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Import Started!</h3>
                            <p className="text-gray-500 max-w-xs mx-auto">
                                The bot is processing the post. Leads will appear in your campaign shortly.
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
                                    <h3 className="font-bold text-slate-800 group-hover:text-blue-700">Import from LinkedIn Post</h3>
                                    <p className="text-xs text-gray-500 mt-1">Extract profiles that liked or commented on a viral post.</p>
                                </div>
                            </button>

                            {/* Option 2: Connections */}
                            <button
                                onClick={() => setView('connections-confirm')}
                                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-left group w-full"
                            >
                                <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Users size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 group-hover:text-blue-700">Your Connections</h3>
                                        <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full uppercase">New</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Import your recent connections for qualification.</p>
                                </div>
                            </button>

                            {/* Option 3: Sales Navigator (Disabled) */}
                            <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 opacity-60 cursor-not-allowed">
                                <div className="w-12 h-12 rounded-lg bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                                    <Search size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-slate-400">Sales Navigator Search</h3>
                                        <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full uppercase">Coming Soon</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Paste a Sales Nav search URL.</p>
                                </div>
                            </div>
                        </div>

                    ) : view === 'connections-confirm' ? (
                        // CONFIRMATION VIEW
                        <div className="animate-fade-in">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center mb-4">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Are you sure?</h3>
                                <p className="text-sm text-gray-500 max-w-xs">
                                    This will import <strong>all your recent LinkedIn connections</strong> into the system for AI qualification. This action may overwrite existing data for contacts already in your pipeline.
                                </p>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-xs text-amber-700 space-y-1">
                                <p className="font-semibold">⚠️ Sensitive action — read before proceeding:</p>
                                <ul className="list-disc list-inside space-y-0.5 text-amber-600">
                                    <li>All your LinkedIn connections will be fetched</li>
                                    <li>Contacts already in the pipeline may be updated</li>
                                    <li>This process may take a few minutes</li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmConnections}
                                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                                >
                                    <Users size={16} />
                                    Yes, Import Connections
                                </button>
                            </div>
                        </div>

                    ) : (
                        // POST FORM VIEW
                        <form onSubmit={handleImportFromPost} className="animate-fade-in">
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">LinkedIn Post URL</label>
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
                                    Make sure the post is public. The bot will check likes and comments.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !postUrl}
                                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Linkedin size={20} />}
                                {loading ? 'Importing...' : 'Import & Analyze'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AddLeadsModal
