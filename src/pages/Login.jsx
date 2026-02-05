import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, ArrowRight, ShieldCheck, Mail } from 'lucide-react';

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
        <div className="min-h-screen bg-obsidian flex items-center justify-center p-4 relative overflow-hidden">

            {/* AMBIENT BACKGROUND */}
            <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none z-0" />

            <div className="bg-charcoal/80 backdrop-blur-xl border border-glass-border p-8 w-full max-w-md rounded-2xl relative z-10 shadow-2xl animate-fade-in-up">

                {/* HEADER */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-black border border-glass-border flex items-center justify-center mb-6 shadow-inner">
                        <img src="/logo-linklead.png" alt="Link&Lead" className="w-10 h-auto opacity-90" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta</h1>
                    <p className="text-gray-400 text-sm text-center">Acesse o painel de aprovações Link&Lead</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400 ml-1">Email Corporativo</label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full bg-white/5 border border-glass-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400 ml-1">Senha</label>
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-glass-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary py-3.5 text-base shadow-lg shadow-primary/20 hover:shadow-primary/40"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>Entrar na Plataforma <ArrowRight size={20} /></>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-glass-border text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                        <ShieldCheck size={14} className="text-primary/60" />
                        Protegido por Link&Lead Security
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
