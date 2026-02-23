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
        <div className="min-h-screen flex" style={{ background: '#FAFAFA' }}>

            {/* ═══════════════════════════════════════════ */}
            {/* LEFT PANEL — Brand Statement               */}
            {/* ═══════════════════════════════════════════ */}
            <div
                className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-end p-12"
                style={{ background: 'linear-gradient(160deg, #0A0A0A 0%, #1A1A1A 100%)' }}
            >
                {/* Geometric accent shapes */}
                <div
                    className="absolute top-0 right-0 w-[500px] h-[500px] opacity-[0.07]"
                    style={{
                        background: 'radial-gradient(circle at 70% 30%, #F97316 0%, transparent 60%)',
                    }}
                />
                <div
                    className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] border border-orange-500/10 rounded-full"
                    style={{ animation: 'pulse 8s ease-in-out infinite' }}
                />
                <div
                    className="absolute top-[15%] right-[10%] w-[200px] h-[200px] border border-white/5 rotate-45"
                />
                <div
                    className="absolute top-[40%] left-[5%] w-2 h-2 bg-orange-500 rounded-full"
                    style={{ animation: 'pulse 3s ease-in-out infinite' }}
                />
                <div
                    className="absolute top-[25%] left-[35%] w-1.5 h-1.5 bg-orange-400/60 rounded-full"
                    style={{ animation: 'pulse 5s ease-in-out infinite 1s' }}
                />

                {/* Brand content at bottom-left */}
                <div className="relative z-10 max-w-lg">
                    <div className="flex items-center gap-4 mb-10">
                        <img
                            src="/logo-linklead.png"
                            alt="Link&Lead Marketing"
                            className="w-44 h-auto"
                            style={{ mixBlendMode: 'screen' }}
                        />
                    </div>

                    <h2
                        className="text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        Outbound com
                        <br />
                        <span className="text-orange-500">Inteligência.</span>
                    </h2>

                    <p className="text-white/40 text-base leading-relaxed max-w-sm mb-10">
                        Automatize sua prospecção, gerencie leads e feche mais negócios com IA integrada ao seu fluxo de vendas.
                    </p>

                    {/* Trust indicators */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                            <span className="text-white/30 text-xs font-medium">Sistema online</span>
                        </div>
                        <div className="w-px h-3 bg-white/10" />
                        <span className="text-white/30 text-xs font-medium">256-bit SSL</span>
                        <div className="w-px h-3 bg-white/10" />
                        <span className="text-white/30 text-xs font-medium">LGPD Compliance</span>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* RIGHT PANEL — Login Form                    */}
            {/* ═══════════════════════════════════════════ */}
            <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-10 relative">

                {/* Subtle top-right accent */}
                <div
                    className="absolute top-0 right-0 w-[250px] h-[250px] opacity-[0.04] pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle at 80% 20%, #F97316 0%, transparent 60%)',
                    }}
                />

                <div className="w-full max-w-[420px] relative z-10">

                    {/* Mobile logo (hidden on desktop) */}
                    <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
                        <img src="/logo-linklead.png" alt="Link&Lead" className="w-9 h-auto" />
                        <span className="text-gray-400 text-sm font-bold tracking-[0.2em] uppercase">Link&Lead</span>
                    </div>

                    {/* Heading */}
                    <div className="mb-10">
                        <h1
                            className="text-3xl font-black text-gray-900 tracking-tight mb-2"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            Acesse sua conta
                        </h1>
                        <p className="text-gray-400 text-sm">
                            Entre para gerenciar seus leads e tarefas diárias.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em] ml-0.5">Email</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors duration-200">
                                    <Mail size={17} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    className="w-full bg-white border-2 border-gray-100 rounded-xl pl-11 pr-4 py-3.5 text-gray-900 placeholder-gray-300 text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-0 transition-all duration-200 shadow-sm hover:border-gray-200"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em] ml-0.5">Senha</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-500 transition-colors duration-200">
                                    <Lock size={17} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white border-2 border-gray-100 rounded-xl pl-11 pr-4 py-3.5 text-gray-900 placeholder-gray-300 text-sm font-medium focus:outline-none focus:border-orange-500 focus:ring-0 transition-all duration-200 shadow-sm hover:border-gray-200"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white text-sm font-bold tracking-wide transition-all duration-300 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                                background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                                boxShadow: loading ? 'none' : '0 8px 30px -4px rgba(249, 115, 22, 0.35)',
                            }}
                            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={19} />
                            ) : (
                                <>Entrar na Plataforma <ArrowRight size={17} /></>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-10 pt-6 border-t border-gray-100 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-300 font-medium">
                            <ShieldCheck size={13} className="text-orange-400/60" />
                            Protegido por Link&Lead Security
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
