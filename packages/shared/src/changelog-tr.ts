import type { ChangelogEntry } from "./changelog.js";

export const trEntries: ChangelogEntry[] = [

  {
    version: "0.22.3",
    date: "2026-10-30",
    highlights: [
      "Windows on Arm'da yerel hizmet yeniden başlıyor: çalışma zamanı artık statik bağlanıyor.",
      "Arm sürümünü x64 bir PC'ye kurmak artık net bir mesajla duruyor.",
    ],
  },
  {
    version: "0.22.2",
    date: "2026-10-30",
    highlights: [
      "Windows on Arm yükleyicisi Nib.exe ve tüm DLL dosyalarını yeniden çıkarıyor.",
      "Arm yükleyicisi x64 bir bilgisayarda boş bir klasör kurmak yerine uyarı verip duruyor.",
    ],
  },
  {
    version: "0.22.1",
    date: "2026-10-29",
    highlights: [
      "Uzak ana makineler yerinde yükseltilir: yeniden bağlanmak, Host'u yeniden kurmadan bu sürüme taşır.",
      "Kontrol düzlemine ulaşılamadığında kredi simgesi bilinen son bakiyeyi korur.",
      "Hesap menüsündeki Planı değiştir artık konsolun faturalandırma sayfasını açar.",
    ],
  },
  {
    version: "0.22.0",
    date: "2026-10-29",
    highlights: [
      "Alan adı taşındıktan sonra uygulama nib.am adresine bağlanıyor.",
      "Duyurular yerinde açılıyor ve okunduğunda okunmadı işareti kalkıyor.",
      "Sorun bildir ve Sürüm notları artık Nib deposunu gösteriyor.",
      "Web oturum açmasından sonra tarayıcı sizi uygulamaya geri getirebiliyor.",
    ],
  },
  {
    version: "0.21.0",
    date: "2026-10-28",
    highlights: [
      "Nib'in ilk genel sürümü: tek kurulum, tek oturum açma, tüm modeller.",
      "Nib hesabıyla oturum açın; tarayıcı onay sayfası kodu hazır getirir.",
      "Yazma alanı planı, kalan krediyi ve günlük/haftalık/aylık kullanımı gösterir.",
      "Yönetici duyuruları bildirim merkezinde görev sonuçlarının üstünde görünür.",
      "Windows x64 yükleyicisi ve Linux AppImage/deb yayımlandı.",
    ],
  },
];
