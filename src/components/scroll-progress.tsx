import styles from './scroll-progress.module.css';

/**
 * 스크롤 진행률 인디케이터 (PRD §5.1 "스크롤 진행률 인디케이터 노출").
 *
 * 하네스가 씬에 얹어 둔 `--scroll-progress` 를 CSS 로 그대로 읽는다 —
 * **JS 가 한 줄도 없다.** 그래서 서버 컴포넌트로 남는다.
 *
 * `aria-hidden` 인 이유: 스크롤 위치는 브라우저가 이미 보조기술에 알린다.
 * 같은 사실을 한 번 더 읽어 주면 중복이고, 진행률은 초당 60번 바뀌어서
 * 라이브 영역으로 두면 소음이 된다. 이건 **눈으로 보는 메아리**다.
 */
export function ScrollProgress() {
  return (
    <div className={styles.indicator} aria-hidden="true" data-testid="scroll-progress">
      <div className={styles.fill} />
    </div>
  );
}
