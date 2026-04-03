import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold text-[var(--text-title)]">invit.app</h1>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-5 py-2 text-sm font-medium text-[var(--text-title)] hover:text-[var(--violet)] transition-colors"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 bg-[var(--violet)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Commencer
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-title)] leading-tight mb-6">
            Créez de belles invitations
            <span className="text-[var(--gold)]"> en quelques minutes</span>
          </h2>
          <p className="text-lg text-gray-500 mb-8 max-w-lg mx-auto">
            Design par IA, envoi WhatsApp automatique, QR code pour le contrôle à l&apos;entrée.
            Tout ce dont vous avez besoin pour vos événements.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-[var(--violet)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-lg"
            >
              Créer mon événement
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-[var(--gold-dark)]">
            <span>💍 Mariage</span>
            <span>🎂 Anniversaire</span>
            <span>🤝 Dot</span>
            <span>🏢 Corporate</span>
            <span>⛪ Baptême</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400">
        invit.app — Invitations numériques pour l&apos;Afrique
      </footer>
    </div>
  )
}
