import type { Metadata } from 'next';
import { Barlow, Rajdhani, Space_Grotesk, IBM_Plex_Sans } from 'next/font/google';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { FontProvider } from '@/contexts/FontContext';
import CloakGuard from '@/components/CloakGuard';
import ThemeEffects from '@/components/ThemeEffects';
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
  title: 'Google Docs',
  description: 'Create and edit documents',
  icons: {
    icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico',
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
      style={{ ['--font-body' as string]: "var(--font-barlow), sans-serif" }}
    >
      <body>
        <CloakGuard />
        <ThemeProvider>
          <FontProvider>
            <ThemeEffects />
            {children}
          </FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
