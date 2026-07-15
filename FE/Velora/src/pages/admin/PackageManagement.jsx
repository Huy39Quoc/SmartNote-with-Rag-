import React, { useState, useEffect } from 'react'
import adminApi from '../../lib/api/adminApi'
import Spinner from '../../components/ui/Spinner'

const AVAILABLE_FEATURES = [
    { id: 'TAG_SUBJECT', label: 'Tag môn học / chủ đề / dự án' },
    { id: 'CHECKLIST_BASIC', label: 'Checklist công việc cơ bản' },
    { id: 'AI_NOTE_FORMAT', label: 'AI format ghi chú' },
    { id: 'AI_SUMMARY_BASIC', label: 'Tóm tắt AI cơ bản' },
    { id: 'AI_SUMMARY_ADVANCED', label: 'Tóm tắt & phân tích AI nâng cao' },
    { id: 'AI_CHAT', label: 'Hỏi đáp AI với ghi chú / tài liệu' },
    { id: 'AI_ANALYZE', label: 'AI phân tích tài liệu' },
    { id: 'DOCUMENT_UPLOAD', label: 'Upload tài liệu' },
    { id: 'EXTRACT_SCHEDULE', label: 'AI trích xuất deadline từ ghi chú' },
    { id: 'AI_FLASHCARD', label: 'Flashcard AI tự động' },
    { id: 'DEADLINE_MANAGEMENT', label: 'Quản lý deadline & lịch học thông minh' },
    { id: 'PRIORITY_SUGGESTION', label: 'Gợi ý ưu tiên công việc' },
    { id: 'EXPORT_FILE', label: 'Export PDF / Word' },
    { id: 'TEAM_WORK', label: 'Học nhóm & chia sẻ ghi chú theo nhóm' },
    { id: 'AI_PROGRESS_ANALYTICS', label: 'AI phân tích tiến độ học tập' },
    { id: 'TEAM_DASHBOARD', label: 'Dashboard theo dõi nhóm' },
    { id: 'GOOGLE_CALENDAR', label: 'Tích hợp Google Calendar' },
    { id: 'MANAGE_MEMBERS', label: 'Admin quản lý thành viên nhóm' },
    { id: 'CUSTOM_WORKSPACE', label: 'Custom workspace theo nhóm' },
    { id: 'PRIORITY_SUPPORT', label: 'Ưu tiên hỗ trợ khách hàng' },
]

const initialForm = {
    name: '',
    priceMonthly: 0,
    priceYearly: 0,
    description: '',
    maxNotes: -1,
    maxAiFormatsPerMonth: -1,
    storageGb: 0,
    maxDevices: -1,
    features: [],
}

