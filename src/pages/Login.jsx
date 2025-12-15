import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await signIn(email, password);
            navigate('/');
        } catch (err) {
            setError('Falha ao entrar. Verifique suas credenciais.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo-area-login">
                        <img src="/logo-linklead.png" alt="Link&Lead Logo" style={{ maxWidth: '180px', height: 'auto' }} />
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-6">Bem-vindo de volta</h1>
                    <p>Acesse o painel de aprovações Link&Lead</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label>Email Corporativo</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? (
                            <Loader2 className="spinner" size={20} />
                        ) : (
                            <>Entrar na Plataforma <ArrowRight size={20} /></>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Protegido por Link&Lead Security</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
