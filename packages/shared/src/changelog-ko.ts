import type { ChangelogEntry } from "./changelog.js";

export const koEntries: ChangelogEntry[] = [
  {
    version: "0.22.0",
    date: "2026-10-29",
    highlights: [
      "도메인 이전 후 앱이 nib.am에 연결됩니다.",
      "공지를 제자리에서 펼칠 수 있고 읽으면 안 읽음 점이 사라집니다.",
      "문제 신고와 릴리스 노트가 이제 Nib 저장소를 가리킵니다.",
      "웹 로그인 후 브라우저에서 앱으로 돌아올 수 있습니다.",
    ],
  },
  {
    version: "0.21.0",
    date: "2026-10-28",
    highlights: [
      "Nib 첫 공개 빌드: 한 번 설치, 한 번 로그인, 모든 모델.",
      "Nib 계정으로 로그인하면 브라우저 승인 페이지가 코드와 함께 열립니다.",
      "작성창에 플랜, 남은 크레딧, 일/주/월 사용량이 표시됩니다.",
      "관리자 공지가 알림 센터의 작업 결과 위에 나타납니다.",
      "Windows x64 설치 파일과 Linux AppImage/deb를 배포했습니다.",
    ],
  },
];
