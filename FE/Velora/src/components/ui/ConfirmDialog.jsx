import Modal from './Modal'

export default function ConfirmDialog({ tieu_de = 'Xác nhận', noi_dung, nhan_xac_nhan = 'Xác nhận', onXacNhan, onHuy, nguy_hiem }) {
  return (
    <Modal tieu_de={tieu_de} onDong={onHuy} width={380}>
      <p style={{ marginBottom: 20, color: 'var(--text-secondary)' }}>{noi_dung}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onHuy}>Huỷ</button>
        <button className={nguy_hiem ? 'btn-danger' : 'btn-primary'} onClick={onXacNhan}>
          {nhan_xac_nhan}
        </button>
      </div>
    </Modal>
  )
}
