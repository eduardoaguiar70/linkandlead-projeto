import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from './AuthContext'

const TeamMemberContext = createContext({ teamRole: null, teamId: null, isTeamAdmin: false, loading: true })

export const useTeamMember = () => useContext(TeamMemberContext)

export const TeamMemberProvider = ({ children }) => {
    const { user } = useAuth()
    const [teamRole, setTeamRole] = useState(null)
    const [teamId, setTeamId] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) {
            setTeamRole(null)
            setTeamId(null)
            setLoading(false)
            return
        }

        const fetchTeamMembership = async () => {
            try {
                // Use maybeSingle() instead of single() so it never throws on 0 rows
                const { data, error } = await supabase
                    .from('team_members')
                    .select('role, team_id')
                    .eq('user_id', user.id)
                    .eq('role', 'team_admin')   // Only care about admin rows
                    .maybeSingle()

                if (error) {
                    console.error('[TeamMemberContext] DB error:', error.message)
                    setTeamRole(null)
                    setTeamId(null)
                } else {
                    console.log('[TeamMemberContext] ROLE RECUPERADA DO BANCO:', data?.role ?? 'null — nenhuma linha team_admin encontrada')
                    setTeamRole(data?.role ?? null)
                    setTeamId(data?.team_id ?? null)
                }
            } catch (err) {
                console.error('[TeamMemberContext] Exceção inesperada:', err)
                setTeamRole(null)
                setTeamId(null)
            } finally {
                setLoading(false)
            }
        }

        fetchTeamMembership()
    }, [user])

    return (
        <TeamMemberContext.Provider value={{
            teamRole,
            teamId,
            isTeamAdmin: teamRole === 'team_admin',
            loading
        }}>
            {children}
        </TeamMemberContext.Provider>
    )
}
