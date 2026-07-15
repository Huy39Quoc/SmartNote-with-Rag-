import Modal from './Modal'

export default function ConfirmDialog({ title = 'Xác nhận', noi_dung, confirmLabel = 'Xác nhận', onConfirm, onCancel, danger }) {
  return (
    <Modal title={title} onClose={onCancel} width={380}>
      <p style={{ marginBottom: 20, color: 'var(--text-secondary)' }}>{noi_dung}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel}>Huỷ</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
