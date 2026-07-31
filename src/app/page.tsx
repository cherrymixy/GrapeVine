import { Sidebar } from '@/components/sidebar';
import { copy } from '@/data';

// 회색박스. PRD §5.1 의 스크롤 스크럽 영상·오버레이·진행률은 연출 패스
// (STEP 14~16)에서 붙는다. 여기서는 텍스트만 세운다.
export default function MainPage() {
  return (
    <main>
      <Sidebar variant="guest" />
      <h1>{copy.main.title}</h1>
      <p>{copy.main.subtitle}</p>
    </main>
  );
}
