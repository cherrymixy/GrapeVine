import { Sidebar } from '@/components/sidebar';
import { HOW_IT_WORKS_DECORATIONS, HOW_IT_WORKS_STEPS, copy } from '@/data';

// 회색박스. PRD §5.3 의 "원 크기를 점점 줄여가는" 스케일 연출은 디자인 패스.
// steps.ts 의 scale 값이 아직 전부 1 이라 지금은 크기 차이가 없다.
export default function HowItWorksPage() {
  return (
    <main>
      <Sidebar variant="guest" />
      <h1>{copy.howItWorks.title}</h1>

      <ol data-testid="steps">
        {HOW_IT_WORKS_STEPS.map((step) => (
          <li key={step.no} data-step={step.no} data-scale={step.scale}>
            <span>{step.no}</span>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>

      <p data-testid="decorations">{HOW_IT_WORKS_DECORATIONS.join(' ')}</p>
    </main>
  );
}
