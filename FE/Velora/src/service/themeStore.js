import { useEffect, useState } from 'react'

const THEME_KEY = 'velora_theme'

export default function useThemeStore() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem(THEME_KEY) || 'dark'
    })

    useEffect(() => {
        document.documentElement.dataset.theme = theme
        localStorage.setItem(THEME_KEY, theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme((current) => current === 'dark' ? 'light' : 'dark')
    }

    return {
        theme,
        isDark: theme === 'dark',
        toggleTheme,
    }
}