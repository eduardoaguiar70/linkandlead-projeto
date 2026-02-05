import React, { useState, useEffect } from 'react'
import { generateContent } from '../services/api'
import { supabase } from '../services/supabaseClient'
import { X, Loader2, Building2, Briefcase, Sparkles, User, AlertCircle, Image as ImageIcon, UploadCloud, FileText, CheckCircle2 } from 'lucide-react'

const CreatePostModal = ({ onClose, onSuccess }) => {
    // Clients List
    const [clients, setClients] = useState([])
    const [loadingClients, setLoadingClients] = useState(true)

    // Wizard State
    const [step, setStep] = useState(1) // 1: Briefing, 2: Review, 3: Finalize

    // Form State
    const [selectedClientId, setSelectedClientId] = useState('') // This holds the UUID
    const [clienteName, setClienteName] = useState('')
    const [selectedClientData, setSelectedClientData] = useState(null)

    const [tema, setTema] = useState('')
    const [publico, setPublico] = useState('')

    // Content State
    const [generatedText, setGeneratedText] = useState('')
    const [currentPostId, setCurrentPostId] = useState(null)
    const [selectedFiles, setSelectedFiles] = useState([])

    // Process State
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState(null)

    // New Tab State
    const [activeTab, setActiveTab] = useState('ai') // 'ai' | 'manual'

    // Fetch clients on mount
    useEffect(() => {
        const fetchClients = async () => {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('*')
                    .order('name')

                if (error) throw error
                const validClients = (data || []).filter(c => c.name)
                setClients(validClients)
            } catch (err) {
                console.error('Erro ao buscar clientes:', err)
            } finally {
                setLoadingClients(false)
            }
        }
        fetchClients()
    }, [])

    const handleClientChange = (e) => {
        const uuid = e.target.value
        setSelectedClientId(uuid)

        const clientData = clients.find(c => String(c.id) === uuid)
        if (clientData) {
            setClienteName(clientData.name)
            setSelectedClientData(clientData)
        } else {
            setClienteName('')
            setSelectedClientData(null)
        }
    }

    // --- STEP 1: GENERATE DRAFT ---
    const handleGenerateDraft = async (e) => {
        e.preventDefault()
        if (!selectedClientId) return alert("Por favor, selecione um cliente.")
        if (!tema || !publico) return

        setLoading(true)
        setErrorMsg(null)

        try {
            const data = await generateContent(clienteName, tema, publico, selectedClientData, null)

            let text = ""
            if (typeof data === 'string') text = data
            else if (data.text) text = data.text
            else if (data.content) text = data.content
            else if (data.response) text = data.response
            else if (data.transcription) text = data.transcription
            else if (data.corpo_post) text = data.corpo_post
            else text = JSON.stringify(data, null, 2)

            setGeneratedText(text.replace(/^"|"$/g, '').replace(/\\n/g, '\n'))

            if (data.id) setCurrentPostId(data.id)
            else if (data.record_id) setCurrentPostId(data.record_id)

            setStep(2)
        } catch (err) {
            console.error(err)
            setErrorMsg('Falha ao gerar rascunho. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    // --- FINAL SAVE (Shared Logic) ---
    const performSave = async (isManual = false) => {
        if (!selectedClientId) {
            alert("Erro: ID do cliente não identificado")
            return
        }

        setLoading(true)
        setErrorMsg(null)

        try {
            // Validate client name for manual flow
            let finalClientName = clienteName
            if (isManual && !finalClientName) {
                const { data: clientData } = await supabase
                    .from('clients')
                    .select('name')
                    .eq('id', selectedClientId)
                    .single()
                finalClientName = clientData?.name
            }

            if (!finalClientName) throw new Error("Nome do cliente não encontrado")

            // Upload Images
            let finalImageUrls = []
            if (selectedFiles.length > 0) {
                const uploadPromises = selectedFiles.map(async (file) => {
                    const fileExt = file.name.split('.').pop()
                    const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_')
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${sanitizedName}.${fileExt}`

                    const { error: uploadError } = await supabase.storage
                        .from('post-images')
                        .upload(fileName, file)

                    if (uploadError) throw uploadError

                    const { data: publicUrlData } = supabase.storage
                        .from('post-images')
                        .getPublicUrl(fileName)

                    return publicUrlData.publicUrl
                })
                finalImageUrls = await Promise.all(uploadPromises)
            }

            // Payload
            const payload = {
                id_client: selectedClientId,
                nome_cliente: finalClientName,
                tema: tema || 'Post Manual',
                publico: publico || 'Geral',
                corpo_post: generatedText,
                sugestao_imagem: finalImageUrls,
                status: 'waiting_approval'
            }

            // Insert or Update
            if (currentPostId && !isManual) {
                const { error } = await supabase.from('tabela_projetofred1').update(payload).eq('id', currentPostId)
                if (error) throw error
            } else {
                const { error, data } = await supabase.from('tabela_projetofred1').insert([payload]).select()
                if (error) throw error
                // Basic check
                if (data && data[0] && !data[0].nome_cliente) {
                    alert("Aviso: Banco de dados pode ter ignorado o nome do cliente.")
                }
            }

            alert("Post salvo com sucesso!")
            if (onSuccess) onSuccess()
            else onClose()

        } catch (err) {
            console.error("Save Error:", err)
            setErrorMsg("Erro ao salvar post: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)
            const validFiles = newFiles.filter(file => {
                if (file.size > 50 * 1024 * 1024) {
                    alert(`Arquivo ${file.name} excede 50MB.`)
                    return false
                }
                return true
            })
            if (validFiles.length > 0) setSelectedFiles(prev => [...prev, ...validFiles])
        }
    }

    // --- UI COMPONENTS ---
    const ProgressBar = () => (
        <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
                <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                    <div
                        className={`h-full transition-all duration-300 ${s <= step ? 'bg-primary' : 'bg-transparent'}`}
                        style={{ width: s <= step ? '100%' : '0%' }}
                    />
                </div>
            ))}
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-2">Passo {step}/3</span>
        </div>
    )

    const ModernInput = ({ label, icon: Icon, ...props }) => (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">{label}</label>
            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors pointer-events-none">
                    {Icon && <Icon size={18} />}
                </div>
                {props.type === 'textarea' ? (
                    <textarea
                        {...props}
                        className="w-full bg-white/5 border border-glass-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all min-h-[100px] resize-y"
                    />
                ) : (
                    <input
                        {...props}
                        className="w-full bg-white/5 border border-glass-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                )}
            </div>
        </div>
    )

    // --- RENDER ---
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 pt-16" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-[#0f0f0f] border border-glass-border w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">

                {/* HEADER */}
                <div className="p-6 border-b border-glass-border flex justify-between items-center bg-white/[0.02]">
                    <div>
                        <h2 className="text-xl font-bold text-white mb-0.5">Novo Conteúdo B2B</h2>
                        <p className="text-xs font-medium text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 uppercase tracking-wider">Criar Novo Post</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-glass-border bg-black/20">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'ai' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Sparkles size={16} className={activeTab === 'ai' ? 'text-primary' : ''} />
                        Criar com IA
                        {activeTab === 'ai' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(255,77,0,0.5)]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'manual' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <FileText size={16} className={activeTab === 'manual' ? 'text-primary' : ''} />
                        Manual
                        {activeTab === 'manual' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(255,77,0,0.5)]" />}
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                    {/* --- AI MODE --- */}
                    {activeTab === 'ai' && (
                        <>
                            <ProgressBar />

                            {/* STEP 1 */}
                            {step === 1 && (
                                <form onSubmit={handleGenerateDraft}>
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Selecione o Cliente</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"><Building2 size={18} /></div>
                                            <select
                                                value={selectedClientId}
                                                onChange={handleClientChange}
                                                className="w-full bg-white/5 border border-glass-border rounded-xl pl-10 pr-4 py-3 text-white appearance-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                                                required
                                            >
                                                <option value="" className="bg-charcoal text-gray-500">Selecione...</option>
                                                {clients.map(c => <option key={c.id} value={c.id} className="bg-charcoal text-white">{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <ModernInput
                                        label="Tema Central"
                                        icon={Briefcase}
                                        type="textarea"
                                        placeholder="Sobre o que vamos falar hoje?"
                                        value={tema} onChange={e => setTema(e.target.value)} required
                                    />

                                    <ModernInput
                                        label="Público-Alvo"
                                        icon={User}
                                        placeholder="CEO, Marketing Managers..."
                                        value={publico} onChange={e => setPublico(e.target.value)} required
                                    />

                                    {errorMsg && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2"><AlertCircle size={16} /> {errorMsg}</div>}

                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-glass-border text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium">Cancelar</button>
                                        <button type="submit" disabled={loading} className="flex-[2] btn-primary">
                                            {loading ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> Gerar Rascunho</>}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* STEP 2 */}
                            {step === 2 && (
                                <div className="animate-fade-in-up">
                                    <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Rascunho Gerado (Edite à vontade):</label>
                                    <textarea
                                        value={generatedText}
                                        onChange={e => setGeneratedText(e.target.value)}
                                        className="w-full bg-white/5 border border-glass-border rounded-xl p-4 text-gray-200 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all min-h-[300px] leading-relaxed resize-y mb-6 font-mono text-sm"
                                    />

                                    <div className="flex gap-4">
                                        <button onClick={() => setStep(1)} className="flex-1 px-4 py-3 rounded-xl border border-glass-border text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium">Voltar e Ajustar</button>
                                        <button onClick={() => setStep(3)} className="flex-[2] btn-primary">
                                            Aprovar Texto <CheckCircle2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3 */}
                            {step === 3 && (
                                <div className="animate-fade-in-up">
                                    <FormMediaUpload selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} handleFileChange={handleFileChange} />

                                    <div className="bg-white/5 border border-glass-border rounded-xl p-4 mb-6">
                                        <h4 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Resumo</h4>
                                        <div className="text-sm text-gray-400 space-y-1">
                                            <p><span className="text-gray-500">Cliente:</span> {clienteName}</p>
                                            <p><span className="text-gray-500">Tema:</span> {tema}</p>
                                        </div>
                                    </div>

                                    {errorMsg && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2"><AlertCircle size={16} /> {errorMsg}</div>}

                                    <div className="flex gap-4">
                                        <button onClick={() => setStep(2)} className="flex-1 px-4 py-3 rounded-xl border border-glass-border text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium">Voltar</button>
                                        <button onClick={() => performSave(false)} disabled={loading} className="flex-[2] btn-primary">
                                            {loading ? <Loader2 className="animate-spin" /> : "💾 Salvar Post Final"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* --- MANUAL MODE --- */}
                    {activeTab === 'manual' && (
                        <form onSubmit={(e) => { e.preventDefault(); performSave(true); }} className="animate-fade-in-up">
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Selecione o Cliente</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"><Building2 size={18} /></div>
                                    <select
                                        value={selectedClientId}
                                        onChange={handleClientChange}
                                        className="w-full bg-white/5 border border-glass-border rounded-xl pl-10 pr-4 py-3 text-white appearance-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                                        required
                                    >
                                        <option value="" className="bg-charcoal text-gray-500">Selecione...</option>
                                        {clients.map(c => <option key={c.id} value={c.id} className="bg-charcoal text-white">{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <ModernInput
                                label="Título / Tema"
                                icon={Briefcase}
                                placeholder="Ex: Campanha de Verão"
                                value={tema} onChange={e => setTema(e.target.value)}
                            />

                            <ModernInput
                                label="Texto do Post"
                                icon={FileText}
                                type="textarea"
                                placeholder="Escreva o conteúdo aqui..."
                                value={generatedText} onChange={e => setGeneratedText(e.target.value)} required
                            />

                            <FormMediaUpload selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} handleFileChange={handleFileChange} />

                            {errorMsg && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2"><AlertCircle size={16} /> {errorMsg}</div>}

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-glass-border text-gray-400 hover:bg-white/5 hover:text-white transition-all font-medium">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-[2] btn-primary">
                                    {loading ? <Loader2 className="animate-spin" /> : "💾 Salvar Manualmente"}
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </div>
        </div>
    )
}

// Sub-component for Media Upload to keep logic clean
const FormMediaUpload = ({ selectedFiles, setSelectedFiles, handleFileChange }) => (
    <div className="mb-8">
        <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Mídia (Imagens/Vídeo)</label>
        <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${selectedFiles.length > 0 ? 'border-primary/50 bg-primary/5' : 'border-glass-border hover:border-gray-500 hover:bg-white/5'}`}>
            <input type="file" multiple accept="image/*,video/*,application/pdf" onChange={handleFileChange} className="hidden" id="file-upload" />

            {selectedFiles.length === 0 ? (
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center h-24 cursor-pointer gap-2">
                    <UploadCloud className="text-gray-500" size={24} />
                    <span className="text-sm font-medium text-gray-400">Clique para selecionar arquivos</span>
                </label>
            ) : (
                <div>
                    <div className="flex justify-between items-center mb-3 px-1">
                        <span className="text-xs font-semibold text-gray-400 uppercase">{selectedFiles.length} arquivos</span>
                        <button type="button" onClick={() => setSelectedFiles([])} className="text-xs text-red-400 hover:text-red-300 font-medium">Limpar Tudo</button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {selectedFiles.map((file, i) => (
                            <div key={i} className="aspect-square rounded-lg bg-black/40 border border-glass-border overflow-hidden relative flex items-center justify-center group">
                                {file.type.includes('pdf') ? <FileText className="text-red-500" /> :
                                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                }
                            </div>
                        ))}
                        <label htmlFor="file-upload" className="aspect-square rounded-lg border border-glass-border flex items-center justify-center cursor-pointer hover:bg-white/5 text-gray-500 hover:text-white transition-colors">
                            <span className="text-2xl">+</span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    </div>
)

export default CreatePostModal
