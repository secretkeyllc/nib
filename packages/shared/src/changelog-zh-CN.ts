import type { ChangelogEntry } from "./changelog.js";

export const zhCNEntries: ChangelogEntry[] = [

  {
    version: "0.22.3",
    date: "2026-10-30",
    highlights: [
      "Windows on Arm 的本地服务恢复启动：运行时改为静态链接。",
      "Arm 安装在 x64 电脑上会明确提示并停止。",
    ],
  },
  {
    version: "0.22.2",
    date: "2026-10-30",
    highlights: [
      "Windows on Arm 安装包又能正确解出 Nib.exe 和全部 DLL。",
      "Arm 安装包在 x64 电脑上会直接提示，而不是装出一个空目录。",
    ],
  },
  {
    version: "0.22.1",
    date: "2026-10-29",
    highlights: [
      "远程主机原地升级：重新连接即可把 Host 升到当前版本，无需删除重建。",
      "控制平面暂时不可达时，额度徽标保留上次已知的余额。",
      "账户菜单中的“更改套餐”现在打开控制台的账单页。",
    ],
  },
  {
    version: "0.22.0",
    date: "2026-10-29",
    highlights: [
      "域名迁移后，客户端改连 nib.am。",
      "公告可以直接展开，读过后未读圆点立即消失。",
      "“问题反馈”和“版本说明”改为指向 Nib 自己的仓库。",
      "网页登录完成后，浏览器可以把你带回客户端。",
    ],
  },
  {
    version: "0.21.0",
    date: "2026-10-28",
    highlights: [
      "Nib 首个公开版本：一次安装、一次登录、全部模型。",
      "使用 Nib 账号登录，浏览器批准页会自动带上验证码。",
      "输入框上方显示套餐、剩余额度，以及日/周/月用量。",
      "管理员公告出现在通知中心的任务结果之上。",
      "已发布 Windows x64 安装包与 Linux AppImage/deb。",
    ],
  },
];
