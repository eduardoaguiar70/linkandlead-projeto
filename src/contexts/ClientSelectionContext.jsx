import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../services/supabaseClient'

const ClientSelectionContext = createContext()

export const useClientSelection = () => {
    return useContext(ClientSelectionContext)
}

// localStorage key is scoped per user so different accounts never share state
const storageKey = (userId) => `selectedClientId_${userId}`

// One-time migration: remove the old unscoped key to prevent cross-user leaks
if (localStorage.getItem('selectedClientId')) {
    console.log('[Security] Removing legacy unscoped selectedClientId from localStorage')
    localStorage.removeItem('selectedClientId')
}

export const ClientSelectionProvider = ({ children }) => {
    const { user } = useAuth()
    const [selectedClientId, setSelectedClientId] = useState(null)
    const [validating, setValidating] = useState(true) // guard: block queries until ownership confirmed
    const [activeLeadId, setActiveLeadId] = useState(null)

    // Whenever the authenticated user changes, re-validate the stored selection
    useEffect(() => {
        const validateSelection = async () => {
            setValidating(true)

            if (!user) {
                // No user — clear everything
                setSelectedClientId(null)
                setValidating(false)
                return
            }

            // Read the selection scoped to THIS user's ID
            const key = storageKey(user.id)
            const saved = localStorage.getItem(key)
            const savedId = saved ? JSON.parse(saved) : null

            if (!savedId) {
                setSelectedClientId(null)
                setValidating(false)
                return
            }

            // Confirm the client actually belongs to this user
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('id', savedId)
                    .eq('user_id', user.id)
                    .single()

                if (error || !data) {
                    console.warn('[Security] Stored client does not belong to current user. Clearing.')
                    localStorage.removeItem(key)
                    setSelectedClientId(null)
                } else {
                    setSelectedClientId(savedId)
                }
            } catch {
                localStorage.removeItem(key)
                setSelectedClientId(null)
            } finally {
                setValidating(false)
            }
        }

        validateSelection()
    }, [user])

    const setClient = (clientId) => {
        if (!user) return
        const key = storageKey(user.id)
        setSelectedClientId(clientId)
        if (clientId) {
            localStorage.setItem(key, JSON.stringify(clientId))
        } else {
            localStorage.removeItem(key)
        }
    }

    const value = {
        // Expose null while validating so pages don't fire queries with stale data
        selectedClientId: validating ? null : selectedClientId,
        setSelectedClientId: setClient,
        activeLeadId,
        setActiveLeadId,
        isValidatingClient: validating,
    }

    return (
        <ClientSelectionContext.Provider value={value}>
            {children}
        </ClientSelectionContext.Provider>
    )
}
