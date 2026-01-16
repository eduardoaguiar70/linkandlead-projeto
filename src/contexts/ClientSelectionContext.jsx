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
        setSelectedClientId: setClient
    }

    return (
        <ClientSelectionContext.Provider value={value}>
            {children}
        </ClientSelectionContext.Provider>
    )
}
