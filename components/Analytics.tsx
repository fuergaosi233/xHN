'use client'

import Script from 'next/script'

interface AnalyticsProps {
  websiteId?: string
  scriptUrl?: string
}

export default function Analytics({ 
  websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
  scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL 
}: AnalyticsProps = {}) {
  if (!websiteId || !scriptUrl) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Umami Analytics: Missing website ID or script URL')
    }
    return null
  }

  return (
    <Script
      src={scriptUrl}
      data-website-id={websiteId}
      strategy="afterInteractive"
      defer
    />
  )
}

// Hook for custom event tracking
export function useUmami() {
  const track = (eventName: string, eventData?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track(eventName, eventData)
    }
  }

  return { track }
}

// TypeScript declaration for umami
declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, any>) => void
    }
  }
}