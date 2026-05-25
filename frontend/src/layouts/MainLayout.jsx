import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '@/components/layout/Header'
import { useChatStore } from '@/store/chatStore'

/**
 * MainLayout — used for the user-facing app (chat, profile, upload).
 * No sidebar here — ChatPage has its own inline sidebar.
 */
export default function MainLayout() {
  const { loadSessions } = useChatStore()

  useEffect(() => { loadSessions() }, [loadSessions])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white/60">
      <Header />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
