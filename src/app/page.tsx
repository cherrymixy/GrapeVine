import { DecorGrapes, type DecorGrape } from '@/components/decor-grapes';
import { Screen } from '@/components/screen';
import { ScrollCue } from '@/components/scroll-cue';
import { ScrollProgress } from '@/components/scroll-progress';
import { REVEAL_CLASS, revealStyle } from '@/components/reveal';
import { ScrollScene } from '@/components/scroll-scene';
import { ScrubBackdrop } from '@/components/scrub-backdrop';
import { Sidebar } from '@/components/sidebar';
import { MAIN_CUES, MAIN_SCENE, copy } from '@/data';

import styles from './page.module.css';

/**
 * Main — Figma 201:645 번역 + 스크롤 하네스 (STEP 14).
 *
 * 화면 자체는 STEP 12 에서 번역한 마지막 프레임 그대로다. 이번에 달라진 건
 * 그 화면이 **긴 스크롤 구간 안에 핀으로 붙잡혀** 있고, 얼마나 굴렸는지가
 * `0..1` 로 흘러나온다는 것뿐이다 (PRD §5.1 / §9.1).
 *
 * 그 진행률로 영상을 스크럽하는 건 STEP 15, 오버레이를 구간에 매핑하는 건
 * STEP 16 이다. 여기서는 **바닥만 깐다** — 작업규칙 4, STEP 하나 = 연출 하나.
 *
 * `ScrollScene` 은 클라이언트 컴포넌트지만 이 페이지는 서버 컴포넌트로
 * 남는다 — 화면을 `children` 으로 넘기기 때문이다.
 */

/** 헤드라인 마지막 낱말에 선택 하이라이트가 걸린다 (201:653 — "vine"). */
function splitTrailingWord(text: string): [string, string] {
  const at = text.trimEnd().lastIndexOf(' ');
  if (at < 0) return ['', text];
  return [text.slice(0, at + 1), text.slice(at + 1)];
}

/** 프레임(1536×771) 대비 %. Figma 201:658 / 659 / 660. */
const GRAPES: readonly DecorGrape[] = [
  { x: 68.066, y: 69.585, size: 10.612 }, // 964, 455
  { x: 52.376, y: 48.443, size: 10.612 }, // 723, 292
  { x: 32.585, y: 83.852, size: 10.612 }, // 419, 565
];

export default function MainPage() {
  const [lead, highlighted] = splitTrailingWord(copy.main.title);

  return (
    <ScrollScene length={MAIN_SCENE.length} lerp={MAIN_SCENE.lerp}>
      <Screen background="/images/main_2.png" tone="light" priority>
        {/*
          Screen 의 첫 자식이어야 한다. 배경 스틸·영상·장식 포도알이 모두
          z-index -1 이라 **DOM 순서가 곧 페인트 순서**다 — 여기 있어야
          스틸 위, 포도알 아래에 앉는다.

          배경 스틸(main_2.png)은 영상의 마지막 프레임이라 reduce 폴백이자
          영상이 뜨기 전의 바탕이고, 포스터(main_0.png)는 **첫 프레임**이다.
          포스터로 마지막 프레임을 쓰면 로드 직후 완성된 넝쿨이 빈 화면으로
          튄다.
        */}
        <ScrubBackdrop src="/video/main.mp4" poster="/images/main_0.png" />

        {/* 후반부에 하나씩 (PRD §5.1). 구간은 GRAPES 순서와 짝지어진다. */}
        <DecorGrapes grapes={GRAPES} reveal={MAIN_CUES.grapes} />

        {/*
          Sidebar 는 About·Login 등 다섯 화면이 함께 쓴다. 연출 때문에
          공용 컴포넌트에 prop 을 늘리는 대신 여기서 감싼다 — `.sidebar` 는
          absolute 인데 이 div 는 정적이라 위치 기준(`.content`)이 그대로다.
        */}
        <div className={REVEAL_CLASS} style={revealStyle(MAIN_CUES.sidebar)}>
          <Sidebar variant="guest" />
        </div>

        <h1 className={`${styles.title} ${REVEAL_CLASS}`} style={revealStyle(MAIN_CUES.title)}>
          {lead}
          <span className={styles.selected}>
            {highlighted}
            {/*
              손잡이 점은 **별도 엘리먼트**다. `.selected` 에 클래스를 하나 더
              얹으면 `::before`/`::after` 가 겹쳐 세로 막대가 사라진다.
            */}
            <span className={styles.handles} aria-hidden="true" />
          </span>
        </h1>

        <p className={`${styles.subtitle} ${REVEAL_CLASS}`} style={revealStyle(MAIN_CUES.subtitle)}>
          {copy.main.subtitleLines.map((line) => (
            <span key={line} className={styles.subtitleLine}>
              {line}
            </span>
          ))}
        </p>

        <ScrollCue cue={MAIN_CUES.scrollCue} />
        <ScrollProgress />
      </Screen>
    </ScrollScene>
  );
}
