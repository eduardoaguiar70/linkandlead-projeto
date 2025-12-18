import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

const ClientAuthContext = createContext({})

export const useClientAuth = () => useContext(ClientAuthContext)

export const ClientAuthProvider = ({ children }) => {
    const [clientUser, setClientUser] = useState(null)
    const [clientId, setClientId] = useState(null) // UUID
    const [clientLegacyId, setClientLegacyId] = useState(null) // Integer ID (Legacy)
    const [clientName, setClientName] = useState('')
    const [isTokenAuth, setIsTokenAuth] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        const fetchClientData = async (user) => {
            try {
                // 1. LOGIN (UUID) -> PERFIL
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('id, client_id, role, nome_empresa') // Added nome_empresa and id
                    .eq('id', user.id)
                    .single()

                if (error) throw error

                if (profile.role !== 'client') {
                    console.warn('User found but role is not client:', profile.role)
                    setClientUser(null)
                    setClientId(null)
                    setClientLegacyId(null)
                    setClientName('')
                } else {
                    console.log(`Client Auth Success: User ${user.id} (UUID)`)
                    setClientUser(user)
                    setClientId(profile.id) // UUID PRIMARY
                    setClientLegacyId(profile.client_id) // Integer Legacy
                    setClientName(profile.nome_empresa || '')
                }
            } catch (err) {
                console.error('Error fetching client profile:', err)
                setClientUser(null)
                setClientId(null)
                setClientLegacyId(null)
                setClientName('')
            } finally {
                if (mounted) setLoading(false)
            }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (isTokenAuth) return // Don't override if manually logged in via token

            if (session?.user) {
                fetchClientData(session.user)
            } else {
                setClientUser(null)
                setClientId(null)
                setClientLegacyId(null)
                setClientName('')
                setLoading(false)
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [isTokenAuth]) // Re-run if token auth state changes (though mainly to re-bind listener logic)

    const loginWithToken = async (token) => {
        setLoading(true)
        try {
            // Check 'clients' table for access_token
            const { data: client, error } = await supabase
                .from('clients')
                .select('*')
                .eq('access_token', token)
                .single()

            if (error || !client) {
                throw new Error('Token inválido ou expirado.')
            }

            // Set global state "as if" logged in
            // Mocking a clientUser object to satisfy existence checks
            setClientUser({ id: 'token_user', email: 'token_access', role: 'client' })

            // Use client.id directly. 
            // Note: If 'tabela_projetofred1' uses UUID from profiles, this might miss-match unless client.id IS the UUID.
            // Assuming client.id is the correct identifier for posts in this context.
            setClientId(client.id)
            setClientLegacyId(client.id) // Assuming same ID or fallback
            // FIX: User confirmed 'clients' table uses 'name' column.
            setClientName(client.name || client.nome_empresa)
            setIsTokenAuth(true)

            return true
        } catch (err) {
            console.error(err)
            return false
        } finally {
            setLoading(false)
        }
    }

    const signOut = async () => {
        if (isTokenAuth) {
            setIsTokenAuth(false)
            setClientUser(null)
            setClientId(null)
            setClientLegacyId(null)
            setClientName('')
        } else {
            await supabase.auth.signOut()
            setClientUser(null)
            setClientId(null)
            setClientLegacyId(null)
            setClientName('')
        }
    }

    return (
        <ClientAuthContext.Provider value={{ clientUser, clientId, clientLegacyId, clientName, loading, signOut, isTokenAuth, loginWithToken }}>
            {children}
        </ClientAuthContext.Provider>
    )
}
