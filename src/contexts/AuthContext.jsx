
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // 1. Initial Session Check (Critical for F5/Refresh)
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted && session?.user) {
                    setUser(session.user);
                    setLoading(false); // RELEASE LOADING IMMEDIATELY
                    fetchProfile(session.user.id, session.user.email); // Background fetch
                } else if (mounted) {
                    setLoading(false); // No session, stop loading
                }
            } catch (err) {
                console.error('Session check failed:', err);
                if (mounted) setLoading(false);
            }
        };

        checkSession();

        // 2. Auth State Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            console.log('Auth State Change:', event);

            if (session?.user) {
                // If user changes or login happens, update state
                if (session.user.id !== user?.id) {
                    setUser(session.user);
                    setLoading(false); // RELEASE LOADING IMMEDIATELY
                    fetchProfile(session.user.id, session.user.email); // Background fetch
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setLoading(false);
            }
        });

        // 3. Safety Timeout
        const safetyTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn('Auth check timed out. Forcing stop loading.');
                setLoading(false);
            }
        }, 5000);

        return () => {
            mounted = false;
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, []); // Empty dependency array ok, relying on internal logic

    const fetchProfile = async (userId, userEmail) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                // Self-healing attempt for missing profile
                if (error.code === 'PGRST116' && userEmail) {
                    console.log('Profile missing (PGRST116). Attempting to create default profile...');
                    const defaultProfile = {
                        id: userId,
                        email: userEmail,
                        role: 'admin',
                        nome_empresa: 'Minha Agência'
                    };

                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert([defaultProfile]);

                    if (!insertError) {
                        setProfile(defaultProfile);
                        setLoading(false); // Success path
                        return;
                    }
                    console.error('Failed to create fallback profile:', insertError);
                }

                // 3. TRATAMENTO DE ERRO NO PERFIL (Strict Error Handling)
                // If we are here, we failed to get OR create a profile.
                console.error('Critical Profile Error provided. Signing out to prevent broken state.');
                await handleCriticalAuthError();
            } else {
                setProfile(data);
                setLoading(false); // Success path
            }
        } catch (error) {
            console.error('Profile fetch exception:', error);
            await handleCriticalAuthError();
        }
    };

    const handleCriticalAuthError = async () => {
        // Force sign out and clear state
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setLoading(false); // GUARANTEED: Loading must stop
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            // Force clear state to ensure UI updates immediately
            setUser(null);
            setProfile(null);
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
            {!loading ? children : (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    flexDirection: 'column',
                    gap: '1rem',
                    background: '#f8fafc'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid #e2e8f0',
                        borderTopColor: '#2563eb',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Carregando Link&Lead...</span>
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </AuthContext.Provider>
    );
};
