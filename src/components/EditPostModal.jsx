import React, { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { X, Loader2, Save, Image as ImageIcon, UploadCloud } from 'lucide-react'

const EditPostModal = ({ post, onClose, onSuccess }) => {
    const [text, setText] = useState(post.corpo_post || '')
    const [currentImageUrl, setCurrentImageUrl] = useState(post.sugestao_imagem)
    const [newImageFile, setNewImageFile] = useState(null)

    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState(null)

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (!file.type.startsWith('image/')) return alert('Apenas imagens.')
            if (file.size > 5 * 1024 * 1024) return alert('Máximo 5MB.')
            setNewImageFile(file)
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg(null)

        try {
            let finalImageUrl = currentImageUrl

            // 1. Upload new image if selected
            if (newImageFile) {
                const fileExt = newImageFile.name.split('.').pop()
                const sanitizedName = newImageFile.name.replace(/[^a-zA-Z0-9]/g, '_')
                const fileName = `${Date.now()}_${sanitizedName}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('post-images')
                    .upload(fileName, newImageFile)

                if (uploadError) throw uploadError

                const { data: publicUrlData } = supabase.storage
                    .from('post-images')
                    .getPublicUrl(fileName)

                if (publicUrlData) finalImageUrl = publicUrlData.publicUrl
            }

            // 2. Update DB
            const updates = {
                corpo_post: text,
                sugestao_imagem: finalImageUrl
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

                        {/* IMAGE EDITOR */}
                        <div className="modern-form-group">
                            <label className="input-label">Mídia (Imagem)</label>

                            {/* Current/New Preview */}
                            <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                {newImageFile ? (
                                    <div style={{ color: '#16a34a', fontWeight: 600 }}>
                                        Nova imagem selecionada: {newImageFile.name}
                                    </div>
                                ) : currentImageUrl ? (
                                    <img src={currentImageUrl} alt="Current" style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px' }} />
                                ) : (
                                    <div style={{ color: '#94a3b8' }}>Sem imagem atualmente</div>
                                )}
                            </div>

                            {/* Upload Input */}
                            <div className={`upload-wrapper ${newImageFile ? 'has-file' : ''}`}>
                                <input type="file" accept="image/*" onChange={handleFileChange} className="file-input-hidden" />
                                <div className="upload-content-empty">
                                    <UploadCloud size={20} className="upload-icon-empty" />
                                    <span className="upload-text">Clique para trocar a imagem</span>
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
