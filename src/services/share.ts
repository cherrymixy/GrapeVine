/**
 * 공유 링크 생성과 복사 (PRD §5.6).
 */

/**
 * 슬러그를 공유 URL 로 만든다. 순수 함수 — origin 은 호출자가 넘긴다.
 *
 * 서버에서는 요청 헤더의 host, 브라우저에서는 `location.origin` 이 origin 이다.
 * 여기서 직접 읽지 않는 이유는 그 순간 순수하지 않게 되고, 배포 환경마다
 * 다른 값을 테스트에서 재현할 수 없어서다.
 */
export function buildShareUrl(origin: string, slug: string): string {
  // origin 끝의 슬래시를 정리한다 — `https://x.com/` + `/v/abc` 로 `//` 가 되는 걸 막는다.
  return `${origin.replace(/\/+$/, '')}/v/${slug}`;
}

/**
 * 클립보드에 복사한다. 브라우저 전용.
 *
 * `navigator.clipboard` 는 보안 컨텍스트(https 또는 localhost)에서만 존재한다.
 * 없으면 조용히 성공한 척하지 않고 false 를 돌려준다 — 호출자가 "복사됨"을
 * 잘못 표시하지 않도록.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