export default function PackageManagement() {
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [formData, setFormData] = useState(initialForm)
    const [isFormOpen, setIsFormOpen] = useState(false)

    useEffect(() => {
        loadPackages()
    }, [])

    const getResponseData = (res) => {
        if (Array.isArray(res?.data?.data)) return res.data.data
        if (Array.isArray(res?.data)) return res.data
        if (Array.isArray(res)) return res
        return []
    }

    const toFeatureArray = (features) => {
        if (!features) return []

        if (Array.isArray(features)) {
            return features
                .map(item => String(item).trim())
                .filter(Boolean)
        }

        return String(features)
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)
    }

    const loadPackages = async () => {
        setLoading(true)

        try {
            const res = await adminApi.getAdminPackages()
            setPackages(getResponseData(res))
        } catch (err) {
            console.error('Lỗi khi tải danh sách gói:', err)
            alert(err.response?.data?.message || 'Không thể tải danh sách gói dịch vụ')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateClick = () => {
        setEditingId(null)
        setFormData(initialForm)
        setIsFormOpen(true)
    }

    const handleEditClick = (pkg) => {
        setEditingId(pkg.id)
        setFormData({
            name: pkg.name || '',
            priceMonthly: pkg.priceMonthly ?? 0,
            priceYearly: pkg.priceYearly ?? 0,
            description: pkg.description || '',
            maxNotes: pkg.maxNotes ?? -1,
            maxAiFormatsPerMonth: pkg.maxAiFormatsPerMonth ?? -1,
            storageGb: pkg.storageGb ?? 0,
            maxDevices: pkg.maxDevices ?? -1,
            features: toFeatureArray(pkg.features),
        })
        setIsFormOpen(true)
    }

    const handleCancel = () => {
        setEditingId(null)
        setFormData(initialForm)
        setIsFormOpen(false)
    }

    const handleCheckboxChange = (id) => {
        setFormData(prev => {
            const isChecked = prev.features.includes(id)

            return {
                ...prev,
                features: isChecked
                    ? prev.features.filter(item => item !== id)
                    : [...prev.features, id],
            }
        })
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa gói dịch vụ này không?')) return

        try {
            await adminApi.deleteAdminPackage(id)
            alert('Xóa gói dịch vụ thành công!')
            loadPackages()

            if (editingId === id) {
                handleCancel()
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi xảy ra khi xóa gói dịch vụ')
        }
    }

    const validateForm = () => {
        const name = formData.name.trim()

        if (!name) {
            alert('Tên gói dịch vụ không được để trống')
            return false
        }

        if (Number(formData.priceMonthly) < 0) {
            alert('Giá tháng không được âm')
            return false
        }

        if (Number(formData.priceYearly) < 0) {
            alert('Giá năm không được âm')
            return false
        }

        return true
    }

    const buildPayload = () => {
        return {
            ...formData,
            name: formData.name.trim().toUpperCase(),
            priceMonthly: Number(formData.priceMonthly) || 0,
            priceYearly: Number(formData.priceYearly) || 0,
            maxNotes: Number(formData.maxNotes),
            maxAiFormatsPerMonth: Number(formData.maxAiFormatsPerMonth),
            storageGb: Number(formData.storageGb) || 0,
            maxDevices: Number(formData.maxDevices),
            features: formData.features,
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm()) return

        try {
            if (!editingId) {
                const duplicatePackage = packages.find(
                    pkg => pkg.name?.toUpperCase() === formData.name.trim().toUpperCase()
                )

                if (duplicatePackage) {
                    alert(`Gói dịch vụ "${formData.name}" đã tồn tại!\n\nVui lòng sử dụng tên khác hoặc chỉnh sửa gói hiện tại.`)
                    return
                }
            }

            const payload = buildPayload()

            if (editingId) {
                await adminApi.updateAdminPackage(editingId, payload)
            } else {
                await adminApi.createAdminPackage(payload)
            }

            alert(editingId ? 'Cập nhật gói dịch vụ thành công!' : 'Tạo mới gói dịch vụ thành công!')
            handleCancel()
            loadPackages()
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Lỗi lưu dữ liệu lên hệ thống'

            if (
                errorMessage.includes('UNIQUE KEY constraint') ||
                errorMessage.includes('duplicate key')
            ) {
                alert('Tên gói dịch vụ đã tồn tại.\nVui lòng sử dụng một tên khác.')
            } else {
                alert(errorMessage)
            }
        }
    }

    const getFeatureLabel = (id) => {
        const found = AVAILABLE_FEATURES.find(f => f.id === id)
        return found ? found.label : id
    }

    const formatVnd = (value) => {
        const number = Number(value || 0)

        if (number === 0) return '0₫'

        return number.toLocaleString('vi-VN', {
            style: 'currency',
            currency: 'VND',
        })
    }

    const formatLimit = (value, suffix = '') => {
        if (value === null || value === undefined || Number(value) < 0) {
            return 'Vô hạn'
        }

        return `${value}${suffix}`
    }

    return (
        <div style={styles.page}>
            <div style={styles.headerSection}>
                <div>
                    <h2 style={styles.title}>
                        Quản lý Gói dịch vụ & Phân quyền
                    </h2>

                    <p style={styles.subtitle}>
                        Cấu hình linh hoạt các tính năng học tập, hạn ngạch tài nguyên và phân quyền cho từng gói thành viên.
                    </p>
                </div>

                {!isFormOpen && (
                    <button
                        onClick={handleCreateClick}
                        style={styles.btnCreate}
                        className="btn-primary"
                    >
                        + Tạo Gói Mới
                    </button>
                )}
            </div>

            {isFormOpen && (
                <div style={styles.formContainer}>
                    <div style={styles.formHeader}>
                        <h3 style={styles.formTitle}>
                            {editingId
                                ? `Chỉnh sửa cấu hình gói: ${formData.name}`
                                : 'Cấu hình gói dịch vụ mới'}
                        </h3>

                        <button
                            type="button"
                            onClick={handleCancel}
                            style={styles.btnClose}
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.formGrid3}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>
                                    Tên gói dịch vụ
                                </label>

                                <input
                                    type="text"
                                    required
                                    style={styles.input}
                                    placeholder="Vd: FREE, PRO, PLUS..."
                                    value={formData.name}
                                    onChange={e => setFormData({
                                        ...formData,
                                        name: e.target.value.toUpperCase(),
                                    })}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>
                                    Giá / Tháng (VND)
                                </label>

                                <input
                                    type="number"
                                    step="1000"
                                    min="0"
                                    required
                                    style={styles.input}
                                    placeholder="Ví dụ: 49000"
                                    value={formData.priceMonthly}
                                    onChange={e => setFormData({
                                        ...formData,
                                        priceMonthly: Number(e.target.value) || 0,
                                    })}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>
                                    Giá / Năm (VND)
                                </label>

                                <input
                                    type="number"
                                    step="1000"
                                    min="0"
                                    required
                                    style={styles.input}
                                    placeholder="Ví dụ: 390000"
                                    value={formData.priceYearly}
                                    onChange={e => setFormData({
                                        ...formData,
                                        priceYearly: Number(e.target.value) || 0,
                                    })}
                                />
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                Mô tả gói
                            </label>

                            <textarea
                                rows="2"
                                style={styles.textarea}
                                placeholder="Mô tả ngắn gọn về định vị hoặc đối tượng phù hợp của gói..."
                                value={formData.description}
                                onChange={e => setFormData({
                                    ...formData,
                                    description: e.target.value,
                                })}
                            />
                        </div>

                        <div style={styles.resourceBox}>
                            <span style={styles.resourceLabel}>
                                Cấu hình giới hạn tài nguyên hệ thống (-1 = Vô hạn)
                            </span>

                            <div style={styles.formGrid4}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        Số ghi chú tối đa
                                    </label>

                                    <input
                                        type="number"
                                        style={styles.input}
                                        value={formData.maxNotes}
                                        onChange={e => setFormData({
                                            ...formData,
                                            maxNotes: Number(e.target.value),
                                        })}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        Lượt AI Format/tháng
                                    </label>

                                    <input
                                        type="number"
                                        style={styles.input}
                                        value={formData.maxAiFormatsPerMonth}
                                        onChange={e => setFormData({
                                            ...formData,
                                            maxAiFormatsPerMonth: Number(e.target.value),
                                        })}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        Dung lượng (GB)
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        style={styles.input}
                                        value={formData.storageGb}
                                        onChange={e => setFormData({
                                            ...formData,
                                            storageGb: Number(e.target.value) || 0,
                                        })}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>
                                        Đồng bộ thiết bị
                                    </label>

                                    <input
                                        type="number"
                                        style={styles.input}
                                        value={formData.maxDevices}
                                        onChange={e => setFormData({
                                            ...formData,
                                            maxDevices: Number(e.target.value),
                                        })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>
                                Tích chọn quyền lợi tính năng đi kèm:
                            </label>

                            <div style={styles.checkboxGrid}>
                                {AVAILABLE_FEATURES.map(feat => (
                                    <label key={feat.id} style={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            style={styles.checkbox}
                                            checked={formData.features.includes(feat.id)}
                                            onChange={() => handleCheckboxChange(feat.id)}
                                        />

                                        <span style={styles.checkboxText}>
                                            {feat.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={styles.formFooter}>
                            <button
                                type="button"
                                onClick={handleCancel}
                                style={{
                                    ...styles.btn,
                                    ...styles.btnSecondary,
                                }}
                            >
                                Hủy bỏ
                            </button>

                            <button
                                type="submit"
                                style={{
                                    ...styles.btn,
                                    ...styles.btnPrimary,
                                }}
                            >
                                {editingId ? 'Cập Nhật Thay Đổi' : 'Xác Nhận Tạo'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div style={styles.listSection}>
                <h3 style={styles.listTitle}>
                    Danh Sách Gói Dịch Vụ Hiện Tại
                    <span style={styles.badge}>
                        {packages.length} gói
                    </span>
                </h3>

                {loading ? (
                    <div style={styles.loadingContainer}>
                        <Spinner />
                    </div>
                ) : (
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeaderRow}>
                                    <th style={styles.tableHeader}>Tên gói & Mô tả</th>
                                    <th style={styles.tableHeader}>Bảng Giá Niêm Yết</th>
                                    <th style={styles.tableHeader}>Hạn ngạch giới hạn</th>
                                    <th style={styles.tableHeader}>Các quyền năng đặc cách</th>
                                    <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>

                            <tbody>
                                {packages.map(pkg => (
                                    <tr key={pkg.id} style={styles.tableRow}>
                                        <td style={styles.tableCell}>
                                            <div style={styles.packageName}>
                                                {pkg.name}
                                            </div>

                                            <p style={styles.packageDesc}>
                                                {pkg.description || 'Không có mô tả chi tiết cho gói này.'}
                                            </p>
                                        </td>

                                        <td style={styles.tableCell}>
                                            <div style={styles.priceMonthly}>
                                                {formatVnd(pkg.priceMonthly)} / tháng
                                            </div>

                                            <div style={styles.priceYearly}>
                                                {formatVnd(pkg.priceYearly)} / năm
                                            </div>
                                        </td>

                                        <td style={styles.tableCell}>
                                            <div style={styles.specItem}>
                                                📄 Ghi chú:{' '}
                                                <span style={styles.specValue}>
                                                    {formatLimit(pkg.maxNotes, ' ghi chú')}
                                                </span>
                                            </div>

                                            <div style={styles.specItem}>
                                                🤖 AI Format:{' '}
                                                <span style={styles.specValue}>
                                                    {formatLimit(pkg.maxAiFormatsPerMonth, ' lần')}
                                                </span>
                                            </div>

                                            <div style={styles.specItem}>
                                                💾 Lưu trữ:{' '}
                                                <span style={styles.specValue}>
                                                    {formatLimit(pkg.storageGb, ' GB')}
                                                </span>
                                            </div>

                                            <div style={styles.specItem}>
                                                📱 Thiết bị:{' '}
                                                <span style={styles.specValue}>
                                                    {formatLimit(pkg.maxDevices, ' máy')}
                                                </span>
                                            </div>
                                        </td>

                                        <td style={styles.tableCell}>
                                            {pkg.features ? (
                                                <div style={styles.featureTags}>
                                                    {toFeatureArray(pkg.features).map((featId, idx) => (
                                                        <span key={idx} style={styles.featureTag}>
                                                            {getFeatureLabel(featId)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={styles.noFeatures}>
                                                    Trống (Không được cấp quyền nâng cao)
                                                </span>
                                            )}
                                        </td>

                                        <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleEditClick(pkg)}
                                                style={styles.btnEdit}
                                            >
                                                Sửa
                                            </button>

                                            <button
                                                onClick={() => handleDelete(pkg.id)}
                                                style={styles.btnDelete}
                                            >
                                                Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {packages.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan="5"
                                            style={{
                                                ...styles.tableCell,
                                                textAlign: 'center',
                                                padding: '48px 20px',
                                                color: 'var(--text-faint)',
                                            }}
                                        >
                                            Hệ thống hiện tại chưa có dữ liệu gói dịch vụ thành viên nào.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

const styles = {
    page: {
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
    },
    headerSection: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '24px',
        paddingBottom: '24px',
        borderBottom: '0.5px solid var(--border)',
        marginBottom: '24px',
    },
    title: {
        fontSize: '20px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '4px',
    },
    subtitle: {
        fontSize: '13px',
        color: 'var(--text-muted)',
        lineHeight: '1.5',
    },
    btnCreate: {
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    formContainer: {
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
    },
    formHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '0.5px solid var(--border)',
    },
    formTitle: {
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: 0,
    },
    btnClose: {
        background: 'transparent',
        border: 'none',
        fontSize: '16px',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        padding: '0',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    formGrid3: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
    },
    formGrid4: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    label: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
    },
    input: {
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '13px',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font)',
    },
    textarea: {
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '13px',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font)',
        resize: 'vertical',
        minHeight: '80px',
    },
    resourceBox: {
        background: 'var(--bg-ai)',
        border: '0.5px solid var(--border-blue)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    resourceLabel: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--accent-blue-dim)',
        textTransform: 'uppercase',
    },
    checkboxGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '8px',
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border)',
        borderRadius: '8px',
        padding: '12px',
        maxHeight: '260px',
        overflowY: 'auto',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        cursor: 'pointer',
        padding: '6px',
        borderRadius: '6px',
    },
    checkbox: {
        cursor: 'pointer',
        marginTop: '2px',
        accentColor: 'var(--accent-blue)',
    },
    checkboxText: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        lineHeight: '1.4',
    },
    formFooter: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        paddingTop: '16px',
        borderTop: '0.5px solid var(--border)',
    },
    btn: {
        padding: '10px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        border: '0.5px solid var(--border)',
    },
    btnPrimary: {
        background: 'var(--accent-blue)',
        borderColor: 'var(--accent-blue)',
        color: '#fff',
    },
    btnSecondary: {
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)',
    },
    listSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    listTitle: {
        fontSize: '16px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    badge: {
        background: 'var(--bg-elevated)',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        padding: '4px 10px',
        borderRadius: '6px',
        fontWeight: 600,
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px 20px',
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: '12px',
    },
    tableContainer: {
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: '12px',
        overflow: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
    },
    tableHeaderRow: {
        background: 'var(--bg-elevated)',
        borderBottom: '0.5px solid var(--border)',
    },
    tableHeader: {
        padding: '12px',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textAlign: 'left',
        textTransform: 'uppercase',
    },
    tableRow: {
        borderBottom: '0.5px solid var(--border)',
    },
    tableCell: {
        padding: '12px',
        verticalAlign: 'top',
        color: 'var(--text-secondary)',
    },
    packageName: {
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '4px',
    },
    packageDesc: {
        fontSize: '12px',
        color: 'var(--text-muted)',
        margin: '0',
        lineHeight: '1.4',
    },
    priceMonthly: {
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--accent-blue)',
        marginBottom: '4px',
    },
    priceYearly: {
        fontSize: '12px',
        color: 'var(--text-muted)',
    },
    specItem: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        lineHeight: '1.5',
    },
    specValue: {
        fontWeight: 600,
        color: 'var(--text-primary)',
    },
    featureTags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
    },
    featureTag: {
        background: 'var(--bg-elevated)',
        color: 'var(--text-secondary)',
        fontSize: '11px',
        fontWeight: 500,
        padding: '4px 8px',
        borderRadius: '4px',
        border: '0.5px solid var(--border)',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
    },
    noFeatures: {
        fontSize: '12px',
        color: 'var(--text-muted)',
        fontStyle: 'italic',
    },
    btnEdit: {
        background: 'transparent',
        border: 'none',
        color: 'var(--accent-blue)',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        marginRight: '12px',
        textDecoration: 'underline',
        padding: '0',
    },
    btnDelete: {
        background: 'transparent',
        border: 'none',
        color: 'var(--accent-red)',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        textDecoration: 'underline',
        padding: '0',
    },
}