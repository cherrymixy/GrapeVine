/**
 * 이 기기에서 영상 대신 이미지 시퀀스를 쓸지 (STEP 19b).
 *
 * PRD §9.1 은 iOS Safari 의 `currentTime` 스크러빙이 불안정하다는 이유로
 * 시퀀스를 **폴백**으로 뒀다. 그런데 실제로 재보니 모바일 해상도에서는
 * 시퀀스가 영상보다 **작다**(Main 1.22MB vs 2.8MB / 리빌 187KB vs 7.8MB).
 * 그래서 "느리면 갈아탄다"가 아니라 처음부터 모바일 기본이다.
 *
 * 느린지 재고 갈아타는 방식(프로브)을 안 쓰는 이유: **재려면 영상을 먼저
 * 받아야 한다.** 갈아탄 뒤에도 받은 건 돌려줄 수 없으니 그게 제일 비싸다.
 *
 * ⚠️ 반드시 마운트 뒤(effect)에만 부른다. 서버에는 `window` 가 없고, 서버가
 *    이 판단을 할 방법도 없다.
 */
export function prefersImageSequence(): boolean {
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    // 손가락으로 쓰는 큰 화면(데스크탑 터치 모니터·대형 태블릿)은 영상이 낫다.
    window.innerWidth <= 900
  );
}
