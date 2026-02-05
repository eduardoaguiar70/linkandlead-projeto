import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import { useNavigate } from 'react-router-dom'
import {
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Calendar,
    ArrowRight,
    Loader2,
    Target,
    Users,
    MessageSquare,
    BarChart3
} from 'lucide-react'

const CampaignsPage = () => {
    const { selectedClientId } = useClientSelection()
    const navigate = useNavigate()
    const [campaigns, setCampaigns] = useState([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [newCampaignName, setNewCampaignName] = useState('')
    const [createLoading, setCreateLoading] = useState(false)

    useEffect(() => {
        if (selectedClientId) {
            fetchCampaigns()
        }
    }, [selectedClientId])

    const fetchCampaigns = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('client_id', selectedClientId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setCampaigns(data || [])
        } catch (error) {
            console.error('Error fetching campaigns:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateCampaign = async (e) => {
        e.preventDefault()
        if (!newCampaignName.trim() || !selectedClientId) return

        setCreateLoading(true)
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .insert([
                    {
                        name: newCampaignName,
                        client_id: selectedClientId,
                        status: 'active'
                    }
                ])
                .select()

            if (error) throw error

            if (data) {
                setCampaigns([data[0], ...campaigns])
                setIsCreateModalOpen(false)
                setNewCampaignName('')
            }
        } catch (error) {
            console.error('Error creating campaign:', error)
        } finally {
            setCreateLoading(false)
        }
    }

    // Filter campaigns
    const filteredCampaigns = campaigns.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-800">
            {/* HEADER */}
            <div className="max-w-7xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Campanhas de Vendas</h1>
                        <p className="text-slate-500 text-lg">Gerencie suas estratégias de prospecção e acompanhe resultados.</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
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
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* CAMPAIGN LIST */}
                {loading ? (
                    <div className="py-20 flex justify-center text-gray-400">
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : filteredCampaigns.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 border-dashed">
                        <Target className="mx-auto text-gray-300 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhuma campanha encontrada</h3>
                        <p className="text-gray-500 mb-6">Comece criando sua primeira campanha de prospecção.</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-5 py-2 rounded-lg bg-orange-50 text-orange-600 font-bold hover:bg-orange-100 transition-colors"
                        >
                            Criar Campanha
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCampaigns.map(campaign => (
                            <div
                                key={campaign.id}
                                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${campaign.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-slate-500'
                                        }`}>
                                        <Target size={20} />
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${campaign.status === 'active'
                                        ? 'bg-green-50 text-green-600 border-green-100'
                                        : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                        {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-1">
                                    {campaign.name}
                                </h3>
                                <p className="text-sm text-slate-600 font-medium mb-6 line-clamp-2">
                                    {campaign.description || "Sem descrição definida."}
                                </p>

                                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 border-t border-slate-100 pt-4">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        {new Date(campaign.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-auto text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Acessar <ArrowRight size={14} />
                                    </div>
                                </div>
                            </div>
                        ))}
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
                        <form onSubmit={handleCreateCampaign} className="p-6">
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Campanha</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newCampaignName}
                                    onChange={e => setNewCampaignName(e.target.value)}
                                    placeholder="Ex: Prospecção CEO Tech Q1"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all font-medium"
                                />
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
                                    disabled={!newCampaignName.trim() || createLoading}
                                    className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
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

export default CampaignsPage
