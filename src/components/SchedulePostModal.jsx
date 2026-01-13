import React, { useState } from 'react'
import { CalendarClock, X, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import './CreatePostModal.css' // Reusing modal styles

const SchedulePostModal = ({ post, onClose, onSuccess }) => {
    const [scheduleDate, setScheduleDate] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSchedule = async (e) => {
        e.preventDefault()
        if (!scheduleDate) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('tabela_projetofred1')
                .update({
                    data_agendamento: scheduleDate,
                    status: 'AGENDADO'
                })
                .eq('id', post.id)

            if (error) throw error

            // Show success logic if needed (handled by parent usually, but we can do a local one)
            onSuccess()
            onClose()
            // Optional: You could use a toast library here if available in the project context
            alert(`Post agendado para ${new Date(scheduleDate).toLocaleString()}!`)

        } catch (error) {
            console.error('Erro ao agendar:', error)
            alert('Erro ao agendar post: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarClock size={24} className="text-primary" />
                        Agendar Publicação
                    </h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>Tema do Post</label>
                        <div style={{
                            padding: '12px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontWeight: 500,
                            color: '#1e293b'
                        }}>
                            {post.tema || 'Sem Título'}
                        </div>
                    </div>

                    <form onSubmit={handleSchedule} style={{ marginTop: '20px' }}>
                        <div className="form-group">
                            <label htmlFor="scheduleDate">Data e Hora da Publicação</label>
                            <input
                                type="datetime-local"
                                id="scheduleDate"
                                className="form-input"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading || !scheduleDate}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {loading ? <Loader2 className="spinner" size={18} /> : <CheckCircle2 size={18} />}
                                Confirmar Agendamento
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default SchedulePostModal
