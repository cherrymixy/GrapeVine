import { copy } from '@/data';

/**
 * 공통 셸의 우상단 세로 스택 사이드바 (PRD §5.0).
 *
 * 회색박스 — 라운드 아웃라인 pill 은 디자인 패스(STEP 12~13).
 * 여기서는 링크 3개의 구조와 세션별 구성만 고정한다.
 *
 * 모달은 쿼리 파라미터로 연다(`?modal=share`). 클라이언트 상태 없이
 * 서버 렌더만으로 동작하고, 링크로 바로 열 수 있으며, JS 없이도 된다.
 */

export type SidebarVariant = 'guest' | 'owner';

export function Sidebar({ variant }: { variant: SidebarVariant }) {
  const items =
    variant === 'guest'
      ? [
          { href: '/about', label: copy.nav.about },
          { href: '/how-it-works', label: copy.nav.howItWorks },
          { href: '/login', label: copy.nav.login },
        ]
      : [
          { href: '/my', label: copy.nav.myVine },
          { href: '/my?modal=share', label: copy.nav.shareMyVine },
          { href: '/my?modal=setting', label: copy.nav.setting },
        ];

  return (
    <nav data-testid="sidebar" data-variant={variant}>
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href}>{item.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
