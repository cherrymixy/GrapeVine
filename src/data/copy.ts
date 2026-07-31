/**
 * 문구 전량 — PRD §6.
 *
 * 절대규칙 6: 문구는 이 파일에서만. 컴포넌트에 하드코딩 금지.
 *
 * 여기 채워진 값은 전부 PRD 에 문자 그대로 적혀 있는 것들이다(§5.1~§5.10).
 * PRD 가 지정하지 않은 문구(About 타이틀·에러·빈 상태)는 지어내지 않고
 * TODO 로 비워 뒀다 — 작업규칙 8.
 *
 * How It Works 01~05 는 PRD §6 상 data/steps.ts 소관이라 여기 없다.
 */

const TAGLINE = 'Grapes are growing on the vine.';

export const copy = {
  tagline: TAGLINE,

  /** 공통 셸 — 우상단 세로 사이드바 (PRD §5.0) */
  nav: {
    about: 'About',
    howItWorks: 'How It Works',
    login: 'Login',
    myVine: 'My Vine',
    shareMyVine: 'Share My Vine',
    setting: 'Setting',
  },

  /** Main `/` — PRD §5.1 */
  main: {
    title: TAGLINE,
    subtitle:
      'The compliments friends leave on my grapevine grow into grapes. Leave compliments that were hard to say face-to-face.',
  },

  /** About `/about` — PRD §5.2 */
  about: {
    // TODO(승아): About 타이틀. PRD 는 "타이틀 + 설명 문단"이라고만 하고 문구를 주지 않았다.
    body: 'This is a compliment board to share with friends. Create your tree and share the link with your friends. Friends can add compliments to your board and help your grapes grow without logging in.',
  },

  /** Login / Sign Up — PRD §5.4 */
  auth: {
    idLabel: 'ID',
    passwordLabel: 'PASSWORD',
    logIn: 'Log in',
    signUpPrompt: "Don't have an account?",
    signUp: 'Sign Up',
  },

  /** My Vine `/my` — PRD §5.5 */
  myVine: {
    createVine: 'Create My Vine',
  },

  /** Share My Vine 모달 — PRD §5.6 */
  share: {
    title: 'Share My Vine',
    copy: 'Copy',
  },

  /** Setting 모달 — PRD §5.7 */
  setting: {
    title: 'Setting',
    myAccount: 'My Account',
  },

  /** See Grape 모달 — PRD §5.8 */
  seeGrape: {
    /** isAnonymous 인 알의 작성자 표시 */
    anonymousAuthor: 'Unknown',
  },

  /** Other's Vine `/v/[slug]` — PRD §5.9 */
  othersVine: {
    title: (ownerName: string) => `${ownerName}'s Vine`,
    addGrape: 'Add Grape',
    /** 이 페이지가 꽉 찼을 때의 비활성 CTA */
    full: 'Here is Full!',
  },

  /** Add Grape 모달 — PRD §5.10 */
  addGrape: {
    title: (ownerName: string) => `Compliment ${ownerName}`,
    /** 익명 토글 라벨 */
    anonymous: 'Unknown',
    send: 'Send',
  },

  // TODO(승아): 빈 상태 문구. PRD §6 는 copy.ts 소관이라고만 하고 문안을 주지 않았다.
  empty: {},

  // TODO(승아): 에러 문구 전량. PRD 에 문안이 없다.
  // 최소 필요 목록 (STEP 6~7 에서 확정):
  //   - 없는 슬러그 / 삭제된 판
  //   - 칭찬 80자 초과
  //   - 익명 아닌데 이름 미입력
  //   - 전송 실패(네트워크)
  //   - 주인 본인은 자기 판에 작성 불가 (PRD §7-7)
  errors: {},
} as const;
