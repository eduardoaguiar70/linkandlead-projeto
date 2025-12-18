import React, { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { X, Loader2, Save, Image as ImageIcon, UploadCloud } from 'lucide-react'

const EditPostModal = ({ post, onClose, onSuccess }) => {
    const [text, setText] = useState(post.corpo_post || '')
    // Initialize as array (handle legacy string or null)
    const initialImages = Array.isArray(post.sugestao_imagem)
        ? post.sugestao_imagem
        : post.sugestao_imagem
            ? [post.sugestao_imagem]
            : []

    const [currentImageUrls, setCurrentImageUrls] = useState(initialImages)
    const [newImageFiles, setNewImageFiles] = useState([])

    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState(null)

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files)

            // Validate basic constraints
            const validFiles = files.filter(file => {
                if (!file.type.startsWith('image/')) {
                    alert(`Arquivo ${file.name} não é uma imagem.`)
                    return false
                }
                if (file.size > 50 * 1024 * 1024) {
                    alert(`Arquivo ${file.name} excede o limite de 50MB.`)
                    return false
                }
                return true
            })

            setNewImageFiles(validFiles)
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg(null)

        try {
            let finalImageUrls = currentImageUrls

            // 1. Upload new images if selected (Replacing old)
            if (newImageFiles.length > 0) {
                const uploadPromises = newImageFiles.map(async (file) => {
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

            // 2. Update DB
            const updates = {
                corpo_post: text,
                sugestao_imagem: finalImageUrls // Save as Array
            }

            // REVISÃO LOGIC: If editing a post with feedback, reset status to waiting_approval
            if ((post.status === 'revisão' || post.status === 'changes_requested') && post.feedback_cliente) {
                updates.status = 'waiting_approval'
            }

            const { error: dbError } = await supabase
                .from('tabela_projetofred1')
                .update(updates)
                .eq('id', post.id)

            if (dbError) throw dbError

            alert("Post atualizado com sucesso!")
            onSuccess() // Should trigger refresh
            onClose()

        } catch (err) {
            console.error(err)
            setErrorMsg("Erro ao atualizar: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }} onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
        }}>
            <div className="modern-modal" style={{ maxWidth: '700px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <div className="header-title">
                        <h2>Editar Post #{post.id}</h2>
                        <span className="subtitle">{post.tema}</span>
                    </div>
                    <button className="close-btn" onClick={onClose} aria-label="Fechar">
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '2rem' }}>

                    {/* FEEDBACK ALERT */}
                    {(post.status === 'revisão' || post.status === 'changes_requested') && post.feedback_cliente && (
                        <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'start'
                        }}>
                            <AlertCircle color="#ef4444" size={20} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <h4 style={{ color: '#991b1b', fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
                                    📢 Atenção: Cliente solicitou alterações
                                </h4>
                                <p style={{ color: '#7f1d1d', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                    "{post.feedback_cliente}"
                                </p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSave}>
                        {/* TEXT EDITOR */}
                        <div className="modern-form-group">
                            <label className="input-label">Texto do Post</label>
                            <textarea
                                value={text}
                                onChange={e => setText(e.target.value)}
                                className="modern-textarea"
                                style={{ minHeight: '200px', fontSize: '1rem', lineHeight: '1.6' }}
                            />
                        </div>

                        {/* IMAGE EDITOR (CAROUSEL SUPPORT) */}
                        <div className="modern-form-group">
                            <label className="input-label">Mídia (Imagens)</label>

                            {/* Current/New Preview Grid */}
                            <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                {newImageFiles.length > 0 ? (
                                    <div>
                                        <div style={{ color: '#16a34a', fontWeight: 600, marginBottom: '0.5rem', textAlign: 'center' }}>
                                            {newImageFiles.length} Novas imagens selecionadas:
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                                            {newImageFiles.map((file, idx) => (
                                                <div key={idx} style={{ aspectRatio: '1/1', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd' }}>
                                                    <img src={URL.createObjectURL(file)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : currentImageUrls.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                                        {currentImageUrls.map((url, idx) => (
                                            <div key={idx} style={{ aspectRatio: '1/1', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd' }}>
                                                <img src={url} alt={`Current ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ color: '#94a3b8', textAlign: 'center' }}>Sem imagem atualmente</div>
                                )}
                            </div>

                            {/* Upload Input */}
                            <div className={`upload-wrapper ${newImageFiles.length > 0 ? 'has-file' : ''}`}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    className="file-input-hidden"
                                />
                                <div className="upload-content-empty">
                                    <UploadCloud size={20} className="upload-icon-empty" />
                                    <span className="upload-text">Clique para trocar imagens (Substituir tudo)</span>
                                </div>
                            </div>
                        </div>

                        {errorMsg && <p className="error-text">{errorMsg}</p>}

                        <div className="modal-footer">
                            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn-generate-primary" disabled={loading}>
                                {loading ? <><Loader2 className="spinner" /> Salvando...</> : <><Save size={18} /> Salvar Alterações</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default EditPostModal
