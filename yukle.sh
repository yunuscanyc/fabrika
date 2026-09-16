#!/usr/bin/env bash

# Hata durumunda scripti durdur
set -e

echo "=========================================="
echo "   🚀 SUNUCU GÜNCELLEME VE DERLEME BAŞLADI"
echo "=========================================="

# 1. Kodları çek
echo "📥 [1/4] GitHub'dan son değişiklikler alınıyor..."
git pull

# 2. Bağımlılıkları yükle
echo "📦 [2/4] Paket bağımlılıkları yükleniyor/güncelleniyor (npm install)..."
npm install

# 3. Projeyi derle (Frontend Vite + Backend server.cjs)
echo "🔨 [3/4] Proje derleniyor (npm run build)..."
npm run build

# 4. Sunucu servisini yeniden başlat
echo "🔄 [4/4] Sunucu servisi yeniden başlatılıyor..."

if command -v pm2 &> /dev/null; then
  echo "PM2 bulundu, servis yeniden başlatılıyor..."
  # Eğer kayıtlı pm2 servisi varsa yeniden başlat, yoksa başlat
  pm2 restart all || pm2 start dist/server.cjs --name "ahsap-erp"
elif command -v systemctl &> /dev/null && systemctl list-units --full -all | grep -q "ahsap"; then
  echo "Systemd servisi tespit edildi, yeniden başlatılıyor..."
  sudo systemctl restart ahsap*
else
  echo "ℹ️ PM2 veya systemd servisi bulunamadı."
  echo "Proje başarıyla derlendi. Doğrudan çalıştırmak için: npm start"
fi

echo "=========================================="
echo "   ✅ GÜNCELLEME BAŞARIYLA TAMAMLANDI!"
echo "=========================================="
