import Sidebar from '@/components/ui/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <Sidebar />
      <main className="max-w-7xl mx-auto p-4 md:p-8 pb-20 md:pb-8">{children}</main>
    </div>
  )
}
