/* Modal de confirmation pour les actions destructives */
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

/**
 * Modal de confirmation pour les suppressions et actions sensibles.
 * Props : isOpen, onConfirm, onCancel, title, message.
 */
export default function ConfirmModal({ isOpen, onConfirm, onCancel, title, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-5">
        <div
          className="flex items-start gap-4 rounded-[24px] border p-4"
          style={{
            borderColor: 'rgba(248, 113, 113, 0.22)',
            backgroundColor: 'rgba(248, 113, 113, 0.08)',
          }}
        >
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border"
            style={{
              borderColor: 'rgba(248, 113, 113, 0.28)',
              backgroundColor: 'rgba(248, 113, 113, 0.14)',
              color: '#f87171',
            }}
          >
            <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Action sensible
            </p>
            <p className="mt-2 text-sm leading-7" style={{ color: 'var(--color-text-secondary)' }}>
              {message}
            </p>
          </div>
        </div>

        <div
          className="rounded-[22px] border px-4 py-3"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-border) 68%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 76%, transparent)',
          }}
        >
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-secondary)' }}>
            Verification
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            Confirme uniquement si tu veux vraiment poursuivre cette operation irreversible.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-[var(--ui-control-height)] items-center justify-center rounded-[var(--ui-radius-xl)] border px-[var(--ui-button-px)] py-[var(--ui-button-py)] text-[length:var(--ui-button-font-size)] font-medium text-white transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            style={{
              borderColor: 'rgba(220, 38, 38, 0.42)',
              background: 'linear-gradient(135deg, #dc2626, #ef4444)',
              boxShadow: '0 18px 36px -24px rgba(239, 68, 68, 0.55)',
            }}
          >
            Confirmer
          </button>
        </div>
      </div>
    </Modal>
  )
}
