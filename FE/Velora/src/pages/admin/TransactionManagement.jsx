import { useCallback, useEffect, useState } from 'react'
import { IconCash, IconRefresh, IconSearch, IconX } from '@tabler/icons-react'
import toast from 'react-hot-toast'
import adminApi from '../../lib/api/adminApi'
import Spinner from '../../components/ui/Spinner'
import { DEFAULT_TRANSACTION_FILTERS, TRANSACTION_STATUSES } from '../../constants/adminConstants'

export default function TransactionManagement() {
  const [filters, setFilters] = useState(DEFAULT_TRANSACTION_FILTERS)
  const [applied, setApplied] = useState(filters)
  const [page, setPage] = useState(0)
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 })
  const [revenue, setRevenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [action, setAction] = useState(null)
  const [working, setWorking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { ...applied, page, size: 20 }
      if (!params.status) delete params.status
      if (!params.keyword) delete params.keyword
      const [transactions, stats] = await Promise.all([
        adminApi.getTransactions(params),
        adminApi.getRevenue({ from: applied.from, to: applied.to }),
      ])
      setData(transactions.data.data || { content: [] })
      setRevenue(stats.data.data)
    } catch (error) { toast.error(error.response?.data?.message || 'Không thể tải giao dịch') }
    finally { setLoading(false) }
  }, [applied, page])

  useEffect(() => { load() }, [load])
  const search = event => { event.preventDefault(); setPage(0); setApplied(filters) }
  const openDetail = async id => {
    try { const response = await adminApi.getTransaction(id); setDetail(response.data.data) }
    catch { toast.error('Không thể tải chi tiết giao dịch') }
  }
  const reconcile = async transaction => {
    setWorking(true)
    try {
      const response = await adminApi.reconcileTransaction(transaction.id)
      toast.success(response.data.data?.message || 'Đã đối soát với VNPay')
      await load(); await openDetail(transaction.id)
    } catch (error) { toast.error(error.response?.data?.message || 'Đối soát thất bại') }
    finally { setWorking(false) }
  }

  const executeAction = async form => {
    setWorking(true)
    try {
      if (action.type === 'refund') await adminApi.refundTransaction(action.transaction.id, { amount: Number(form.amount), reason: form.reason })
      if (action.type === 'status') await adminApi.updateTransactionStatus(action.transaction.id, { status: form.status, note: form.reason })
      if (action.type === 'extend') await adminApi.extendSubscription(action.transaction.userId, { months: Number(form.months), reason: form.reason })
      if (action.type === 'cancel') await adminApi.cancelSubscription(action.transaction.userId, { reason: form.reason })
      toast.success('Thao tác thành công'); setAction(null); setDetail(null); await load()
    } catch (error) { toast.error(error.response?.data?.message || 'Thao tác thất bại') }
    finally { setWorking(false) }
  }

  return <div style={styles.page}>
    <div style={styles.header}><div><h2 style={styles.title}>Quản lý giao dịch</h2><p style={styles.muted}>Theo dõi thanh toán, doanh thu, đối soát và subscription.</p></div><button onClick={load} disabled={loading}><IconRefresh size={14} /> Làm mới</button></div>
    {revenue && <RevenueDashboard value={revenue} />}
    <form onSubmit={search} style={styles.filters}>
      <input placeholder="Mã giao dịch, email hoặc gói" value={filters.keyword} onChange={e => setFilters(old => ({ ...old, keyword: e.target.value }))} />
      <select value={filters.status} onChange={e => setFilters(old => ({ ...old, status: e.target.value }))}>{TRANSACTION_STATUSES.map(status => <option key={status} value={status}>{status ? statusLabel(status) : 'Tất cả trạng thái'}</option>)}</select>
      <input type="date" value={filters.from} onChange={e => setFilters(old => ({ ...old, from: e.target.value }))} />
      <input type="date" value={filters.to} onChange={e => setFilters(old => ({ ...old, to: e.target.value }))} />
      <button className="btn-primary" type="submit"><IconSearch size={14} /> Lọc</button>
    </form>

    <div style={styles.tableWrap}>
      {loading ? <div style={styles.loading}><Spinner /></div> : <table style={styles.table}>
        <thead><tr>{['Mã tham chiếu', 'Người dùng', 'Gói', 'Số tiền', 'Trạng thái', 'VNPay', 'Thời gian', ''].map(label => <th key={label} style={styles.th}>{label}</th>)}</tr></thead>
        <tbody>{data.content?.map(transaction => <tr key={transaction.id} style={styles.tr}>
          <td style={styles.td}><strong>{transaction.txnRef}</strong><small style={styles.small}>{transaction.billingType || '—'}</small></td>
          <td style={styles.td}>{transaction.userEmail}<small style={styles.small}>{transaction.userName || '—'}</small></td>
          <td style={styles.td}>{transaction.packageName}</td><td style={styles.td}>{formatVnd(transaction.amount)}</td>
          <td style={styles.td}><Status value={transaction.status} /></td><td style={styles.td}>{transaction.vnpayTranNo || '—'}</td>
          <td style={styles.td}>{formatDate(transaction.createdAt)}</td><td style={styles.td}><button onClick={() => openDetail(transaction.id)}>Chi tiết</button></td>
        </tr>)}</tbody>
      </table>}
      {!loading && !data.content?.length && <div style={styles.empty}>Không có giao dịch phù hợp.</div>}
    </div>
    <div style={styles.pagination}><span>{data.totalElements || 0} giao dịch</span><div><button disabled={page === 0} onClick={() => setPage(old => old - 1)}>Trước</button><span style={{ padding: 10 }}>Trang {page + 1}/{Math.max(data.totalPages || 1, 1)}</span><button disabled={page + 1 >= data.totalPages} onClick={() => setPage(old => old + 1)}>Sau</button></div></div>

    {detail && <DetailModal transaction={detail} working={working} close={() => setDetail(null)} reconcile={reconcile} action={type => setAction({ type, transaction: detail })} />}
    {action && <ActionModal action={action} working={working} close={() => setAction(null)} submit={executeAction} />}
  </div>
}

