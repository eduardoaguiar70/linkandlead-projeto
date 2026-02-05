import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useNavigate } from 'react-router-dom'
import {
    Plus,
    Search,
    Loader2,
    Users,
    ArrowRight,
    RefreshCw,
    Building,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react'
import { useClientSelection } from '../contexts/ClientSelectionContext'

const ListsPage = () => {
    const navigate = useNavigate()
    const { selectedClientId } = useClientSelection()
    const [lists, setLists] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [newListName, setNewListName] = useState('')
    const [createLoading, setCreateLoading] = useState(false)

    // Client Data (Unipile ID)
    const [clientUnipileId, setClientUnipileId] = useState(null)
    const [clientName, setClientName] = useState('')
    const [clientLoading, setClientLoading] = useState(false)
    const [allClients, setAllClients] = useState([])
    const [targetClientId, setTargetClientId] = useState(null)

    useEffect(() => {
        if (selectedClientId) {
            setTargetClientId(selectedClientId)
            fetchClientDetails(selectedClientId)
            fetchLists()
            fetchAllClients()
        } else {
            setLists([])
            setClientUnipileId(null)
            setClientName('')
            setTargetClientId(null)
            fetchAllClients()
        }
    }, [selectedClientId])

    const fetchAllClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('id, name, unipile_account_id')
                .order('name', { ascending: true })
            if (error) throw error
            setAllClients(data || [])
        } catch (error) {
            console.error('Error fetching clients:', error)
        }
    }

    const fetchClientDetails = async (clientId) => {
        if (!clientId) {
            setClientUnipileId(null)
            setClientName('')
            return
        }
        setClientLoading(true)
        try {
            // If we already have the client in allClients, use it to save a round trip
            const clientFromList = allClients.find(c => c.id == clientId)
            if (clientFromList) {
                setClientUnipileId(clientFromList.unipile_account_id)
                setClientName(clientFromList.name)
                setClientLoading(false)
                return
            }

            const { data, error } = await supabase
                .from('clients')
                .select('name, unipile_account_id')
                .eq('id', clientId)
                .single()

            if (error) throw error
            setClientUnipileId(data?.unipile_account_id || null)
            setClientName(data?.name || 'Cliente')
        } catch (error) {
            console.error('Error fetching client details:', error)
            setClientUnipileId(null)
            setClientName('')
        } finally {
            setClientLoading(false)
        }
    }

    const handleTargetClientChange = (e) => {
        const newId = e.target.value
        setTargetClientId(newId)
        fetchClientDetails(newId)
    }

    const fetchLists = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('client_id', selectedClientId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setLists(data || [])
        } catch (error) {
            console.error('Error fetching lists:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateList = async (e) => {
        e.preventDefault()
        if (!newListName.trim() || !clientUnipileId || !targetClientId) return

        setCreateLoading(true)
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .insert([{
                    name: newListName,
                    status: 'EMPTY',
                    client_id: targetClientId,
                    account_id: clientUnipileId
                }])
                .select()

            if (error) throw error

            if (data) {
                // Only update list state if created for current view context
                if (targetClientId == selectedClientId) {
                    setLists([data[0], ...lists])
                } else {
                    alert('Campanha criada para outro cliente. Troque de cliente para visualizar.')
                }
                setIsCreateModalOpen(false)
                setNewListName('')
            }
        } catch (error) {
            console.error('Error creating campaign:', error)
            alert('Erro ao criar campanha: ' + error.message)
        } finally {
            setCreateLoading(false)
        }
    }

    const handlePullLeads = async (e, list) => {
        e.stopPropagation() // Prevent row click

        if (!clientUnipileId) {
            alert('Este cliente não possui um ID da Unipile configurado. Configure em "Gerenciar Clientes".')
            return
        }

        try {
            const response = await fetch('https://n8n-n8n-start.kfocge.easypanel.host/webhook/pull-leads-placeholder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaign_id: list.id,
                    client_id: selectedClientId,
                    unipile_account_id: clientUnipileId
                })
            })

            if (response.ok) {
                alert('Solicitação de leads enviada com sucesso!')
            } else {
                alert('Erro ao solicitar leads.')
            }
        } catch (error) {
            console.error(error)
            alert('Erro de conexão ao solicitar leads.')
        }
    }

    const filteredLists = lists.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // AGENCY LOCK: Block view if no client is selected
    if (!selectedClientId) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="bg-white p-6 rounded-full inline-flex mb-6 shadow-sm border border-slate-100">
                        <Building size={48} className="text-slate-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">Selecione um Cliente</h2>
                    <p className="text-slate-500 text-lg leading-relaxed">
                        Você precisa selecionar um cliente no menu superior para visualizar ou criar listas de prospecção.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">
            {/* HEADER */}
            <div className="max-w-7xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Campanhas e Listas</h1>
                        <p className="text-slate-500 text-lg">Gerencie suas campanhas de prospecção.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <Plus size={20} /> Nova Campanha
                    </button>
                </div>

                {/* CONTROLS */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar campanhas..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* LIST TABLE */}
                {loading || clientLoading ? (
                    <div className="py-20 flex justify-center text-gray-400">
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : filteredLists.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
                        <Users className="mx-auto text-gray-300 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhuma campanha encontrada</h3>
                        <p className="text-gray-500 mb-6">Crie sua primeira campanha para começar.</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-5 py-2 rounded-lg bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 transition-colors"
                        >
                            Criar Campanha
                        </button>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-4 px-6">Nome da Campanha</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6">Criado em</th>
                                    <th className="py-4 px-6 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLists.map(list => (
                                    <tr
                                        key={list.id}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                        onClick={() => navigate(`/campaigns/${list.id}/leads`)}
                                    >
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-slate-900">{list.name}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${list.status === 'READY' ? 'bg-green-50 text-green-600 border-green-100' :
                                                list.status === 'PROCESSING' ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse' :
                                                    'bg-gray-100 text-gray-500 border-gray-200'
                                                }`}>
                                                {list.status || 'Rascunho'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-slate-500 text-sm">
                                            {new Date(list.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-6 text-right flex items-center justify-end gap-3">
                                            <button
                                                onClick={(e) => handlePullLeads(e, list)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border ${clientUnipileId
                                                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                                    }`}
                                                title={clientUnipileId ? "Puxar Leads do LinkedIn" : "Cliente sem ID Unipile configurado"}
                                                disabled={!clientUnipileId}
                                            >
                                                <RefreshCw size={14} /> Puxar Leads
                                            </button>
                                            <ArrowRight size={18} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-slate-800">Nova Campanha</h2>
                            <p className="text-sm text-gray-500 mt-1">Dê um nome para sua nova campanha de prospecção.</p>
                        </div>
                        <form onSubmit={handleCreateList} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Campanha</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newListName}
                                    onChange={e => setNewListName(e.target.value)}
                                    placeholder="Ex: Prospecção LinkedIn - CEOs"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Cliente da Campanha</label>
                                <div className="space-y-3">
                                    <select
                                        value={targetClientId || ''}
                                        onChange={handleTargetClientChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium appearance-none"
                                    >
                                        <option value="" disabled>Selecione o Cliente...</option>
                                        {allClients.map(client => (
                                            <option key={client.id} value={client.id}>
                                                {client.name}
                                            </option>
                                        ))}
                                    </select>

                                    {targetClientId && (
                                        clientUnipileId ? (
                                            <div className="flex items-center gap-3 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 animate-fade-in">
                                                <CheckCircle2 size={20} className="shrink-0" />
                                                <div className="text-sm">
                                                    <p className="font-bold">Conta Conectada</p>
                                                    <p className="text-xs mt-0.5">ID: {clientUnipileId}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 animate-fade-in">
                                                <AlertTriangle size={20} className="shrink-0" />
                                                <div className="text-sm">
                                                    <p className="font-bold">Cliente sem conexão</p>
                                                    <p className="text-xs mt-0.5">
                                                        Este cliente não possui um ID conectado.
                                                        <br />
                                                        Vá em <strong>Gerenciar Clientes</strong> para configurar.
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-gray-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newListName.trim() || !clientUnipileId || createLoading}
                                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {createLoading && <Loader2 className="animate-spin" size={18} />}
                                    Criar Campanha
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ListsPage
