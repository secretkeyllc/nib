import type { ChangelogEntry } from "./changelog.js";

export const koEntries: ChangelogEntry[] = [

  {
    version: "0.22.8",
    date: "2026-10-30",
    highlights: [
      "Windows on Arm 사이드카가 더 이상 Visual C++ 재배포 패키지를 필요로 하지 않습니다.",
    ],
  },
  {
    version: "0.22.7",
    date: "2026-10-30",
    highlights: [
      "Windows on Arm 설치 프로그램이 릴리스 파이프라인에서 다시 빌드됩니다.",
    ],
  },
  {
    version: "0.22.6",
    date: "2026-10-30",
    highlights: [
      "macOS 빌드가 이제 실제로 ad-hoc 서명되어 Apple Silicon에서 열립니다.",
    ],
  },
  {
    version: "0.22.5",
    date: "2026-10-30",
    highlights: [
      "macOS 다운로드가 이제 실제 빌드입니다. ad-hoc 서명이라 Apple Silicon에서 처음 한 번 시스템 설정에서 허용하면 실행됩니다.",
    ],
  },
  {
    version: "0.22.4",
    date: "2026-10-30",
    highlights: [
      "macOS 빌드가 베타로 제공됩니다. ad-hoc 서명이라 첫 실행 시 시스템 설정에서 한 번 허용해야 합니다.",
      "Windows on Arm 설치 프로그램이 Nib.exe를 조용히 잃어버리지 않고, x64 PC에서는 설치를 거부합니다.",
    ],
  },
  {
    version: "0.22.3",
    date: "2026-10-30",
    highlights: [
      "Windows on Arm에서 로컬 서비스가 다시 시작됩니다. 런타임이 정적 링크로 바뀌었습니다.",
      "Arm 버전을 x64 PC에 설치하면 이제 명확한 안내와 함께 중단됩니다.",
    ],
  },
  {
    version: "0.22.2",
    date: "2026-10-30",
    highlights: [
      "Windows on Arm 설치 프로그램이 Nib.exe와 모든 DLL을 다시 추출합니다.",
      "Arm 설치 프로그램은 x64 PC에서 빈 폴더를 설치하는 대신 안내를 표시하고 중단합니다.",
    ],
  },
  {
    version: "0.22.1",
    date: "2026-10-29",
    highlights: [
      "원격 호스트를 그 자리에서 업그레이드합니다. 다시 연결하면 Host를 삭제 후 재등록하지 않고도 이 버전으로 올릴 수 있습니다.",
      "컨트롤 플레인에 일시적으로 연결할 수 없어도 크레딧 표시에는 마지막으로 확인한 잔액이 유지됩니다.",
      "계정 메뉴의 플랜 변경이 이제 콘솔의 결제 페이지를 엽니다.",
    ],
  },
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
