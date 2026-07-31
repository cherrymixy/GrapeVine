import { SLOT_LAYOUT, SOURCE_FRAME } from '@/data/slot-layout';
import type { PageView } from '@/models';

/**
 * 포도판 — 알 15개를 고정 좌표에 절대배치한다.
 *
 * 좌표는 `data/slot-layout.ts` 에서만 온다 (절대규칙 5 — px 하드코딩 금지).
 * 여기 있는 숫자는 전부 그 파일에서 읽은 값이고 이 파일이 정하는 값은 없다.
 *
 * 회색박스: 색·보더·라운드는 디자인 패스(STEP 12~13). 빈/채움은 임시 텍스트
 * (○/●)와 `data-filled` 로만 구분한다.
 *
 * ⚠️ 컨테이너는 원본 프레임의 종횡비를 유지해야 한다. x 는 폭 대비, y 는 높이
 * 대비로 환산된 값이라 비율이 달라지면 알과 배경 넝쿨이 어긋난다.
 */
export function GrapeBoard({
  view,
  slotHref,
}: {
  view: PageView;
  /** 채워진 알을 눌렀을 때 갈 곳. 없으면 읽기 전용(방문자). */
  slotHref?: (slotIndex: number) => string;
}) {
  return (
    <div
      data-testid="board"
      style={{
        position: 'relative',
        aspectRatio: `${SOURCE_FRAME.width} / ${SOURCE_FRAME.height}`,
      }}
    >
      {view.slots.map((slot) => {
        const layout = SLOT_LAYOUT[slot.slotIndex];
        // 좌표가 아직 없는 슬롯은 그리지 않는다 — 임의의 자리에 던져 놓으면
        // 화면은 채워지지만 틀린 배치가 남는다.
        if (!layout) return null;

        const filled = slot.grape !== null;
        const style = {
          position: 'absolute' as const,
          // xPct/yPct 는 알의 **중심**이라 절반만큼 되민다.
          left: `${layout.xPct}%`,
          top: `${layout.yPct}%`,
          width: `${layout.sizePct}%`,
          aspectRatio: '1 / 1',
          transform: 'translate(-50%, -50%)',
        };

        const label = filled ? '●' : '○';

        if (filled && slotHref) {
          return (
            <a
              key={slot.slotIndex}
              href={slotHref(slot.slotIndex)}
              data-slot={slot.slotIndex}
              data-filled="true"
              style={style}
            >
              {label}
            </a>
          );
        }

        return (
          <span
            key={slot.slotIndex}
            data-slot={slot.slotIndex}
            data-filled={filled}
            style={style}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
