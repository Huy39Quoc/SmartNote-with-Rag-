import { PACKAGE_FEATURE_LABELS } from '../constants/packageConstants'

export const parsePackageFeatures = (user) => {
    const raw = user?.packageFeatures || ''

    return raw
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
}

export const hasFeature = (user, featureCode) => {
    if (!user || !featureCode) {
        return false
    }

    const packageName =
        user.packageName ||
        user.currentPackageName ||
        user.package?.name ||
        user.currentPackage?.name ||
        'FREE'

    if (packageName.toUpperCase() === 'PLUS') {
        return true
    }

    const rawFeatures =
        user.features ||
        user.packageFeatures ||
        user.currentPackage?.features ||
        user.package?.features ||
        ''

    if (Array.isArray(rawFeatures)) {
        return rawFeatures
            .map(item => String(item).trim().toUpperCase())
            .includes(featureCode.toUpperCase())
    }

    if (typeof rawFeatures === 'string') {
        return rawFeatures
            .split(',')
            .map(item => item.trim().toUpperCase())
            .includes(featureCode.toUpperCase())
    }

    return false
}

export const hasAllFeatures = (user, featureCodes = []) => {
    return featureCodes.every(code => hasFeature(user, code))
}

export const getFeatureLabel = (featureCode) => {
    const normalizedCode = featureCode?.trim()
    return PACKAGE_FEATURE_LABELS[normalizedCode] || featureCode
}

export const getUpgradeMessage = (featureCode) => {
    const label = getFeatureLabel(featureCode)
    return `Tính năng "${label}" chỉ có ở gói cao hơn. Vui lòng nâng cấp để sử dụng.`
}
