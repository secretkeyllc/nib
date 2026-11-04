import type { ChangelogEntry } from "./changelog.js";

export const trEntries: ChangelogEntry[] = [
{
    version: "0.22.33",
    date: "2026-11-04",
    highlights: [
      "Ek rozetleri artık proje bağlaması olmadan bağlı bir ana makinede çalışan oturumlarda açılıyor ve kredi açılır penceresindeki Pro / Pro Extra geçişi koyu modda okunabiliyor.",
    ],
  },
{
    version: "0.22.32",
    date: "2026-11-03",
    highlights: [
      "Oturum açma sizi adınızla karşılar, kredi açılır penceresi koyu modda doğru görünür, -extra modeller temel modelin düşünme düzeylerini korur ve \"Extra\" etiketi kazanır, ana makine bağlantı oturumlarındaki ek rozetleri yeniden açılır.",
    ],
  },
{
    version: "0.22.31",
    date: "2026-11-03",
    highlights: [
      "Uygulama artik bos bir React hata ekraniyla acilmiyor: kredileri acilir penceresindeki bir gorunum-durumu hook'u erken bir return'den sonra bildirilmisti ve hook sirasini bozuyordu (React #310).",
    ],
  },

{
    version: "0.22.30",
    date: "2026-11-03",
    highlights: [
      "Uzak oturumlardaki dosya cipleri yeniden aciliyor: dosya gorunumu oturum kimligini Host'a iletir, boylece okumalar oturumun yetkili scratch alaninda cozumlenir.",
      "Gateway -extra modelleri artik gercek baglam pencerelerini ve yeteneklerini gosteriyor - katalog, -extra dagitimlari icin temel modelin yayimlanmis kaydini devralir.",
      "Hesap menusu sizi selamliyor (Hi <ad>, I am Nib.), planinizin altinda dahil olan Extra kotasini listeliyor ve besteci kredileri acilir penceresine Pro / Pro Extra sekmeleri ekleniyor.",
    ],
  },

{
    version: "0.22.29",
    date: "2026-11-03",
    highlights: [
      "Bir oturuma yüklenen dosyaların rozetleri artık her yerde açılıyor: yerel arama sonuç vermezse dosya görünümü, oturumun araçlarını çalıştıran ana makineye sorar ve kopyayı o oturumun özel scratch dizininden okur.",
    ],
  },
{
    version: "0.22.28",
    date: "2026-11-03",
    highlights: [
      "Uzak bir oturumda yüklenmiş bir eke tıklamak artık makine kopyasını önizler: dosya görünümü, uzak scratch yollarını sahibi olan makinede çözer ve yalnızca o oturum dizinine yetki verir.",
    ],
  },

{
    version: "0.22.27",
    date: "2026-11-03",
    highlights: [
      "Composer + düğmesiyle eklenen dosyalar artık yapılandırılmış ek kanalını kullanır - uzak oturumun makinesi gerçek dosyayı alır ve istem, ajanın asla okuyamayacağı bir masaüstü yolu yerine uzak kopyayı gösterir.",
    ],
  },

{
    version: "0.22.26",
    date: "2026-11-03",
    highlights: [
      "Her ek yükleme kararı artık masaüstü günlüğüne yazılır ve istem, uzak bağlamayı doğrudan oturum deposundan çözümler — son sessiz geri dönüş yolu kapatıldı.",
    ],
  },

{
    version: "0.22.25",
    date: "2026-11-02",
    highlights: [
      "Saf uzak oturumlarda (ajan makinede çalışır) gönderilen ekler artık tur başlamadan önce makineye yüklenir ve istem metni uzak kopyayı gösterir.",
      "Oturumdan yürütme makinesine giden kayıt masaüstü yeniden başlasa da korunur; yükseltme sonrası ekler araçların olduğu makineyi takip eder.",
    ],
  },

{
    version: "0.22.24",
    date: "2026-11-02",
    highlights: [
      "Araçları uzak bir makinede çalışan oturumların ekleri (makineye eşlenmiş yerel masaüstü oturumları dahil) artık otomatik olarak o makineye yüklenir; model kullanılamaz bir yerel yol yerine gerçek dosyayı okur.",
    ],
  },

{
    version: "0.22.23",
    date: "2026-11-02",
    highlights: [
      "Bağlı uzak makinedeki bir oturumda proje klasörü bulunmasa da ekler artık gerçekten yüklenir; okunamayan bir yerel yol gönderilmez.",
      "Uzak ek kopyaları masaüstü depolama düzenini birebir yansıtır — aynı oturum, dizin ve dosya adlarıyla — uzak araçlar yerel yolun işaret ettiği yerde bulur.",
      "Composer artık sürekli bir yükleme bildirimi göstermez; bir tur başarısız olmadıkça yükleme sessiz kalır.",
    ],
  },

{
    version: "0.22.22",
    date: "2026-11-02",
    highlights: [
      "Yerel temsilci + uzak araçlar modunda ekler artık oturum başlamadan önce seçilen uzak makinenin özel oturum dizinine yüklenir.",
      "Uzak Read, Glob ve Grep yüklenen kopyaları okuyabilir; yazma işlemleri proje sınırları içinde kalır.",
      "Dosya başına 50 MiB sınırı ve SHA-256 doğrulaması vardır; Composer eklerin uzak makinede kaldığını belirtir.",
    ],
  },

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
