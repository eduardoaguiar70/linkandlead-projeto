import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import { toast } from 'sonner'

const GENERATE_ICEBREAKER_URL = 'https://n8n-n8n-start.kfocge.easypanel.host/webhook/generate-icebreaker'
const ACCEPT_AND_SEND_URL = 'https://n8n-n8n-start.kfocge.easypanel.host/webhook/accept-and-send'

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
                    .eq('status', 'pending')
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
        const toastId = toast.loading('Processando...')
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
            toast.success('Convite recusado.', { id: toastId })
        } catch (error) {
            console.error(error)
            toast.error('Ocorreu um erro. Tente novamente.', { id: toastId })
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
            setMessage(data.icebreaker || 'Olá! Gostaria de me conectar.')
        } catch (error) {
            console.error(error)
            setMessage('Olá! Gostaria de me conectar.')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleConfirmAcceptAndSend = async (req) => {
        const toastId = toast.loading('Processando...')
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
                toast.success('Conexão aceita e icebreaker enviado com sucesso! 🚀', { id: toastId })
            } else {
                toast.success('Conexão aceita com sucesso! ✅', { id: toastId })
            }

            setMessage('')
        } catch (error) {
            console.error(error)
            toast.error('Ocorreu um erro. Tente novamente.', { id: toastId })
        }
    }

    const handleCancel = () => {
        setSelectedRequest(null)
        setMessage('')
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-4 flex flex-col gap-4">
            {requests.length === 0 && (
                <div className="text-center text-gray-500 py-8">Nenhuma solicitação pendente.</div>
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
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="font-semibold text-gray-900 truncate">
                                    {req.name || 'Desconhecido'}
                                </span>
                                <span className="text-sm text-gray-500 truncate mt-0.5">
                                    {req.headline || ''}
                                </span>
                            </div>

                            {!isSelected && (
                                <div className="flex items-center gap-2 shrink-0 ml-4">
                                    <button
                                        onClick={() => handleIgnore(req)}
                                        className="px-4 py-2 font-medium text-gray-500 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                                    >
                                        Ignorar
                                    </button>
                                    <button
                                        onClick={() => handleAcceptClick(req.invitation_id)}
                                        className="px-5 py-2 font-medium text-blue-600 border border-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                                    >
                                        Aceitar
                                    </button>
                                </div>
                            )}
                        </div>

                        {isSelected && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Escreva sua primeira mensagem..."
                                    className="w-full flex-1 min-h-[100px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y text-sm text-gray-800"
                                />

                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <button
                                        onClick={() => handleGenerateIcebreaker(req)}
                                        disabled={isGenerating}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isGenerating ? 'Gerando...' : 'Gerar Icebreaker 🤖'}
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => handleConfirmAcceptAndSend(req)}
                                            className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-full hover:bg-green-700 transition-colors shadow-sm"
                                        >
                                            Enviar e Aceitar
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
