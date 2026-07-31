import styles from './decor-grapes.module.css';

/** 프레임(1536×771) 대비 중심 좌표와 지름. 전부 % 다. */
export type DecorGrape = {
  /** 중심 x — 프레임 폭 대비 % */
  x: number;
  /** 중심 y — 프레임 높이 대비 % */
  y: number;
  /** 지름 — 프레임 폭 대비 % */
  size: number;
};

/**
 * 배경에 흩어진 장식 포도알.
 *
 * 판의 슬롯과는 무관하다 — 슬롯 좌표는 `data/slot-layout.ts` 가 갖고 있고
 * 이건 화면별 장식이라 각 페이지가 좌표를 넘긴다.
 *
 * 텍스트보다 **뒤에** 깔린다 (Figma 레이어 순서). About 은 포도알이 헤드라인과
 * 겹치는데, 글자가 위에 와야 시안과 같다.
 */
/**
 * `grape` 는 포도알 색(Main·About), `panel` 은 패널과 같은 옅은 면
 * (Login·Sign Up — 바탕 위에 거의 안 보일 만큼 옅게 얹힌다).
 */
export type DecorTone = 'grape' | 'panel';

export function DecorGrapes({
  grapes,
  tone = 'grape',
}: {
  grapes: readonly DecorGrape[];
  tone?: DecorTone;
}) {
  return (
    <>
      {grapes.map((grape) => (
        <span
          key={`${grape.x}-${grape.y}`}
          className={styles.grape}
          data-tone={tone}
          style={{
            left: `${grape.x}%`,
            top: `${grape.y}%`,
            width: `${grape.size}%`,
            aspectRatio: '1 / 1',
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
