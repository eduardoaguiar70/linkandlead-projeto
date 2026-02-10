import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext'; // Import Auth
import { Pencil, Upload, FileText, X, Check, Link as LinkIcon, Info, AlertTriangle, Linkedin } from 'lucide-react';

const N8N_UPLOAD_DOC_URL = 'https://n8n-n8n-start.kfocge.easypanel.host/webhook/upload-client-doc'

export default function ClientsPage() {
    const { user } = useAuth(); // Hook Auth
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [toast, setToast] = useState(null); // { message, type }

    // ... (rest of local state) ...
    // Note: I am NOT changing the lines between 14-27, just re-stating them if needed for context but 'replace_file_content' replaces the block.
    // To minimize context, I will target specific blocks if possible, but multiple edits are needed.
    // Better to use a single large block or multiple chunks?
    // I will use multiple chunks with multi_replace_file_content logic simulated via single call if continuous, or just use replace_file_content for the whole file? No, too large.
    // I will use replace_file_content for the imports and state first.
    // Wait, I can't do multiple disparate chunks with replace_file_content.
    // I should use `multi_replace_file_content` if available? 
    // Checking tools... `multi_replace_file_content` IS available. 
    // I will use `default_api:multi_replace_file_content`.
    // Wait, the user prompt showed `default_api:replace_file_content` and `default_api:multi_replace_file_content` descriptors.
    // Yes, I have `multi_replace_file_content`.

    // Proceeding with `multi_replace_file_content`.

    // Chunk 1: Imports
    // Chunk 2: Toast State
    // Chunk 3: handleCopyLink function
    // Chunk 4: Button in Table
    // Chunk 5: Toast UI render


    // ... (rest of local state) ...

    // File Upload State
    const [filesToUpload, setFilesToUpload] = useState([]);
    const [existingFiles, setExistingFiles] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        tone_of_voice: 'Profissional',
        target_audience_default: '',
        pain_points: '',
        unipile_account_id: ''
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

    async function fetchClientFiles(clientId) {
        try {
            const { data, error } = await supabase
                .from('client_knowledge')
                .select('*')
                .eq('client_id', clientId);

            if (error) throw error;
            setExistingFiles(data || []);
        } catch (error) {
            console.error('Erro ao buscar arquivos do cliente:', error);
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFilesToUpload(prev => [...prev, ...newFiles]);
        }
    };

    const removeFileToUpload = (index) => {
        setFilesToUpload(prev => prev.filter((_, i) => i !== index));
    };

    const handleEdit = (client) => {
        setEditingClient(client);
        setFormData({
            name: client.name || '',
            description: client.description || '',
            tone_of_voice: client.tone_of_voice || 'Profissional',
            target_audience_default: client.target_audience_default || '',
            pain_points: client.pain_points || '',
            unipile_account_id: client.unipile_account_id || ''
        });
        setFilesToUpload([]);
        setExistingFiles([]);
        fetchClientFiles(client.id);
        setShowModal(true);
    };

    const handleNew = () => {
        setEditingClient(null);
        setFormData({
            name: '',
            description: '',
            tone_of_voice: 'Profissional',
            target_audience_default: '',
            pain_points: '',
            unipile_account_id: ''
        });
        setFilesToUpload([]);
        setExistingFiles([]);
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

    const handleCopyLink = (client) => {
        if (!client.access_token) {
            alert("Este cliente não possui um token de acesso.");
            return;
        }
        const link = `${window.location.origin}/portal/${client.access_token}`;
        navigator.clipboard.writeText(link);

        setToast({ message: "Link de acesso copiado!", type: "success" });
        setTimeout(() => setToast(null), 3000);
    };

    const sanitizeFileName = (originalName) => {
        return originalName.replace(/[^a-zA-Z0-9.]/g, '_');
    };

    const uploadFiles = async (clientId) => {
        if (!filesToUpload || filesToUpload.length === 0) return;

        console.log(`[DEBUG] uploadFiles chamado com clientID: ${clientId} (Tipo: ${typeof clientId})`);

        for (const file of filesToUpload) {
            if (!file) continue;

            console.log(`[DEBUG] Preparando envio de ${file.name} para webhook`);

            // Create FormData with file and clientId
            const formData = new FormData();
            formData.append('file', file);
            formData.append('clientId', clientId);

            console.log(`[DEBUG] Enviando para webhook: ${N8N_UPLOAD_DOC_URL}`);

            try {
                const response = await fetch(N8N_UPLOAD_DOC_URL, {
                    method: 'POST',
                    body: formData
                    // Note: Do NOT set Content-Type header - browser will set it automatically with boundary
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Webhook retornou erro ${response.status}: ${errorText}`);
                }

                const result = await response.json();
                console.log(`[DEBUG] Upload de ${file.name} concluído:`, result);

            } catch (error) {
                console.error(`[DEBUG] Erro ao enviar ${file.name} para webhook:`, error);
                throw new Error(`Falha no upload de "${file.name}": ${error.message}`);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); // 1. Prevent Default
        console.log("1. Iniciou handleSave");
        setSaving(true);

        try {
            console.log("2. User ID:", user?.id);

            // PAYLOAD CONSTRUCTION & LOGGING
            let payload = {};
            try {
                payload = {
                    name: formData.name,
                    description: formData.description,
                    tone_of_voice: formData.tone_of_voice,
                    target_audience_default: formData.target_audience_default,
                    pain_points: formData.pain_points,
                    unipile_account_id: formData.unipile_account_id
                    // Add other fields here if needed
                };
                console.log("3. Payload montado:", payload);
            } catch (payloadError) {
                throw new Error("Erro ao montar o payload: " + payloadError.message);
            }

            // --- EXECUTE SUPABASE CALLS AFTER PAYLOAD IS READY ---
            let clientData = null;
            let realClientId = null;

            if (editingClient) {
                console.log("[DEBUG] Atualizando cliente existente...", editingClient.id);
                const { data, error } = await supabase
                    .from('clients')
                    .update(payload) // Use the constructed payload
                    .eq('id', editingClient.id)
                    .select()
                    .single();

                if (error) throw error;
                clientData = data;
            } else {
                console.log("[DEBUG] Criando novo cliente...");
                const { data, error } = await supabase
                    .from('clients')
                    .insert([payload]) // Use the constructed payload
                    .select()
                    .single();

                if (error) throw error;
                clientData = data;
            }

            // SAFETY CHECKS
            if (!clientData) throw new Error("Erro crítico: Dados do cliente não retornaram do banco.");
            realClientId = clientData.id;
            console.log("[DEBUG] ID Numérico capturado:", realClientId);
            if (!realClientId) throw new Error("Erro crítico: ID do cliente é inválido.");

            // UPLOAD
            if (filesToUpload.length > 0) {
                console.log(`[DEBUG] Iniciando uploads para ID: ${realClientId}`);
                await uploadFiles(realClientId);
            }

            // SUCCESS
            alert(editingClient ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
            setShowModal(false);
            fetchClients();

        } catch (error) {
            console.error("ERRO CRÍTICO NO SALVAMENTO:", error);
            alert("Erro: " + (error.message || "Erro desconhecido"));
        } finally {
            console.log("[DEBUG] Finalizando processo (finally).");
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
                                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', width: '120px' }}>Conexão</th>
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
                                        <td style={{ padding: '1rem' }}>
                                            {client.unipile_account_id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0077b5', fontSize: '0.8rem', fontWeight: '600' }}>
                                                    <Linkedin size={16} /> OK
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9ca3af', fontSize: '0.8rem' }} title="Pendente Unipile ID">
                                                    <AlertTriangle size={16} /> Pendente
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleCopyLink(client)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#16a34a', // Green
                                                    padding: '0.25rem',
                                                    marginRight: '0.5rem'
                                                }}
                                                title="Copiar Link de Acesso"
                                            >
                                                <LinkIcon size={18} />
                                            </button>
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

            {/* TOAST */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    background: toast.type === 'error' ? '#ef4444' : '#22c55e',
                    color: 'white',
                    padding: '1rem 1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 100,
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <Check size={18} />
                    <span style={{ fontWeight: 600 }}>{toast.message}</span>
                </div>
            )}

            {/* MODAL */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50
                }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0 }}>
                                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    padding: '4px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* Unipile ID Section - Priority */}
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '1rem' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <Info style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} size={20} />
                                    <div>
                                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#1e40af' }}>Integração LinkedIn (Obrigatório)</h4>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#1e3a8a', lineHeight: '1.4' }}>
                                            ⚠️ Importante: Para obter este ID, você deve primeiro conectar o perfil do LinkedIn deste cliente manualmente através do Dashboard da Unipile. Copie o <strong>'Account ID'</strong> gerado lá e cole abaixo.
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#1e3a8a' }}>
                                        ID da Conta Unipile (LinkedIn)
                                    </label>
                                    <input
                                        name="unipile_account_id"
                                        value={formData.unipile_account_id}
                                        onChange={handleInputChange}
                                        placeholder="Ex: f7NRx9..."
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #93c5fd', borderRadius: '4px', fontFamily: 'monospace', color: '#1f2937' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nome da Empresa</label>
                                <input
                                    required
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', color: '#1f2937' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Descrição do Negócio</label>
                                <textarea
                                    required
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', color: '#1f2937' }}
                                    rows="3"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tom de Voz</label>
                                <select
                                    name="tone_of_voice"
                                    value={formData.tone_of_voice}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', color: '#1f2937' }}
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
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', color: '#1f2937' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Dores e Problemas</label>
                                <textarea
                                    name="pain_points"
                                    value={formData.pain_points}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', color: '#1f2937' }}
                                    rows="3"
                                />
                            </div>

                            {/* DOCUMENT UPLOAD SECTION */}
                            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
                                    Arquivos de Contexto (PDF, DOC)
                                </label>

                                <div style={{
                                    border: '1px dashed #d1d5db',
                                    borderRadius: '0.25rem',
                                    padding: '1rem',
                                    textAlign: 'center',
                                    marginBottom: '1rem',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileChange}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            opacity: 0,
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#6b7280' }}>
                                        <Upload size={24} />
                                        <span style={{ fontSize: '0.875rem' }}>Clique ou arraste arquivos aqui</span>
                                    </div>
                                </div>

                                {/* LISTA DE ARQUIVOS PENDENTES */}
                                {filesToUpload.length > 0 && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '0.25rem' }}>Prontos para enviar:</p>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {filesToUpload.map((file, idx) => (
                                                <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem', background: '#f9fafb', padding: '0.25rem 0.5rem', marginBottom: '0.25rem', borderRadius: '0.25rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                                        <FileText size={14} color="#4b5563" />
                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFileToUpload(idx)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0 }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* LISTA DE ARQUIVOS JÁ EXISTENTES */}
                                {existingFiles.length > 0 && (
                                    <div>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '0.25rem' }}>Arquivos Anteriores:</p>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {existingFiles.map((file) => (
                                                <li key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#059669', marginBottom: '0.25rem' }}>
                                                    <Check size={14} />
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.file_name}</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>- Enviado</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
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
