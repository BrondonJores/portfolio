/* Modal de confirmation pour les actions destructives */
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

/**
 * Modal de confirmation pour les suppressions et actions sensibles.
 * Props : isOpen, onConfirm, onCancel, title, message.
 */
export default function ConfirmModal({ isOpen, onConfirm, onCancel, title, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <p
        className="text-sm mb-6"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {message}
      </p>
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          onClick={onConfirm}
          className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-0"
        >
          Confirmer
        </Button>
      </div>
    </Modal>
  )
}
