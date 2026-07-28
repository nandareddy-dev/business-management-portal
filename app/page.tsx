import type { Metadata } from 'next'
import LandingPage from '@/components/LandingPage'

export const metadata: Metadata = {
  title: 'GK CRM — One CRM. Every Industry. | Hyderabad',
  description:
    'Lead pipeline, projects, staff, billing and AI automations — all in one premium CRM portal built for Indian businesses. Interior Design CRM live now, more industries coming soon.',
  keywords: [
    'CRM Hyderabad',
    'Interior Design CRM',
    'lead management software India',
    'GK CRM',
    'multi-tenant CRM SaaS',
  ],
  openGraph: {
    title: 'GK CRM — One CRM. Every Industry.',
    description:
      'Manage leads, projects, staff and billing from one premium portal built for Indian businesses.',
    url: 'https://crm.gkdigitalsolutions.in',
    siteName: 'GK CRM',
    images: [
      {
        url: 'https://crm.gkdigitalsolutions.in/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GK CRM Dashboard',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GK CRM — One CRM. Every Industry.',
    description: 'Manage leads, projects, staff and billing from one premium portal.',
    images: ['https://crm.gkdigitalsolutions.in/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://crm.gkdigitalsolutions.in',
  },
}

export default function Page() {
  return <LandingPage />
}