import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Pencil } from 'lucide-react';

export default function ClientsPage() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingClient, setEditingClient] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        tone_of_voice: 'Profissional',
        target_audience_default: '',
        pain_points: ''
    });

    useEffect(() => {
        fetchClients();
    }, []);

    async function fetchClients() {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEdit = (client) => {
        setEditingClient(client);
        setFormData({
            name: client.name || '',
            description: client.description || '',
            tone_of_voice: client.tone_of_voice || 'Profissional',
            target_audience_default: client.target_audience_default || '',
            pain_points: client.pain_points || ''
        });
        setShowModal(true);
    };

    const handleNew = () => {
        setEditingClient(null);
        setFormData({
            name: '',
            description: '',
            tone_of_voice: 'Profissional',
            target_audience_default: '',
            pain_points: ''
        });
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!editingClient || !window.confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', editingClient.id);

            if (error) throw error;

            setShowModal(false);
            fetchClients();
            alert('Cliente excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert('Erro ao excluir: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingClient) {
                // UPDATE
                const { error } = await supabase
                    .from('clients')
                    .update(formData)
                    .eq('id', editingClient.id);
                if (error) throw error;
                alert('Cliente atualizado com sucesso!');
            } else {
                // CREATE
                const { error } = await supabase
                    .from('clients')
                    .insert([formData]);
                if (error) throw error;
                alert('Cliente cadastrado com sucesso!');
            }

            setShowModal(false);
            fetchClients();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar cliente: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>Gerenciar Clientes</h1>
                <button
                    onClick={handleNew}
                    style={{
                        backgroundColor: '#ea580c',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.25rem',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    + Novo Cliente
                </button>
            </div>

            {loading ? (
                <p>Carregando...</p>
            ) : (
                <div style={{ background: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <tr>
                                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563' }}>Empresa</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563' }}>Descrição</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563' }}>Tom de Voz</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                        Nenhum cliente cadastrado.
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client) => (
                                    <tr key={client.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '1rem', fontWeight: '500' }}>{client.name}</td>
                                        <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem', maxWidth: '20rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {client.description}
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{client.tone_of_voice}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleEdit(client)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#2563eb',
                                                    padding: '0.25rem'
                                                }}
                                                title="Editar / Ver Detalhes"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50
                }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>
                            {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                        </h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nome da Empresa</label>
                                <input
                                    required
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Descrição do Negócio</label>
                                <textarea
                                    required
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                                    rows="3"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tom de Voz</label>
                                <select
                                    name="tone_of_voice"
                                    value={formData.tone_of_voice}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                                >
                                    <option>Profissional</option>
                                    <option>Descontraído</option>
                                    <option>Autoritário</option>
                                    <option>Educativo</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Público Alvo (Padrão)</label>
                                <input
                                    name="target_audience_default"
                                    value={formData.target_audience_default}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Dores e Problemas</label>
                                <textarea
                                    name="pain_points"
                                    value={formData.pain_points}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem' }}
                                    rows="3"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{ flex: 1, padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{ flex: 1, padding: '0.5rem', background: '#ea580c', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                >
                                    {saving ? 'Salvando...' : (editingClient ? 'Salvar Alterações' : 'Salvar Cliente')}
                                </button>
                            </div>

                            {editingClient && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={saving}
                                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: '500' }}
                                >
                                    Excluir Cliente
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
