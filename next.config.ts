import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 홈 디렉터리에 무관한 package-lock.json 이 있어 Next가 워크스페이스 루트를
  // 잘못 추론한다. 루트를 이 폴더로 못박아 파일 트레이싱을 결정적으로 만든다.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
