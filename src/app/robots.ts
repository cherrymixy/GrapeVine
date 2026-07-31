import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/site';

/**
 * 검색엔진 규칙 (STEP 20).
 *
 * ## `/v/[slug]` 를 색인에서 뺀다
 *
 * 이 서비스의 **비목표에 "포도밭 둘러보기"가 있다.** 남의 판을 구경하는
 * 경로를 의도적으로 만들지 않았는데, 검색엔진이 판을 색인하면 **뒷문으로
 * 그 기능이 생긴다** — "Vine" 으로 검색하면 남들이 받은 칭찬이 나온다.
 *
 * 슬러그는 10자 무작위라 "비공개"가 아니라 "링크를 아는 사람만"이다.
 * 절대규칙 4(세션과 무관하게 항상 공개)는 **로그인을 요구하지 말라**는
 * 뜻이지 **널리 알리라**는 뜻이 아니다. 둘은 충돌하지 않는다.
 *
 * `/my` 와 계정 화면도 뺀다 — 색인될 내용이 없고 로그인으로 튕긴다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/about', '/how-it-works'],
      disallow: ['/v/', '/my', '/login', '/signup', '/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
