import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

const ClientAuthContext = createContext({})

export const useClientAuth = () => useContext(ClientAuthContext)

export const ClientAuthProvider = ({ children }) => {
    const [clientUser, setClientUser] = useState(null)
    const [clientId, setClientId] = useState(null) // UUID
    const [clientLegacyId, setClientLegacyId] = useState(null) // Integer ID (Legacy)
    const [clientName, setClientName] = useState('')
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
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
        setClientUser(null)
        setClientId(null)
        setClientLegacyId(null)
        setClientName('')
    }

    return (
        <ClientAuthContext.Provider value={{ clientUser, clientId, clientLegacyId, clientName, loading, signOut }}>
            {children}
        </ClientAuthContext.Provider>
    )
}