function RevenueDashboard({ value }) {
  return <><div style={styles.cards}>
    <Metric label="Doanh thu gộp" value={formatVnd(value.grossRevenue)} /><Metric label="Đã/đang hoàn" value={formatVnd(value.refundedAmount)} />
    <Metric label="Doanh thu ròng" value={formatVnd(value.netRevenue)} accent /><Metric label="Giao dịch thành công" value={value.successfulTransactions} />
  </div><div style={styles.breakdowns}><Breakdown title="Theo ngày" values={value.byDay} /><Breakdown title="Theo tháng" values={value.byMonth} /><Breakdown title="Theo gói" values={value.byPackage} /></div></>
}
function Metric({ label, value, accent }) { return <div style={styles.metric}><span>{label}</span><strong style={{ color: accent ? 'var(--accent-green)' : 'var(--text-primary)' }}>{value}</strong></div> }
function Breakdown({ title, values = {} }) { const rows = Object.entries(values); const max = Math.max(...rows.map(([, value]) => Number(value)), 1); return <div style={styles.breakdown}><strong>{title}</strong>{rows.slice(-8).map(([key, value]) => <div key={key} style={styles.barRow}><span>{key}</span><div style={styles.barTrack}><div style={{ ...styles.bar, width: `${Number(value) / max * 100}%` }} /></div><small>{formatVnd(value)}</small></div>)}</div> }

function DetailModal({ transaction, close, reconcile, action, working }) {
  return <Modal close={close}><div style={styles.modalHead}><div><h3>Chi tiết giao dịch</h3><p style={styles.muted}>{transaction.txnRef}</p></div><button onClick={close}><IconX size={15} /></button></div>
    <div style={styles.detailGrid}>{[
      ['Trạng thái', <Status value={transaction.status} />], ['Số tiền', formatVnd(transaction.amount)], ['Mã VNPay', transaction.vnpayTranNo || '—'], ['Response code', transaction.responseCode || '—'],
      ['Ngân hàng', transaction.bankCode || '—'], ['Thanh toán lúc', formatDate(transaction.payDate)], ['Khách hàng', transaction.userEmail], ['Gói', `${transaction.packageName} · ${transaction.billingType || '—'}`],
      ['Đã hoàn', formatVnd(transaction.refundAmount)], ['Ghi chú Admin', transaction.adminNote || '—'],
    ].map(([label, value]) => <div key={label} style={styles.detailItem}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div style={styles.modalActions}><button onClick={() => reconcile(transaction)} disabled={working}><IconRefresh size={14} /> Đối soát VNPay</button><button onClick={() => action('status')}>Xử lý trạng thái</button><button onClick={() => action('extend')}>Gia hạn gói</button><button onClick={() => action('cancel')} className="btn-danger">Hủy gói</button>{['SUCCESS', 'REFUND_PENDING'].includes(transaction.status) && <button onClick={() => action('refund')} className="btn-danger"><IconCash size={14} /> Hoàn tiền</button>}</div>
  </Modal>
}

function ActionModal({ action, close, submit, working }) {
  const [form, setForm] = useState({ amount: action.transaction.amount, months: 1, status: action.transaction.status, reason: '' })
  const titles = { refund: 'Yêu cầu hoàn tiền VNPay', status: 'Xử lý trạng thái giao dịch', extend: 'Gia hạn gói thủ công', cancel: 'Hủy gói người dùng' }
  return <Modal close={close}><h3 style={{ marginBottom: 16 }}>{titles[action.type]}</h3><form onSubmit={event => { event.preventDefault(); submit(form) }} style={styles.actionForm}>
    {action.type === 'refund' && <label>Số tiền hoàn<input type="number" min="1" max={action.transaction.amount} value={form.amount} onChange={e => setForm(old => ({ ...old, amount: e.target.value }))} required /></label>}
    {action.type === 'status' && <label>Trạng thái<select value={form.status} onChange={e => setForm(old => ({ ...old, status: e.target.value }))}>{['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'].map(status => <option key={status}>{status}</option>)}</select></label>}
    {action.type === 'extend' && <label>Số tháng gia hạn<input type="number" min="1" max="120" value={form.months} onChange={e => setForm(old => ({ ...old, months: e.target.value }))} required /></label>}
    <label>Lý do<textarea rows="3" value={form.reason} onChange={e => setForm(old => ({ ...old, reason: e.target.value }))} required /></label>
    <div style={styles.modalActions}><button type="button" onClick={close} disabled={working}>Hủy</button><button className="btn-primary" disabled={working}>{working ? 'Đang xử lý...' : 'Xác nhận'}</button></div>
  </form></Modal>
}
function Modal({ children, close }) { return <div style={styles.overlay} onMouseDown={close}><div style={styles.modal} onMouseDown={e => e.stopPropagation()}>{children}</div></div> }
function Status({ value }) { return <span style={{ ...styles.status, ...(styles[`status${value}`] || {}) }}>{statusLabel(value)}</span> }
function statusLabel(value) { return ({ PENDING: 'Chờ thanh toán', SUCCESS: 'Thành công', FAILED: 'Thất bại', CANCELLED: 'Đã hủy', REFUND_PENDING: 'Đang hoàn tiền', REFUNDED: 'Đã hoàn tiền' })[value] || value }
function formatVnd(value) { return Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }) }
function formatDate(value) { return value ? new Date(value).toLocaleString('vi-VN') : '—' }

