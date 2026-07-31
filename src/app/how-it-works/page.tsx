import type { CSSProperties } from 'react';

import { BackLink } from '@/components/back-link';
import { Screen } from '@/components/screen';
import { Sidebar } from '@/components/sidebar';
import { HOW_IT_WORKS_DECORATIONS, HOW_IT_WORKS_STEPS } from '@/data';

import styles from './page.module.css';

/**
 * How It Works — Figma 201:682 번역.
 *
 * 값의 출처가 둘로 갈린다.
 * - 문구와 번호: `data/steps.ts` (절대규칙 6)
 * - 좌표·지름·각도·크기: 아래 표 (순수 비주얼 값)
 *
 * PRD §6 은 "원 크기 스케일 값"도 steps.ts 소관이라고 했지만, 실측 결과 원과
 * 글자가 서로 다른 비율로 줄어들어 스칼라 하나로 표현되지 않는다. 크기·좌표·
 * 각도를 여기 한 표에 모아 둔다 — 흩어 놓는 것보다 고치기 쉽다.
 *
 * 좌표는 전부 프레임(1536×771) 대비 중심 % 다.
 */

type StepVisual = {
  /** 원 — 중심 %, 지름은 폭 대비 % */
  circle: { x: number; y: number; size: number; fill: 'brand' | 'deep' };
  /** 번호 뱃지 — 중심 %, 글자 크기 rem */
  badge: { x: number; y: number; size: number; padding: number };
  /** 문구 — 중심 %, 글자 크기 rem. 줄바꿈은 steps.ts 가 정한다. */
  label: { x: number; y: number; size: number };
  /** 단계 전체 기울기 */
  rotate: number;
  /** 원 위에서 읽히는 글자색 */
  ink: 'dark' | 'light';
};

/** Figma 201:690~201:715. 원과 뱃지는 서로 반대 색이다. */
const STEP_VISUALS: readonly StepVisual[] = [
  {
    // 01 — 201:690 (485) / 201:699 / 201:701
    circle: { x: 14.03, y: 54.799, size: 31.576, fill: 'brand' },
    badge: { x: 8.285, y: 42.213, size: 1.984, padding: 0.417 },
    label: { x: 14.026, y: 54.89, size: 2.976 },
    rotate: 32.96,
    ink: 'dark',
  },
  {
    // 02 — 201:691 (275) / 201:702 / 201:704
    circle: { x: 36.816, y: 35.603, size: 17.904, fill: 'deep' },
    badge: { x: 30.532, y: 37.108, size: 0.959, padding: 0.201 },
    label: { x: 36.816, y: 35.667, size: 1.438 },
    rotate: -15.75,
    ink: 'light',
  },
  {
    // 03 — 201:693 (367) / 201:707 / 201:709
    circle: { x: 55.306, y: 54.799, size: 23.893, fill: 'brand' },
    badge: { x: 49.486, y: 45.577, size: 1.597, padding: 0.335 },
    label: { x: 55.338, y: 54.799, size: 2.395 },
    rotate: 11.56,
    ink: 'dark',
  },
  {
    // 04 — 201:698 (197) / 201:710 / 201:712
    circle: { x: 78.874, y: 55.577, size: 12.826, fill: 'deep' },
    badge: { x: 74.625, y: 56.953, size: 0.648, padding: 0.136 },
    label: { x: 78.884, y: 55.677, size: 0.972 },
    rotate: -18.67,
    ink: 'light',
  },
  {
    // 05 — 201:692 (275) / 201:713 / 201:715
    circle: { x: 90.462, y: 75.681, size: 17.904, fill: 'brand' },
    badge: { x: 86.059, y: 70.406, size: 1.203, padding: 0.253 },
    label: { x: 90.495, y: 75.746, size: 1.805 },
    rotate: 16.43,
    ink: 'dark',
  },
];

/** 단계에 속하지 않는 작은 원들 — 201:695 / 694 / 696 / 697. */
const LOOSE_CIRCLES = [
  { x: 48.307, y: 0, size: 7.422, fill: 'deep' },
  { x: 70.182, y: 45.266, size: 7.422, fill: 'deep' },
  { x: 98.438, y: 56.161, size: 7.422, fill: 'brand' },
  { x: 67.383, y: 97.535, size: 7.422, fill: 'brand' },
] as const;

/** 장식 텍스트 — 201:705 `^_^` / 201:706 `T.T`. */
const DECORATIONS = [
  { x: 70.195, y: 45.248, rotate: 20.95, ink: 'light' as const },
  { x: 98.428, y: 56.56, rotate: -15, ink: 'dark' as const },
];

const FILL = { brand: 'var(--brand)', deep: 'var(--grape-deep)' } as const;
const INK = { dark: 'var(--text)', light: 'var(--text-sub)' } as const;

export default function HowItWorksPage() {
  return (
    <Screen tone="light">
      {LOOSE_CIRCLES.map((circle) => (
        <span
          key={`${circle.x}-${circle.y}`}
          className={`${styles.circle} ${styles.loose}`}
          aria-hidden="true"
          style={
            {
              '--x': `${circle.x}%`,
              '--y': `${circle.y}%`,
              '--size': `${circle.size}%`,
              '--fill': FILL[circle.fill],
            } as CSSProperties
          }
        />
      ))}

      {STEP_VISUALS.map((visual, index) => {
        const step = HOW_IT_WORKS_STEPS[index];
        if (!step) return null;

        return (
          <span key={step.no} className={styles.stepGroup}>
            <span
              className={styles.circle}
              aria-hidden="true"
              style={
                {
                  '--x': `${visual.circle.x}%`,
                  '--y': `${visual.circle.y}%`,
                  '--size': `${visual.circle.size}%`,
                  '--fill': FILL[visual.circle.fill],
                } as CSSProperties
              }
            />
            <span
              className={styles.badge}
              style={
                {
                  '--x': `${visual.badge.x}%`,
                  '--y': `${visual.badge.y}%`,
                  '--rotate': `${visual.rotate}deg`,
                  '--badge-size': `${visual.badge.size}rem`,
                  '--badge-padding': `${visual.badge.padding}rem`,
                  // 원과 반대 색
                  '--badge-fill': visual.circle.fill === 'brand' ? FILL.deep : FILL.brand,
                } as CSSProperties
              }
            >
              {step.no}
            </span>
            <span
              className={styles.label}
              style={
                {
                  '--x': `${visual.label.x}%`,
                  '--y': `${visual.label.y}%`,
                  '--rotate': `${visual.rotate}deg`,
                  '--label-size': `${visual.label.size}rem`,
                  '--label-ink': INK[visual.ink],
                } as CSSProperties
              }
            >
              {step.lines.map((line) => (
                <span key={line} className={styles.labelLine}>
                  {line}
                </span>
              ))}
            </span>
          </span>
        );
      })}

      {DECORATIONS.map((decoration, index) => (
        <span
          key={HOW_IT_WORKS_DECORATIONS[index]}
          className={styles.decoration}
          aria-hidden="true"
          style={
            {
              '--x': `${decoration.x}%`,
              '--y': `${decoration.y}%`,
              '--rotate': `${decoration.rotate}deg`,
              '--label-ink': INK[decoration.ink],
            } as CSSProperties
          }
        >
          {HOW_IT_WORKS_DECORATIONS[index]}
        </span>
      ))}

      <Sidebar variant="guest" current="/how-it-works" />
      <BackLink href="/" />
    </Screen>
  );
}
