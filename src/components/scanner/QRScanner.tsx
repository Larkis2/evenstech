'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState('')
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        // Extract invitation code from URL or raw text
        const match = decodedText.match(/INV-\d{4}-[A-Z0-9]{4}/)
        if (match) {
          scanner.stop().catch(() => {})
          onScanRef.current(match[0])
        }
      },
      () => {} // Expected when no QR visible
    ).catch((err) => {
      setError(
        typeof err === 'string' && err.includes('Permission')
          ? 'Accès caméra refusé. Autorisez la caméra dans les paramètres du navigateur.'
          : 'Impossible d\'accéder à la caméra.'
      )
    })

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [])

  function handleClose() {
    scannerRef.current?.stop().catch(() => {})
    onClose()
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <span className="text-sm font-medium text-[var(--text-title)]">📷 Scanner QR</span>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          Fermer
        </button>
      </div>

      {error ? (
        <div className="p-6 text-center">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={handleClose}
            className="mt-3 text-sm text-[var(--violet)] underline"
          >
            Fermer
          </button>
        </div>
      ) : (
        <>
          <div id="qr-reader" className="w-full" />
          <p className="text-xs text-gray-400 text-center py-3">
            Pointez la caméra vers le QR code de l&apos;invitation
          </p>
        </>
      )}
    </div>
  )
}
