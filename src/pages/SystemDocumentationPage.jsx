import React, { useState } from 'react'
import { BookOpen, Target, MessageSquare, BarChart3, Users, ChevronRight, Zap, TrendingUp, AlertCircle, Info } from 'lucide-react'

// ─── TOC COMPONENTS ──────────────────────────────────────────────────────────
const TocItem = ({ title, icon: Icon, id, active, onClick }) => (
    <div 
        onClick={() => onClick(id)}
        style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.55rem 0.75rem', borderRadius: '6px',
            cursor: 'pointer', transition: 'all 0.15s ease',
            background: active ? '#FFF7ED' : 'transparent',
            color: active ? '#F97316' : '#6B7280',
            fontWeight: active ? '700' : '500',
            fontSize: '0.82rem',
        }}
    >
        <Icon size={16} color={active ? '#F97316' : '#9CA3AF'} />
        {title}
        {active && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
    </div>
)

// ─── CONTENT COMPONENTS ──────────────────────────────────────────────────────
const SectionTitle = ({ title, icon: Icon, id }) => (
    <div id={id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '3rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ padding: '0.5rem', background: '#FFF7ED', borderRadius: '8px' }}>
            <Icon size={20} color="#F97316" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', margin: 0 }}>
            {title}
        </h2>
    </div>
)

const Paragraph = ({ children }) => (
    <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: '#374151', marginBottom: '1.25rem' }}>
        {children}
    </p>
)

