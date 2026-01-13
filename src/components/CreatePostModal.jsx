import React, { useState, useEffect } from 'react'
import { generateContent } from '../services/api'
import { supabase } from '../services/supabaseClient'
import { X, Loader2, Building2, Briefcase, Sparkles, User, AlertCircle, Image as ImageIcon, UploadCloud, FileText } from 'lucide-react'
import './CreatePostModal.css'

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
    // Content State
    const [generatedText, setGeneratedText] = useState('')
    const [currentPostId, setCurrentPostId] = useState(null) // NEW: Track created post ID
    const [selectedFiles, setSelectedFiles] = useState([])

    // Process State
    const [loading, setLoading] = useState(false) // Generic loading for actions
    const [errorMsg, setErrorMsg] = useState(null)

    // Fetch clients on mount
    useEffect(() => {
        const fetchClients = async () => {
            try {
                // CHANGED: Fetch from 'clients' table instead of 'profiles'
                const { data, error } = await supabase
                    .from('clients')
                    .select('*') // Fetch all fields (name, description, tone_of_voice, etc.)
                    .order('name')

                if (error) throw error
                // Filter out any without name (just in case)
                const validClients = (data || []).filter(c => c.name)
                console.log("Clients Fetched from 'clients' table:", validClients)
                setClients(validClients)
            } catch (err) {
                console.error('Erro ao buscar clientes (tabela clients):', err)
            } finally {
                setLoadingClients(false)
            }
        }
        fetchClients()
    }, [])

    const handleClientChange = (e) => {
        const uuid = e.target.value
        console.log("Selected Client ID:", uuid)
        setSelectedClientId(uuid)

        const clientData = clients.find(c => String(c.id) === uuid)
        if (clientData) {
            setClienteName(clientData.name) // CHANGED: nome_empresa -> name
            setSelectedClientData(clientData)
        } else {
            console.warn("Client data not found for ID:", uuid)
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
            // Call API (n8n wrapper)
            const data = await generateContent(clienteName, tema, publico, selectedClientData, null)

            // Heuristic to extract text from generic JSON response
            let text = ""
            if (typeof data === 'string') text = data
            else if (data.text) text = data.text
            else if (data.content) text = data.content
            else if (data.response) text = data.response
            else if (data.transcription) text = data.transcription
            else if (data.corpo_post) text = data.corpo_post
            else text = JSON.stringify(data, null, 2)

            setGeneratedText(text.replace(/^"|"$/g, '').replace(/\\n/g, '\n'))

            // NEW: Capture and store the Post ID if returned
            if (data.id) {
                console.log("Draft created with ID:", data.id)
                setCurrentPostId(data.id)
            } else if (data.record_id) {
                console.log("Draft created with ID:", data.record_id)
                setCurrentPostId(data.record_id)
            }

            setStep(2)
        } catch (err) {
            console.error(err)
            setErrorMsg('Falha ao gerar rascunho. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    // --- STEP 3: FINAL SAVE ---
    const handleFinalSave = async () => {
        console.log("Attempting Save. Client UUID:", selectedClientId)

        if (!selectedClientId) {
            alert("Erro: ID do cliente não identificado")
            return
        }

        setLoading(true)
        setErrorMsg(null)

        try {
            let finalImageUrls = []

            // 1. Upload Images if exist
            if (selectedFiles.length > 0) {
                console.log(`Uploading ${selectedFiles.length} images...`)

                // Map all uploads to promises
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

                // Wait for all uploads
                finalImageUrls = await Promise.all(uploadPromises)
            }

            // 2. Insert or Update logic
            const payload = {
                id_client: selectedClientId,
                nome_cliente: clienteName,
                tema: tema,
                publico: publico,
                corpo_post: generatedText,
                sugestao_imagem: finalImageUrls, // Save array of URLs
                status: 'waiting_approval'
            }
            console.log("Save Payload:", payload)

            if (currentPostId) {
                // UPDATE existing record
                console.log("Updating existing post:", currentPostId)
                const { error: dbError } = await supabase
                    .from('tabela_projetofred1')
                    .update(payload)
                    .eq('id', currentPostId)

                if (dbError) throw dbError
            } else {
                // INSERT new record (Fallback)
                console.log("Inserting new post")
                const { error: dbError } = await supabase
                    .from('tabela_projetofred1')
                    .insert([payload])

                if (dbError) throw dbError
            }

            alert("Post salvo com sucesso!")
            if (onSuccess) {
                onSuccess()
            } else {
                onClose()
            }

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

            // Validate files
            const validFiles = newFiles.filter(file => {
                if (file.size > 50 * 1024 * 1024) {
                    alert(`Arquivo ${file.name} excede o limite de 50MB e foi ignorado.`)
                    return false
                }
                return true
            })

            if (validFiles.length > 0) {
                setSelectedFiles(prev => [...prev, ...validFiles])
            }
        }
    }

    // --- MANUAL SAVING LOGIC ---
    const handleManualSave = async (e) => {
        e.preventDefault()
        if (!selectedClientId) return alert("Por favor, selecione um cliente.")

        // FIX: Direct DB Lookup to guarantee fresh data
        let finalClientName = ''
        try {
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('*') // Fetch ALL columns to check for name/nome/company_name variations
                .eq('id', selectedClientId)
                .single()

            if (clientError) throw clientError

            // Try all possible name fields
            finalClientName =
                clientData?.name ||
                clientData?.nome ||
                clientData?.company_name ||
                clientData?.nome_empresa

        } catch (fetchErr) {
            console.error("Erro ao buscar nome do cliente:", fetchErr)
            // Fallback to state if DB fetch fails (unlikely)
            const selectedClientObj = clients.find(c => String(c.id) === String(selectedClientId))
            finalClientName = selectedClientObj?.name || clienteName
        }

        if (!finalClientName) {
            return alert("Erro Crítico: Não foi possível identificar o nome do cliente. Por favor, recarregue a página.")
        }

        console.log("Saving Manual Post (DB Verified):", { id: selectedClientId, name: finalClientName })

        setLoading(true)
        setErrorMsg(null)

        try {
            let finalImageUrls = []

            // 1. Upload Images if exist (Reused logic)
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

            // 2. Insert Record
            const payload = {
                id_client: selectedClientId,
                nome_cliente: finalClientName, // Validated Name
                tema: tema || 'Post Manual', // Fallback theme name
                publico: publico || 'Geral', // Fallback audience
                corpo_post: generatedText, // Reusing this state for the manual text body
                sugestao_imagem: finalImageUrls,
                status: 'waiting_approval'
            }

            console.log("DEBUG: Posting Payload:", payload)

            const { data: insertData, error: dbError } = await supabase
                .from('tabela_projetofred1')
                .insert([payload])
                .select() // Request return of inserted data to verify

            if (dbError) throw dbError

            console.log("DEBUG: Database Returned:", insertData)

            // Check if DB wiped the name
            if (insertData && insertData[0] && !insertData[0].nome_cliente) {
                alert("ALERTA: O post foi salvo, mas o Banco de Dados parece ter ignorado o nome do cliente. Verifique se existe alguma 'Trigger' ou politica RLS bloqueando essa coluna.")
            }

            alert("Post manual salvo com sucesso!")
            if (onSuccess) onSuccess()
            else onClose()

        } catch (err) {
            console.error("Erro manual:", err)
            setErrorMsg("Erro ao salvar: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    // --- UI Renderers ---
    const ProgressBar = () => (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', alignItems: 'center' }}>
            {[1, 2, 3].map(s => (
                <div key={s} style={{ flex: 1, height: '4px', background: s <= step ? '#f97316' : '#e2e8f0', borderRadius: '2px', transition: 'all 0.3s' }}></div>
            ))}
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Passo {step}/3</span>
        </div>
    )

    // New Tab State
    const [activeTab, setActiveTab] = useState('ai') // 'ai' | 'manual'

    return (
        <div className="modal-overlay" onClick={(e) => {
            if (e.target.className === 'modal-overlay') onClose();
        }}>
            <div className="modal-content modern-modal" style={{ maxWidth: '800px' }}>
                <div className="modal-header">
                    <div className="header-title">
                        <h2>Novo Conteúdo B2B</h2>
                        <span className="subtitle">Escolha como criar seu post</span>
                    </div>
                    <button className="close-btn" onClick={onClose} aria-label="Fechar">
                        <X size={24} />
                    </button>
                </div>

                {/* TABS HEADER */}
                <div style={{ padding: '0 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '2rem' }}>
                    <button
                        onClick={() => setActiveTab('ai')}
                        style={{
                            padding: '1rem 0',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'ai' ? '2px solid #7c3aed' : '2px solid transparent',
                            color: activeTab === 'ai' ? '#7c3aed' : '#64748b',
                            fontWeight: activeTab === 'ai' ? 600 : 500,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <Sparkles size={18} /> ✨ Criar com IA
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        style={{
                            padding: '1rem 0',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === 'manual' ? '2px solid #7c3aed' : '2px solid transparent',
                            color: activeTab === 'manual' ? '#7c3aed' : '#64748b',
                            fontWeight: activeTab === 'manual' ? 600 : 500,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <User size={18} /> ✍️ Criar Manualmente
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '2rem' }}>

                    {/* --- TAB: AI WIZARD --- */}
                    {activeTab === 'ai' && (
                        <>
                            <ProgressBar />

                            {/* --- STEP 1: BRIEFING --- */}
                            {step === 1 && (
                                <form onSubmit={handleGenerateDraft}>
                                    <div className="modern-form-group">
                                        <label className="input-label">1. Selecione o Cliente</label>
                                        <div className="input-wrapper">
                                            <Building2 className="input-icon" size={18} />
                                            {loadingClients ? (
                                                <div style={{ padding: '0.8rem' }}>Carregando...</div>
                                            ) : (
                                                <select
                                                    value={selectedClientId}
                                                    onChange={handleClientChange}
                                                    className="modern-input"
                                                    required
                                                >
                                                    <option value="" disabled>Selecione...</option>
                                                    {clients.map(c => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    <div className="modern-form-group">
                                        <label className="input-label">2. Tema Central do Post</label>
                                        <textarea
                                            value={tema} onChange={e => setTema(e.target.value)}
                                            placeholder="Sobre o que vamos falar hoje?"
                                            className="modern-textarea" rows={2} required
                                        />
                                    </div>

                                    <div className="modern-form-group">
                                        <label className="input-label">3. Público-Alvo</label>
                                        <input
                                            type="text" value={publico} onChange={e => setPublico(e.target.value)}
                                            placeholder="Quem vai ler?" className="modern-input" required
                                        />
                                    </div>

                                    {errorMsg && <p className="error-text">{errorMsg}</p>}

                                    <div className="modal-footer">
                                        <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
                                        <button type="submit" className="btn-generate-primary" disabled={loading}>
                                            {loading ? <><Loader2 className="spinner" /> Gerando Rascunho...</> : <><Sparkles size={18} /> Gerar Rascunho com IA</>}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* --- STEP 2: REVIEW --- */}
                            {step === 2 && (
                                <div className="fade-in">
                                    <label className="input-label" style={{ marginBottom: '1rem', display: 'block' }}>Edite o Rascunho Sugerido:</label>
                                    <textarea
                                        value={generatedText}
                                        onChange={e => setGeneratedText(e.target.value)}
                                        className="modern-textarea"
                                        style={{ minHeight: '300px', fontSize: '1rem', lineHeight: '1.6' }}
                                    />

                                    <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                                        <button className="btn-cancel" onClick={() => setStep(1)}>Voltar</button>
                                        <button className="btn-generate-primary" onClick={() => setStep(3)}>
                                            Aprovar Texto e Avançar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* --- STEP 3: FINALIZE --- */}
                            {step === 3 && (
                                <div className="fade-in">
                                    <div style={{ marginBottom: '2rem' }}>
                                        <label className="input-label">Deseja anexar imagens? (Carrossel)</label>
                                        <div className={`upload-wrapper ${selectedFiles.length > 0 ? 'has-file' : ''}`} style={{ marginTop: '0.5rem', minHeight: '120px', flexDirection: 'column', alignItems: 'flex-start', padding: '1rem' }}>
                                            <input
                                                type="file"
                                                accept="image/*,video/*,application/pdf"
                                                multiple
                                                onChange={handleFileChange}
                                                className="file-input-hidden"
                                            />

                                            {selectedFiles.length === 0 ? (
                                                <div className="upload-content-empty" style={{ width: '100%', justifyContent: 'center', height: '100%' }}>
                                                    <UploadCloud size={24} className="upload-icon-empty" />
                                                    <span className="upload-text">Clique para Upload de Imagens (Múltiplas)</span>
                                                </div>
                                            ) : (
                                                <div style={{ width: '100%' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                        <span className="file-name" style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                            {selectedFiles.length} imagem(ns) selecionada(s)
                                                        </span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedFiles([]) }}
                                                            className="btn-remove-file"
                                                            title="Limpar tudo"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
                                                        {selectedFiles.map((file, index) => (
                                                            <div key={index} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {file.type === 'application/pdf' ? (
                                                                    <div style={{ textAlign: 'center', padding: '0.25rem' }}>
                                                                        <FileText size={32} color="#ef4444" style={{ margin: '0 auto 4px' }} />
                                                                        <span style={{ display: 'block', fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70px' }}>
                                                                            {file.name}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <img
                                                                        src={URL.createObjectURL(file)}
                                                                        alt={`Preview ${index}`}
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                    />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>Resumo:</h4>
                                        <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                                            <strong>Cliente:</strong> {clienteName} <br />
                                            <strong>Tema:</strong> {tema}
                                        </div>
                                    </div>

                                    {errorMsg && <p className="error-text">{errorMsg}</p>}

                                    <div className="modal-footer">
                                        <button className="btn-cancel" onClick={() => setStep(2)}>Voltar</button>
                                        <button className="btn-generate-primary" onClick={handleFinalSave} disabled={loading}>
                                            {loading ? <><Loader2 className="spinner" /> Salvando...</> : "💾 Salvar Post Final"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* --- TAB: MANUAL MODE --- */}
                    {activeTab === 'manual' && (
                        <form onSubmit={handleManualSave} className="fade-in">
                            <div className="modern-form-group">
                                <label className="input-label">Selecione o Cliente</label>
                                <div className="input-wrapper">
                                    <Building2 className="input-icon" size={18} />
                                    {loadingClients ? (
                                        <div style={{ padding: '0.8rem' }}>Carregando...</div>
                                    ) : (
                                        <select
                                            value={selectedClientId}
                                            onChange={handleClientChange}
                                            className="modern-input"
                                            required
                                        >
                                            <option value="" disabled>Selecione...</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="modern-form-group">
                                <label className="input-label">Tema / Título Interno</label>
                                <input
                                    type="text"
                                    value={tema} // Shared state with AI flow
                                    onChange={e => setTema(e.target.value)}
                                    placeholder="Ex: Lançamento Black Friday"
                                    className="modern-input"
                                />
                            </div>

                            <div className="modern-form-group">
                                <label className="input-label">Legenda / Texto do Post</label>
                                <textarea
                                    value={generatedText} // Reusing this state to keep things simple
                                    onChange={e => setGeneratedText(e.target.value)}
                                    placeholder="Escreva a legenda do post aqui..."
                                    className="modern-textarea"
                                    rows={8}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <label className="input-label">Anexar Mídia (Imagens/Vídeos)</label>
                                <div className={`upload-wrapper ${selectedFiles.length > 0 ? 'has-file' : ''}`} style={{ marginTop: '0.5rem', minHeight: '120px', flexDirection: 'column', alignItems: 'flex-start', padding: '1rem' }}>
                                    <input
                                        type="file"
                                        accept="image/*,video/*,application/pdf"
                                        multiple
                                        onChange={handleFileChange}
                                        className="file-input-hidden"
                                    />

                                    {selectedFiles.length === 0 ? (
                                        <div className="upload-content-empty" style={{ width: '100%', justifyContent: 'center', height: '100%' }}>
                                            <UploadCloud size={24} className="upload-icon-empty" />
                                            <span className="upload-text">Clique para selecionar arquivos</span>
                                        </div>
                                    ) : (
                                        <div style={{ width: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <span className="file-name" style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                    {selectedFiles.length} arquivo(s)
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedFiles([]) }}
                                                    className="btn-remove-file"
                                                    title="Limpar tudo"
                                                    type="button"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
                                                {selectedFiles.map((file, index) => (
                                                    <div key={index} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {file.type === 'application/pdf' ? (
                                                            <div style={{ textAlign: 'center', padding: '0.25rem' }}>
                                                                <FileText size={32} color="#ef4444" style={{ margin: '0 auto 4px' }} />
                                                                <span style={{ display: 'block', fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70px' }}>
                                                                    {file.name}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={URL.createObjectURL(file)}
                                                                alt={`Preview ${index}`}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {errorMsg && <p className="error-text">{errorMsg}</p>}

                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
                                <button type="submit" className="btn-generate-primary" disabled={loading}>
                                    {loading ? <><Loader2 className="spinner" /> Salvando...</> : "💾 Salvar Rascunho Manual"}
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </div>
            <style>{`.fade-in { animation: navLinkFade 0.4s ease forwards; } @keyframes navLinkFade { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }`}</style>
        </div>
    )
}

export default CreatePostModal
