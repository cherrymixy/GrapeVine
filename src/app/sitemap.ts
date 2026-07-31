import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/site';

/**
 * 사이트맵 (STEP 20).
 *
 * **랜딩 3종만** 넣는다. 판(`/v/[slug]`)은 여기 들어가면 안 된다 —
 * 사이트맵은 "이걸 색인해 달라"는 목록이고, 그건 `robots.ts` 가 막으려는
 * 바로 그 일이다. 판 목록을 여기 흘리면 비목표("포도밭 둘러보기")가
 * 뒷문으로 생긴다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/about', '/how-it-works'].map((path) => ({
    url: `${siteUrl}${path === '/' ? '' : path}`,
  }));
}