const Alert = ({ type = 'info', title, children }) => {
    const isWarn = type === 'warning'
    const color = isWarn ? '#F59E0B' : '#0EA5E9'
    const bg = isWarn ? '#FFFBEB' : '#F0F9FF'
    const Icon = isWarn ? AlertCircle : Info

    return (
        <div style={{ background: bg, borderLeft: `4px solid ${color}`, padding: '1rem', borderRadius: '0 4px 4px 0', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <Icon size={20} color={color} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
                {title && <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', fontWeight: '800', color: '#111827' }}>{title}</h4>}
                <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.5' }}>
                    {children}
                </div>
            </div>
        </div>
    )
}

const KpiBox = ({ label, description, isMath }) => (
    <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '1rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {label}
        </h4>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B7280', lineHeight: '1.5', fontFamily: isMath ? 'monospace' : 'inherit' }}>
            {description}
        </p>
    </div>
)

// ─── MAIN DOCUMENTATION PAGE ─────────────────────────────────────────────────
const SystemDocumentationPage = () => {
    const [activeSection, setActiveSection] = useState('visao-geral')

    const scrollTo = (id) => {
        setActiveSection(id)
        const el = document.getElementById(id)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    return (
        <div style={{ display: 'flex', minHeight: '100%', background: '#fff' }}>
            
            {/* ── LEFT SIDEBAR (TOC) ────────────────────────────────────────── */}
            <div style={{ 
                width: '280px', flexShrink: 0, borderRight: '1px solid #E5E7EB', 
                padding: '2rem 1rem', position: 'sticky', top: 0, height: '100vh', 
                overflowY: 'auto' 
            }}>
                <div style={{ marginBottom: '2rem', padding: '0 0.75rem' }}>
                    <h1 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', margin: '0 0 0.25rem' }}>Help Center</h1>
                    <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>V.1.0 • Manuals & Mechanics</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <TocItem id="visao-geral" title="Overview" icon={BookOpen} active={activeSection === 'visao-geral'} onClick={scrollTo} />
                    <TocItem id="sales-cockpit" title="Sales Cockpit" icon={Target} active={activeSection === 'sales-cockpit'} onClick={scrollTo} />
                    <TocItem id="intelligent-inbox" title="Intelligent Inbox" icon={MessageSquare} active={activeSection === 'intelligent-inbox'} onClick={scrollTo} />
                    <TocItem id="analytics-kpis" title="Analytics & KPIs" icon={BarChart3} active={activeSection === 'analytics-kpis'} onClick={scrollTo} />
                    <TocItem id="team-governance" title="Team Governance" icon={Users} active={activeSection === 'team-governance'} onClick={scrollTo} />
                </div>
            </div>

            {/* ── CONTENT AREA ──────────────────────────────────────────────── */}
            <div style={{ flex: 1, padding: '2rem 4rem', maxWidth: '900px' }}>
                
                {/* 1. Visão Geral */}
                <SectionTitle id="visao-geral" title="Welcome to Link & Lead" icon={BookOpen} />
                <Paragraph>
                    <b>Link & Lead</b> is your advanced architecture for managing Outbound sales on LinkedIn. 
                    Unlike traditional CRMs, our focus is entirely engagement-driven: 
                    we do not want you wasting time filling out forms, we want you to spend time <b>talking directly to your leads</b>.
                </Paragraph>
                <Paragraph>
                    The system was designed around the concept of <i>"Missions"</i> (Daily tasks) and the <i>Intelligent Inbox</i>, 
                    which aggregates all your B2B touchpoints in a highly structured manner.
                </Paragraph>

                {/* 2. Sales Cockpit */}
                <SectionTitle id="sales-cockpit" title="Sales Cockpit (Missions)" icon={Target} />
                <Paragraph>
                    The Sales Cockpit is your daily routine hub. Every lead pulled into the system is broken down into missions you must complete. If the screen is empty, your work for the day is done!
                </Paragraph>
                <Alert title="What is the 'Icebreaker'?">
                    Inside missions, we call the very first contact message the <b>Icebreaker</b>. This is the cold prospecting message that initiates the entire relationship. Sending this message is the official trigger for a lead to count towards your Prospecting Analytics score.
                </Alert>
                <Paragraph>
                    Whenever you complete your <i>Today</i> tasks, make sure to check the <b>Overdue</b> tab so you don't leave any prospects behind to cool off.
                </Paragraph>

                {/* 3. Intelligent Inbox */}
                <SectionTitle id="intelligent-inbox" title="Intelligent Inbox & Copilot" icon={MessageSquare} />
                <Paragraph>
                    The Intelligent Inbox will pull all your real LinkedIn historical conversations with the imported leads. You don't need to use LinkedIn's chaotic message tab; you can operate and reply directly from here.
                </Paragraph>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr', marginBottom: '1.25rem' }}>
                    <div style={{ border: '1px solid #E5E7EB', padding: '1rem', borderRadius: '6px' }}>
                        <Zap size={18} color="#F59E0B" style={{ marginBottom: '0.5rem' }} />
                        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#111827' }}>AI Copilot</h4>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280' }}>Our AI model reads the chat history with the lead and suggests quick replies (Icebreaker, Pushing, Acknowledgment) based strictly on their exact commercial moment.</p>
                    </div>
                    <div style={{ border: '1px solid #E5E7EB', padding: '1rem', borderRadius: '6px' }}>
                        <TrendingUp size={18} color="#22C55E" style={{ marginBottom: '0.5rem' }} />
                        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#111827' }}>Reactive Status Tracker</h4>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280' }}>Upon sending or receiving a reply, the system automatically pulls the Lead out of the "Awaiting Contact" status and starts their journey through the relational funnel.</p>
                    </div>
                </div>

                {/* 4. Analytics & KPIs */}
                <SectionTitle id="analytics-kpis" title="Analytics & Exact Metrics" icon={BarChart3} />
                <Paragraph>
                    Our data intelligence layer (My Analytics & Team View) relies on a <b>Hybrid Time Architecture</b>. 
                    This means when you apply Date Filters (e.g., Last 7 Days, Last 30 Days), the metrics split into "Flow Metrics" (Strictly period-bound) and "Inventory/Backlog Metrics" (Global database snapshots).
                </Paragraph>
                
                <KpiBox 
                    label="1. Scheduled Calls (GLOBAL Vision)" 
                    description="A photograph of your actual calendar. Ignores the date filter and lists the exact total of leads currently marked as 'Scheduled' or 'Completed' through the Smart Inbox context menu UI."
                />

                <KpiBox 
                    label="2. Prospects Approached (Period-Bound)" 
                    description="Shows the volume of UNIQUE leads that received their VERY FIRST message ('Icebreaker') strictly within the selected time window."
                />
                
                <KpiBox 
                    label="3. Messages Sent (Period-Bound)" 
                    description="The absolute gross volume of all messages where you were the sender (is_sender = true) dispatched within the selected date window. Counts both icebreakers and follow-ups."
                />
                
                <KpiBox 
                    label="4. Reply Rate (%) (Period-Bound)" 
                    description="Math Formula: (Engaged Prospects / Prospects Approached in the period) * 100. Shows the effectiveness of your copy in the chosen window."
                    isMath
                />
                
                <KpiBox 
                    label="5. ICP 'A' No Contact (GLOBAL Vision)" 
                    description="Total amount of leads identified as High Priority (Score A), but holding ZERO message history. This metric IGNORES date filters and acts as a General Stock Alert for perfect leads begging for an approach on your shelf."
                />

                <Alert type="info" title="The Hybrid Logic Explained">
                    The fact that "ICP 'A'" ignores date filters ensures that an incredible Lead captured 2 months ago that you forgot to contact will <b>never disappear</b> from your dashboard just because you are analyzing "last 7 days" performance.
                </Alert>

                {/* 5. Team Governance */}
                <SectionTitle id="team-governance" title="Team Governance (Workspaces)" icon={Users} />
                <Paragraph>
                    The platform enables squad creation (Teams). Every lead and interaction belongs to a <b>LinkedIn Profile</b>, which in turn belongs to an <b>SDR (Logged user)</b>, which belongs to a <b>Team</b>.
                </Paragraph>
                <Paragraph>
                    If your user does not hold the <code>team_admin</code> attribute in our database, you will always be restricted to the unified <i>"My Analytics"</i> isolated view.
                    Team Administrators automatically unlock the <b>"Team Dashboard"</b> module in the sidebar navigation.
                </Paragraph>
                <Paragraph>
                    Inside the Team Dashboard, the admin can drill-down results in 3 formats:
                    <br/><br/>
                    1. <b>Team Aggregated View:</b> Total absolute output combining all squad members.<br/>
                    2. <b>SDR Individual View:</b> Isolate a specific SDR and understand their funnel.<br/>
                    3. <b>Profile Micro-vision:</b> If an SDR manages 2 or more LinkedIn profiles simultaneously, you can isolate the performance of <i>each one</i> of those LinkedIn profiles independently.
                </Paragraph>

                <div style={{ marginTop: '4rem', padding: '2rem', background: '#FAFAFA', borderTop: '2px dashed #E5E7EB', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#9CA3AF', fontWeight: '500' }}>
                        Link & Lead Engine © {new Date().getFullYear()}. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default SystemDocumentationPage
