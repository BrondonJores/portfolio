import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'

function getErrorMessage(error) {
  if (!error) {
    return 'Une erreur inattendue est survenue.'
  }
  if (typeof error === 'string') {
    return error
  }
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim()
  }
  if (typeof error?.reason?.message === 'string' && error.reason.message.trim()) {
    return error.reason.message.trim()
  }
  return 'Une erreur inattendue est survenue.'
}

function isChunkError(message) {
  return (
    /Failed to fetch dynamically imported module/i.test(message)
    || /Importing a module script failed/i.test(message)
    || /ChunkLoadError/i.test(message)
  )
}

export default function AppRouteErrorBoundary() {
  const error = useRouteError()
  const fallbackMessage = getErrorMessage(error)
  const routeMessage = isRouteErrorResponse(error) && typeof error.data === 'string'
    ? error.data
    : fallbackMessage
  const chunkError = isChunkError(routeMessage)

  return (
    <section
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border p-6 sm:p-8"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-accent)' }}>
          {chunkError ? 'Mise a jour detectee' : 'Erreur application'}
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {chunkError ? 'Nouvelle version disponible' : 'Un incident est survenu'}
        </h1>
        <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {chunkError
            ? 'Le navigateur utilise probablement une ancienne version des assets. Recharge la page pour synchroniser la nouvelle release.'
            : 'Recharge la page. Si le probleme persiste, reviens a l accueil puis retente la navigation.'}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </button>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors duration-200"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Retour a l accueil
          </Link>
        </div>

        <details className="mt-5">
          <summary className="cursor-pointer text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Details techniques
          </summary>
          <pre
            className="mt-2 rounded-lg border p-3 text-xs overflow-auto"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
              backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 88%, transparent)',
            }}
          >
            {routeMessage}
          </pre>
        </details>
      </div>
    </section>
  )
}
