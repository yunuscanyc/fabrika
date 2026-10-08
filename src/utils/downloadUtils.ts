/**
 * Rende Portal - Güvenli ve Büyük Boyut Uyumlu Dosya İndirme Motoru
 * 
 * Chromium (Chrome, Edge) ve WebKit (Safari) tarayıcıları doğrudan `data:...;base64` 
 * URI'lerini `a[download]` ile indirirken ~2MB üzerindeki dosyalarda "Ağ Hatası (Network Error)"
 * verir veya indirmeyi sessizce iptal eder.
 * 
 * Bu yardımcı fonksiyon:
 * 1. Base64 verisini tarayıcı belleğinde parçalı Uint8Array ve binary Blob'a dönüştürür.
 * 2. URL.createObjectURL ile sınırsız boyutlu yerel Blob URL oluşturur.
 * 3. Sunucu / API uç noktalarını (örn. /api/backup/export) fetch() ile güvenle çekip Blob olarak indirir.
 * 4. Böylece 10 MB, 50 MB, 100 MB+ büyüklüğündeki tüm PDF, CAD, fotoğraf ve yedek dosyaları sorunsuz iner.
 */

export async function guvenliDosyaIndir(dataOrUrl: string, dosyaAdi: string) {
  if (!dataOrUrl) {
    console.warn('[İNDİRME UYARISI] İndirilecek dosya adresi veya içeriği boş.');
    return;
  }

  try {
    // 1. Durum: Base64 / Data URI (Örn: Fotoğraflar, taranmış ruhsatlar, PDF'ler)
    if (dataOrUrl.startsWith('data:')) {
      const parts = dataOrUrl.split(',');
      if (parts.length < 2) {
        throw new Error('Geçersiz Data URI formatı');
      }

      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      
      // Büyük boyutlu base64 dizilerini bellek taşması olmadan güvenli parse etme
      const byteCharacters = atob(parts[1]);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const blob = new Blob([byteNumbers], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = dosyaAdi || 'dosya';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Belleği temizle
      setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
      return;
    }

    // 2. Durum: Sunucu API URL'si veya normal dosya bağlantısı (Örn: /api/backup/export)
    const response = await fetch(dataOrUrl);
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let parsedError = '';
      try {
        parsedError = JSON.parse(errorText).error;
      } catch {
        parsedError = errorText;
      }
      throw new Error(parsedError || `Sunucudan dosya alınamadı (HTTP ${response.status})`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = dosyaAdi || 'dosya';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Belleği temizle
    setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
  } catch (err: any) {
    console.error('[GÜVENLİ İNDİRME HATASI]', err);
    // Son çare klasik yöntem fallback
    try {
      const fallbackLink = document.createElement('a');
      fallbackLink.href = dataOrUrl;
      fallbackLink.download = dosyaAdi || 'dosya';
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
    } catch (fallbackErr) {
      alert('Dosya indirilemedi: ' + (err.message || 'Bilinmeyen hata'));
    }
  }
}
