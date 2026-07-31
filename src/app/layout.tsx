import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { copy } from '@/data';
import { kodeMono, plexSansKr } from '@/lib/fonts';

import '@/styles/globals.css';

/**
 * OG 이미지는 **절대 URL** 이어야 스크래퍼가 가져갈 수 있다.
 * metadataBase 를 안 주면 Next 가 localhost 를 붙여 공유 시 404 가 된다.
 * 도메인이 아직 없으므로 배포 환경이 알려주는 값을 쓰고, 없으면 로컬로 둔다.
 *
 * ⚠️ `/` 는 정적 프리렌더라 이 값이 **빌드 시점에 박힌다.**
 *    `next start` 에만 넣으면 반영되지 않는다 — 빌드 환경에 설정할 것.
 *    Vercel 은 VERCEL_URL 을 빌드 때 자동으로 준다.
 */
const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

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
