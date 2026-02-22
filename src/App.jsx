import React, { useState, useEffect } from 'react'
import { supabase } from './services/supabaseClient'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './App.css'

// Pages & Components
import AdminPanel from './pages/AdminPanel'
import ClientPortal from './pages/ClientPortal' // External review
import ClientDashboard from './pages/ClientDashboard' // Old/Legacy portal if any
import PostsPage from './pages/PostsPage'
import PostFeedbackPage from './pages/PostFeedbackPage' // New Feedback Loop
import Login from './pages/Login'
import ClientsPage from './pages/ClientsPage'
import IdeasPage from './pages/IdeasPage'
import SalesHubPage from './pages/SalesHubPage'
import SalesInboxPage from './pages/SalesInboxPage'
import CampaignsPage from './pages/CampaignsPage'
import CampaignLeadsView from './pages/CampaignLeadsView'
import CampaignLeadsPage from './pages/CampaignLeadsPage'
import SystemInfoPage from './pages/SystemInfoPage'
import LinkedInEngagementPage from './pages/LinkedInEngagementPage'
import MissionsPage from './pages/MissionsPage'
import ContentLibraryPage from './pages/ContentLibraryPage'
import AdminLayout from './components/AdminLayout'

// Client Portal New (Ideas/Insights)
import ClientLoginPage from './pages/ClientLoginPage'
import ClientDashboardLayout from './components/ClientDashboardLayout'
import ClientInsightsPage from './pages/ClientInsightsPage'
import { ClientAuthProvider, useClientAuth } from './contexts/ClientAuthContext'
import { ClientSelectionProvider } from './contexts/ClientSelectionContext'
import { useParams, useNavigate } from 'react-router-dom'

// Magic Link Handler Component
const MagicLinkHandler = () => {
  console.log("ROTA ACIONADA: MagicLinkHandler montado") // DEBUG LIFE CHECK
  const { token } = useParams()
  console.log("Token from URL:", token)

  const { loginWithToken, loading: authLoading, clientUser } = useClientAuth()
  const navigate = useNavigate()
  const [authAttempted, setAuthAttempted] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const attemptLogin = async () => {
      if (token && !clientUser) {
        // Ignore "insights" if it accidentally matches (though Router should handle it)
        if (token === 'insights' || token === 'login') return;

        const success = await loginWithToken(token)
        if (!success) {
          setError('Link inválido ou expirado.')
        }
      }
      setAuthAttempted(true)
    }
    attemptLogin()
  }, [token, clientUser, loginWithToken])

  if (authLoading || !authAttempted) {
    return (
      <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span>Validando acesso...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontFamily: 'sans-serif' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>Acesso Negado</h2>
        <p style={{ color: '#64748b' }}>{error}</p>
        <button
          onClick={() => navigate('/portal/login')}
          style={{ padding: '0.75rem 1.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Ir para Login
        </button>
      </div>
    )
  }

  if (!clientUser) {
    // Fallback safety
    return <Navigate to="/portal/login" replace />
  }

  // Success: Render the standard Dashboard Layout
  return (
    <ClientDashboardLayout>
      <ClientInsightsPage />
    </ClientDashboardLayout>
  )
}

// Validates authentication and role (Admin)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  // 1. Loading inicial de Auth (Sessão)
  if (loading) return <div className="loading-screen">Carregando...</div>

  // 2. Sem usuário -> Login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. Usuário existe, mas Perfil ainda carregando (Fetch em background)
  // Se a rota exige role, precisamos esperar o profile
  if (allowedRoles && !profile) {
    return <div className="loading-screen">Verificando permissões...</div>
  }

  // 4. Checagem de Role
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect based on role
    if (profile.role === 'client') return <Navigate to="/portal/insights" replace />
    if (profile.role === 'admin') return <Navigate to="/" replace />
    return <Navigate to="/login" replace /> // Fallback
  }

  return children
}

function App() {
  // REMOVED BLOCKING SESSION CHECK here to allow instant render of public routes.
  // AuthProvider will handle its own loading state for protected routes.

  return (
    <Router>
      <Routes>
        {/* === CLIENT PORTAL ROUTES (Decoupled from Global AuthProvider) === */}

        {/* 1. Magic Link Route (Public - handled by ClientInsightsPage logic) */}
        <Route path="/portal/:token" element={
          <ClientAuthProvider>
            <ClientInsightsPage />
          </ClientAuthProvider>
        } />

        {/* 2. Login Page (Public) */}
        <Route path="/portal/login" element={<ClientLoginPage />} />

        {/* 3. Insights Page (Protected by Layout check logic) */}
        <Route path="/portal/insights" element={
          <ClientAuthProvider>
            <ClientDashboardLayout>
              <ClientInsightsPage />
            </ClientDashboardLayout>
          </ClientAuthProvider>
        } />

        {/* === MAIN APP ROUTES (Wrapped in AuthProvider) === */}
        <Route path="/*" element={
          <AuthProvider>
            <Routes>
              {/* Public App Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/aprovacao" element={<ClientPortal />} />
              <Route path="/post-feedback/:id" element={<PostFeedbackPage />} />

              {/* Admin Protected Routes */}
              <Route element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ClientSelectionProvider>
                    <AdminLayout />
                  </ClientSelectionProvider>
                </ProtectedRoute>
              }>
                <Route path="/" element={<AdminPanel />} />
                <Route path="/posts" element={<PostsPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/ideas" element={<IdeasPage />} />
                <Route path="/sales" element={<SalesHubPage />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/campaigns/:id" element={<CampaignLeadsView />} />
                <Route path="/campaigns/:campaignId/leads" element={<CampaignLeadsPage />} />
                <Route path="/sales/inbox" element={<SalesInboxPage />} />
                <Route path="/system-info" element={<SystemInfoPage />} />
                <Route path="/engagement" element={<LinkedInEngagementPage />} />
                <Route path="/missions" element={<MissionsPage />} />
                <Route path="/content-library" element={<ContentLibraryPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        } />
      </Routes>
    </Router>
  )
}

export default App
