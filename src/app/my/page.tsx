import { redirect } from 'next/navigation';

import { copy } from '@/data';
import { getCurrentUser } from '@/services/auth';

// 회색박스 (작업규칙 5). 판 생성 버튼 배선은 STEP 5.
export default async function MyVinePage() {
  // proxy.ts 가 이미 걸러내지만 여기서 **다시** 확인한다.
  // Next 문서가 proxy 단독 의존을 명시적으로 경고한다 — matcher 변경이나
  // 라우트 이동으로 가드가 조용히 빠질 수 있다.
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main>
      <h1>{copy.nav.myVine}</h1>
      <p data-testid="display-name">{user.displayName}</p>

      <form method="post" action="/api/auth/logout">
        <button type="submit">{copy.auth.logOut}</button>
      </form>
    </main>
  );
}
