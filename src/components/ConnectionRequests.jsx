import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import { toast } from 'sonner'

const GENERATE_ICEBREAKER_URL = 'https://n8n-n8n-start.kfocge.easypanel.host/webhook/generate-icebreaker'
const ACCEPT_AND_SEND_URL = 'https://n8n-n8n-start.kfocge.easypanel.host/webhook/accept-and-send'

// ── ICP Score Badge ────────────────────────────────────────────────────────────
const ICP_STYLES = {
    A: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    B: 'bg-amber-100 text-amber-800 border-amber-200',
    C: 'bg-orange-100 text-orange-800 border-orange-200',
    DISCARD: 'bg-gray-100 text-gray-500 border-gray-200',
}

const IcpBadge = ({ score, reasoning }) => {
    const [showTooltip, setShowTooltip] = useState(false)
    if (!score) return null
    const styles = ICP_STYLES[score] ?? ICP_STYLES.DISCARD
    return (
        <div
            className="relative inline-flex items-center"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border cursor-default select-none ${styles}`}>
                ICP&nbsp;{score}
            </span>
            {showTooltip && reasoning && (
                <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3 bg-white border border-gray-200 rounded-xl shadow-xl">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">AI Reasoning</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{reasoning}</p>
                    <div className="absolute top-full left-4 border-8 border-transparent border-t-white" style={{ filter: 'drop-shadow(0 1px 0 #e5e7eb)' }} />
                </div>
            )}
        </div>
    )
}

const ConnectionRequests = () => {
    const { selectedClientId } = useClientSelection()
    const [requests, setRequests] = useState([])
    const [selectedRequest, setSelectedRequest] = useState(null)
    const [message, setMessage] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)

    useEffect(() => {
        if (!selectedClientId) return

        const fetchRequests = async () => {
            try {
                const { data, error } = await supabase
                    .from('connection_requests')
                    .select('*')
                    .eq('status', 'resolved')
                    .eq('client_id', selectedClientId)

                if (error) {
                    console.error(error)
                    return
                }

                if (data) {
                    setRequests(data)
                }
            } catch (error) {
                console.error(error)
            }
        }

        fetchRequests()
    }, [selectedClientId])

    const handleIgnore = async (req) => {
        const toastId = toast.loading('Processing...')
        try {
            const response = await fetch(ACCEPT_AND_SEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invitation_id: req.invitation_id,
                    client_id: req.client_id,
                    unipile_account_id: req.unipile_account_id,
                    action: 'decline',
                    message: ''
                })
            })

            if (!response.ok) throw new Error('API error')

            const { error } = await supabase
                .from('connection_requests')
                .update({ status: 'ignored' })
                .eq('invitation_id', req.invitation_id)

            if (error) throw error

            setRequests((prev) => prev.filter((r) => r.invitation_id !== req.invitation_id))
            toast.success('Invitation ignored.', { id: toastId })
        } catch (error) {
            console.error(error)
            toast.error('An error occurred. Please try again.', { id: toastId })
        }
    }

    const handleAcceptClick = (invitationId) => {
        setSelectedRequest(invitationId)
        setMessage('')
    }

    const handleGenerateIcebreaker = async (req) => {
        setIsGenerating(true)
        try {
            const response = await fetch(GENERATE_ICEBREAKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: req.name, headline: req.headline })
            })
            const data = await response.json()
            setMessage(data.icebreaker || 'Hi! I would like to connect.')
        } catch (error) {
            console.error(error)
            setMessage('Hi! I would like to connect.')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleConfirmAcceptAndSend = async (req) => {
        const toastId = toast.loading('Processing...')
        try {
            const response = await fetch(ACCEPT_AND_SEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invitation_id: req.invitation_id,
                    message: message,
                    client_id: req.client_id,
                    unipile_account_id: req.unipile_account_id,
                    action: 'accept'
                })
            })

            if (!response.ok) throw new Error('API error')

            const { error } = await supabase
                .from('connection_requests')
                .update({ status: 'accepted' })
                .eq('invitation_id', req.invitation_id)

            if (error) throw error

            setRequests((prev) => prev.filter((r) => r.invitation_id !== req.invitation_id))
            setSelectedRequest(null)

            if (message && message.trim()) {
                toast.success('Connection accepted and icebreaker sent successfully! 🚀', { id: toastId })
            } else {
                toast.success('Connection accepted successfully! ✅', { id: toastId })
            }

            setMessage('')
        } catch (error) {
            console.error(error)
            toast.error('An error occurred. Please try again.', { id: toastId })
        }
    }

    const handleCancel = () => {
        setSelectedRequest(null)
        setMessage('')
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-4">
            {requests.length === 0 && (
                <div className="text-center text-gray-500 py-8">No pending requests.</div>
            )}

            {requests.map((req) => {
                const isSelected = selectedRequest === req.invitation_id

                return (
                    <div
                        key={req.invitation_id}
                        className="flex flex-col border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden"
                    >
                        <div className="flex items-center p-4 gap-4">
                            <img
                                src={req.avatar_url || 'https://via.placeholder.com/150'}
                                alt={req.name || '?'}
                                className="w-14 h-14 rounded-full object-cover border border-gray-200 shrink-0"
                                referrerPolicy="no-referrer"
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-gray-900 truncate">
                                        {req.name || 'Unknown'}
                                    </span>
                                    <IcpBadge score={req.icp_score} reasoning={req.icp_reasoning} />
                                    <a
                                        href={req.profile_url || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(req.name || '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                        title="View LinkedIn Profile"
                                        onClick={(e) => e.stopPropagation()} // Prevent any parent click handlers
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                                            <rect x="2" y="9" width="4" height="12"></rect>
                                            <circle cx="4" cy="4" r="2"></circle>
                                        </svg>
                                    </a>
                                </div>
                                <span className="text-sm text-gray-500 truncate mt-0.5" title={req.headline}>
                                    {req.headline || ''}
                                </span>
                            </div>

                            {!isSelected && (
                                <div className="flex items-center gap-2 shrink-0 ml-4">
                                    <button
                                        onClick={() => handleIgnore(req)}
                                        className="px-4 py-2 font-medium text-gray-500 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                                    >
                                        Ignore
                                    </button>
                                    <button
                                        onClick={() => handleAcceptClick(req.invitation_id)}
                                        className="px-5 py-2 font-medium text-blue-600 border border-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                                    >
                                        Accept
                                    </button>
                                </div>
                            )}
                        </div>

                        {isSelected && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Write your first message..."
                                    className="w-full flex-1 min-h-[100px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y text-sm text-gray-800"
                                />

                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <button
                                        onClick={() => handleGenerateIcebreaker(req)}
                                        disabled={isGenerating}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isGenerating ? 'Generating...' : 'Generate Icebreaker 🤖'}
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleConfirmAcceptAndSend(req)}
                                            className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors shadow-sm"
                                        >
                                            Accept and Send
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default ConnectionRequests
