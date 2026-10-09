/**
 * Rende Portal - Pano (Clipboard) ve Ekran Görüntüsü Destek Motoru
 * 
 * Kullanıcının PrintScreen, Windows Ekran Alıntısı Aracı (Win + Shift + S),
 * Mac ekran görüntüsü (Cmd + Shift + 4) veya kopyalanan herhangi bir resmi
 * doğrudan Ctrl + V ile forma aktarmasını sağlar.
 */

export function formatClipboardFileName(originalName?: string, mimeType: string = 'image/png'): string {
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  if (!originalName || originalName === 'image.png' || originalName === 'blob') {
    return `ekran_goruntusu_${timeStr}.${ext}`;
  }
  return originalName;
}

/**
 * ClipboardEvent (Ctrl+V veya Yapıştır olayı) içinden resim dosyalarını ayıklar.
 */
export function extractImagesFromClipboard(e: ClipboardEvent): File[] {
  const files: File[] = [];

  // 1. clipboardData.items kontrolü
  if (e.clipboardData?.items) {
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const finalName = formatClipboardFileName(file.name, file.type);
          const renamedFile = new File([file], finalName, { type: file.type });
          files.push(renamedFile);
        }
      }
    }
  }

  // 2. clipboardData.files yedek kontrolü (bazı tarayıcılarda items yerine doğrudan files doldurulur)
  if (files.length === 0 && e.clipboardData?.files) {
    for (let i = 0; i < e.clipboardData.files.length; i++) {
      const file = e.clipboardData.files[i];
      if (file.type.startsWith('image/')) {
        const finalName = formatClipboardFileName(file.name, file.type);
        const renamedFile = new File([file], finalName, { type: file.type });
        files.push(renamedFile);
      }
    }
  }

  return files;
}

/**
 * "Panodan Yapıştır" butonuna tıklandığında navigator.clipboard API ile panoyu okur.
 */
export async function readImagesFromClipboardApi(): Promise<File[]> {
  const files: File[] = [];

  if (!navigator.clipboard || !navigator.clipboard.read) {
    throw new Error('Tarayıcınız doğrudan pano okuma iznini desteklemiyor. Lütfen doğrudan Ctrl + V tuşlarını kullanınız.');
  }

  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find(t => t.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        const finalName = formatClipboardFileName('image.png', imageType);
        const file = new File([blob], finalName, { type: imageType });
        files.push(file);
      }
    }
  } catch (err: any) {
    throw new Error(
      err?.name === 'NotAllowedError'
        ? 'Pano okuma izni verilmedi. Doğrudan klavyeden Ctrl + V tuşlarına basarak yapıştırabilirsiniz.'
        : 'Panoda yapıştırılacak resim veya ekran görüntüsü bulunamadı. Lütfen önce resmi kopyalayın (Ctrl+C veya Win+Shift+S) ve ardından yapıştırın.'
    );
  }

  return files;
}
