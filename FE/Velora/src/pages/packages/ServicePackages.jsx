import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import packageApi from '../../lib/api/packageApi'
import Spinner from '../../components/ui/Spinner'
import useAuthStore from '../../service/authStore'
import { PACKAGE_FEATURE_CODES, SYSTEM_PACKAGE_ORDER } from '../../constants/packageConstants'
import { getFeatureLabel } from '../../utils/packageFeatures'

const LIMIT_COMPARE_CODES = [
    'NOTE_LIMIT',
    'AI_FORMAT_LIMIT',
    'STORAGE_LIMIT',
    'DEVICE_LIMIT',
]

const LIMIT_COMPARE_LABELS = {
    NOTE_LIMIT: 'Số ghi chú tối đa',
    AI_FORMAT_LIMIT: 'Lượt AI Format/tháng',
    STORAGE_LIMIT: 'Dung lượng (GB)',
    DEVICE_LIMIT: 'Đồng bộ thiết bị',
}
const formatPrice = (value) => {
    const price = Number(value || 0)

    return price.toLocaleString('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    })
}

export default function ServicePackages() {
    const { user, getProfile } = useAuthStore()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)
    const [buyingId, setBuyingId] = useState(null)
    const [billingCycle, setBillingCycle] = useState('monthly')

    const currentPackageName = user?.packageName || 'FREE'
    const usedAi = user?.aiUsedThisMonth || 0
    const maxAi = user?.maxAiFormatsPerMonth
    const noteCount = user?.noteCount || 0
    const maxNotes = user?.maxNotes
    const storageUsedBytes = user?.storageUsedBytes || 0
    const storageGb = user?.storageGb
    const maxStorageBytes =
        storageGb === null || storageGb === undefined || Number(storageGb) < 0
            ? null
            : Number(storageGb) * 1024 * 1024 * 1024

    useEffect(() => {
        loadServicePackages()
    }, [])

    useEffect(() => {
        const status = searchParams.get('status')

        if (!status) return

        getProfile?.()
        navigate('/service-packages', { replace: true })
    }, [searchParams, navigate, getProfile])

    const loadServicePackages = async () => {
        setLoading(true)

        try {
            const { data } = await packageApi.getActivePackages()
            setPackages(data.data || data || [])
        } catch (error) {
            console.error(error)
            alert('Không thể tải danh sách gói dịch vụ')
        } finally {
            setLoading(false)
        }
    }

    const handlePurchasePackage = async (id) => {
        setBuyingId(id)

        try {
            const { data } = await packageApi.purchaseServicePackage(id, billingCycle)
            const responseData = data.data || data

            if (responseData?.activated) {
                await getProfile?.()
                await loadServicePackages()
                return
            }

            if (responseData?.paymentUrl) {
                window.location.href = responseData.paymentUrl
                return
            }

            alert('Không thể tạo liên kết thanh toán!')
        } catch (error) {
            console.error(error)
            alert(error.response?.data?.message || 'Đã xảy ra lỗi khi kết nối tới cổng thanh toán')
        } finally {
            setBuyingId(null)
        }
    }

    const formatLimit = (value, suffix = '') => {
        if (value === null || value === undefined || Number(value) < 0) {
            return 'Vô hạn'
        }

        return `${value}${suffix}`
    }

    const getPackageName = (packageItem) => {
        return packageItem?.name?.toUpperCase() || 'FREE'
    }

    const getCurrentPackageName = () => {
        return currentPackageName?.toUpperCase() || 'FREE'
    }

    const parsePackageFeatures = (features) => {
        if (!features) return []

        if (Array.isArray(features)) {
            return features
                .map(item => String(item).trim().toUpperCase())
                .filter(Boolean)
        }

        return String(features)
            .split(',')
            .map(item => item.trim().toUpperCase())
            .filter(Boolean)
    }

    const normalizeLimitValue = (value) => {
        if (value === null || value === undefined || Number(value) < 0) {
            return Number.POSITIVE_INFINITY
        }

        return Number(value || 0)
    }

    const getLimitScore = (value, weight) => {
        const normalized = normalizeLimitValue(value)

        if (normalized === Number.POSITIVE_INFINITY) {
            return weight * 100000
        }

        return normalized * weight
    }

    const getPackagePowerScore = (packageItem) => {
        if (!packageItem) return 0

        const featureCount = parsePackageFeatures(packageItem.features).length

        return (
            featureCount * 1000000
            + getLimitScore(packageItem.maxNotes, 10)
            + getLimitScore(packageItem.maxAiFormatsPerMonth, 20)
            + getLimitScore(packageItem.storageGb, 50)
            + getLimitScore(packageItem.maxDevices, 30)
        )
    }

    const packageIncludesPackage = (containerPackage, targetPackage) => {
        if (!containerPackage || !targetPackage) return false

        const containerFeatures = new Set(parsePackageFeatures(containerPackage.features))
        const targetFeatures = parsePackageFeatures(targetPackage.features)

        const hasAllFeatures = targetFeatures.every(feature => containerFeatures.has(feature))

        const hasEnoughLimits =
            normalizeLimitValue(containerPackage.maxNotes) >= normalizeLimitValue(targetPackage.maxNotes)
            && normalizeLimitValue(containerPackage.maxAiFormatsPerMonth) >= normalizeLimitValue(targetPackage.maxAiFormatsPerMonth)
            && normalizeLimitValue(containerPackage.storageGb) >= normalizeLimitValue(targetPackage.storageGb)
            && normalizeLimitValue(containerPackage.maxDevices) >= normalizeLimitValue(targetPackage.maxDevices)

        return hasAllFeatures && hasEnoughLimits
    }

    const getCurrentPackage = () => {
        return packages.find(packageItem => getPackageName(packageItem) === getCurrentPackageName()) || {
            name: getCurrentPackageName(),
            features: user?.packageFeatures || '',
            maxNotes,
            maxAiFormatsPerMonth: maxAi,
            storageGb,
            maxDevices: user?.maxDevices,
        }
    }

    const getComparablePrice = (packageItem) => {
        const monthly = Number(packageItem?.priceMonthly || 0)
        const yearly = Number(packageItem?.priceYearly || 0)

        if (monthly > 0) return monthly
        if (yearly > 0) return yearly / 12

        return 0
    }

    const sortPackages = (packageList) => {
        return [...packageList].sort((a, b) => {
            const featureDiff = getPackageFeatureCount(a) - getPackageFeatureCount(b)

            if (featureDiff !== 0) {
                return featureDiff
            }

            const limitDiff = getPackageLimitScore(a) - getPackageLimitScore(b)

            if (limitDiff !== 0) {
                return limitDiff
            }

            const priceDiff = getComparablePrice(a) - getComparablePrice(b)

            if (priceDiff !== 0) {
                return priceDiff
            }

            return getPackageName(a).localeCompare(getPackageName(b))
        })
    }

    const isCurrentPackage = (packageItem) => {
        return getCurrentPackageName() === getPackageName(packageItem)
    }
    const getPackageFeatureCount = (packageItem) => {
        return parsePackageFeatures(packageItem?.features).length
    }
    const getPackageLimitScore = (packageItem) => {
        if (!packageItem) return 0

        return (
            normalizeLimitValue(packageItem.maxNotes) * 10
            + normalizeLimitValue(packageItem.maxAiFormatsPerMonth) * 20
            + normalizeLimitValue(packageItem.storageGb) * 50
            + normalizeLimitValue(packageItem.maxDevices) * 30
        )
    }

    const isPackageBetterThan = (candidatePackage, currentPackage) => {
        const candidateFeatureCount = getPackageFeatureCount(candidatePackage)
        const currentFeatureCount = getPackageFeatureCount(currentPackage)

        if (candidateFeatureCount !== currentFeatureCount) {
            return candidateFeatureCount > currentFeatureCount
        }

        return getPackageLimitScore(candidatePackage) > getPackageLimitScore(currentPackage)
    }
    const isLowerPackage = (packageItem) => {
        if (isCurrentPackage(packageItem)) return false

        const currentPackage = getCurrentPackage()

        return !isPackageBetterThan(packageItem, currentPackage)
    }

    const isHigherPackage = (packageItem) => {
        if (isCurrentPackage(packageItem)) return false

        const currentPackage = getCurrentPackage()

        return isPackageBetterThan(packageItem, currentPackage)
    }

    const canPurchasePackage = (packageItem) => {
        if (isCurrentPackage(packageItem)) return false

        const currentPackage = getCurrentPackage()

        return isPackageBetterThan(packageItem, currentPackage)
    }

    const getPackageActionLabel = (packageItem) => {
        if (isHigherPackage(packageItem)) {
            return `Nâng cấp lên ${getPackageName(packageItem)}`
        }

        return `Chọn gói ${getPackageName(packageItem)}`
    }

    const getUnavailablePackageText = (packageItem) => {
        if (isCurrentPackage(packageItem)) {
            return 'Gói hiện tại'
        }

        if (isLowerPackage(packageItem)) {
            return `Gói này không cao hơn gói ${getCurrentPackageName()}`
        }

        return 'Không khả dụng'
    }

    const formatBytes = (bytes) => {
        const value = Number(bytes || 0)

        if (value < 1024) return `${value} B`

        const kb = value / 1024
        if (kb < 1024) return `${kb.toFixed(1)} KB`

        const mb = kb / 1024
        if (mb < 1024) return `${mb.toFixed(1)} MB`

        const gb = mb / 1024
        return `${gb.toFixed(2)} GB`
    }

    const calculatePercentage = (used, max) => {
        if (max === null || max === undefined || Number(max) < 0) {
            return 100
        }

        if (!max || Number(max) <= 0) {
            return 0
        }

        return Math.min(100, Math.round((Number(used || 0) / Number(max)) * 100))
    }

    const renderCompareValue = (value) => {
        if (value === true) {
            return <span style={styles.compareYes}>✓</span>
        }

        if (value === false) {
            return <span style={styles.compareNo}>—</span>
        }

        return <span style={styles.compareText}>{value}</span>
    }

    const packageHasFeature = (packageItem, featureCode) => {
        if (!packageItem?.features) return false

        return parsePackageFeatures(packageItem.features)
            .includes(featureCode?.trim()?.toUpperCase())
    }

    const renderPackageFeatureValue = (packageItem, featureCode) => {
        if (!packageItem) return false

        if (featureCode === 'NOTE_LIMIT') {
            return formatLimit(packageItem.maxNotes, ' ghi chú')
        }

        if (featureCode === 'AI_FORMAT_LIMIT') {
            return formatLimit(packageItem.maxAiFormatsPerMonth, ' lần/tháng')
        }

        if (featureCode === 'STORAGE_LIMIT') {
            return formatLimit(packageItem.storageGb, ' GB')
        }

        if (featureCode === 'DEVICE_LIMIT') {
            return formatLimit(packageItem.maxDevices, ' thiết bị')
        }

        return packageHasFeature(packageItem, featureCode)
    }

    const getAllCompareFeatureCodes = () => {
        const dynamicCodes = packages
            .flatMap(packageItem => parsePackageFeatures(packageItem.features))

        const normalFeatureCodes = PACKAGE_FEATURE_CODES.filter(code =>
            !['NOTE_LIMIT', 'DEVICE_LIMIT'].includes(code)
        )

        return Array.from(new Set([
            ...LIMIT_COMPARE_CODES,
            ...normalFeatureCodes,
            ...dynamicCodes,
        ]))
    }
    const getCompareLabel = (code) => {
        return LIMIT_COMPARE_LABELS[code] || getFeatureLabel(code)
    }
    const buildDynamicCompareRows = (comparePackages) => {
        return getAllCompareFeatureCodes().map(code => ({
            id: code,
            label: getCompareLabel(code),
            values: comparePackages.map(packageItem => ({
                packageId: packageItem.id,
                value: renderPackageFeatureValue(packageItem, code),
            })),
        }))
    }

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Spinner />
            </div>
        )
    }

    const sortedPackages = sortPackages(packages)
    const compareRows = buildDynamicCompareRows(sortedPackages)

    return (
        <div style={styles.page}>
            <h2 style={styles.title}>Nâng cấp Velora Premium</h2>

            <p style={styles.subtitle}>
                Chọn gói phù hợp để mở khóa các tính năng AI, quản lý deadline,
                flashcard và học nhóm.
            </p>

            <section style={styles.usageCard}>
                <div style={styles.usageHeader}>
                    <div>
                        <div style={styles.usageLabel}>Gói hiện tại</div>
                        <div style={styles.usagePackage}>{currentPackageName}</div>
                    </div>

                    {user?.packageExpiryDate && (
                        <div style={styles.expiryText}>
                            Hết hạn: {new Date(user.packageExpiryDate).toLocaleDateString('vi-VN')}
                        </div>
                    )}
                </div>

                <div style={styles.usageGrid}>
                    <UsageItem
                        label="AI tháng này"
                        value={`${usedAi}/${maxAi === null || maxAi === undefined || maxAi < 0 ? '∞' : maxAi} lượt`}
                        percent={calculatePercentage(usedAi, maxAi)}
                    />

                    <UsageItem
                        label="Ghi chú"
                        value={`${noteCount}/${maxNotes === null || maxNotes === undefined || maxNotes < 0 ? '∞' : maxNotes}`}
                        percent={calculatePercentage(noteCount, maxNotes)}
                    />

                    <UsageItem
                        label="Dung lượng"
                        value={`${formatBytes(storageUsedBytes)}/${maxStorageBytes ? formatBytes(maxStorageBytes) : 'Vô hạn'}`}
                        percent={maxStorageBytes ? calculatePercentage(storageUsedBytes, maxStorageBytes) : 100}
                    />
                </div>
            </section>

            <div style={styles.toggleContainer}>
                <button
                    type="button"
                    style={{
                        ...styles.toggleBtn,
                        ...(billingCycle === 'monthly' ? styles.toggleActive : {}),
                    }}
                    onClick={() => setBillingCycle('monthly')}
                >
                    Thanh toán theo tháng
                </button>

                <button
                    type="button"
                    style={{
                        ...styles.toggleBtn,
                        ...(billingCycle === 'yearly' ? styles.toggleActive : {}),
                    }}
                    onClick={() => setBillingCycle('yearly')}
                >
                    Thanh toán theo năm
                </button>
            </div>

            <div style={styles.grid}>
                {sortedPackages.map((packageItem) => {
                    const price = billingCycle === 'monthly'
                        ? packageItem.priceMonthly
                        : packageItem.priceYearly

                    const durationText = billingCycle === 'monthly'
                        ? '/ tháng'
                        : '/ năm'
                    const current = isCurrentPackage(packageItem)
                    const canPurchase = canPurchasePackage(packageItem)
                    return (
                        <div
                            key={packageItem.id}
                            style={{
                                ...styles.card,
                                ...(current ? styles.currentCard : {}),
                            }}
                        >
                            {current && (
                                <div style={styles.currentBadge}>
                                    Gói hiện tại
                                </div>
                            )}

                            <div style={styles.cardTop}>
                                <h3 style={styles.packageName}>{packageItem.name}</h3>

                                <div style={styles.priceRow}>
                                    <span style={styles.price}>{formatPrice(price)}</span>
                                    <span style={styles.duration}>{durationText}</span>
                                </div>
                            </div>

                            <p style={styles.description}>
                                {packageItem.description || 'Gói dịch vụ tiêu chuẩn'}
                            </p>

                            <div style={styles.specsList}>
                                <div style={styles.specItem}>
                                    <span>📝 Ghi chú</span>
                                    <strong>{formatLimit(packageItem.maxNotes, ' ghi chú')}</strong>
                                </div>

                                <div style={styles.specItem}>
                                    <span>🤖 AI</span>
                                    <strong>{formatLimit(packageItem.maxAiFormatsPerMonth, ' lần/tháng')}</strong>
                                </div>

                                <div style={styles.specItem}>
                                    <span>💾 Lưu trữ</span>
                                    <strong>{formatLimit(packageItem.storageGb, ' GB')}</strong>
                                </div>

                                <div style={styles.specItem}>
                                    <span>📱 Thiết bị</span>
                                    <strong>{formatLimit(packageItem.maxDevices, ' thiết bị')}</strong>
                                </div>
                            </div>

                            {packageItem.features && (
                                <div style={styles.featuresSection}>
                                    <div style={styles.featuresTitle}>
                                        Tính năng bao gồm:
                                    </div>

                                    <ul style={styles.featuresList}>
                                        {packageItem.features
                                            .split(',')
                                            .map(f => f.trim())
                                            .filter(Boolean)
                                            .map((featId) => (
                                                <li key={featId} style={styles.featureLi}>
                                                    ✓ {getFeatureLabel(featId)}
                                                </li>
                                            ))}
                                    </ul>
                                </div>
                            )}

                            {canPurchase ? (
                                <button
                                    className="btn-primary"
                                    style={styles.buyBtn}
                                    disabled={buyingId === packageItem.id}
                                    onClick={() => handlePurchasePackage(packageItem.id)}
                                >
                                    {buyingId === packageItem.id
                                        ? 'Đang chuyển hướng...'
                                        : getPackageActionLabel(packageItem)}
                                </button>
                            ) : (
                                <div style={styles.unavailableBtn}>
                                    {getUnavailablePackageText(packageItem)}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <section style={styles.compareSection}>
                <h3 style={styles.compareTitle}>So sánh tính năng</h3>

                <div style={styles.compareTableWrap}>
                    <table style={styles.compareTable}>
                        <thead>
                            <tr>
                                <th style={styles.compareTh}>Tính năng</th>

                                {sortedPackages.map(packageItem => (
                                    <th key={packageItem.id} style={styles.compareTh}>
                                        {getPackageName(packageItem)}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {compareRows.map(row => (
                                <tr key={row.id}>
                                    <td style={styles.compareTdFeature}>{row.label}</td>

                                    {row.values.map(cell => (
                                        <td key={cell.packageId} style={styles.compareTd}>
                                            {renderCompareValue(cell.value)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}

function UsageItem({ label, value, percent }) {
    return (
        <div style={styles.usageItem}>
            <div style={styles.usageItemTop}>
                <span>{label}</span>
                <strong>{value}</strong>
            </div>

            <div style={styles.progressTrack}>
                <div
                    style={{
                        ...styles.progressFill,
                        width: `${Math.min(100, Math.max(0, percent))}%`,
                    }}
                />
            </div>
        </div>
    )
}

const styles = {
    page: {
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '24px',
        boxSizing: 'border-box',
    },
    title: {
        fontSize: '22px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '4px',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: '14px',
        color: 'var(--text-muted)',
        marginBottom: '24px',
        lineHeight: '1.5',
        textAlign: 'center',
    },
    usageCard: {
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 16,
        padding: 18,
        marginBottom: 24,
    },
    usageHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    usageLabel: {
        fontSize: 12,
        color: 'var(--text-muted)',
    },
    usagePackage: {
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--accent-blue)',
        marginTop: 2,
    },
    expiryText: {
        fontSize: 12,
        color: 'var(--text-muted)',
    },
    usageGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
    },
    usageItem: {
        background: 'var(--bg-elevated)',
        borderRadius: 10,
        padding: 12,
        border: '0.5px solid var(--border)',
    },
    usageItemTop: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 10,
        fontSize: 12,
        color: 'var(--text-secondary)',
        marginBottom: 10,
    },
    progressTrack: {
        height: 7,
        background: 'var(--bg-surface)',
        borderRadius: 999,
        overflow: 'hidden',
        border: '0.5px solid var(--border)',
    },
    progressFill: {
        height: '100%',
        background: 'var(--accent-blue)',
        borderRadius: 999,
        transition: 'width 0.2s',
    },
    toggleContainer: {
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '32px',
        flexWrap: 'wrap',
    },
    toggleBtn: {
        padding: '8px 16px',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all 0.2s',
    },
    toggleActive: {
        background: 'var(--accent-blue)',
        color: '#fff',
        borderColor: 'var(--accent-blue)',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
    },
    card: {
        position: 'relative',
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    },
    currentCard: {
        borderColor: 'var(--accent-blue)',
        boxShadow: '0 0 0 1px var(--accent-blue)',
    },
    currentBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 999,
        background: 'var(--bg-ai)',
        color: 'var(--accent-blue)',
        border: '0.5px solid var(--accent-blue)',
        fontWeight: 600,
    },
    cardTop: {
        borderBottom: '0.5px solid var(--border)',
        paddingBottom: '16px',
        textAlign: 'center',
    },
    packageName: {
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: '12px',
    },
    priceRow: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: '4px',
    },
    price: {
        fontSize: '28px',
        fontWeight: 700,
        color: 'var(--accent-blue)',
    },
    duration: {
        fontSize: '14px',
        color: 'var(--text-muted)',
        marginLeft: '4px',
    },
    description: {
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: '1.6',
        margin: '0',
        textAlign: 'center',
        minHeight: '40px',
    },
    specsList: {
        background: 'var(--bg-elevated)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    specItem: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
    },
    featuresSection: {
        flex: 1,
    },
    featuresTitle: {
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '8px',
    },
    featuresList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxHeight: 180,
        overflowY: 'auto',
        paddingRight: 4,
    },
    featureLi: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        lineHeight: '1.4',
    },
    buyBtn: {
        width: '100%',
        padding: '12px',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '8px',
        marginTop: '12px',
        cursor: 'pointer',
    },
    compareSection: {
        marginTop: 34,
        marginBottom: 40,
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 16,
        padding: 18,
    },
    compareTitle: {
        margin: '0 0 14px',
        fontSize: 18,
        color: 'var(--text-primary)',
    },
    compareTableWrap: {
        overflowX: 'auto',
    },
    compareTable: {
        width: '100%',
        borderCollapse: 'collapse',
        minWidth: 760,
    },
    compareTh: {
        textAlign: 'center',
        padding: '12px 10px',
        fontSize: 12,
        color: 'var(--text-primary)',
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-elevated)',
    },
    compareTdFeature: {
        padding: '12px 10px',
        fontSize: 12,
        color: 'var(--text-secondary)',
        borderBottom: '0.5px solid var(--border)',
        textAlign: 'left',
        width: '40%',
    },
    compareTd: {
        padding: '12px 10px',
        fontSize: 12,
        color: 'var(--text-secondary)',
        borderBottom: '0.5px solid var(--border)',
        textAlign: 'center',
    },
    compareYes: {
        color: 'var(--accent-green)',
        fontWeight: 700,
        fontSize: 15,
    },
    compareNo: {
        color: 'var(--text-muted)',
        fontWeight: 600,
    },
    compareText: {
        color: 'var(--text-secondary)',
        fontWeight: 500,
    },
    unavailableBtn: {
        width: '100%',
        padding: '12px',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '8px',
        marginTop: '12px',
        textAlign: 'center',
        background: 'var(--bg-elevated)',
        color: 'var(--text-muted)',
        border: '0.5px solid var(--border)',
        boxSizing: 'border-box',
    },
}
