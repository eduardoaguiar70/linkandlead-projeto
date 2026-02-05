import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Loader2, Camera, ArrowRight, RefreshCw, LayoutGrid } from 'lucide-react'

const ClientDashboard = () => {
    const { profile } = useAuth()
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        if (profile?.nome_empresa) {
            fetchClientPosts(profile.nome_empresa)
        }
    }, [profile])


    const fetchClientPosts = async (clientName) => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('tabela_projetofred1')
                .select('*')
                .eq('nome_cliente', clientName)
                .order('id', { ascending: false })

            if (error) throw error
            setPosts(data || [])
        } catch (err) {
            console.error('Erro ao buscar posts:', err)
        } finally {
            setLoading(false)
        }
    }

    const clientName = profile?.nome_empresa

    return (
        <div className="p-2 md:p-6 animate-fade-in-up">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4 glass-panel p-6 rounded-2xl border-glass-border bg-gradient-to-r from-white/5 to-transparent">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        Olá, {clientName || 'Cliente'} <span className="text-2xl">👋</span>
                    </h1>
                    <p className="text-gray-400">
                        Você tem <span className="text-primary font-bold">{posts.length} posts</span> no histórico.
                    </p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-sm font-medium border border-glass-border hover:border-white/20"
                >
                    <RefreshCw size={14} /> Atualizar Dados
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Loader2 className="animate-spin mb-4 text-primary" size={32} />
                    <p className="text-sm font-medium">Carregando galeria...</p>
                </div>
            ) : (
                /* Grid de Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post) => (
                        <div key={post.id} className="group glass-panel rounded-2xl border-glass-border overflow-hidden flex flex-col hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">

                            {/* Área da Imagem */}
                            <div className="h-48 bg-black/40 relative overflow-hidden">
                                {post.image_url ? (
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-white/5 text-gray-600">
                                        <Camera className="w-12 h-12 opacity-20" />
                                    </div>
                                )}

                                {/* Badge de Status */}
                                <div className="absolute top-3 right-3">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border ${(() => {
                                        const s = (post.status || '').toUpperCase();
                                        if (s === 'APPROVED' || s.includes('APPROV')) return 'bg-green-500/20 text-green-400 border-green-500/30';
                                        if (s.includes('WAITING') || s.includes('PEND')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                                        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
                                    })()}`}>
                                        {(() => {
                                            const s = (post.status || '').toUpperCase();
                                            if (s === 'APPROVED' || s.includes('APPROV')) return 'Aprovado';
                                            if (s.includes('WAITING') || s.includes('PEND')) return 'Pendente';
                                            return 'Em Revisão';
                                        })()}
                                    </span>
                                </div>
                            </div>

                            {/* Conteúdo do Card */}
                            <div className="p-5 flex-1 flex flex-col bg-gradient-to-b from-transparent to-black/20">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-white leading-tight mb-2 line-clamp-2">
                                        {post.titulo_hook || post.tema || "Sem título"}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium mb-4 flex items-center gap-2">
                                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                        {new Date(post.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>

                                <button
                                    onClick={() => navigate(`/post-feedback/${post.id}`)}
                                    className="w-full mt-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-glass-border hover:border-primary/50 font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30"
                                >
                                    {(post.status || '').toUpperCase().includes('APPROV') ? 'Ver Detalhes' : 'Revisar Conteúdo'}
                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {posts.length === 0 && (
                        <div className="col-span-full py-20 glass-panel rounded-2xl border-glass-border border-dashed flex flex-col items-center justify-center text-center">
                            <LayoutGrid className="w-16 h-16 text-gray-700 mb-4" />
                            <h3 className="text-gray-300 font-medium text-lg">Nenhum post encontrado.</h3>
                            <p className="text-sm text-gray-500 mt-2">Seu histórico está vazio por enquanto.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default ClientDashboard
