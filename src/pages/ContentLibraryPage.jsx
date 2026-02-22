import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import {
    Library,
    Plus,
    Search,
    BookOpen,
    Video,
    FileText,
    Link as LinkIcon,
    Trash2,
    Edit2,
    X,
    Loader2
} from 'lucide-react'

// Map content types to icons and colors
const TYPE_CONFIG = {
    'Video': { icon: Video, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
    'Post': { icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
    'Artigo': { icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    'Outro': { icon: LinkIcon, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' }
}

const ContentLibraryPage = () => {
    const { user } = useAuth()
    const { selectedClientId } = useClientSelection()
    const [contents, setContents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingContent, setEditingContent] = useState(null)
    const [formData, setFormData] = useState({
        content_name: '',
        content_description: '',
        content_url: '',
        content_type: 'Video'
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (user && selectedClientId) {
            fetchContents()
        } else {
            setContents([])
            setLoading(false)
        }
    }, [user, selectedClientId])

    const fetchContents = async () => {
        if (!selectedClientId) return
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('content_library')
                .select('*')
                .eq('client_id', selectedClientId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setContents(data || [])
        } catch (err) {
            console.error('Error fetching content library:', err)
            // Optionally add toast notifications here
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (content = null) => {
        if (content) {
            setEditingContent(content)
            setFormData({
                content_name: content.content_name,
                content_description: content.content_description || '',
                content_url: content.content_url,
                content_type: content.content_type
            })
        } else {
            setEditingContent(null)
            setFormData({
                content_name: '',
                content_description: '',
                content_url: '',
                content_type: 'Video'
            })
        }
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingContent(null)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!user) return

        try {
            setSaving(true)

            const payload = {
                ...formData,
                user_id: user.id,
                client_id: selectedClientId
            }

            if (editingContent) {
                const { error } = await supabase
                    .from('content_library')
                    .update(payload)
                    .eq('id', editingContent.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('content_library')
                    .insert([payload])
                if (error) throw error
            }

            await fetchContents()
            handleCloseModal()
        } catch (err) {
            console.error('Error saving content:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja remover este conteúdo da biblioteca?')) return

        try {
            const { error } = await supabase
                .from('content_library')
                .delete()
                .eq('id', id)

            if (error) throw error
            setContents(prev => prev.filter(c => c.id !== id))
        } catch (err) {
            console.error('Error deleting content:', err)
        }
    }

    // Filter contents based on search query
    const filteredContents = contents.filter(c =>
        c.content_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.content_description && c.content_description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-200/50">
                            <Library className="text-orange-500" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Biblioteca de Conteúdos</h1>
                            <p className="text-sm text-gray-500">Gerencie links, materiais e templates para usar em abordagens.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-all shadow-sm shrink-0"
                    >
                        <Plus size={18} />
                        Adicionar Material
                    </button>
                </div>

                {/* No client selected guard */}
                {!selectedClientId ? (
                    <div className="bg-white border text-center border-gray-200 rounded-3xl p-12">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                            <Library className="text-gray-400" size={28} />
                        </div>
                        <h3 className="text-gray-900 font-bold text-lg mb-2">Selecione um cliente</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            Selecione um cliente no seletor acima para ver e gerenciar a biblioteca de conteúdos.
                        </p>
                    </div>
                ) : (
                    <>

                        {/* Toolbar */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-200">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar conteúdo por nome ou contexto..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 font-medium rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                />
                            </div>
                        </div>

                        {/* Content Grid */}
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="animate-spin text-orange-500" size={32} />
                            </div>
                        ) : filteredContents.length === 0 ? (
                            <div className="bg-white border text-center border-gray-200 rounded-3xl p-12 dashed-border">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                    <Library className="text-gray-400" size={28} />
                                </div>
                                <h3 className="text-gray-900 font-bold text-lg mb-2">Acervo vazio</h3>
                                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                                    {searchQuery ? 'Sua busca não encontrou resultados.' : 'Ainda não há materiais na sua biblioteca de vendas. Adicione links, PDFs, posts ou vídeos.'}
                                </p>
                                {!searchQuery && (
                                    <button
                                        onClick={() => handleOpenModal()}
                                        className="px-6 py-2 bg-orange-50 text-orange-600 font-semibold rounded-full hover:bg-orange-100 transition-colors inline-flex items-center gap-2"
                                    >
                                        <Plus size={18} />
                                        Criar primeiro conteúdo
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredContents.map(item => {
                                    const typeConf = TYPE_CONFIG[item.content_type] || TYPE_CONFIG['Outro']
                                    const TypeIcon = typeConf.icon

                                    return (
                                        <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-gray-300 transition-all group flex flex-col h-full">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`p-2.5 rounded-xl border ${typeConf.bg} ${typeConf.border} ${typeConf.color}`}>
                                                    <TypeIcon size={20} />
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex-1 mb-4">
                                                <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{item.content_name}</h3>
                                                {item.content_description && (
                                                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                                                        {item.content_description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                                                <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase bg-gray-50 px-2 py-1 rounded-md">
                                                    {item.content_type}
                                                </span>
                                                <a
                                                    href={item.content_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 hover:underline"
                                                >
                                                    Abrir link <LinkIcon size={12} />
                                                </a>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal de Criar/Editar */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingContent ? 'Editar Material' : 'Adicionar ao Acervo'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1">Título/Nome</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.content_name}
                                    onChange={e => setFormData({ ...formData, content_name: e.target.value })}
                                    placeholder="Ex: Vídeo de Demonstração V2"
                                    className="w-full px-4 py-2.5 font-medium border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1">Contexto de Uso</label>
                                <textarea
                                    value={formData.content_description}
                                    onChange={e => setFormData({ ...formData, content_description: e.target.value })}
                                    placeholder="Ex: Use este vídeo caso o lead questione sobre concorrência..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 font-medium border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1">Tipo</label>
                                    <select
                                        value={formData.content_type}
                                        onChange={e => setFormData({ ...formData, content_type: e.target.value })}
                                        className="w-full px-4 py-2.5 font-bold border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none bg-gray-50"
                                    >
                                        <option value="Video">Vídeo</option>
                                        <option value="Post">Post (Social)</option>
                                        <option value="Artigo">Artigo</option>
                                        <option value="Outro">Outro (PDF, Link)</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-1">URL (Link Público)</label>
                                    <input
                                        required
                                        type="url"
                                        value={formData.content_url}
                                        onChange={e => setFormData({ ...formData, content_url: e.target.value })}
                                        placeholder="https://..."
                                        className="w-full px-4 py-2.5 font-medium border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-all border border-transparent"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 border border-transparent text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {saving && <Loader2 size={16} className="animate-spin" />}
                                    {editingContent ? 'Salvar Alterações' : 'Salvar no Acervo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ContentLibraryPage
