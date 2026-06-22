import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import useAuthStore from './service/authStore'
import MainLayout from './components/layout/MainLayout'
import { ProtectedRoute, AdminRoute, PublicOnlyRoute } from './components/layout/ProtectedRoute'
import SharedNotes from './pages/notes/SharedNotes'
// Pages
import Landing    from './pages/landing/Landing'
import Login      from './pages/auth/Login'
import Register   from './pages/auth/Register'
import Overview   from './pages/Overview'
import Notes      from './pages/notes/Notes'
import Chat       from './pages/chat/Chat'
import Documents  from './pages/documents/Documents'
import Schedule   from './pages/schedule/Schedule'
import Knowledge  from './pages/knowledge/Knowledge'
import AdminPanel from './pages/admin/AdminPanel'
import Account    from './pages/profile/Account'
import Notifications from './pages/notifications/Notifications'
import ServicePackages from './pages/packages/ServicePackages'
import PackageManagement from './pages/admin/PackageManagement'
import FlashcardsAI from './pages/notes/FlashcardsAI'


export default function App() {
    const { daXacThuc, layThongTin } = useAuthStore()

    useEffect(() => {
        if (daXacThuc) layThongTin()
    }, [daXacThuc])

    return (
        <Routes>
            {/* Public */}
            <Route path="/"          element={<Landing />} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register"   element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />

            {/* Protected - Đăng nhập mới xem được và hiển thị có kèm sidebar */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route path="/overview"           element={<Overview />} />
                <Route path="/notes"             element={<Notes />} />
                <Route path="/notes/:id"         element={<Notes />} />
                <Route path="/notes/:id/flashcards" element={<FlashcardsAI />} />
                <Route path="/shared-notes" element={<SharedNotes />} />
                <Route path="/chat"                element={<Chat />} />
                <Route path="/documents"            element={<Documents />} />
                <Route path="/schedule"                element={<Schedule />} />
                <Route path="/knowledge"           element={<Knowledge />} />
                <Route path="/account"           element={<Account />} />
                <Route path="/notifications"           element={<Notifications />} />
                <Route path="/service-packages"         element={<ServicePackages />} />

                {/* CHÈN VÀO ĐÂY: Quản lý và phân quyền Admin chỉ dành riêng cho Admin */}
                <Route path="/admin"            element={<AdminRoute><AdminPanel /></AdminRoute>} />
                <Route path="/admin/service-packages" element={<AdminRoute><PackageManagement /></AdminRoute>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to={daXacThuc ? '/notes' : '/'} replace />} />
        </Routes>
    )
}