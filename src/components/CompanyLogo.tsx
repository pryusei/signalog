'use client'

import { useState } from 'react'

import { isSafeUrl } from '@/lib/safeUrl'

interface Props {
  name: string
  logoUrl: string | null
  imgClassName?: string
  tileClassName?: string
}

export function CompanyLogo({ name, logoUrl, imgClassName, tileClassName }: Props) {
  const [error, setError] = useState(false)

  if (isSafeUrl(logoUrl) && !error) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={name} className={imgClassName} onError={() => setError(true)} />
    )
  }
  return <div className={tileClassName}>{name.slice(0, 2)}</div>
}
