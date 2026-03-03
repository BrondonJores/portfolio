/* Page de connexion administrateur */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../../hooks/useAuth.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

/* Style commun des inputs */
const inputStyle = {
  backgroundColor: 'var(--color-bg-card)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
}

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  /* Redirection si deja connecte */
  const from = location.state?.from?.pathname || '/admin'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Identifiants invalides.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Connexion - Administration</title>
      </Helmet>
      <main
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <span
              className="text-4xl font-black"
              style={{ color: 'var(--color-accent)' }}
            >
              BJ
            </span>
            <p
              className="text-sm mt-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Acces administateur
            </p>
          </div>

          {/* Formulaire de connexion */}
          <div
            className="rounded-2xl border p-8"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="admin-email"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Email
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                    style={inputStyle}
                    placeholder="admin@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Mot de passe
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                    style={inputStyle}
                    placeholder="Mot de passe"
                  />
                </div>

                {error && (
                  <p
                    className="text-sm py-2 px-3 rounded-lg"
                    style={{ color: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.1)' }}
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="w-full justify-center"
                >
                  {loading ? <Spinner size="sm" /> : 'Se connecter'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
