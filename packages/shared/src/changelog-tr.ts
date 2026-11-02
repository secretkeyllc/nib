import type { ChangelogEntry } from "./changelog.js";

export const trEntries: ChangelogEntry[] = [
{
    version: "0.22.21",
    date: "2026-11-01",
    highlights: [
      "Mevcut Nib hesapları yükseltmeden sonra yeniden giriş gerektirmeden tam model listesini yükler.",
      "Ağ geçidinin yayımlanan bağlam ve çıktı limitleri Composer ve çalışma zamanında uygulanırken kayıtlı seçimler ve manuel geçersiz kılmalar korunur.",
      "Model keşfi geçici hatalardan sonra yeniden denenir ve çıkış, yeniden kimlik doğrulama veya eklenti yeniden yükleme sırasındaki eski sonuçları yok sayar.",
    ],
  },

{
    version: "0.22.20",
    date: "2026-11-01",
    highlights: [
      "Nib'de oturum açmak artık hesabın ağ geçidindeki tam model listesini yayımlanan bağlam ve çıktı limitleriyle yükler.",
      "Yeniden oturum açmak, kaydedilen model seçimini ve manuel limitleri korurken yayımlanan değerleri günceller.",
      "Oturumu kapatıp yeniden açmak model üst verilerini geri getirir; başarısız bir model sorgusu geçerli bir oturum açmayı engellemez.",
    ],
  },

{
    version: "0.22.19",
    date: "2026-11-01",
    highlights: [
      "Nib servis satırındaki tıklama oturum durumunu izler: oturum kapalıyken tek tıkla oturum açar, açıkken düzenleyiciyi açar.",
      "Nib satırında API biçimi değiştirmek artık düzgün kaydedilir — her kayıt Chat Completions'a sıfırlanmaz.",
      "Bestecinin model menüsü yalnızca Nib satırında etkinleştirilen modelleri gösterir, ağ geçidinin tüm kataloğunu değil.",
    ],
  },

{
    version: "0.22.18",
    date: "2026-11-01",
    highlights: [
      "Nib servisi model listesinde birinci sınıf bir öğe olur: düzenlemek için satıra tıklayın, uygulama simgesiyle \"Nib hesabı\" olarak görünür.",
      "Nib satırındaki model seçimi düzgün kaydedilir — oturum açtıktan sonraki ilk açılış, hesabın çağırabildiği her modeli seçer.",
      "Güncellemeden sonraki ilk açılışta mevcut Nib satırları api.nib.am adresine taşınır.",
    ],
  },

{
    version: "0.22.17",
    date: "2026-11-01",
    highlights: [
      "Model listesindeki Nib servisi artık diğer uç noktalar gibi düzenlenebilir: API biçimi, modeller ve model başına ayarlar.",
      "Masaüstünün oturum açtığı anahtar konsolda \"Nib\" olarak adlandırılır ve yeniden adlandırılamaz ya da silinemez.",
      "Bildirilen sürüm numarasının bir sürüm geride kalması düzeltildi; başlangıç yazısı \"I am Nib\" olur.",
    ],
  },

{
    version: "0.22.16",
    date: "2026-10-31",
    highlights: [
      "Süresi dolmuş bir oturum artık oturum kapalıyla aynı görünür: saklanan Nib anahtarı emekliye ayrılır, model seçici ölü öğeler sunmaz.",
      "Uzak denetim ayarları girişi başlığını ve Experimental rozetini yeniden gösterir.",
    ],
  },

{
    version: "0.22.15",
    date: "2026-10-31",
    highlights: [
      "Web denetleyicisi çalışma alanı temellerini kazandı: proje bazlı gruplanabilir oturumlar, besteci üzerinde model seçimi ve mod geçişi, sınırlı transkript okumaları ve tek satır oturum başlıkları.",
    ],
  },

{
    version: "0.22.14",
    date: "2026-10-31",
    highlights: [
      "Web denetleyicisi artık 0.22.13 masaüstlerinde çalışma alanını yüklüyor (oturum ayrıntısı okuması yanlış bağımsız değişken adını kullanıyordu); masaüstü yeniden bağlandığında otomatik olarak yenileniyor.",
    ],
  },

{
    version: "0.22.13",
    date: "2026-10-31",
    highlights: [
      "Web denetleyicisi artık gerçek çalışma alanını yüklüyor: uzak komutlar sonuçları renderer ile aynı şekilde açıyor; oturumlar, transkriptler ve gönderimler artık boş gelmiyor.",
    ],
  },


  {
    version: "0.22.12",
    date: "2026-10-31",
    highlights: [
      "Uzaktan kontrol eşleştirmesi artık gerçekten bağlanıyor: masaüstü, QR içindeki yerine rastgele bir sid ile kaydoluyordu; telefonun her denemesi bilinmeyen eşleştirme olarak reddediliyordu.",
    ],
  },


  {
    version: "0.22.11",
    date: "2026-10-31",
    highlights: [
      "Eşleştirme bağlantısı artık makine başına sabit: bir kez tarayın, durdurma/başlatma ve uygulama yeniden başlatmalarında telefon çalışmaya devam eder.",
      "Bağlantıyı döndürme eylemi, bir sızma durumunda yeni bağlantı üretir ve önceki tüm QR'ları geçersiz kılar.",
      "Hesap menüsünde de eşleştirme var: tek dokunuşla QR kodu açılır.",
      "Eşleştirmeler uygulamayla birlikte otomatik başlayabilir; telefon her an bağlanabilir.",
      "Çalışma alanı maskotu her iki temada yeni 16:9 görseline kavuştu ve boş çalışma alanı karşılaması artık imza satırıyla başlıyor: \"I am Nib, …\".",
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
