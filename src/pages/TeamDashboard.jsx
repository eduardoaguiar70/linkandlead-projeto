import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
    Shield, Users, ChevronDown, Filter, BarChart3, MessageSquare,
    PhoneCall, TrendingUp, UserX, Trophy, Loader2, AlertTriangle,
    RefreshCw, Crown, Medal
} from 'lucide-react'

// ─── KPI DEFINITIONS (same visual identity as MyAnalytics) ───────────────────
const KPI_DEFS = [
    { id: 'prospeccoes',   label: 'Prospects Approached',icon: BarChart3,    color: '#F97316', suffix: '', desc: 'Leads approached (Icebreaker sent)' },
    { id: 'mensagens',     label: 'Messages Sent',icon: MessageSquare,color: '#0EA5E9', suffix: '', desc: 'Total messages sent by you' },
    { id: 'calls',         label: 'Scheduled Calls',   icon: PhoneCall,    color: '#22C55E', suffix: '', desc: 'Leads with a scheduled call or meeting' },
    { id: 'taxaResposta',  label: 'Reply Rate',  icon: TrendingUp,   color: '#F59E0B', suffix: '%', desc: 'Leads approached that replied' },
    { id: 'icpSemContato', label: "Uncontacted ICP 'A'",icon: UserX,        color: '#EF4444', suffix: '', desc: <>ICP A with ZERO messages in history<br/><span style={{fontSize: '0.62rem', fontWeight: '500', color: '#EF4444', opacity: 0.9, display: 'inline-block', marginTop: '0.3rem'}}>* This number ignores date filters, changing only when an Icebreaker is sent</span></> },
]

const CALL_STAGES = ['call agendada', 'reunião', 'meeting scheduled', 'call scheduled', 'demo']

const EMPTY_STATS = { prospeccoes: 0, mensagens: 0, calls: 0, taxaResposta: 0, icpSemContato: 0 }

