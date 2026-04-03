'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  code: string
  size?: number
}

export default function QRCodeDisplay({ code, size = 160 }: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    const url = `${window.location.origin}/invitation/${code}`
    QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: '#1C1612', light: '#FFFFFF' },
    }).then(setDataUrl)
  }, [code, size])

  if (!dataUrl) {
    return (
      <div
        className="bg-gray-100 rounded-xl animate-pulse"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <img
      src={dataUrl}
      alt={`QR Code ${code}`}
      width={size}
      height={size}
      className="rounded-xl"
    />
  )
}
