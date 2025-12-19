import React, { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { Clock, CheckCircle2, ArrowRight, X } from 'lucide-react'

const ContentCalendar = ({ posts }) => {
    const [selectedDayPosts, setSelectedDayPosts] = useState(null)

    // Filter posts that have a schedule date
    const scheduledPosts = posts.filter(p => p.data_agendamento)

    // Modifiers Logic
    const hasPostModifier = (date) => {
        return scheduledPosts.some(post => {
            const postDate = new Date(post.data_agendamento)
            return postDate.toDateString() === date.toDateString()
        })
    }

    const modifiers = {
        hasPost: hasPostModifier
    }

    const modifiersStyles = {
        hasPost: {
            fontWeight: 'bold',
            color: '#6366f1'
        }
    }

    // Custom Day Content to show Dots
    const DayContent = (props) => {
        const { date, displayMonth, activeModifiers } = props
        const dayPosts = scheduledPosts.filter(post =>
            new Date(post.data_agendamento).toDateString() === date.toDateString()
        )

        const isPast = date < new Date().setHours(0, 0, 0, 0)

        // Only render content for days in the current month view (standard behavior)
        if (date.getMonth() !== displayMonth.getMonth()) {
            return <span style={{ color: '#cbd5e1' }}>{date.getDate()}</span>
        }

        return (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                <span>{date.getDate()}</span>
                {dayPosts.length > 0 && (
                    <div style={{ display: 'flex', gap: '2px', position: 'absolute', bottom: '4px' }}>
                        {dayPosts.slice(0, 3).map((post, i) => {
                            const postIsPast = new Date(post.data_agendamento) < new Date()
                            return (
                                <div key={i} style={{
                                    width: '4px', height: '4px', borderRadius: '50%',
                                    backgroundColor: postIsPast ? '#22c55e' : '#3b82f6'
                                }} />
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    const handleDayClick = (day) => {
        if (!day) return
        const dayPosts = scheduledPosts.filter(post =>
            new Date(post.data_agendamento).toDateString() === day.toDateString()
        )

        if (dayPosts.length > 0) {
            setSelectedDayPosts({ date: day, posts: dayPosts })
        } else {
            setSelectedDayPosts(null)
        }
    }

    const scrollToPost = (postId) => {
        const element = document.getElementById(`post-${postId}`)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            element.style.transition = 'background 0.5s'
            const originalBg = element.style.background
            element.style.background = '#fef3c7'
            setTimeout(() => {
                element.style.background = originalBg
            }, 1000)
        }
        setSelectedDayPosts(null)
    }

    return (
        <div className="content-calendar-wrapper" style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            padding: '1.5rem',
            marginBottom: '2rem',
            border: '1px solid #f1f5f9',
            fontFamily: "'Inter', sans-serif",
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>

            <style>{`
                .rdp {
                    margin: 0;
                    --rdp-cell-size: 45px;
                    --rdp-accent-color: #6366f1;
                    --rdp-background-color: #e0e7ff; 
                }
                .rdp-day_selected { 
                    background-color: var(--rdp-accent-color); 
                }
                .rdp-day_today { 
                    font-weight: bold; 
                    color: #6366f1;
                }
                .rdp-caption_label {
                    font-size: 1rem;
                    color: #1e293b;
                    font-weight: 700;
                    text-transform: capitalize;
                }
                .rdp-head_cell {
                    color: #94a3b8;
                    font-weight: 600;
                    font-size: 0.85rem;
                }
                @media (max-width: 640px) {
                    .rdp { --rdp-cell-size: 36px; }
                }
            `}</style>

            <h3 style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <Clock size={20} color="#6366f1" />
                Calendário de Conteúdo
            </h3>

            <DayPicker
                mode="single"
                locale={ptBR}
                onDayClick={handleDayClick}
                modifiers={modifiers}
                modifiersStyles={modifiersStyles}
                components={{
                    DayContent: DayContent
                }}
            />

            {/* Popover / Overlay */}
            {selectedDayPosts && (
                <>
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.2)' }}
                        onClick={() => setSelectedDayPosts(null)}
                    ></div>
                    <div className="calendar-popover" style={{
                        position: 'fixed',
                        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        zIndex: 10000,
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '16px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                        width: '320px',
                        maxWidth: '90%',
                        border: '1px solid #e2e8f0',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '1.1rem' }}>
                                    {format(selectedDayPosts.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                                </h4>
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                    {selectedDayPosts.posts.length} {selectedDayPosts.posts.length === 1 ? 'postagem' : 'postagens'}
                                </span>
                            </div>
                            <button onClick={() => setSelectedDayPosts(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                            {selectedDayPosts.posts.map(post => {
                                const isPast = new Date(post.data_agendamento) < new Date()
                                return (
                                    <div key={post.id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                            {post.tema || post.corpo_post?.substring(0, 30) + "..." || "Post sem título"}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>
                                            {isPast ? (
                                                <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                                    <CheckCircle2 size={12} /> Publicado as {format(new Date(post.data_agendamento), 'HH:mm')}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', background: '#dbeafe', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                                    <Clock size={12} /> Agendado para {format(new Date(post.data_agendamento), 'HH:mm')}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => scrollToPost(post.id)}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: '8px',
                                                background: 'white',
                                                color: '#0f172a',
                                                fontSize: '0.85rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                fontWeight: 600,
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                        >
                                            Visualizar <ArrowRight size={14} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default ContentCalendar
