import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProviders } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TimeFlow - AI Scheduling Assistant | Smart Task & Email Management',
  description: 'TimeFlow is your AI scheduling assistant that understands your life. Effortlessly manage tasks, emails, and habits with AI that learns your priorities. Free 14-day trial, no credit card required.',
  keywords: [
    'AI scheduling assistant',
    'task management',
    'calendar automation',
    'email categorization',
    'habit tracking',
    'smart calendar',
    'AI that schedules tasks',
    'automatic email time blocking',
    'productivity app',
    'Google Calendar integration',
  ],
  authors: [{ name: 'TimeFlow' }],
  creator: 'TimeFlow',
  publisher: 'TimeFlow',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'TimeFlow - AI Scheduling Assistant',
    description: 'Effortlessly manage tasks, emails, and habits with AI that learns your priorities.',
    url: 'https://timeflow.app',
    siteName: 'TimeFlow',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TimeFlow - Your AI Scheduling Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TimeFlow - AI Scheduling Assistant',
    description: 'Effortlessly manage tasks, emails, and habits with AI that learns your priorities.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
