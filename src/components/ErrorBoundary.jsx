
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8fafc',
                    color: '#1e293b',
                    textAlign: 'center',
                    fontFamily: "'Montserrat', sans-serif"
                }}>
                    <div style={{
                        background: '#fff',
                        padding: '2rem 3rem',
                        borderRadius: '16px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        maxWidth: '500px',
                        width: '90%'
                    }}>
                        <div style={{
                            background: '#fee2e2',
                            padding: '1rem',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            marginBottom: '1.5rem'
                        }}>
                            <AlertTriangle size={48} color="#ef4444" />
                        </div>

                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#0f172a' }}>
                            Ops! Algo deu errado.
                        </h1>

                        <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: '1.5' }}>
                            Ocorreu um erro inesperado e o sistema precisou parar.
                            <br />
                            Não se preocupe, seus dados estão seguros.
                        </p>

                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1.5rem',
                                background: '#0f172a',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                transition: 'opacity 0.2s',
                            }}
                            onMouseOver={(e) => e.target.style.opacity = '0.9'}
                            onMouseOut={(e) => e.target.style.opacity = '1'}
                        >
                            <RefreshCw size={18} /> Recarregar Página
                        </button>

                        {/* Optional: details for debugging (hidden by default or small) */}
                        {this.state.error && process.env.NODE_ENV === 'development' && (
                            <details style={{ marginTop: '2rem', textAlign: 'left', color: '#94a3b8', fontSize: '0.75rem', overflow: 'auto', maxHeight: '100px' }}>
                                <summary>Detalhes do Erro</summary>
                                <pre>{this.state.error.toString()}</pre>
                                <pre>{this.state.errorInfo.componentStack}</pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