const styles = {
  page: { padding: 20, overflowY: 'auto', width: '100%' }, header: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }, title: { fontSize: 20 }, muted: { fontSize: 12, color: 'var(--text-muted)', marginTop: 4 },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 10 }, metric: { background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 9, padding: 13, display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, color: 'var(--text-muted)' },
  breakdowns: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 10, marginBottom: 14 }, breakdown: { background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 9, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }, barRow: { display: 'grid', gridTemplateColumns: '70px 1fr 85px', gap: 6, alignItems: 'center' }, barTrack: { height: 6, borderRadius: 9, background: 'var(--bg-elevated)', overflow: 'hidden' }, bar: { height: '100%', background: 'var(--accent-blue)' },
  filters: { display: 'grid', gridTemplateColumns: 'minmax(220px,2fr) minmax(150px,1fr) 145px 145px auto', gap: 8, marginBottom: 12 }, tableWrap: { background: 'var(--bg-surface)', border: '.5px solid var(--border)', borderRadius: 10, overflowX: 'auto' }, table: { width: '100%', borderCollapse: 'collapse', minWidth: 950, fontSize: 12 }, th: { padding: 10, textAlign: 'left', color: 'var(--text-muted)', borderBottom: '.5px solid var(--border)' }, td: { padding: 10, borderBottom: '.5px solid var(--border)', color: 'var(--text-secondary)' }, tr: {}, small: { display: 'block', color: 'var(--text-faint)', marginTop: 3 }, loading: { padding: 40, display: 'flex', justifyContent: 'center' }, empty: { padding: 35, textAlign: 'center', color: 'var(--text-muted)' }, pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, color: 'var(--text-muted)', fontSize: 12 },
  status: { display: 'inline-flex', borderRadius: 999, padding: '3px 7px', fontSize: 10, background: 'var(--bg-elevated)' }, statusSUCCESS: { color: 'var(--accent-green)', background: 'rgba(110,196,138,.1)' }, statusFAILED: { color: 'var(--accent-red)', background: 'rgba(224,87,87,.1)' }, statusPENDING: { color: 'var(--accent-amber)', background: 'rgba(196,145,58,.1)' }, statusREFUND_PENDING: { color: 'var(--accent-purple)' }, statusREFUNDED: { color: 'var(--accent-blue-dim)' },
  overlay: { position: 'fixed', inset: 0, zIndex: 2100, background: '#000b', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }, modal: { width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 13, padding: 20, boxShadow: '0 24px 80px #000a' }, modalHead: { display: 'flex', justifyContent: 'space-between', marginBottom: 16 }, detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 9 }, detailItem: { background: 'var(--bg-elevated)', borderRadius: 7, padding: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }, modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 7, flexWrap: 'wrap', marginTop: 18 }, actionForm: { display: 'flex', flexDirection: 'column', gap: 12 },
}
