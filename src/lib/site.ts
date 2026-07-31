/**
 * 이 배포본의 절대 주소.
 *
 * OG 이미지는 **절대 URL** 이어야 스크래퍼가 가져갈 수 있고, robots·sitemap
 * 도 절대 주소를 요구한다. `metadataBase` 를 안 주면 Next 가 localhost 를
 * 붙여 공유 시 404 가 된다.
 *
 * 도메인이 아직 없으므로 배포 환경이 알려주는 값을 쓰고, 없으면 로컬로 둔다.
 *
 * ⚠️ `/` 는 정적 프리렌더라 이 값이 **빌드 시점에 박힌다.**
 *    `next start` 에만 넣으면 반영되지 않는다 — 빌드 환경에 설정할 것.
 *    Vercel 은 VERCEL_URL 을 빌드 때 자동으로 준다.
 *
 * layout·robots·sitemap 세 곳이 같은 값을 봐야 해서 여기로 꺼냈다 (STEP 20).
 * 서로 다르면 OG 는 되는데 sitemap 은 딴 도메인을 가리키는 식으로 어긋난다.
 */
export const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
