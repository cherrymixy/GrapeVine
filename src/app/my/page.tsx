import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { CopyButton } from '@/components/copy-button';
import { copy } from '@/data';
import { createServiceRoleClient } from '@/lib/supabase';
import { SupabaseVineRepository } from '@/repositories/supabase-vine-repository';
import { getCurrentUser } from '@/services/auth';
import { buildShareUrl, resolveOrigin } from '@/services/share';

// 회색박스 (작업규칙 5). 판 렌더와 Create My Vine 배선은 STEP 7.
export default async function MyVinePage() {
  // proxy.ts 가 이미 걸러내지만 여기서 **다시** 확인한다.
  // Next 문서가 proxy 단독 의존을 명시적으로 경고한다 — matcher 변경이나
  // 라우트 이동으로 가드가 조용히 빠질 수 있다.
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const repository = new SupabaseVineRepository(createServiceRoleClient());
  const vine = await repository.getVineByOwnerId(user.id);

  // origin 은 요청 헤더에서 얻는다. 배포 도메인을 코드나 env 에 박지 않기 위해서다.
  const headerList = await headers();
  const origin = resolveOrigin({
    host: headerList.get('host'),
    forwardedProto: headerList.get('x-forwarded-proto'),
  });
  const shareUrl = vine ? buildShareUrl(origin, vine.slug) : null;

  return (
    <main>
      <h1>{copy.nav.myVine}</h1>
      <p data-testid="display-name">{user.displayName}</p>

      {shareUrl ? (
        <section>
          <h2>{copy.share.title}</h2>
          <input data-testid="share-url" readOnly value={shareUrl} />
          <CopyButton value={shareUrl} />
        </section>
      ) : (
        // PRD §5.5 — 옵션 없음, 버튼 하나. 리빌 연출은 STEP 17.
        <form method="post" action="/api/vine">
          <button type="submit" data-testid="create-vine">
            {copy.myVine.createVine}
          </button>
        </form>
      )}

      <form method="post" action="/api/auth/logout">
        <button type="submit">{copy.auth.logOut}</button>
      </form>
    </main>
  );
}
