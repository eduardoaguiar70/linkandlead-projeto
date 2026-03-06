import React, { createContext, useContext, useState, useEffect } from 'react'

const ClientSelectionContext = createContext()

export const useClientSelection = () => {
    return useContext(ClientSelectionContext)
}

export const ClientSelectionProvider = ({ children }) => {
    const [selectedClientId, setSelectedClientId] = useState(() => {
        // Persist selection
        const saved = localStorage.getItem('selectedClientId')
        return saved ? JSON.parse(saved) : null
    })

    // Track which lead is currently open in the Inbox (used by notification system)
    const [activeLeadId, setActiveLeadId] = useState(null)

    const setClient = (clientId) => {
        setSelectedClientId(clientId)
        if (clientId) {
            localStorage.setItem('selectedClientId', JSON.stringify(clientId))
        } else {
            localStorage.removeItem('selectedClientId')
        }
    }

    const value = {
        selectedClientId,
        setSelectedClientId: setClient,
        activeLeadId,
        setActiveLeadId
    }

    return (
        <ClientSelectionContext.Provider value={value}>
            {children}
        </ClientSelectionContext.Provider>
    )
}
