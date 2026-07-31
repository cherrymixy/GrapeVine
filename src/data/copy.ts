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

/**
 * 브랜딩용 태그라인 (PRD §1). 문장이라 마침표가 붙는다.
 * 화면 헤드라인은 마침표가 없다 — 아래 `HEADLINE` 참조.
 */
const TAGLINE = 'Grapes are growing on the vine.';

/**
 * Main·About 헤드라인 (Figma 201:654 / 201:681).
 *
 * 태그라인과 달리 **마침표가 없다.** PRD §1 의 태그라인에는 있지만
 * 비주얼 SSOT 인 Figma 의 헤드라인 노드에는 없다(PRD §12).
 * 문장이 아니라 표제로 쓰이기 때문이다.
 */
const HEADLINE = 'Grapes are growing on the vine';

/**
 * Figma 가 손으로 끊어 놓은 줄들.
 *
 * 폭만 주고 자연 줄바꿈에 맡기면 브라우저 글자 폭이 미세하게 달라 다른
 * 지점에서 끊긴다. 시안의 조판이 곧 디자인이므로 끊는 위치를 여기 둔다.
 * 한 줄짜리 문장이 필요한 곳(메타데이터 등)은 `join(' ')` 로 합쳐 쓴다.
 */
const MAIN_SUBTITLE_LINES = [
  'The compliments friends leave on my grapevine grow into grapes.',
  'Leave compliments that were hard to say face-to-face.',
] as const;

/** Figma 201:679 — 네 줄. 셋째 줄은 문장 중간에서 끊긴다. */
const ABOUT_BODY_LINES = [
  'This is a compliment board to share with friends.',
  'Create your tree and share the link with your friends.',
  'Friends can add compliments to your board',
  'and help your grapes grow without logging in.',
] as const;

