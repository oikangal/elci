
# AMBA Local (Ambassador Leaderboard) — Mobile-First

Bu proje 3 sayfadan oluşan bir elçi takip sistemidir:
1) **Ana Sayfa (Liderlik Tablosu)** — kalan gün sayısı, animasyonlu sıralama
2) **Elçi Sayfası** — günlük durumunu ve toplam puanını görür
3) **Admin** — S / P / Ü işaretleme (günde 1'er kez), bitiş tarihini ayarla

## Hızlı Başlangıç
```bash
# 1) Klasöre gir
cd amba-local

# 2) Kurulum
npm install

# 3) Çalıştır (API + Web aynı anda)
npm run dev
```

- Web arayüz: http://127.0.0.1:5173
- API: http://127.0.0.1:4000

> Admin girişi için varsayılan şifre: **admin123** (client/.env içinde).  
> Elçi girişleri için örnek kullanıcılar: **ayse / 1111**, **melis / 2222**, **selin / 3333**, **zeynep / 4444**.

## Notlar
- Puanlar: Story=100, Post/Reels=150, Ürün=300.
- Aynı gün aynı tür ikinci işaretlemeye izin verilmez (S/P/Ü her biri 1 kez).
- Veriler `server/data/db.json` dosyasında JSON olarak saklanır.
