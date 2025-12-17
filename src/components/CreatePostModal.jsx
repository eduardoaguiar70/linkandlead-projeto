import React, { useState, useEffect } from 'react'
import { generateContent } from '../services/api'
import { supabase } from '../services/supabaseClient'
import { X, Loader2, Building2, Briefcase, Sparkles, User, AlertCircle, Image as ImageIcon, UploadCloud } from 'lucide-react'
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
    const [generatedText, setGeneratedText] = useState('')
    const [currentPostId, setCurrentPostId] = useState(null) // NEW: Track created post ID
    const [imageFile, setImageFile] = useState(null)

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
            let finalImageUrl = null

            // 1. Upload Image if exists
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop()
                const sanitizedName = imageFile.name.replace(/[^a-zA-Z0-9]/g, '_')
                const fileName = `${Date.now()}_${sanitizedName}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('post-images')
                    .upload(fileName, imageFile)

                if (uploadError) throw uploadError

                const { data: publicUrlData } = supabase.storage
                    .from('post-images')
                    .getPublicUrl(fileName)

                if (publicUrlData) finalImageUrl = publicUrlData.publicUrl
            }

            // 2. Insert or Update logic
            const payload = {
                id_client: selectedClientId,
                nome_cliente: clienteName,
                tema: tema,
                publico: publico,
                corpo_post: generatedText,
                sugestao_imagem: finalImageUrl,
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
        const file = e.target.files[0]
        if (file) {
            if (!file.type.startsWith('image/')) return alert('Apenas imagens.')
            setImageFile(file)
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

    return (
        <div className="modal-overlay" onClick={(e) => {
            if (e.target.className === 'modal-overlay') onClose();
        }}>
            <div className="modal-content modern-modal" style={{ maxWidth: '800px' }}>
                <div className="modal-header">
                    <div className="header-title">
                        <h2>Novo Conteúdo B2B</h2>
                        <span className="subtitle">Assistente de Criação</span>
                    </div>
                    <button className="close-btn" onClick={onClose} aria-label="Fechar">
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '2rem' }}>
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
                                <label className="input-label">Deseja anexar uma imagem?</label>
                                <div className={`upload-wrapper ${imageFile ? 'has-file' : ''}`} style={{ marginTop: '0.5rem' }}>
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="file-input-hidden" />
                                    {imageFile ? (
                                        <div className="upload-content-selected">
                                            <div className="file-info">
                                                <ImageIcon size={20} className="file-icon-selected" />
                                                <span className="file-name">{imageFile.name}</span>
                                            </div>
                                            <button onClick={() => setImageFile(null)} className="btn-remove-file"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="upload-content-empty">
                                            <UploadCloud size={24} className="upload-icon-empty" />
                                            <span className="upload-text">Clique para Upload (Opcional)</span>
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

                </div>
            </div>
            <style>{`.fade-in { animation: navLinkFade 0.4s ease forwards; } @keyframes navLinkFade { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }`}</style>
        </div>
    )
}

export default CreatePostModal
