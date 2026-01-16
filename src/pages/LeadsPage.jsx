import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useLanguage } from '../contexts/LanguageContext'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import './LeadsPage.css'
import {
    Briefcase,
    Linkedin,
    MessageSquare,
    Calendar,
    XOctagon,
    MoreHorizontal,
    ExternalLink,
    BrainCircuit,
    Copy,
    Check,
    Search,
    Loader2
} from 'lucide-react'

// Status Configuration
const STATUS_COLUMNS = [
    { id: 'new', label: 'Novos', icon: <Briefcase size={16} />, color: '#3b82f6' },
    { id: 'contacted', label: 'Contatados', icon: <MessageSquare size={16} />, color: '#eab308' },
    { id: 'in_conversation', label: 'Em Conversa', icon: <MessageSquare size={16} strokeWidth={3} />, color: '#f97316' },
    { id: 'meeting_scheduled', label: 'Reunião', icon: <Calendar size={16} />, color: '#22c55e' },
    { id: 'disqualified', label: 'Desqualificado', icon: <XOctagon size={16} />, color: '#ef4444' }
]

const LeadsPage = () => {
    const { t } = useLanguage()
    const { selectedClientId } = useClientSelection()
    // State
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedLead, setSelectedLead] = useState(null)

    // Pagination
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const ITEMS_per_PAGE = 50

    useEffect(() => {
        if (selectedClientId) {
            setLeads([])
            setPage(0)
            setHasMore(true)
            fetchLeads(0, true)
        } else {
            setLeads([])
        }
    }, [selectedClientId])

    const fetchLeads = async (pageIndex = 0, isRefresh = false) => {
        if (!selectedClientId) return

        try {
            if (pageIndex === 0) setLoading(true)
            else setLoadingMore(true)

            const from = pageIndex * ITEMS_per_PAGE
            const to = from + ITEMS_per_PAGE - 1

            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('client_id', selectedClientId)
                .order('created_at', { ascending: false })
                .range(from, to)

            if (error) throw error

            if (data) {
                if (isRefresh || pageIndex === 0) {
                    setLeads(data)
                } else {
                    setLeads(prev => [...prev, ...data])
                }
                setHasMore(data.length === ITEMS_per_PAGE)
            }
        } catch (err) {
            console.error('Error fetching leads:', err)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1
            setPage(nextPage)
            fetchLeads(nextPage, false)
        }
    }

    // Intersection Observer
    const observerTarget = React.useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                    loadMore();
                }
            },
            { threshold: 1.0 }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, leads]); // Re-attach on list change

    const updateLeadStatus = async (leadId, newStatus) => {
        // MAPPING: Label/Input -> Database Enum Value
        const STATUS_MAPPING = {
            'Novos': 'TO_CONTACT',
            'Contatados': 'CONTACTED',
            'Em Conversa': 'IN_CONVERSATION',
            'Reunião': 'MEETING_SCHEDULED',
            'Desqualificado': 'DISQUALIFIED',
            // Fallbacks
            'to_contact': 'TO_CONTACT',
            'contacted': 'CONTACTED',
            'in_conversation': 'IN_CONVERSATION',
            'meeting_scheduled': 'MEETING_SCHEDULED',
            'disqualified': 'DISQUALIFIED',
        }

        const dbStatus = STATUS_MAPPING[newStatus] || newStatus

        // Optimistic UI Update
        const previousLeads = [...leads]
        setLeads(leads.map(l => l.id === leadId ? { ...l, status: dbStatus } : l))

        // Also update selected lead if open
        if (selectedLead && selectedLead.id === leadId) {
            setSelectedLead({ ...selectedLead, status: dbStatus })
        }

        try {
            const { error } = await supabase
                .from('leads')
                .update({ status_pipeline: dbStatus })
                .eq('id', leadId)

            if (error) throw error
        } catch (err) {
            console.error('Error updating status:', err)
            // Revert on error
            setLeads(previousLeads)
            alert('Erro ao atualizar status.')
        }
    }

    // Filter leads by status
    const getLeadsByStatus = (statusId) => {
        return leads.filter(lead => (lead.status || 'new') === statusId)
    }

    return (
        <div className="leads-container">
            <div className="leads-header">
                <h1>Gestão de Leads</h1>
                <p>Gerencie suas oportunidades comerciais e acompanhe o progresso.</p>
            </div>

            {!selectedClientId ? (
                <div style={{
                    marginTop: '4rem',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b'
                }}>
                    <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                        <Search size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>Nenhum Cliente Selecionado</h3>
                    <p>Selecione um cliente no topo da página para gerenciar a prospecção.</p>
                </div>
            ) : loading ? (
                <div className="loading-state">Carregando leads...</div>
            ) : (
                <div className="kanban-board">
                    {STATUS_COLUMNS.map(column => {
                        const columnLeads = getLeadsByStatus(column.id)

                        return (
                            <div key={column.id} className="kanban-column">
                                <div className="column-header" style={{ borderTop: `4px solid ${column.color}` }}>
                                    <h3>
                                        {column.icon}
                                        {column.label}
                                    </h3>
                                    <span className="count-badge">{columnLeads.length}</span>
                                </div>

                                <div className="column-content">
                                    {columnLeads.map(lead => (
                                        <div
                                            key={lead.id}
                                            className="lead-card"
                                            onClick={() => setSelectedLead(lead)}
                                        >
                                            <div className="lead-name">{lead.nome || 'Sem Nome'}</div>
                                            <div className="lead-role" title={lead.headline}>
                                                {lead.headline || 'Cargo não informado'}
                                            </div>
                                            <div className="lead-meta">
                                                <span className="company-name">
                                                    @{lead.company || '?'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {columnLeads.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '1rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
                                            Vazio
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Sentinel */}
            {!loading && (
                <div ref={observerTarget} style={{ height: '40px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
                    {loadingMore && <div style={{ display: 'flex', color: '#64748b' }}><Loader2 className="spinner" size={24} /></div>}
                    {!hasMore && leads.length > 0 && <span style={{ color: '#cbd5e1' }}>Todos os leads carregados.</span>}
                </div>
            )}

            {selectedLead && (
                <LeadDetailsDrawer
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onStatusChange={updateLeadStatus}
                />
            )}
        </div>
    )
}

const LeadDetailsDrawer = ({ lead, onClose, onStatusChange }) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="lead-modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
        }}>
            <div className="lead-modal-content">
                <div className="modal-header">
                    <div className="profile-info">
                        <h2>{lead.nome}</h2>
                        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>{lead.headline} @ {lead.company}</p>
                        {lead.linkedin_profile_url && (
                            <a
                                href={lead.linkedin_profile_url}
                                target="_blank"
                                rel="noreferrer"
                                className="linkedin-btn"
                                style={{ marginTop: '1rem', display: 'inline-flex' }}
                            >
                                <Linkedin size={18} /> Ver Perfil LinkedIn <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
                            </a>
                        )}
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <XOctagon size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Origin */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div className="section-title">Origem</div>
                        <div style={{
                            background: '#f1f5f9',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            color: '#334155',
                            fontSize: '0.9rem'
                        }}>
                            📍 Veio do Post: <strong>{lead.post_title || 'Desconhecido'}</strong>
                        </div>
                    </div>

                    {/* AI Intelligence */}
                    <div className="ai-section">
                        <div className="section-title" style={{ color: '#7c3aed' }}>
                            <BrainCircuit size={16} /> Inteligência Artificial
                        </div>

                        {lead.ai_summary && (
                            <div className="ai-box">
                                <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#5b21b6' }}>Resumo do Perfil</strong>
                                <div className="ai-content">{lead.ai_summary}</div>
                            </div>
                        )}

                        {lead.ai_icebreaker && (
                            <div className="ai-box" style={{ borderLeftColor: '#ec4899' }}>
                                <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#9d174d' }}>
                                    Sugestão de Quebra-gelo
                                </strong>
                                <div className="ai-content" style={{ fontStyle: 'italic' }}>
                                    "{lead.ai_icebreaker}"
                                </div>
                                <button
                                    className="copy-btn"
                                    onClick={() => handleCopy(lead.ai_icebreaker)}
                                >
                                    {copied ? <Check size={14} color="green" /> : <Copy size={14} />}
                                    {copied ? 'Copiado!' : 'Copiar Mensagem'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="action-bar">
                    {STATUS_COLUMNS.map(status => (
                        <button
                            key={status.id}
                            className={`status-btn ${lead.status === status.id ? 'active' : ''}`}
                            onClick={() => onStatusChange(lead.id, status.id)}
                            title={`Mover para ${status.label}`}
                        >
                            {status.id === lead.status && <Check size={16} />}
                            {status.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default LeadsPage
