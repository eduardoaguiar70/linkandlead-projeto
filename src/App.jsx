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
import AdminLayout from './components/AdminLayout'

// Client Portal New (Ideas/Insights)
import ClientLoginPage from './pages/ClientLoginPage'
import ClientDashboardLayout from './components/ClientDashboardLayout'
import ClientInsightsPage from './pages/ClientInsightsPage'
import { ClientAuthProvider } from './contexts/ClientAuthContext'

// Validates authentication and role (Admin)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="loading-screen">Carregando...</div>

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect based on role if trying to access unauthorized area
    if (profile.role === 'client') return <Navigate to="/portal/insights" replace />
    if (profile.role === 'admin') return <Navigate to="/" replace />
  }

  return children
}

function App() {
  const [isSessionLoading, setIsSessionLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      setIsSessionLoading(false)
    })
  }, [])

  if (isSessionLoading) {
    return <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Inicializando sistema...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* === PUBLIC ROUTES === */}
          <Route path="/login" element={<Login />} />
          <Route path="/aprovacao" element={<ClientPortal />} />
          <Route path="/post-feedback/:id" element={<PostFeedbackPage />} /> {/* New Feedback Loop */}

          {/* === NEW CLIENT PORTAL (Protected by ClientAuthProvider) === */}
          <Route path="/portal/login" element={<ClientLoginPage />} />

          <Route path="/portal/*" element={
            <ClientAuthProvider>
              <Routes>
                <Route element={<ClientDashboardLayout />}>
                  <Route path="insights" element={<ClientInsightsPage />} />
                  <Route path="*" element={<Navigate to="insights" replace />} />
                </Route>
              </Routes>
            </ClientAuthProvider>
          } />

          {/* === ADMIN ROUTES (Protected by AuthProvider + Role) === */}
          <Route element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<AdminPanel />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/ideas" element={<IdeasPage />} />
          </Route>

          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
