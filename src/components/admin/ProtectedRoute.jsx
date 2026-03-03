/* Composant de protection des routes administrateur */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'
import Spinner from '../ui/Spinner.jsx'

/**
 * Protege une route en verifiant l'authentification.
 * Affiche un spinner pendant le chargement initial.
 * Redirige vers /admin/login si non authentifie.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return children
}
