import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'
import {
    BarChart3, MessageSquare, PhoneCall, TrendingUp,
    UserX, Layers, User, Loader2, AlertTriangle, RefreshCw
} from 'lucide-react'

// ─── KPI DEFINITIONS ─────────────────────────────────────────────────────────
const KPI_DEFS = [
    { id: 'prospeccoes',   label: 'Prospects Approached',  icon: BarChart3,    color: '#F97316', suffix: '', description: 'Leads approached (Icebreaker sent)' },
    { id: 'mensagens',     label: 'Messages Sent',         icon: MessageSquare, color: '#0EA5E9', suffix: '', description: 'Total messages sent by you' },
    { id: 'calls',         label: 'Scheduled Calls',       icon: PhoneCall,    color: '#22C55E', suffix: '', description: 'Leads with a scheduled call or meeting' },
    { id: 'taxaResposta',  label: 'Reply Rate',            icon: TrendingUp,   color: '#F59E0B', suffix: '%', description: 'Leads approached that replied' },
    { id: 'icpSemContato', label: "Uncontacted ICP 'A'",   icon: UserX,        color: '#EF4444', suffix: '', description: <>ICP A with ZERO messages in history<br/><span style={{fontSize: '0.62rem', fontWeight: '500', color: '#EF4444', opacity: 0.9, display: 'inline-block', marginTop: '0.3rem'}}>* This number ignores date filters, changing only when an Icebreaker is sent</span></> },
]

const EMPTY_STATS = { prospeccoes: 0, mensagens: 0, calls: 0, taxaResposta: 0, icpSemContato: 0 }

