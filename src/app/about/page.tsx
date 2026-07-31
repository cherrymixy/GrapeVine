import { Sidebar } from '@/components/sidebar';
import { copy } from '@/data';

// 회색박스. PRD §5.2 의 배경 포도알 4개 산포는 디자인 패스.
export default function AboutPage() {
  return (
    <main>
      <Sidebar variant="guest" />
      <h1>{copy.about.title}</h1>
      <p>{copy.about.body}</p>
    </main>
  );
}
