'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Mes événements', icon: '📋' },
  { href: '/dashboard/guests', label: 'Mes invités', icon: '👥' },
  { href: '/dashboard/design', label: 'Design', icon: '🎨', matchPrefix: true },
  { href: '/dashboard/scan', label: 'Contrôle entrée', icon: '📱' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Top horizontal nav — desktop */}
      <header className="hidden md:block bg-[var(--bg-nav)] border-b border-[var(--border-warm)]">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <Link href="/dashboard" className="text-xl font-bold text-[var(--text-title)]">
            invit.app
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.matchPrefix
                ? pathname.startsWith(item.href)
                : pathname === item.href || (item.href === '/dashboard' && pathname === '/dashboard')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--violet)] text-white'
                      : 'text-gray-600 hover:bg-[var(--bg-card)]'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-nav)] border-t border-[var(--border-warm)] z-50">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.matchPrefix
              ? pathname.startsWith(item.href)
              : pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1 text-xs ${
                  isActive ? 'text-[var(--violet)]' : 'text-gray-400'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="truncate max-w-[70px]">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