// ─── ANIMATED COUNTER ────────────────────────────────────────────────────────
const AnimatedNumber = ({ target, suffix = '', decimals = 0 }) => {
    const [value, setValue] = useState(0)
    const rafRef = useRef(null)
    useEffect(() => {
        const duration = 800
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

// ─── SKELETON ────────────────────────────────────────────────────────────────
const Skeleton = ({ w = '100%', h = '20px', style = {} }) => (
    <div style={{ width: w, height: h, background: '#E5E7EB', borderRadius: '3px', animation: 'pulse 1.5s ease-in-out infinite', ...style }} />
)

// ─── KPI CARD ────────────────────────────────────────────────────────────────
const KpiCard = ({ kpi, value, index, loading }) => {
    const Icon = kpi.icon
    const isDecimal = kpi.suffix === '%'
    return (
        <div style={{
            background: '#fff',
            borderTop: `3px solid ${kpi.color}`,
            border: `1px solid ${kpi.color}22`,
            borderTop: `3px solid ${kpi.color}`,
            padding: '1.25rem 1.25rem 1rem',
            display: 'flex', flexDirection: 'column', gap: '0.4rem',
            animation: `kpiIn 0.4s ease-out ${index * 0.07}s both`,
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', bottom: '-16px', right: '-16px', width: '72px', height: '72px', background: `${kpi.color}08`, borderRadius: '50%' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Icon size={14} color={kpi.color} />
                <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#111827', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {loading ? <Skeleton h="36px" w="80px" /> : <AnimatedNumber target={value} suffix={kpi.suffix} decimals={isDecimal ? 1 : 0} />}
            </div>
            <p style={{ fontSize: '0.65rem', color: '#9CA3AF', margin: 0 }}>{kpi.desc}</p>
        </div>
    )
}

// ─── STYLED SELECT ────────────────────────────────────────────────────────────
const StyledSelect = ({ label, value, onChange, options, placeholder, disabled, loading }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: '200px', flex: 1 }}>
        <label style={{ fontSize: '0.62rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: loading ? '#D1D5DB' : '#9CA3AF' }}>
            {label}
        </label>
        <div style={{ position: 'relative' }}>
            {loading ? (
                <Skeleton h="38px" />
            ) : (
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    disabled={disabled}
                    style={{
                        width: '100%',
                        padding: '0.55rem 2.25rem 0.55rem 0.875rem',
                        background: disabled ? '#F9FAFB' : '#fff',
                        border: `2px solid ${disabled ? '#F3F4F6' : '#E5E7EB'}`,
                        borderRadius: '0',
                        fontSize: '0.82rem', fontWeight: '600',
                        color: disabled ? '#9CA3AF' : '#111827',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        appearance: 'none', outline: 'none',
                        transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { if (!disabled) e.target.style.borderColor = '#F97316' }}
                    onBlur={e => e.target.style.borderColor = disabled ? '#F3F4F6' : '#E5E7EB'}
                >
                    <option value="">{placeholder}</option>
                    {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
            )}
            {!loading && <ChevronDown size={13} style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />}
        </div>
    </div>
)

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div style={{ background: '#111827', color: '#fff', padding: '0.45rem 0.75rem', fontSize: '0.72rem', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <p style={{ margin: '0 0 0.2rem', fontWeight: '700', color: '#F97316' }}>{label}</p>
            {payload.map(p => <p key={p.name} style={{ margin: '0.1rem 0', color: p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
        </div>
    )
}

// ─── RANK ICON ────────────────────────────────────────────────────────────────
const RankIcon = ({ rank }) => {
    if (rank === 1) return <Crown size={16} color="#F59E0B" />
    if (rank === 2) return <Medal size={16} color="#9CA3AF" />
    if (rank === 3) return <Medal size={16} color="#92400E" />
    return <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#6B7280' }}>#{rank}</span>
}

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

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
const TeamDashboard = () => {
    const { user } = useAuth()

    // ── Filter state ──────────────────────────────────────────────────────────
    const [teams, setTeams]           = useState([])   // teams where user is team_admin
    const [sdrs, setSdrs]             = useState([])   // profiles of selected team
    const [clientProfiles, setClientProfiles] = useState([])  // clients of selected SDR

    const [selectedTeam, setSelectedTeam]         = useState('')
    const [selectedSdr, setSelectedSdr]           = useState('')
    const [selectedProfile, setSelectedProfile]   = useState('')
    const [dateRange, setDateRange]               = useState('all')

    // ── Data state ────────────────────────────────────────────────────────────
    const [stats, setStats]         = useState(EMPTY_STATS)
    const [chartData, setChartData] = useState([])
    const [leaderboard, setLeaderboard] = useState([])

    // ── Loading/error state ───────────────────────────────────────────────────
    const [loadingTeams, setLoadingTeams]     = useState(true)
    const [loadingSdrs, setLoadingSdrs]       = useState(false)
    const [loadingClients, setLoadingClients] = useState(false)
    const [loadingStats, setLoadingStats]     = useState(false)
    const [error, setError]                   = useState(null)

    // ═════════════════════════════════════════════════════════════════════════
    // 1. FETCH TEAMS WHERE USER IS team_admin
    // ═════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!user) return
        const fetch = async () => {
            setLoadingTeams(true)
            setError(null)
            try {
                // Get team_ids where this user is team_admin
                const { data: memberships, error: mErr } = await supabase
                    .from('team_members')
                    .select('team_id')
                    .eq('user_id', user.id)
                    .eq('role', 'team_admin')

                if (mErr) throw mErr
                if (!memberships?.length) { setTeams([]); return }

                const teamIds = memberships.map(m => m.team_id)
                const { data: teamsData, error: tErr } = await supabase
                    .from('teams')
                    .select('id, name')
                    .in('id', teamIds)
                    .order('name')

                if (tErr) throw tErr
                setTeams(teamsData || [])
                // Auto-select if only one team
                if (teamsData?.length === 1) setSelectedTeam(teamsData[0].id)
            } catch (err) {
                setError('Could not load teams: ' + (err.message || ''))
            } finally {
                setLoadingTeams(false)
            }
        }
        fetch()
    }, [user])

    // ═════════════════════════════════════════════════════════════════════════
    // 2. FETCH SDRs WHEN TEAM CHANGES
    // ═════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!selectedTeam) { setSdrs([]); setSelectedSdr(''); setSelectedProfile(''); return }
        const fetch = async () => {
            setLoadingSdrs(true)
            setSelectedSdr('')
            setSelectedProfile('')
            setSdrs([])
            setClientProfiles([])
            try {
                // Get user_ids in this team
                const { data: members, error: mErr } = await supabase
                    .from('team_members')
                    .select('user_id')
                    .eq('team_id', selectedTeam)

                if (mErr) throw mErr
                if (!members?.length) return

                const userIds = members.map(m => m.user_id)
                const { data: profilesData, error: pErr } = await supabase
                    .from('profiles')
                    .select('id, nome_empresa, email')
                    .in('id', userIds)
                    .order('nome_empresa')

                if (pErr) throw pErr
                setSdrs((profilesData || []).map(p => ({ id: p.id, name: p.nome_empresa || p.email || p.id })))
            } catch (err) {
                setError('Error loading SDRs: ' + (err.message || ''))
            } finally {
                setLoadingSdrs(false)
            }
        }
        fetch()
    }, [selectedTeam])

    // ═════════════════════════════════════════════════════════════════════════
    // 3. FETCH CLIENT PROFILES WHEN SDR CHANGES
    // ═════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!selectedSdr) { setClientProfiles([]); setSelectedProfile(''); return }
        const fetch = async () => {
            setLoadingClients(true)
            setSelectedProfile('')
            setClientProfiles([])
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, name')
                    .eq('auth_user_id', selectedSdr)
                    .order('name')

                if (error) throw error
                setClientProfiles(data || [])
            } catch (err) {
                console.error('[TeamDashboard] fetch client profiles:', err)
            } finally {
                setLoadingClients(false)
            }
        }
        fetch()
    }, [selectedSdr])

    // ═════════════════════════════════════════════════════════════════════════
    // 4. FETCH KPIs — reactive to all filters
    // ═════════════════════════════════════════════════════════════════════════
    const fetchStats = useCallback(async () => {
        if (!selectedTeam) { setStats(EMPTY_STATS); setChartData([]); setLeaderboard([]); return }
        setLoadingStats(true)
        setError(null)
        try {
            // ── Determine scope ───────────────────────────────────────────
            let clientIds = []

            if (selectedProfile) {
                // Drill: single client profile
                clientIds = [selectedProfile]
            } else if (selectedSdr) {
                // Drill: single SDR — fetch their client IDs
                const { data: c } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('auth_user_id', selectedSdr)
                if (c) clientIds = c.map(x => x.id)
            } else {
                // Team-wide: all clients from all SDRs in this team
                const { data: members } = await supabase
                    .from('team_members')
                    .select('user_id')
                    .eq('team_id', selectedTeam)

                if (members?.length) {
                    const userIds = members.map(m => m.user_id)
                    const { data: c } = await supabase
                        .from('clients')
                        .select('id')
                        .in('auth_user_id', userIds)
                    if (c) clientIds = c.map(x => x.id)
                }
            }

            if (!clientIds.length) {
                setStats(EMPTY_STATS); setChartData([]); setLeaderboard([])
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

            if (error) throw error

            const statsPayload = payload || {}
            
            const prospeccoes = statsPayload.prospeccoes || 0
            const mensagens = statsPayload.mensagens || 0
            const calls = statsPayload.calls || 0
            const engajados = statsPayload.engajados_prospectados || 0
            const icpSemContato = statsPayload.icp_sem_contato || 0
            const chartDataObj = statsPayload.chart || {}

            const taxaResposta = prospeccoes > 0 ? (engajados / prospeccoes) * 100 : 0
            
            setStats({ prospeccoes, mensagens, calls, taxaResposta, icpSemContato })

            // ── Chart: leads per day last 7 days ──────────────────────────
            const dayMap = {}
            const now = new Date()
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now); d.setDate(d.getDate() - i)
                const dateKeyStr = d.toISOString().slice(0, 10)
                const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
                dayMap[dateKeyStr] = { day: label, Prospections: chartDataObj[dateKeyStr] || 0 }
            }
            setChartData(Object.values(dayMap))

            // ── Leaderboard (team-level only) ─────────────────────────────
            if (!selectedSdr && !selectedProfile) {
                await buildLeaderboard(selectedTeam)
            }

        } catch (err) {
            setError('Error loading KPIs: ' + (err.message || ''))
        } finally {
            setLoadingStats(false)
        }
    }, [selectedTeam, selectedSdr, selectedProfile, dateRange])

    useEffect(() => { fetchStats() }, [fetchStats])

    // ═════════════════════════════════════════════════════════════════════════
    // 5. BUILD LEADERBOARD
    // ═════════════════════════════════════════════════════════════════════════
    const buildLeaderboard = async (teamId) => {
        try {
            const { data: members } = await supabase
                .from('team_members')
                .select('user_id')
                .eq('team_id', teamId)

            if (!members?.length) { setLeaderboard([]); return }
            const userIds = members.map(m => m.user_id)

            // Fetch profiles of SDRs
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, nome_empresa, email')
                .in('id', userIds)

            // For each SDR, fetch their client IDs
            const sdrClients = await Promise.all((profilesData || []).map(async (p) => {
                const { data: clientsData } = await supabase
                    .from('clients').select('id').eq('auth_user_id', p.id)
                return {
                     id: p.id,
                     name: p.nome_empresa || p.email || p.id,
                     cIds: (clientsData || []).map(c => c.id)
                }
            }))

            // Calculate Date Range
            let afterDate = null
            if (dateRange !== 'all') {
                const d = new Date()
                if (dateRange === '7d') d.setDate(d.getDate() - 7)
                else if (dateRange === '15d') d.setDate(d.getDate() - 15)
                else if (dateRange === '30d') d.setDate(d.getDate() - 30)
                afterDate = d.toISOString()
            }

            const allClientIds = sdrClients.flatMap(s => s.cIds)
            
            if (allClientIds.length > 0) {
                const { data: leaderboardDataObj } = await supabase.rpc('get_team_leaderboard', {
                    p_client_ids: allClientIds,
                    p_after_date: afterDate || null
                })
                
                const leaders = leaderboardDataObj || []
                
                const rows = sdrClients.map(sdr => {
                    let prospeccoes = 0, calls = 0, engajados = 0
                    
                    sdr.cIds.forEach(cid => {
                        const stats = leaders.find(l => l.client_id === cid)
                        if (stats) {
                            prospeccoes += stats.prospeccoes || 0
                            calls += stats.calls || 0
                            engajados += stats.engajados_prospectados || 0
                        }
                    })
                    
                    return {
                        id: sdr.id,
                        name: sdr.name,
                        prospeccoes,
                        calls,
                        taxaResposta: prospeccoes > 0 ? ((engajados / prospeccoes) * 100).toFixed(1) : '0.0',
                    }
                })

                // Sort by calls desc, then prospeccoes
                rows.sort((a, b) => b.calls - a.calls || b.prospeccoes - a.prospeccoes)
                setLeaderboard(rows)
            } else {
                setLeaderboard([])
            }
        } catch (err) {
            console.error('[TeamDashboard] leaderboard:', err)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONTEXT LABEL
    // ─────────────────────────────────────────────────────────────────────────
    const contextLabel = (() => {
        if (selectedProfile) return 'Profile: ' + (clientProfiles.find(c => c.id === selectedProfile)?.name || selectedProfile)
        if (selectedSdr)     return 'SDR: '    + (sdrs.find(s => s.id === selectedSdr)?.name || selectedSdr)
        if (selectedTeam)    return 'Team: '  + (teams.find(t => t.id === selectedTeam)?.name || selectedTeam)
        return null
    })()

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '2rem', maxWidth: '1300px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            <style>{`
                @keyframes kpiIn  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
                @keyframes pulse  { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
                @keyframes spin   { to { transform:rotate(360deg); } }
                .ldr-row:hover td { background:#FFF7ED !important; }
            `}</style>

            {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                        <div style={{ width: '4px', height: '28px', background: '#F97316' }} />
                        <Shield size={22} color="#F97316" />
                        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#111827', margin: 0 }}>Team Command Center</h1>
                    </div>
                    <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: 0, paddingLeft: '1.25rem' }}>
                        Full visibility over team performance. Drill-down by Team → SDR → Profile.
                    </p>
                </div>
                <button
                    onClick={fetchStats}
                    disabled={!selectedTeam || loadingStats}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.875rem', background: '#fff', border: '1px solid #E5E7EB', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', cursor: (!selectedTeam || loadingStats) ? 'default' : 'pointer', borderRadius: '0', opacity: !selectedTeam ? 0.5 : 1 }}
                >
                    <RefreshCw size={13} style={loadingStats ? { animation: 'spin 1s linear infinite' } : {}} />
                    Refresh
                </button>
            </div>

            {/* ── ERROR BANNER ────────────────────────────────────────────── */}
            {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #EF4444', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#991B1B' }}>
                    <AlertTriangle size={14} /> {error}
                </div>
            )}

            {/* ── CASCADE FILTERS ──────────────────────────────────────────── */}
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
                    <Filter size={13} color="#9CA3AF" />
                    <span style={{ fontSize: '0.62rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF' }}>Cascade Filters</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <StyledSelect
                        label="1. Team"
                        value={selectedTeam}
                        onChange={val => { setSelectedTeam(val); setSelectedSdr(''); setSelectedProfile(''); setSdrs([]); setClientProfiles([]) }}
                        options={teams}
                        placeholder={loadingTeams ? 'Loading...' : teams.length === 0 ? 'No teams found' : '— Select a team —'}
                        disabled={loadingTeams || teams.length === 0}
                        loading={loadingTeams}
                    />

                    <div style={{ width: '1px', background: '#E5E7EB', height: '38px', alignSelf: 'flex-end', marginBottom: '2px' }} />

                    <StyledSelect
                        label="2. SDR"
                        value={selectedSdr}
                        onChange={val => { setSelectedSdr(val); setSelectedProfile(''); setClientProfiles([]) }}
                        options={sdrs}
                        placeholder={!selectedTeam ? '— Select a team first —' : loadingSdrs ? 'Loading SDRs...' : 'All SDRs'}
                        disabled={!selectedTeam || loadingSdrs}
                        loading={loadingSdrs}
                    />

                    <div style={{ width: '1px', background: '#E5E7EB', height: '38px', alignSelf: 'flex-end', marginBottom: '2px' }} />

                    <StyledSelect
                        label="3. LinkedIn Profile"
                        value={selectedProfile}
                        onChange={setSelectedProfile}
                        options={clientProfiles}
                        placeholder={!selectedSdr ? '— Select an SDR first —' : loadingClients ? 'Loading profiles...' : 'All Profiles'}
                        disabled={!selectedSdr || loadingClients}
                        loading={loadingClients}
                    />

                    <div style={{ width: '1px', background: '#E5E7EB', height: '38px', alignSelf: 'flex-end', marginBottom: '2px' }} />

                    <StyledSelect
                        label="4. Date Range"
                        value={dateRange}
                        onChange={setDateRange}
                        options={[
                            { id: 'all', name: 'All Time' },
                            { id: '7d', name: 'Last 7 days' },
                            { id: '15d', name: 'Last 15 days' },
                            { id: '30d', name: 'Last 30 days' }
                        ]}
                        placeholder="Date Range"
                        disabled={!selectedTeam}
                        loading={false}
                    />

                    {contextLabel && (
                        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end', padding: '0.5rem 0.875rem', background: '#FFF7ED', border: '1px solid #FED7AA', fontSize: '0.72rem', fontWeight: '600', color: '#92400E', whiteSpace: 'nowrap' }}>
                            📊 {contextLabel}
                        </div>
                    )}
                </div>
            </div>

            {/* ── NO TEAM SELECTED PLACEHOLDER ────────────────────────────── */}
            {!selectedTeam && !loadingTeams && (
                <div style={{ textAlign: 'center', padding: '4rem', border: '2px dashed #E5E7EB', color: '#9CA3AF' }}>
                    <Shield size={36} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
                    <p style={{ margin: '0', fontSize: '0.875rem', fontWeight: '600' }}>Select a team to load data.</p>
                    {teams.length === 0 && !loadingTeams && <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#D1D5DB' }}>No team was found for your user with the 'team_admin' role.</p>}
                </div>
            )}

            {selectedTeam && (
                <>
                    {/* ── KPI GRID ────────────────────────────────────────────── */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                            <div style={{ width: '3px', height: '16px', background: '#F97316' }} />
                            <h2 style={{ fontSize: '0.78rem', fontWeight: '800', color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Performance KPIs</h2>
                            {loadingStats && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', color: '#F97316' }} />}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '1px', background: '#E5E7EB', border: '1px solid #E5E7EB' }}>
                            {KPI_DEFS.map((kpi, i) => (
                                <KpiCard key={`${kpi.id}-${selectedTeam}-${selectedSdr}-${selectedProfile}`} kpi={kpi} value={stats[kpi.id]} index={i} loading={loadingStats} />
                            ))}
                        </div>
                    </div>

                    {/* ── CHART ───────────────────────────────────────────────── */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                            <div style={{ width: '3px', height: '16px', background: '#F97316' }} />
                            <h2 style={{ fontSize: '0.78rem', fontWeight: '800', color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Prospections — Last 7 days
                            </h2>
                        </div>
                        {loadingStats ? (
                            <div style={{ height: '200px', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#9CA3AF', fontSize: '0.78rem' }}>
                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData} barCategoryGap="35%">
                                    <CartesianGrid vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={28} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F97316', opacity: 0.06 }} />
                                    <Bar dataKey="Prospections" fill="#F97316" radius={[2, 2, 0, 0]} maxBarSize={44} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* ── LEADERBOARD ─────────────────────────────────────────── */}
                    {(!selectedSdr && !selectedProfile) && (
                        <div style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.5rem', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                                <Trophy size={16} color="#F59E0B" />
                                <h2 style={{ fontSize: '0.78rem', fontWeight: '800', color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Leaderboard — Performance Ranking
                                </h2>
                                <div style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#9CA3AF', fontWeight: '600' }}>Ordered by Calls → Prospections</div>
                            </div>

                            {/* Top 3 Podium cards */}
                            {leaderboard.length > 0 && (
                                <div style={{ display: 'flex', gap: '1px', background: '#E5E7EB', borderBottom: '2px solid #E5E7EB' }}>
                                    {leaderboard.slice(0, 3).map((row, i) => {
                                        const podiumColors = ['#FFFBEB', '#F9FAFB', '#FFF7ED']
                                        const borderColors = ['#F59E0B', '#9CA3AF', '#92400E']
                                        return (
                                            <div key={row.id} style={{ flex: 1, background: podiumColors[i] || '#fff', borderTop: `3px solid ${borderColors[i] || '#E5E7EB'}`, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: `kpiIn 0.4s ease-out ${i * 0.1}s both` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <RankIcon rank={i + 1} />
                                                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#111827' }}>{row.name}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                    <div>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#22C55E', lineHeight: 1 }}>{row.calls}</div>
                                                        <div style={{ fontSize: '0.6rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calls</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#F97316', lineHeight: 1 }}>{row.prospeccoes}</div>
                                                        <div style={{ fontSize: '0.6rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prospections</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#F59E0B', lineHeight: 1 }}>{row.taxaResposta}%</div>
                                                        <div style={{ fontSize: '0.6rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reply</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Full table */}
                            {leaderboard.length === 0 && !loadingStats ? (
                                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.8rem' }}>
                                    <Users size={28} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.3 }} />
                                    No ranking records found for this team.
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                        <thead>
                                            <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                                                {['#', 'SDR', 'Prospections', 'Calls', 'Reply Rate'].map((h, i) => (
                                                    <th key={h} style={{ padding: '0.7rem 1rem', textAlign: i <= 1 ? 'left' : 'right', fontSize: '0.62rem', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#6B7280' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaderboard.map((row, i) => (
                                                <tr key={row.id} className="ldr-row" style={{ borderBottom: '1px solid #F3F4F6', background: '#fff', animation: `kpiIn 0.35s ease-out ${i * 0.07}s both` }}>
                                                    <td style={{ padding: '0.8rem 1rem', width: '48px' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px' }}>
                                                            <RankIcon rank={i + 1} />
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.8rem 1rem', fontWeight: '700', color: '#111827' }}>
                                                        {row.name}
                                                        {i === 0 && <span style={{ marginLeft: '0.5rem', fontSize: '0.58rem', fontWeight: '800', background: '#F59E0B', color: '#fff', padding: '0.1rem 0.4rem' }}>TOP</span>}
                                                    </td>
                                                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: '700', color: '#F97316' }}>{row.prospeccoes}</td>
                                                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: '700', color: '#22C55E' }}>{row.calls}</td>
                                                    <td style={{ padding: '0.8rem 1rem', textAlign: 'right', color: '#374151' }}>{row.taxaResposta}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default TeamDashboard
