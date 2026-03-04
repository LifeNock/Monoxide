import type { Metadata } from 'next';
import { Barlow, Rajdhani, Space_Grotesk, IBM_Plex_Sans } from 'next/font/google';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FontProvider } from '@/contexts/FontContext';
import './globals.css';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-barlow',
});

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rajdhani',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
});

export const metadata: Metadata = {
  title: 'Monoxide',
  description: 'The all-in-one unblocked platform',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="carbon"
      className={`${barlow.variable} ${rajdhani.variable} ${spaceGrotesk.variable} ${ibmPlexSans.variable}`}
      style={{ ['--font-body' as string]: "'Barlow', sans-serif" }}
    >
      <body>
        <ThemeProvider>
          <FontProvider>
            {children}
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
