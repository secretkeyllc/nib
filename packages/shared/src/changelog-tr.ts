import type { ChangelogEntry } from "./changelog.js";

export const trEntries: ChangelogEntry[] = [

  {
    version: "0.22.11",
    date: "2026-10-31",
    highlights: [
      "Eşleştirme bağlantısı artık makine başına sabit: bir kez tarayın, durdurma/başlatma ve uygulama yeniden başlatmalarında telefon çalışmaya devam eder.",
      "Bağlantıyı döndürme eylemi, bir sızma durumunda yeni bağlantı üretir ve önceki tüm QR'ları geçersiz kılar.",
      "Hesap menüsünde de eşleştirme var: tek dokunuşla QR kodu açılır.",
      "Eşleştirmeler uygulamayla birlikte otomatik başlayabilir; telefon her an bağlanabilir.",
    ],
  },


  {
    version: "0.22.10",
    date: "2026-10-31",
    highlights: [
      "Bu masaüstünü telefondan veya herhangi bir tarayıcıdan yönetin: Ayarlar → Hakkında'dan başlayan eşleştirmeyi yalnızca kendi hesabınız açabilir.",
      "Web görünümü oturum listesini ve canlı transkripti yansıtır; komut gönderir ve onay kartlarını yanıtlar.",
      "Eşleştirme yalnızca çalıştığı sürece yaşar — bağlantı her başlangıçta yenilenir ve durduğunda sona erer.",
      "Hesap menüsünde de eşleştirme var: tek dokunuşla QR kodu açılır.",
    ],
  },


  {
    version: "0.22.9",
    date: "2026-10-30",
    highlights: [
      "~/.nib izni olağan 0755 olan makinelerde uzak host'lar yeniden kurulabiliyor.",
      "Her kota penceresi artık ne zaman sıfırlanacağını gösteriyor; kredi çipinde ve konsolda.",
      "Sürüm çipi bekleyen sürümü değil kurulu sürümü gösteriyor.",
      "Ayarlar -> Hakkında, adın üstünde ürün işaretini gösteriyor.",
    ],
  },
  {
    version: "0.22.8",
    date: "2026-10-30",
    highlights: [
      "Windows on Arm yan süreci artık Visual C++ Yeniden Dağıtılabilir paketine ihtiyaç duymuyor.",
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
];
