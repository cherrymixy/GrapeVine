import { IBM_Plex_Sans_KR } from 'next/font/google';
import localFont from 'next/font/local';

/**
 * 폰트 — STEP 11.
 *
 * 영문/모노는 **Kode Mono**. Figma 전 화면이 이 하나만 쓴다(201:648 등).
 * 한글은 Kode Mono 에 글리프가 없어 반드시 폴백이 필요하다. UI 문구는 전부
 * 영문이라, 한글이 나오는 곳은 사용자가 쓴 **칭찬 본문과 displayName** 뿐이다.
 *
 * ⚠️ 두 폰트를 다른 방식으로 로드한다. 일관성보다 실익을 택했다.
 *
 * - Kode Mono → `next/font/local` + `public/fonts/`
 *   서브셋 파일 1개(10KB)라 저장소에 두고 **버전을 고정**할 수 있다.
 *   디자인의 근간이 되는 폰트라 Google 쪽 변경에 흔들리면 안 된다.
 *
 * - IBM Plex Sans KR → `next/font/google`
 *   한글은 `@font-face` 가 **94개**로 쪼개져 있다(유니코드 범위 분할).
 *   수동으로 받아 두면 94개 파일을 관리해야 하고, 하나로 합치면 수 MB 를
 *   전부 내려받게 된다. next/font/google 은 빌드 시 자체 호스팅하면서
 *   unicode-range 를 그대로 유지해 **실제 쓰인 글자의 서브셋만** 받는다.
 */

/**
 * latin 서브셋만 쓴다. 이 범위가 U+0000-00FF 를 포함해 é·ñ·ü 까지 덮는다.
 * latin-ext(폴란드어 ł, 터키어 ğ 등)는 이 서비스에 나오지 않는다.
 *
 * 파일을 두 개 등록하지 않는 이유: `next/font/local` 은 unicode-range 를
 * 표현할 수 없어서, 같은 weight 로 두 개를 넣으면 뒤 파일이 앞을 덮어써
 * 기본 라틴 글리프가 통째로 사라진다.
 */
export const kodeMono = localFont({
  src: '../../public/fonts/kode-mono-400-latin.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-kode-mono',
  /*
   * ⚠️ 여기에 fallback 을 주면 안 된다.
   *
   * `--font-mono` 는 `var(--font-kode-mono), var(--font-kr), …` 로 두 변수를
   * 이어 붙인다. 이 변수에 `monospace` 같은 **generic 키워드**가 들어 있으면
   * 펼쳤을 때 한글 폰트보다 앞에 놓이고, generic 은 그 자리에서 시스템 폰트로
   * 반드시 해결되므로 **뒤에 있는 IBM Plex Sans KR 까지 가지 못한다.**
   * 한글이 시스템 기본 모노로 그려진다(실제로 밟았다).
   *
   * generic 은 `--font-mono` 스택의 **맨 끝에 한 번만** 둔다.
   * next/font 가 만드는 `kodeMono Fallback`(메트릭 보정용)은 그대로 남는다.
   */
});

/**
 * 한글 폴백. 기술적·중립적인 인상이라 Kode Mono 옆에서 튀지 않는다.
 * (IBM Plex 는 Mono 와 한 가족으로 설계돼 모노와 나란히 두기 좋다.)
 *
 * `preload: false` 인 이유: 한글은 사용자가 쓴 본문에만 나오므로 첫 화면의
 * 임계 경로가 아니다. 미리 받으면 영문만 보는 대부분의 방문자가 헛되이
 * 대역폭을 쓴다. 브라우저가 한글을 만나는 순간 해당 서브셋만 가져온다.
 */
export const plexSansKr = IBM_Plex_Sans_KR({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-kr',
  // 시스템 한글 폰트만. generic(`sans-serif`)은 넣지 않는다 — 위와 같은 이유로
  // `--font-mono` 스택 중간에 generic 이 끼면 그 뒤가 죽는다.
  fallback: ['Apple SD Gothic Neo', 'Malgun Gothic'],
});
