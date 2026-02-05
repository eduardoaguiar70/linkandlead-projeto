import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    Search,
    Loader2,
    Plus,
    Trash2,
    RefreshCw,
    Download,
    Check
} from 'lucide-react'
import ImportContactsModal from '../components/ImportContactsModal'
import { useClientSelection } from '../contexts/ClientSelectionContext'

const ListDetailsPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { selectedClientId } = useClientSelection()
    const [list, setList] = useState(null)
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [selectedLeads, setSelectedLeads] = useState([])

    useEffect(() => {
        fetchListAndLeads()

        // Polling for processing status
        let interval
        if (list?.status === 'PROCESSING') {
            interval = setInterval(() => {
                fetchListAndLeads(true) // Silent refresh
            }, 10000)
        }
        return () => clearInterval(interval)
    }, [id, list?.status])

    const fetchListAndLeads = async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            // Fetch List Details
            const { data: listData, error: listError } = await supabase
                .from('contact_lists')
                .select('*')
                .eq('id', id)
                .single()

            if (listError) throw listError
            setList(listData)

            // Fetch Leads
            const { data: leadsData, error: leadsError } = await supabase
                .from('contact_list_leads')
                .select('*, leads(*)')
                .eq('list_id', id)

            if (leadsError) throw leadsError

            // Flatten structure
            const flattenedLeads = leadsData?.map(item => ({
                ...item,
                lead_data: item.leads
            })) || []

            setLeads(flattenedLeads)

        } catch (error) {
            console.error('Error fetching details:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredLeads = leads.filter(l =>
        l.lead_data?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.lead_data?.headline?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const toggleSelectLead = (leadId) => {
        setSelectedLeads(prev =>
            prev.includes(leadId)
                ? prev.filter(id => id !== leadId)
                : [...prev, leadId]
        )
    }

    const toggleSelectAll = () => {
        if (selectedLeads.length === filteredLeads.length) {
            setSelectedLeads([])
        } else {
            setSelectedLeads(filteredLeads.map(l => l.id))
        }
    }

    const handleDeleteSelected = async () => {
        if (!selectedLeads.length || !window.confirm(`Tem certeza que deseja remover ${selectedLeads.length} leads desta lista?`)) return

        try {
            const { error } = await supabase
                .from('contact_list_leads')
                .delete()
                .in('id', selectedLeads)

            if (error) throw error

            setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)))
            setSelectedLeads([])
        } catch (error) {
            console.error('Error deleting leads:', error)
            alert('Erro ao remover leads.')
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">
            {/* HEADER */}
            <div className="max-w-7xl mx-auto mb-10">
                <button
                    onClick={() => navigate('/lists')}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-semibold mb-4"
                >
                    <ArrowLeft size={16} /> Voltar para Listas
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                            {list ? list.name : 'Carregando...'}
                        </h1>
                        <p className="text-slate-500 text-lg">Detalhes e leads da lista de contatos.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        >
                            <Download size={20} /> Importar Contatos
                        </button>
                    </div>

                </div>

                {/* PROGRESS BAR */}
                {list?.status === 'PROCESSING' && (
                    <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm mb-6 animate-pulse">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Loader2 className="animate-spin text-blue-600" size={20} />
                                    Importando Contatos...
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Isso pode levar alguns minutos. Estamos capturando dados do LinkedIn.
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-bold text-blue-600">
                                    {Math.round((leads.length / (list.total_leads_expected || 1)) * 100)}%
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((leads.length / (list.total_leads_expected || 1)) * 100, 100)}%` }}
                            ></div>
                        </div>
                        {leads.length > 0 && (
                            <p className="text-xs text-slate-400 mt-2 text-right">
                                {leads.length} de {list.total_leads_expected || '?'} leads processados
                            </p>
                        )}
                    </div>
                )}

                {/* CONTROLS */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar leads na lista..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium placeholder:text-slate-400"
                        />
                    </div>
                    {selectedLeads.length > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors border border-red-200"
                        >
                            <Trash2 size={16} /> Deletar ({selectedLeads.length})
                        </button>
                    )}
                </div>

                {/* TABLE */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="py-20 flex justify-center text-gray-400">
                            <Loader2 className="animate-spin" size={32} />
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-4 px-6 w-12">
                                        <input
                                            type="checkbox"
                                            onChange={toggleSelectAll}
                                            checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th className="py-4 px-6">Nome</th>
                                    <th className="py-4 px-6">Cargo & Empresa</th>
                                    <th className="py-4 px-6">Status na Lista</th>
                                    <th className="py-4 px-6 text-right">Adicionado em</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-gray-400">Nenhum lead encontrado nesta lista.</td>
                                    </tr>
                                ) : (
                                    filteredLeads.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-6">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLeads.includes(item.id)}
                                                    onChange={() => toggleSelectLead(item.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="font-bold text-slate-900">{item.lead_data?.nome || 'Sem Nome'}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="text-sm font-medium text-slate-900">{item.lead_data?.headline}</div>
                                                <div className="text-xs text-slate-500">{item.lead_data?.company}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${item.status === 'ENRICHED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                                                    }`}>
                                                    {item.status || 'Pendente'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right text-sm text-slate-500">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* IMPORT MODAL */}
            <ImportContactsModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                listId={id}
                clientId={selectedClientId}
                accountId={list?.account_id}
                onSuccess={() => fetchListAndLeads()}
            />
        </div>
    )
}

export default ListDetailsPage
