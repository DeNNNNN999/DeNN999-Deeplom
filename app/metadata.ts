import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Supplier Management System | Enterprise Solution',
  description: 'Advanced enterprise supplier management system for efficient procurement',
  keywords: 'supplier management, procurement, contracts, enterprise, business',
  authors: [{ name: 'Your Company' }],
  creator: 'Your Company',
  publisher: 'Your Company',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://supplier-management.example.com/',
    title: 'Supplier Management System | Enterprise Solution',
    description: 'Advanced enterprise supplier management system for efficient procurement',
    siteName: 'Supplier Management System',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Supplier Management System',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Supplier Management System | Enterprise Solution',
    description: 'Advanced enterprise supplier management system for efficient procurement',
    images: ['/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: ['/favicon.ico'],
    apple: ['/apple-touch-icon.png'],
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4f46e5' },
    { media: '(prefers-color-scheme: dark)', color: '#1e1b4b' },
  ],
}