// ─── ANIMATED COUNTER ────────────────────────────────────────────────────────
const AnimatedNumber = ({ target, suffix = '', decimals = 0 }) => {
    const [value, setValue] = useState(0)
    const rafRef = useRef(null)

    useEffect(() => {
        const duration = 900
        const startTime = performance.now()
        const animate = (now) => {
            const p = Math.min((now - startTime) / duration, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            setValue(parseFloat((target * eased).toFixed(decimals)))
            if (p < 1) rafRef.current = requestAnimationFrame(animate)
        }
        setValue(0)
        rafRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(rafRef.current)
    }, [target, decimals])

    return <>{value.toFixed(decimals)}{suffix}</>
}

// ─── KPI CARD ────────────────────────────────────────────────────────────────
const KpiCard = ({ kpi, value, index, loading }) => {
    const Icon = kpi.icon
    const isDecimal = kpi.suffix === '%'

    return (
        <div style={{
            background: '#fff',
            borderLeft: `4px solid ${kpi.color}`,
            border: `1px solid ${kpi.color}22`,
            borderLeft: `4px solid ${kpi.color}`,
            padding: '1.25rem 1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            animation: `kpiUp 0.45s ease-out ${index * 0.08}s both`,
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', top: '-14px', right: '-14px', width: '68px', height: '68px', background: `${kpi.color}10`, borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '28px', height: '28px', background: `${kpi.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                    <Icon size={14} color={kpi.color} />
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: '800', color: '#111827', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {loading ? (
                    <div style={{ width: '80px', height: '36px', background: '#F3F4F6', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ) : (
                    <AnimatedNumber target={value} suffix={kpi.suffix} decimals={isDecimal ? 1 : 0} />
                )}
            </div>
            <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: 0 }}>{kpi.description}</p>
        </div>
    )
}

// ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div style={{ background: '#111827', color: '#fff', padding: '0.5rem 0.875rem', fontSize: '0.75rem', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <p style={{ margin: '0 0 0.25rem', fontWeight: '700', color: '#F97316' }}>{label}</p>
            {payload.map(p => (
                <p key={p.name} style={{ margin: '0.1rem 0', color: p.color }}>
                    {p.name}: <strong>{p.value}</strong>
                </p>
            ))}
        </div>
    )
}

// ─── STYLED SELECT (for Profile and Date Range) ──────────────────────────────
const StyledSelect = ({ label, value, onChange, options, placeholder, disabled }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontSize: '0.62rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>
            {label}
        </label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            style={{
                padding: '0.45rem 0.875rem',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                background: '#fff',
                fontSize: '0.78rem',
                fontWeight: '600',
                color: '#374151',
                cursor: disabled ? 'not-allowed' : 'pointer',
                appearance: 'none', // Remove default arrow
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1em',
                minWidth: '160px'
            }}
        >
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {options.map(option => (
                <option key={option.id} value={option.id}>
                    {option.name}
                </option>
            ))}
        </select>
    </div>
)

// ─── HELPER PARA FETCH ILIMITADO (PAGINAÇÃO) ──────────────────────────────
const fetchAllRows = async (baseQuery, pageSize = 1000) => {
    let allData = []
    let from = 0
    while (true) {
        const { data, error } = await baseQuery.range(from, from + pageSize - 1)
        if (error) throw error
        allData = allData.concat(data || [])
        if (!data || data.length < pageSize) break
        from += pageSize
    }
    return allData
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const MyAnalyticsPage = () => {
    const { user } = useAuth()
    const [clientProfiles, setClientProfiles] = useState([])
    const [selectedProfile, setSelectedProfile] = useState('')
    const [dateRange, setDateRange] = useState('all')

    const [stats, setStats] = useState(EMPTY_STATS)
    const [chartData, setChartData]         = useState([])
    const [loadingProfiles, setLoadingProfiles] = useState(true)
    const [loading, setLoading]   = useState(false) // Renamed from loadingStats
    const [error, setError]                 = useState(null)

    // ── 1. Fetch profiles linked to this user ─────────────────────────────
    useEffect(() => {
        if (!user) return
        const fetchProfiles = async () => {
            setLoadingProfiles(true)
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, name')
                    .eq('auth_user_id', user.id)
                    .order('name')

                if (error) throw error
                setClientProfiles(data || [])
                if (data && data.length > 0) {
                    setSelectedProfile('all') // Set default to 'all' if profiles exist
                } else {
                    setSelectedProfile('') // No profiles, no selection
                }
            } catch (err) {
                console.error('[MyAnalytics] fetch profiles:', err)
                setError('Could not load your profiles. Check your permissions.')
            } finally {
                setLoadingProfiles(false)
            }
        }
        fetchProfiles()
    }, [user])

    // ── 2. Fetch real KPIs whenever profile or date range changes ─────────
    const fetchAnalyticsData = useCallback(async () => {
        if (!user) return
        setLoading(true)
        setError(null)

        try {
            const clientIds = selectedProfile === 'all'
                ? clientProfiles.map(p => p.id)
                : [selectedProfile]

            if (!clientIds.length) {
                setStats(EMPTY_STATS)
                setChartData([])
                setLoading(false)
                return
            }

            // ── Calculate Date Range ──────────────────────────────────────
            let afterDate = null
            if (dateRange !== 'all') {
                const d = new Date()
                if (dateRange === '7d') d.setDate(d.getDate() - 7)
                else if (dateRange === '15d') d.setDate(d.getDate() - 15)
                else if (dateRange === '30d') d.setDate(d.getDate() - 30)
                afterDate = d.toISOString()
            }

            const { data: payload, error } = await supabase.rpc('get_analytics_payload', {
                p_client_ids: clientIds,
                p_after_date: afterDate || null
            })

            if (error) {
                throw error
            }

            const statsPayload = payload || {}

            const prospeccoes = statsPayload.prospeccoes || 0
            const mensagens = statsPayload.mensagens || 0
            const calls = statsPayload.calls || 0
            const engajados = statsPayload.engajados_prospectados || 0
            const icpSemContato = statsPayload.icp_sem_contato || 0
            const chartDataObj = statsPayload.chart || {}

            const taxaResposta = prospeccoes > 0 ? (engajados / prospeccoes) * 100 : 0

            setStats({ prospeccoes, mensagens, calls, taxaResposta, icpSemContato })

            // ── Chart: Prospecções (Icebreakers) per day for last 7 days ───────────────
            const dayMap = {}
            const now = new Date()
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now)
                d.setDate(d.getDate() - i)
                const dateKeyStr = d.toISOString().slice(0, 10)
                const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
                dayMap[dateKeyStr] = { 
                    day: label, 
                    Prospections: chartDataObj[dateKeyStr] || 0 
                }
            }
            setChartData(Object.values(dayMap))

        } catch (err) {
            console.error('[MyAnalytics] fetch error:', err)
            setError(err.message || 'Error loading data.')
        } finally {
            setLoading(false)
        }
    }, [user, selectedProfile, clientProfiles, dateRange])


    useEffect(() => {
        if (!loadingProfiles) fetchAnalyticsData()
    }, [selectedProfile, loadingProfiles, dateRange, fetchAnalyticsData]) // Added dateRange to dependencies

    // ─────────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            <style>{`
                @keyframes kpiUp   { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
                @keyframes pulse   { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
                .profile-tab {
                    display:flex; align-items:center; gap:0.4rem;
                    padding:0.45rem 0.875rem; border:2px solid transparent;
                    background:transparent; color:#6B7280; font-size:0.78rem;
                    font-weight:600; cursor:pointer; transition:all 0.15s; white-space:nowrap;
                    border-radius:0;
                }
                .profile-tab:hover { background:#fff7f0; color:#F97316; }
                .profile-tab.active { background:#F97316; color:#fff; border-color:#F97316; }
            `}</style>

            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '4px', height: '28px', background: '#F97316' }} />
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', margin: 0 }}>My Analytics</h1>
                    <button
                        onClick={() => fetchAnalyticsData()}
                        disabled={loading}
                        title="Refresh data"
                        style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.875rem', background: '#fff', border: '1px solid #E5E7EB', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', cursor: loading ? 'default' : 'pointer', borderRadius: '0' }}
                    >
                        <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
                        Refresh
                    </button>
                </div>
                <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: 0, paddingLeft: '1.25rem' }}>
                    Your real performance metrics — filter by profile for a detailed view.
                </p>
            </div>

            {/* Error Banner */}
            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #EF4444', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#991B1B' }}>
                    <AlertTriangle size={14} />
                    {error}
                </div>
            )}

            {/* Profile Filter Bar */}
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '0.75rem 1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: '0.5rem', color: '#9CA3AF' }}>
                    <Layers size={13} />
                    <span style={{ fontSize: '0.62rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Filters</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <StyledSelect
                        label="My Professional Profile"
                        value={selectedProfile}
                        onChange={setSelectedProfile}
                        options={loadingProfiles ? [] : [{ id: 'all', name: 'Overview (All Profiles)' }, ...clientProfiles]}
                        placeholder={loadingProfiles ? "Loading profiles..." : ""}
                        disabled={loadingProfiles}
                    />

                    <div style={{ width: '1px', background: '#E5E7EB', height: '38px', alignSelf: 'flex-end', marginBottom: '2px' }} />

                    <StyledSelect
                        label="Date Range"
                        value={dateRange}
                        onChange={setDateRange}
                        options={[
                            { id: 'all', name: 'All Time' },
                            { id: '7d', name: 'Last 7 days' },
                            { id: '15d', name: 'Last 15 days' },
                            { id: '30d', name: 'Last 30 days' }
                        ]}
                        placeholder="Loading..."
                        disabled={loadingProfiles}
                    />
                </div>
                
                {loading && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#9CA3AF', fontSize: '0.7rem' }}>
                        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        Loading...
                    </div>
                )}
            </div>

            {/* KPI Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1px',
                background: '#E5E7EB',
                border: '1px solid #E5E7EB',
                marginBottom: '2rem',
            }}>
                {KPI_DEFS.map((kpi, i) => (
                    <KpiCard
                        key={`${kpi.id}-${selectedProfile}`}
                        kpi={kpi}
                        value={stats[kpi.id]}
                        index={i}
                        loading={loading}
                    />
                ))}
            </div>

            {/* Chart Section */}
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: '4px', height: '16px', background: '#F97316' }} />
                    <h2 style={{ fontSize: '0.8rem', fontWeight: '800', color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Prospections — Last 7 days
                    </h2>
                </div>

                {loading ? (
                    <div style={{ height: '220px', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '0.8rem', gap: '0.5rem' }}>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading chart...
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} barCategoryGap="35%">
                            <CartesianGrid vertical={false} stroke="#F3F4F6" />
                            <XAxis
                                dataKey="day"
                                tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                                axisLine={false}
                                tickLine={false}
                                width={32}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F97316', opacity: 0.06 }} />
                            <Bar
                                dataKey="Prospections"
                                fill="#F97316"
                                radius={[2, 2, 0, 0]}
                                maxBarSize={48}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* spin keyframe (also used by RefreshCw / Loader2) */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

export default MyAnalyticsPage
