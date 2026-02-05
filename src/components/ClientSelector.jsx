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
        setSelectedClientId(val ? parseInt(val) : null)
    }

    const getClientName = (c) => c.name || 'Cliente sem nome'

    return (
        <div className="relative flex items-center group">
            <div className="absolute left-3 pointer-events-none text-primary/80 group-hover:text-primary transition-colors">
                <Users size={16} />
            </div>
            <select
                value={selectedClientId || ''}
                onChange={handleChange}
                disabled={loading}
                className="appearance-none bg-white/5 border border-glass-border hover:border-primary/50 text-gray-200 text-sm font-medium rounded-lg pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer min-w-[200px] backdrop-blur-md"
            >
                <option value="" className="bg-charcoal text-gray-400">Selecione um Cliente...</option>
                {clients.map(client => (
                    <option key={client.id} value={client.id} className="bg-charcoal text-white">
                        {getClientName(client)}
                    </option>
                ))}
            </select>
            <div className="absolute right-3 pointer-events-none text-gray-500 group-hover:text-white transition-colors">
                <ChevronDown size={14} />
            </div>
        </div>
    )
}

export default ClientSelector
