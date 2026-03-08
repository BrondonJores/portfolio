/* Composant pagination reutilisable pour les listes admin. */
import { useMemo } from 'react'

/**
 * Borne un entier dans un intervalle.
 * @param {number} value Valeur source.
 * @param {number} min Minimum.
 * @param {number} max Maximum.
 * @returns {number} Valeur bornee.
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Construit la fenetre de pages a afficher autour de la page courante.
 * @param {number} currentPage Page active.
 * @param {number} totalPages Nombre total de pages.
 * @param {number} [windowSize=5] Taille max de la fenetre.
 * @returns {number[]} Liste de pages.
 */
function buildPageWindow(currentPage, totalPages, windowSize = 5) {
  if (totalPages <= 0) return []

  const size = Math.max(3, Math.trunc(windowSize))
  const half = Math.floor(size / 2)

  let start = Math.max(1, currentPage - half)
  let end = Math.min(totalPages, start + size - 1)

  if (end - start + 1 < size) {
    start = Math.max(1, end - size + 1)
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

/**
 * Pagination admin basee sur total/limit/offset.
 * @param {object} props Proprietes composant.
 * @param {number} props.total Total global.
 * @param {number} props.limit Taille de page.
 * @param {number} props.offset Offset courant.
 * @param {(nextPage:number)=>void} props.onPageChange Callback changement page.
 * @param {boolean} [props.disabled=false] Desactive les actions.
 * @returns {JSX.Element | null} Composant de pagination.
 */
export default function AdminPagination({
  total,
  limit,
  offset,
  onPageChange,
  disabled = false,
}) {
  const safeTotal = Number.isFinite(Number(total)) ? Math.max(Number(total), 0) : 0
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20
  const safeOffset = Number.isFinite(Number(offset)) ? Math.max(Number(offset), 0) : 0

  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit))
  const currentPage = clamp(Math.floor(safeOffset / safeLimit) + 1, 1, totalPages)
  const pageWindow = useMemo(
    () => buildPageWindow(currentPage, totalPages, 5),
    [currentPage, totalPages]
  )

  const from = safeTotal === 0 ? 0 : safeOffset + 1
  const to = safeTotal === 0 ? 0 : Math.min(safeOffset + safeLimit, safeTotal)

  if (safeTotal <= safeLimit) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {from}-{to} sur {safeTotal}
      </p>

      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || currentPage <= 1}
          className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-50"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg-primary)',
          }}
        >
          Prec
        </button>

        {pageWindow.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            disabled={disabled || pageNumber === currentPage}
            className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-60"
            style={{
              borderColor: pageNumber === currentPage ? 'var(--color-accent)' : 'var(--color-border)',
              color: pageNumber === currentPage ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-bg-primary)',
            }}
          >
            {pageNumber}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || currentPage >= totalPages}
          className="px-3 py-1.5 rounded-lg border text-xs disabled:opacity-50"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg-primary)',
          }}
        >
          Suiv
        </button>
      </div>
    </div>
  )
}
