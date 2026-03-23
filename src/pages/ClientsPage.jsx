import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext'; // Import Auth
import { Pencil, Upload, FileText, X, Check, Link as LinkIcon, Info, AlertTriangle, Linkedin, Download } from 'lucide-react';



export default function ClientsPage() {
    const { user, profile } = useAuth(); // Hook Auth
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [toast, setToast] = useState(null);

    // File Upload State
    const [filesToUpload, setFilesToUpload] = useState([]);
    const [existingFiles, setExistingFiles] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        email_contato: '',
        description: '',
        tone_of_voice: 'Profissional',
        target_audience_default: '',
        pain_points: '',
        unipile_account_id: '',
        agenda_link: ''
    });

    useEffect(() => {
        fetchClients();
    }, []);

    async function fetchClients() {
        try {
            setLoading(true);
            // SECURITY: Filter by owner unless admin
            let query = supabase.from('clients').select('*');
            
            if (profile?.role !== 'admin') {
                query = query.eq('auth_user_id', user.id);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchClientFiles(clientId) {
        try {
            const { data, error } = await supabase
                .storage
                .from('client-docs')
                .list(`core-docs/${clientId}`, { limit: 50 });

            if (error) throw error;
            const files = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder');
            setExistingFiles(files);
        } catch (error) {
            console.error('Error fetching client files:', error);
            setExistingFiles([]);
        }
    }

    const handleDownloadFile = async (fileName) => {
        if (!editingClient) return;
        const filePath = `core-docs/${editingClient.id}/${fileName}`;
        const { data, error } = await supabase
            .storage
            .from('client-docs')
            .createSignedUrl(filePath, 60);

        if (error) {
            console.error('Error generating download link:', error);
            alert('Error downloading file.');
            return;
        }
        window.open(data.signedUrl, '_blank');
    };

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
            email_contato: client.email_contato || '',
            description: client.description || '',
            tone_of_voice: client.tone_of_voice || 'Profissional',
            target_audience_default: client.target_audience_default || '',
            pain_points: client.pain_points || '',
            unipile_account_id: client.unipile_account_id || '',
            agenda_link: client.agenda_link || ''
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
            email_contato: '',
            description: '',
            tone_of_voice: 'Profissional',
            target_audience_default: '',
            pain_points: '',
            unipile_account_id: '',
            agenda_link: ''
        });
        setFilesToUpload([]);
        setExistingFiles([]);
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!editingClient || !window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', editingClient.id);

            if (error) throw error;

            setShowModal(false);
            fetchClients();
            alert('Client successfully deleted!');
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error deleting: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCopyLink = (client) => {
        if (!client.access_token) {
            alert("This client does not have an access token.");
            return;
        }
        const link = `${window.location.origin}/portal/${client.access_token}`;
        navigator.clipboard.writeText(link);

        setToast({ message: "Access link copied!", type: "success" });
        setTimeout(() => setToast(null), 3000);
    };

    const sanitizeFileName = (originalName) => {
        return originalName.replace(/[^a-zA-Z0-9.]/g, '_');
    };

    const uploadFiles = async (clientId) => {
        if (!filesToUpload || filesToUpload.length === 0) return null;

        const file = filesToUpload[0];
        if (!file) return null;

        const safeName = sanitizeFileName(file.name);
        const filePath = `core-docs/${clientId}/${safeName}`;

        console.log(`[DEBUG] Uploading ${file.name} to Supabase Storage: ${filePath}`);

        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('client-docs')
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            console.error('[DEBUG] Upload error:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log('[DEBUG] Upload complete:', uploadData);
        return uploadData.path;
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); // 1. Prevent Default
        setSaving(true);

        try {

            // PAYLOAD CONSTRUCTION & LOGGING
            const payload = {
                name: formData.name,
                email_contato: formData.email_contato,
                description: formData.description,
                tone_of_voice: formData.tone_of_voice,
                target_audience_default: formData.target_audience_default,
                pain_points: formData.pain_points,
                unipile_account_id: formData.unipile_account_id,
                agenda_link: formData.agenda_link,
                auth_user_id: user.id // SECURITY: Associate client with the creator
            };

            // --- EXECUTE SUPABASE CALLS AFTER PAYLOAD IS READY ---
            let clientData = null;
            let realClientId = null;

            if (editingClient) {
                const { data, error } = await supabase
                    .from('clients')
                    .update(payload) // Use the constructed payload
                    .eq('id', editingClient.id)
                    .select()
                    .single();

                if (error) throw error;
                clientData = data;
            } else {
                const { data, error } = await supabase
                    .from('clients')
                    .insert([payload]) // Use the constructed payload
                    .select()
                    .single();

                if (error) throw error;
                clientData = data;
            }

            // SAFETY CHECKS
            if (!clientData) throw new Error("Critical error: Client data did not return from database.");
            realClientId = clientData.id;
            console.log("[DEBUG] Captured numeric ID:", realClientId);
            if (!realClientId) throw new Error("Critical error: Client ID is invalid.");

            // UPLOAD + UPDATE core_doc_id
            if (filesToUpload.length > 0) {
                console.log(`[DEBUG] Starting upload for ID: ${realClientId}`);
                const docPath = await uploadFiles(realClientId);
                if (docPath) {
                    const { error: updateError } = await supabase
                        .from('clients')
                        .update({ core_doc_id: docPath })
                        .eq('id', realClientId);
                    if (updateError) {
                        console.error('[DEBUG] Error updating core_doc_id:', updateError);
                    } else {
                        console.log('[DEBUG] core_doc_id updated:', docPath);
                    }
                }
            }

            // SUCCESS
            alert(editingClient ? 'Client successfully updated!' : 'Client successfully registered!');
            setShowModal(false);
            fetchClients();

        } catch (error) {
            console.error("CRITICAL ERROR SAVING:", error);
            alert("Error: " + (error.message || "Unknown error"));
        } finally {
            console.log("[DEBUG] Finalizing process (finally).");
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>Manage Clients</h1>
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
                    + New Client
                </button>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div style={{ background: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <tr>
                                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563' }}>Company</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563' }}>Description</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563' }}>Tone of Voice</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', width: '120px' }}>Connection</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: '#4b5563', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                        No clients registered.
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9ca3af', fontSize: '0.8rem' }} title="Pending Unipile ID">
                                                    <AlertTriangle size={16} /> Pending
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
                                                title="Copy Access Link"
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
                                                title="Edit / View Details"
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
                                {editingClient ? 'Edit Client' : 'New Client'}
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
                                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#1e40af' }}>LinkedIn Integration (Required)</h4>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#1e3a8a', lineHeight: '1.4' }}>
                                            ⚠️ Important: To get this ID, you must first manually connect this client's LinkedIn profile through the Unipile Dashboard. Copy the <strong>'Account ID'</strong> generated there and paste it below.
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#1e3a8a' }}>
                                        Unipile Account ID (LinkedIn)
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
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Company Name</label>
                                <input
                                    required
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', color: '#1f2937' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Contact Email</label>
                                <input
                                    type="email"
                                    name="email_contato"
                                    value={formData.email_contato}
                                    onChange={handleInputChange}
                                    placeholder="email@empresa.com"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', color: '#1f2937' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Business Description</label>
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
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tone of Voice</label>
                                <select
                                    name="tone_of_voice"
                                    value={formData.tone_of_voice}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', color: '#1f2937' }}
                                >
                                    <option>Professional</option>
                                    <option>Casual</option>
                                    <option>Authoritative</option>
                                    <option>Educational</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Target Audience (Default)</label>
                                <input
                                    name="target_audience_default"
                                    value={formData.target_audience_default}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', color: '#1f2937' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Pain Points</label>
                                <textarea
                                    name="pain_points"
                                    value={formData.pain_points}
                                    onChange={handleInputChange}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', color: '#1f2937' }}
                                    rows="3"
                                />
                            </div>

                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#166534' }}>
                                    Link da Agenda (Calendly, etc)
                                </label>
                                <input
                                    name="agenda_link"
                                    value={formData.agenda_link}
                                    onChange={handleInputChange}
                                    placeholder="Ex: https://calendly.com/sua-agenda"
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #86efac', borderRadius: '4px', color: '#1f2937' }}
                                />
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#15803d' }}>
                                    💡 A IA usará este link automaticamente para sugerir reuniões no estágio G5.
                                </p>
                            </div>

                            {/* DOCUMENT UPLOAD SECTION */}
                            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
                                    Context Files (PDF, DOC)
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
                                        <span style={{ fontSize: '0.875rem' }}>Click or drag files here</span>
                                    </div>
                                </div>

                                {/* LISTA DE ARQUIVOS PENDENTES */}
                                {filesToUpload.length > 0 && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '0.25rem' }}>Ready to upload:</p>
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

                                {/* LISTA DE ARQUIVOS JÁ EXISTENTES (Storage) */}
                                {existingFiles.length > 0 && (
                                    <div>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '0.25rem' }}>Previous Files:</p>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {existingFiles.map((file) => (
                                                <li
                                                    key={file.id || file.name}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem', color: '#059669', marginBottom: '0.25rem', background: '#f0fdf4', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                                        <Check size={14} />
                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadFile(file.name)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                        title="Download file"
                                                    >
                                                        <Download size={14} />
                                                    </button>
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
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{ flex: 1, padding: '0.5rem', background: '#ea580c', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                >
                                    {saving ? 'Saving...' : (editingClient ? 'Save Changes' : 'Save Client')}
                                </button>
                            </div>

                            {editingClient && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={saving}
                                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: '500' }}
                                >
                                    Delete Client
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
