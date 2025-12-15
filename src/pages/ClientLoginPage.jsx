import React, { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Loader2, Lock } from 'lucide-react'

const ClientLoginPage = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (signInError) throw signInError

            // Check if user is actually a client
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single()

            if (profileError) throw profileError

            if (profile.role !== 'client') {
                await supabase.auth.signOut()
                throw new Error('Acesso não autorizado. Apenas clientes podem acessar esta área.')
            }

            // Success redirect
            navigate('/portal/insights')

        } catch (err) {
            console.error(err)
            setError(err.message || 'Falha no login')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(to bottom, #f3f4f6, #ffffff)', // bg-gray-100 to white
            fontFamily: "'Inter', sans-serif",
            padding: '1rem'
        }}>

            {/* --- LOGO (OUTSIDE CARD) --- */}
            <img
                src="/logo-linklead.png"
                alt="Link&Lead Logo"
                style={{
                    height: '64px', // h-16
                    width: 'auto',
                    marginBottom: '2rem', // mb-8
                    display: 'block'
                }}
            />

            {/* --- MAIN CARD --- */}
            <div style={{
                background: '#ffffff',
                width: '100%',
                maxWidth: '480px', // max-w-md (approx)
                borderRadius: '16px', // rounded-2xl
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', // shadow-xl
                padding: '3rem', // p-10/12
                boxSizing: 'border-box'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{
                        fontSize: '1.875rem', // text-3xl
                        fontWeight: 700,
                        color: '#111827', // text-gray-900
                        marginBottom: '0.5rem'
                    }}>
                        Bem-vindo de volta
                    </h1>
                    <p style={{
                        color: '#4b5563', // text-gray-600
                        fontSize: '0.95rem'
                    }}>
                        Acesse o Portal do Cliente Link&Lead
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fee2e2',
                        color: '#ef4444',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#374151', // text-gray-700
                            marginBottom: '0.5rem'
                        }}>
                            Email Corporativo
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="clean-input"
                            placeholder="seu@empresa.com"
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#374151',
                            marginBottom: '0.5rem'
                        }}>
                            Senha
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="clean-input"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="clean-button"
                    >
                        {loading && <Loader2 className="spinner" size={20} />}
                        {loading ? 'Validando...' : 'Entrar na Plataforma'}
                    </button>
                </form>
            </div>

            <style>{`
                .clean-input {
                    display: block;
                    width: 100%;
                    padding: 0.875rem 1rem; /* py-3.5 */
                    background-color: #f9fafb; /* bg-gray-50 */
                    border: 1px solid #d1d5db; /* border-gray-300 */
                    border-radius: 8px;
                    color: #111827; /* text-gray-900 */
                    font-size: 1rem;
                    line-height: 1.5;
                    outline: none;
                    transition: all 0.2s ease-in-out;
                }
                .clean-input:focus {
                    background-color: #ffffff;
                    border-color: #f97316; /* orange-500 */
                    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.15); /* ring-orange-500/15 */
                }
                .clean-input::placeholder {
                    color: #9ca3af; /* text-gray-400 */
                }

                .clean-button {
                    width: 100%;
                    padding: 0.875rem;
                    background: linear-gradient(to right, #ea580c, #fb923c); /* brand gradient */
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 1.125rem; /* text-lg */
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.4);
                }
                .clean-button:hover:not(:disabled) {
                    filter: brightness(1.05); /* slightly lighter */
                    transform: translateY(-1px);
                    box-shadow: 0 10px 15px -3px rgba(234, 88, 12, 0.3);
                }
                .clean-button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    filter: grayscale(1);
                }

                .spinner {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { 
                    to { transform: rotate(360deg); } 
                }
            `}</style>
        </div>
    )
}

export default ClientLoginPage
