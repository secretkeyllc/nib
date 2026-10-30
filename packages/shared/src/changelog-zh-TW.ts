import type { ChangelogEntry } from "./changelog.js";

export const zhTWEntries: ChangelogEntry[] = [

  {
    version: "0.22.5",
    date: "2026-10-30",
    highlights: [
      "macOS 下載現在是可直接執行的建置：ad-hoc 簽名，Apple Silicon 首次在系統設定裡放行後即可使用。",
    ],
  },
  {
    version: "0.22.4",
    date: "2026-10-30",
    highlights: [
      "macOS 版本以 Beta 形式發布：採用 ad-hoc 簽名，首次啟動需在系統設定裡手動放行一次。",
      "Windows on Arm 安裝包不再靜默遺失 Nib.exe，並在 x64 電腦上直接拒絕安裝。",
    ],
  },
  {
    version: "0.22.3",
    date: "2026-10-30",
    highlights: [
      "Windows on Arm 的本機服務恢復啟動：執行階段改為靜態連結。",
      "Arm 安裝在 x64 電腦上會明確提示並停止。",
    ],
  },
  {
    version: "0.22.2",
    date: "2026-10-30",
    highlights: [
      "Windows on Arm 安裝包又能正確解出 Nib.exe 和全部 DLL。",
      "Arm 安裝包在 x64 電腦上會直接提示，而不是裝出一個空目錄。",
    ],
  },
  {
    version: "0.22.1",
    date: "2026-10-29",
    highlights: [
      "遠端主機原地升級：重新連線即可把 Host 升到目前版本，無需刪除重建。",
      "控制平面暫時無法連線時，額度徽章保留上次已知的餘額。",
      "帳戶選單中的「變更方案」現在開啟主控台的帳單頁。",
    ],
  },
  {
    version: "0.22.0",
    date: "2026-10-29",
    highlights: [
      "網域搬遷後，用戶端改連 nib.am。",
      "公告可以直接展開，讀過後未讀圓點立即消失。",
      "「問題回報」與「版本說明」改為指向 Nib 自己的儲存庫。",
      "網頁登入完成後，瀏覽器可以把你帶回用戶端。",
    ],
  },
  {
    version: "0.21.0",
    date: "2026-10-28",
    highlights: [
      "Nib 首個公開版本：一次安裝、一次登入、全部模型。",
      "使用 Nib 帳號登入，瀏覽器批准頁會自動帶上驗證碼。",
      "輸入框上方顯示方案、剩餘額度，以及日/週/月用量。",
      "管理員公告出現在通知中心的任務結果之上。",
      "已發布 Windows x64 安裝檔與 Linux AppImage/deb。",
    ],
  },
];
