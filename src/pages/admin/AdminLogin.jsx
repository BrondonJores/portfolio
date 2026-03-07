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
  const [mfaToken, setMfaToken] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const { login, verifyTwoFactor, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  /* Redirection si deja connecte */
  const from = location.state?.from?.pathname || '/admin'

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await login(email, password)

      if (result?.mfaRequired) {
        setMfaToken(result.mfaToken)
        setPassword('')
        return
      }

      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Identifiants invalides.')
    } finally {
      setLoading(false)
    }
  }

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await verifyTwoFactor({
        mfaToken,
        ...(useRecoveryCode ? { recoveryCode } : { totpCode }),
      })
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Code 2FA invalide.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToCredentials = () => {
    setMfaToken('')
    setTotpCode('')
    setRecoveryCode('')
    setUseRecoveryCode(false)
    setError(null)
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
            <form onSubmit={mfaToken ? handleTwoFactorSubmit : handleCredentialsSubmit} noValidate>
              <div className="space-y-4">
                {!mfaToken && (
                  <>
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
                  </>
                )}

                {mfaToken && (
                  <>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      Verification 2FA requise pour
                      {' '}
                      <span style={{ color: 'var(--color-text-primary)' }}>{email}</span>
                      .
                    </p>

                    {!useRecoveryCode && (
                      <div>
                        <label
                          htmlFor="admin-totp"
                          className="block text-sm font-medium mb-1.5"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Code Authenticator (6 chiffres)
                        </label>
                        <input
                          id="admin-totp"
                          type="text"
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value)}
                          required
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={12}
                          className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                          style={inputStyle}
                          placeholder="123456"
                        />
                      </div>
                    )}

                    {useRecoveryCode && (
                      <div>
                        <label
                          htmlFor="admin-recovery-code"
                          className="block text-sm font-medium mb-1.5"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Code de recuperation
                        </label>
                        <input
                          id="admin-recovery-code"
                          type="text"
                          value={recoveryCode}
                          onChange={(e) => setRecoveryCode(e.target.value)}
                          required
                          maxLength={32}
                          className="w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                          style={inputStyle}
                          placeholder="ABCDE-12345"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setUseRecoveryCode((prev) => !prev)
                        setError(null)
                        setTotpCode('')
                        setRecoveryCode('')
                      }}
                      className="text-sm underline underline-offset-2"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {useRecoveryCode ? 'Utiliser un code Authenticator' : 'Utiliser un code de recuperation'}
                    </button>
                  </>
                )}

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
                  {loading ? <Spinner size="sm" /> : mfaToken ? 'Verifier le code 2FA' : 'Se connecter'}
                </Button>

                {mfaToken && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBackToCredentials}
                    className="w-full justify-center"
                  >
                    Retour
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  )
}
