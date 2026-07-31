import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { copy } from '@/data';
import { siteUrl } from '@/lib/site';
import { kodeMono, plexSansKr } from '@/lib/fonts';

import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'GRAPEVINE',
  description: copy.main.subtitle,
  icons: { icon: '/images/favicon.svg' },
  openGraph: {
    title: 'GRAPEVINE',
    description: copy.main.subtitle,
    images: [{ url: '/images/og.png', width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // 두 폰트의 CSS 변수를 함께 건다. tokens.css 의 --font-mono 가 둘을
  // 한 스택으로 묶어, 라틴은 Kode Mono 로 그려지고 한글은 글리프가 없어
  // 자연히 다음 폰트로 넘어간다.
  return (
    <html lang="en" className={`${kodeMono.variable} ${plexSansKr.variable}`}>
      <body>{children}</body>
    </html>
  );
}
