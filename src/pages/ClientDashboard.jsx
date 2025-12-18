import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import ReactMarkdown from 'react-markdown'
import {
    Loader2
} from 'lucide-react'
import './ClientDashboard.css'

const ClientDashboard = () => {
    const { profile, signOut } = useAuth()
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
                .order('id', { ascending: false }) // Newest first

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
        <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Olá, {clientName || 'Cliente'}</h1>
                    <p className="text-gray-500">
                        Você tem <span className="text-purple-600 font-bold">{posts.length} posts</span> no histórico.
                    </p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-gray-400 hover:text-gray-600 underline"
                >
                    Atualizar Dados
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500">
                    <Loader2 className="spinner mx-auto mb-4" size={32} />
                    <p>Carregando galeria...</p>
                </div>
            ) : (
                /* Grid de Cards */
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post) => (
                        <div key={post.id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">

                            {/* Área da Imagem (Topo) */}
                            <div className="h-48 bg-gray-100 relative overflow-hidden">
                                {post.image_url ? (
                                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                                        <span className="text-4xl opacity-20">📷</span>
                                    </div>
                                )}
                                {/* Badge de Status Flutuante */}
                                {/* Badge de Status Flutuante */}
                                <div className="absolute top-3 right-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${(() => {
                                        const s = (post.status || '').toUpperCase();
                                        if (s === 'APPROVED' || s.includes('APPROV')) return 'bg-green-100/90 text-green-700';
                                        if (s.includes('WAITING') || s.includes('PEND')) return 'bg-amber-100/90 text-amber-700';
                                        return 'bg-gray-100/90 text-gray-600';
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
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-800 leading-tight mb-2 line-clamp-2">
                                        {post.titulo_hook || post.tema || "Sem título"}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-medium mb-4">
                                        Criado em {new Date(post.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>

                                {/* Botão de Ação (Menor e Elegante) */}
                                <button
                                    onClick={() => navigate(`/post-feedback/${post.id}`)}
                                    className="w-full mt-4 py-2.5 rounded-xl bg-purple-50 text-purple-700 font-semibold text-sm hover:bg-purple-600 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
                                >
                                    {(post.status || '').toUpperCase().includes('APPROV') ? 'Ver Detalhes' : 'Revisar Conteúdo'}
                                    <span>→</span>
                                </button>
                            </div>
                        </div>
                    ))}

                    {posts.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                            <span className="block text-4xl mb-4 opacity-30">📭</span>
                            <h3 className="text-gray-500 font-medium">Nenhum post encontrado.</h3>
                            <p className="text-sm text-gray-400 mt-2">Seu histórico está vazio por enquanto.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default ClientDashboard
