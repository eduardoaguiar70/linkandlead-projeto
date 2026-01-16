import React, { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useClientSelection } from '../contexts/ClientSelectionContext'
import { Users, ChevronDown } from 'lucide-react'

const ClientSelector = () => {
    const [clients, setClients] = useState([])
    const { selectedClientId, setSelectedClientId } = useClientSelection()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, name')
                    .order('name', { ascending: true })

                if (error) throw error
                setClients(data || [])
            } catch (err) {
                console.error('Error fetching clients for selector:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchClients()
    }, [])

    const handleChange = (e) => {
        const val = e.target.value
        setSelectedClientId(val ? parseInt(val) : null) // Assuming ID is int, or string if UUID
    }

    // Heuristics to find the display name
    const getClientName = (c) => c.name || 'Cliente sem nome'

    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: '10px', pointerEvents: 'none', color: '#64748b' }}>
                <Users size={16} />
            </div>
            <select
                value={selectedClientId || ''}
                onChange={handleChange}
                style={{
                    padding: '0.5rem 2rem 0.5rem 2.25rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    color: '#334155',
                    cursor: 'pointer',
                    appearance: 'none',
                    minWidth: '200px'
                }}
                disabled={loading}
            >
                <option value="">Selecione um Cliente...</option>
                {clients.map(client => (
                    <option key={client.id} value={client.id}>
                        {getClientName(client)}
                    </option>
                ))}
            </select>
            <div style={{ position: 'absolute', right: '10px', pointerEvents: 'none', color: '#64748b' }}>
                <ChevronDown size={14} />
            </div>
        </div>
    )
}

export default ClientSelector