export const copy = {
  tagline: TAGLINE,
  headline: HEADLINE,

  /** 공통 셸 — 우상단 세로 사이드바 (PRD §5.0) */
  nav: {
    about: 'About',
    howItWorks: 'How It Works',
    login: 'Login',
    myVine: 'My Vine',
    shareMyVine: 'Share My Vine',
    setting: 'Setting',
  },

  /** Main `/` — PRD §5.1 / Figma 201:645 */
  main: {
    title: HEADLINE,
    subtitleLines: MAIN_SUBTITLE_LINES,
    subtitle: MAIN_SUBTITLE_LINES.join(' '),
  },

  /** About `/about` — PRD §5.2 / Figma 201:667 */
  about: {
    /** 헤드라인은 "About" 이 아니라 태그라인이다 (201:681). */
    title: HEADLINE,
    bodyLines: ABOUT_BODY_LINES,
    body: ABOUT_BODY_LINES.join(' '),
    /** 헤드라인 오른쪽에 작게 붙는 장식 문구 (201:680). */
    note: 'is...',
  },

  /** How It Works `/how-it-works` — PRD §5.3. 단계 텍스트는 data/steps.ts. */
  howItWorks: {
    /**
     * Figma 201:682 에는 화면 타이틀이 없다 — 뒤로가기와 단계 원만 있다.
     * 사이드바 라벨용으로만 남겨 둔다.
     */
    title: 'How It Works',
  },

  /** Login / Sign Up — PRD §5.4 */
  auth: {
    idLabel: 'ID',
    passwordLabel: 'PASSWORD',
    /** 패널 타이틀 (201:731). 버튼의 `Log in` 과 I 의 대소문자가 다르다. */
    logInTitle: 'Log In',
    logIn: 'Log in',
    signUpPrompt: "Don't have an account?",
    signUp: 'Sign Up',
    // TODO(승아): PRD §5.4 는 로그인 폼만 정의하고 가입 폼 문구를 주지 않았다.
    // 아래 둘은 회색박스용 잠정값 — 피그마 가입 화면이 나오면 교체할 것.
    displayNameLabel: 'DISPLAY NAME',
    logOut: 'Log out',
  },

  /** My Vine `/my` — PRD §5.5 */
  myVine: {
    createVine: 'Create My Vine',
  },

  /** Share My Vine 모달 — PRD §5.6 */
  share: {
    /*
     * 복사 결과 (STEP 23, 승아님 지시).
     * 눌렀는데 아무 말이 없으면 됐는지 알 수 없다 — 이 링크가 이 서비스의
     * 전부라 더더욱 확인이 필요하다.
     */
    copied: 'Copied!',
    copyFailed: 'Could not copy. Select the link and copy it.',
    title: 'Share My Vine',
    copy: 'Copy',
  },

  /** Setting 모달 — PRD §5.7 */
  setting: {
    title: 'Setting',
    myAccount: 'My Account',

    /*
     * 설정 항목 (STEP 23).
     *
     * 전에는 `...` 네 줄이 비활성으로 놓여 있었다 — PRD §5.7 이 "미정 4행"
     * 이라고만 해서 자리만 잡아 뒀다. 실제 내용을 채웠다.
     *
     * ⚠️ 아래 문서는 **이 앱이 실제로 하는 일**만 적었다. 안 하는 일을 적으면
     *    (광고·제3자 제공·추적 같은 것) 사실이 아닌 약관이 된다.
     *    법률 검토를 받은 문서가 아니다 — 배포 전에 확인이 필요하면 승아님이
     *    이 문구를 교체하면 된다.
     */
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    openSource: 'Open Source',
    logOutRow: 'Log Out',
  },

  /** Setting 안쪽 문서 (STEP 23). 전부 영문 — 이 서비스의 UI 언어다. */
  documents: {
    privacy: {
      title: 'Privacy Policy',
      body: [
        'What we keep',
        'Your login ID, a password (stored hashed by our authentication provider, never in plain text), and the display name your friends see.',
        'The compliments left on your vine, and the name each writer typed. If a writer chooses Unknown, no name is stored — the field is discarded on the server, not just hidden.',
        'What we do not keep',
        'No email address, phone number, or real name. No analytics, no advertising, no third-party trackers. We do not sell or share anything.',
        'Who can see your vine',
        'Anyone holding the link. The link is a random 10-character address that is not listed anywhere and is excluded from search engines, but it is not a secret — treat it like a shared photo.',
        'Deleting',
        'Deleting your account removes your vine, its pages, and every compliment on it in the same operation.',
      ],
    },
    terms: {
      title: 'Terms of Service',
      body: [
        'What this is',
        'GRAPEVINE is a place to collect compliments. One click creates a board of 15 grapes; anyone with your link can attach one compliment to an empty grape without signing in.',
        'The rules',
        'One vine per account. A compliment is at most 80 characters. Visitors can only add — nothing can be edited or deleted once attached, by the writer or by you. You cannot write on your own vine.',
        'Behave',
        'Write things you would be glad to have read aloud. Do not use the compliment field for harassment, advertising, or anything unlawful.',
        'No promises',
        'This is a personal project offered as-is, with no guarantee that it stays online or that your data survives. Keep anything you want to keep somewhere else too.',
      ],
    },
    openSource: {
      title: 'Open Source',
      body: [
        'Built with',
        'Next.js (App Router) · React · TypeScript · Supabase (Postgres) · Lenis · Vitest. Each is used under its own license.',
        'Type',
        'Kode Mono for Latin, IBM Plex Sans KR for Korean. Both are licensed under the SIL Open Font License 1.1.',
        'The source',
        'github.com/cherrymixy/GrapeVine',
      ],
    },
  },

  /** 공통 셸 — PRD §5.0 */
  shell: {
    // TODO(승아): 닫기/뒤로 라벨 미지정. 피그마는 `<` 아이콘이다.
    close: 'Close',
    back: '<',
    nextPage: '>',
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

  /** Add Grape 모달 — PRD §5.10 / Figma 201:904 */
  addGrape: {
    title: (ownerName: string) => `Compliment ${ownerName}`,
    /** 타이틀 첫 줄. 이름은 다음 줄에 밑줄로 온다 (201:924). */
    titleLead: 'Compliment',
    /** 익명 토글 라벨 */
    anonymous: 'Unknown',
    send: 'Send',
  },

  // TODO(승아): 빈 상태 문구. PRD §6 는 copy.ts 소관이라고만 하고 문안을 주지 않았다.
  empty: {},

  /** 없는 판 (STEP 20). Figma 에 404 시안이 없다. */
  notFound: {
    title: 'This vine is gone.',
    body: 'The link may be wrong, or this vine was never here.',
    home: 'Go to GRAPEVINE',
  },

  /** 서버가 넘어졌을 때 (STEP 20). */
  crashed: {
    title: 'Something went wrong.',
    body: 'Not your fault. Try again in a moment.',
    retry: 'Try again',
  },

  /*
   * 에러 문구 (STEP 20).
   *
   * ⚠️ 지금까지는 도메인 에러 **코드가 그대로** 화면에 나왔다
   *    (`MESSAGE_TOO_LONG` 같은 게 사용자에게 보였다). 코드는 우리끼리
   *    쓰는 말이고 사용자에게는 무엇을 어떻게 고치면 되는지가 필요하다.
   *
   * ⚠️ PRD 에도 Figma 에도 문안이 없다. 아래는 내가 쓴 것이라 승아님이
   *    바꿀 것 — 톤만 맞췄다(짧게, 탓하지 않게, 다음 행동을 알려주게).
   *
   * 키는 `lib/errors.ts` 의 `code` 와 1:1 이다. 새 에러를 만들면 여기도
   *    추가해야 하고, 빠뜨리면 `UNKNOWN` 으로 떨어진다.
   */
  errors: {
    // --- 방문자가 칭찬을 붙일 때 ---
    EMPTY_MESSAGE: 'Write something first.',
    MESSAGE_TOO_LONG: 'Keep it under 80 characters.',
    INVALID_AUTHOR_NAME: 'Leave your name, or choose Unknown.',
    OWNER_CANNOT_ADD_GRAPE: 'This is your own vine.',
    PAGE_FULL: 'This page just filled up. Open the next one.',
    SLOT_TAKEN: 'Someone took that spot. Try once more.',

    // --- 판을 찾을 수 없을 때 ---
    VINE_NOT_FOUND: 'This vine is gone.',
    PAGE_NOT_FOUND: 'That page is gone.',

    // --- 계정 ---
    INVALID_CREDENTIALS: 'Wrong ID or password.',
    LOGIN_ID_TAKEN: 'That ID is taken.',
    /*
     * ⚠️ 칸별로 갈라 놓았다. 하나로 묶어 두면 무엇을 고쳐야 할지 알 수 없다.
     *    규칙은 `lib/auth.ts` 와 같은 값이어야 한다 — 한쪽만 바꾸면 안내와
     *    실제 동작이 어긋난다.
     */
    SIGNUP_LOGIN_ID: 'ID must be 3–30 characters: letters, numbers, . _ -',
    SIGNUP_PASSWORD: 'Password must be at least 6 characters.',
    SIGNUP_DISPLAY_NAME: 'Enter a display name (1–40 characters).',
    /** 칸을 못 가렸을 때만. 위 셋이 정상이면 여기 올 일이 없다. */
    INVALID_SIGNUP_INPUT: 'Check your ID, password, and name.',
    OWNER_ALREADY_HAS_VINE: 'You already have a vine.',

    /*
     * 아래는 사용자가 고칠 수 있는 게 없다. 무슨 일이 있었는지 설명하는
     * 대신 다시 해보라고만 한다 — 내부 사정을 흘리지 않는다.
     */
    AUTH_FAILURE: 'Could not sign you in. Try again.',
    REPOSITORY_FAILURE: 'Something went wrong. Try again.',
    SLOT_OUT_OF_RANGE: 'Something went wrong. Try again.',
    SLUG_COLLISION: 'Something went wrong. Try again.',
    SLUG_EXHAUSTED: 'Something went wrong. Try again.',

    /** 위에 없는 코드가 오면 여기로. 코드를 그대로 보여 주지 않는다. */
    UNKNOWN: 'Something went wrong. Try again.',
  },
} as const;
