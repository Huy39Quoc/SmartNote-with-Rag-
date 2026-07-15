import Modal from './Modal'
import ModalFooter from './ModalFooter'

export default function ConfirmDialog({ title = 'Xác nhận', content, confirmLabel = 'Xác nhận', cancelLabel = 'Huỷ', onConfirm, onCancel, danger }) {
  return (
    <Modal title={title} onClose={onCancel} width={380}>
      <p style={{ marginBottom: 20, color: 'var(--text-secondary)' }}>{content}</p>
      <ModalFooter>
        <button type="button" onClick={onCancel}>{cancelLabel}</button>
        <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </ModalFooter>
    </Modal>
  )
}
