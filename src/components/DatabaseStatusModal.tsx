import React, { useState, useRef } from 'react';
import { 
  Database, RefreshCw, CheckCircle2, AlertTriangle, X, Table, 
  Download, Upload, ShieldCheck, FileJson, Loader2, HardDrive, Check, Sparkles, AlertOctagon, Terminal
} from 'lucide-react';

export interface DbStatusData {
  connected: boolean;
  host: string;
  port: number | string;
  database: string;
  user: string;
  detectedTables: Record<string, string | undefined>;
  tableCounts: Record<string, any>;
  lastDbError?: string | null;
}

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbStatus: DbStatusData | null;
  onRefresh: () => Promise<void>;
  initialTab?: 'durum' | 'yedek';
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  isOpen,
  onClose,
  dbStatus,
  onRefresh,
  initialTab = 'durum'
}) => {
  const [activeTab, setActiveTab] = useState<'durum' | 'yedek'>(initialTab);
  const [refreshing, setRefreshing] = useState(false);

  // Yedekleme & Geri Yükleme State
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [validatingBackup, setValidatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [selectedBackupData, setSelectedBackupData] = useState<any | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    exportDate: string;
    app: string;
    totalRecords: number;
    tableSummary: Array<{ name: string; key: string; count: number }>;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'full'>('merge');
  const [confirmLossChecked, setConfirmLossChecked] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreErrorMsg, setRestoreErrorMsg] = useState<string | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  // TEK TUŞLA YEDEK İNDİR
  const handleDownloadBackup = (fullMedia = false) => {
    try {
      setDownloadingBackup(true);
      const link = document.createElement('a');
      link.href = fullMedia ? '/api/backup/export' : '/api/backup/export?noPhotos=true';
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = fullMedia 
        ? `rende_veritabani_tam_yedek_${dateStr}.json`
        : `rende_veritabani_hizli_veri_yedeği_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => setDownloadingBackup(false), 2500);
    } catch (err: any) {
      alert('Yedek indirme hatası: ' + err.message);
      setDownloadingBackup(false);
    }
  };

  // YEDEK DOSYASI SEÇİLDİĞİNDE DOĞRULA (PRE-FLIGHT CHECK)
  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationResult(null);
    setRestoreSuccessMsg(null);
    setRestoreErrorMsg(null);
    setConfirmLossChecked(false);
    setValidatingBackup(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        setSelectedBackupData(parsed);

        const valRes = await fetch('/api/backup/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed)
        });

        const valData = await valRes.json();
        if (valRes.ok && valData.valid) {
          setValidationResult(valData);
        } else {
          setRestoreErrorMsg(valData.error || 'Yedek dosyası geçerli değil.');
        }
      } catch (err: any) {
        setRestoreErrorMsg('Dosya okuma hatası: Geçerli bir JSON yedek dosyası seçiniz.');
      } finally {
        setValidatingBackup(false);
      }
    };
    reader.readAsText(file);
  };

  // TEK TUŞLA GÜVENLİ GERİ YÜKLE
  const handleExecuteRestore = async () => {
    if (!selectedBackupData) return;

    if (restoreMode === 'full') {
      if (!confirmLossChecked) {
        alert('Lütfen yedek tarihinden sonraki yeni kayıtların silineceğini onaylayan kutucuğu işaretleyiniz.');
        return;
      }
      const confirmed = confirm(
        `🚨 DİKKAT: ${validationResult?.exportDate || 'Yedek'} tarihinden ŞU ANA KADAR girdiğiniz tüm yeni siparişler, cerideler, puantajlar ve kayıtlar KALICI OLARAK SİLİNECEKTİR.\n\nSistem tamamen yedek anına dönecektir.\n\nDevam etmek istediğinize KESİNLİKLE emin misiniz?`
      );
      if (!confirmed) return;
    } else {
      const confirmed = confirm(
        `✨ Akıllı Birleştirme Modu:\n\n• Yeni girdiğiniz mevcut kayıtlara DOKUNULMAYACAKTIR.\n• Sadece kazara silinen veya eksik olan kayıtlar (${validationResult?.exportDate || 'yedek'}) veritabanına geri getirilecektir.\n\nOnaylıyor musunuz?`
      );
      if (!confirmed) return;
    }

    setRestoringBackup(true);
    setRestoreSuccessMsg(null);
    setRestoreErrorMsg(null);

    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-name': sessionStorage.getItem('rende_user_name') || '1. Yönetici'
        },
        body: JSON.stringify({
          backupData: selectedBackupData,
          mode: restoreMode
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRestoreSuccessMsg(data.message || 'Veritabanı yedeği başarıyla geri yüklendi!');
        setSelectedBackupData(null);
        setValidationResult(null);
        await onRefresh();
      } else {
        setRestoreErrorMsg(data.error || 'Geri yükleme başarısız oldu.');
      }
    } catch (err: any) {
      setRestoreErrorMsg('Geri yükleme bağlantı hatası: ' + err.message);
    } finally {
      setRestoringBackup(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Başlık */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                dbStatus?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                PostgreSQL Veritabanı &amp; Yedekleme
                {dbStatus?.connected ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    Canlı Bağlı
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
                    Bağlantı Yok
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {dbStatus?.database || 'FabrikaYonetimDB'} @ {dbStatus?.host || 'localhost'}:{dbStatus?.port || 5432} (.env)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sekmeler */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('durum')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'durum'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Bağlantı &amp; Tablo Durumu</span>
          </button>

          <button
            onClick={() => setActiveTab('yedek')}
            className={`px-3 sm:px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'yedek'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span className="flex items-center gap-1">
              💾 Tek Tuşla Yedek &amp; Geri Yükle
              <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">Canlı</span>
            </span>
          </button>
        </div>

        {/* 1. DURUM SEKMESİ */}
        {activeTab === 'durum' && (
          <div className="space-y-4">
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                dbStatus?.connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {dbStatus?.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                {dbStatus?.connected ? (
                  <>
                    <p className="font-semibold text-emerald-900">
                      PostgreSQL Veritabanı Aktif ve Bağlı!
                    </p>
                    <p>
                      Sistem doğrudan <strong>.env</strong> dosyasında tanımlı canlı <strong>{dbStatus.database}</strong> veritabanınızdan veri okumaktadır.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-900">
                      Canlı PostgreSQL Veritabanı Bağlantısı Bekleniyor
                    </p>
                    <p>
                      Sunucunuzdaki <strong>.env</strong> dosyasındaki <code>PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD</code> değişkenlerini kontrol ediniz.
                    </p>
                    {dbStatus?.lastDbError && (
                      <div className="mt-1 p-2 bg-rose-100 rounded text-[11px] font-mono text-rose-900 overflow-x-auto">
                        Hata: {dbStatus.lastDbError}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Sunucu .env Yapılandırması Özeti */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Terminal className="w-3.5 h-3.5 text-slate-600" />
                <span>Ortam Değişkenleri (.env) Bağlantı Bilgisi</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[9px] font-sans">Sunucu / Host</span>
                  <span className="font-bold text-slate-800 truncate block">{dbStatus?.host || 'localhost'}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[9px] font-sans">Port</span>
                  <span className="font-bold text-slate-800 truncate block">{dbStatus?.port || '5432'}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[9px] font-sans">Veritabanı</span>
                  <span className="font-bold text-blue-700 truncate block">{dbStatus?.database || 'FabrikaYonetimDB'}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[9px] font-sans">Kullanıcı</span>
                  <span className="font-bold text-slate-800 truncate block">{dbStatus?.user || 'postgres'}</span>
                </div>
              </div>
            </div>

            {/* Tablo Listesi */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-slate-500" />
                  Tespit Edilen Tablolar &amp; Canlı Kayıt Sayıları
                </span>
                <span className="text-[11px] text-slate-500 font-bold text-emerald-700">
                  {Object.keys(dbStatus?.detectedTables || {}).length} tablo bağlandı
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'ceride', label: 'Şantiye Ceridesi' },
                  { key: 'projeler', label: 'Projeler &amp; Şantiyeler' },
                  { key: 'personeller', label: 'Personel Kayıtları' },
                  { key: 'departmanlar', label: 'Departmanlar' },
                  { key: 'gorevler', label: 'Görevler' },
                  { key: 'izinler', label: 'İzin Kayıtları' },
                  { key: 'puantajlar', label: 'Puantaj Kayıtları' },
                  { key: 'makineler', label: 'Makineler &amp; Ekipman' },
                  { key: 'makineBakimlar', label: 'Makine Bakımları' },
                  { key: 'araclar', label: 'Araç Filosu' },
                  { key: 'aracBakimlar', label: 'Araç Bakımları' },
                  { key: 'yevmiyeciler', label: 'Yevmiyeciler' },
                  { key: 'kkdZimmetler', label: 'KKD Zimmetleri' },
                  { key: 'saglikRaporlari', label: 'Sağlık Raporları' },
                  { key: 'isgEgitimleri', label: 'İSG Eğitimleri' },
                  { key: 'hatirlaticilar', label: 'Ajanda &amp; Hatırlatıcılar' },
                  { key: 'malzemeSiparisleri', label: 'Malzeme Siparişleri' },
                  { key: 'malzemeKatalog', label: 'Malzeme Kataloğu' }
                ].map((item) => {
                  const lowerKey = item.key.toLowerCase();
                  let detected: string | undefined = undefined;
                  let count: any = undefined;

                  if (dbStatus?.detectedTables) {
                    for (const [k, v] of Object.entries(dbStatus.detectedTables)) {
                      if (k.toLowerCase() === lowerKey || k.toLowerCase().includes(lowerKey)) {
                        if (v) { detected = v; break; }
                      }
                    }
                  }

                  if (dbStatus?.tableCounts) {
                    for (const [k, v] of Object.entries(dbStatus.tableCounts)) {
                      if (k.toLowerCase() === lowerKey || k.toLowerCase().includes(lowerKey)) {
                        if (v !== undefined) { count = v; break; }
                      }
                    }
                  }

                  return (
                    <div
                      key={item.key}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 text-[11px]">{item.label}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {detected ? `${detected}` : 'Hafıza Deposu'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {count !== undefined ? `${count} kayıt` : 'Aktif'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. YEDEKLEME & GERİ YÜKLEME SEKMESİ */}
        {activeTab === 'yedek' && (
          <div className="space-y-4">
            {/* Bilgi & Güvenlik Kartı */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-blue-950">
                  Tam Güvenlikli Veritabanı Yedekleme &amp; Geri Yükleme
                </p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Şantiye Ceridesi, Malzeme Siparişleri, Projeler, Personeller, Araçlar, Makineler, Hatırlatıcılar ve tüm ayarları tek bir dosya (.json) olarak kendi bilgisayarınıza indirebilir; dilediğiniz an tek tıkla geri yükleyebilirsiniz.
                </p>
              </div>
            </div>

            {/* Bildirim Mesajları */}
            {restoreSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{restoreSuccessMsg}</span>
              </div>
            )}

            {restoreErrorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{restoreErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* SOL KART: TEK TUŞLA YEDEK İNDİR */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">1. Tek Tuşla Yedek İndir</h4>
                      <p className="text-[10px] text-slate-500">Bilgisayarınıza tam yedek dosyasını (.json) kaydeder</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Mevcut canlı veritabanındaki tüm tablolar, fotoğraflar ve hafıza kayıtları eksiksiz paketlenir.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadBackup(false)}
                    disabled={downloadingBackup}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {downloadingBackup ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>⚡ Hızlı Veri Yedeği İndir (~2 MB)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadBackup(true)}
                    disabled={downloadingBackup}
                    className="w-full py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>🖼️ Tam Arşiv Yedeği (Fotoğraflı)</span>
                  </button>
                </div>
              </div>

              {/* SAĞ KART: TEK TUŞLA GERİ YÜKLE */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">2. Tek Tuşla Geri Yükle</h4>
                      <p className="text-[10px] text-slate-500">Daha önce aldığınız yedek dosyasını yükleyin</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Yedek dosyasını seçtiğinizde önce içeriği güvenle incelenir, geri yükleme modunu seçebilirsiniz.
                  </p>
                </div>

                <div>
                  <input
                    ref={backupFileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleBackupFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => backupFileInputRef.current?.click()}
                    disabled={validatingBackup || restoringBackup}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {validatingBackup ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Dosya Doğrulanıyor...</span>
                      </>
                    ) : (
                      <>
                        <FileJson className="w-4 h-4" />
                        <span>Yedek Dosyası Seç (.json)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* YEDEK DOSYASI ÖN İNCELEME & MOD SEÇİM ALANI */}
            {validationResult && (
              <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-xs text-slate-900">Seçilen Yedek Dosyası İncelendi</span>
                  </div>
                  <span className="text-[11px] text-blue-700 font-mono font-semibold">
                    Yedek Tarihi: {validationResult.exportDate}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Toplam Kayıt</span>
                    <span className="font-extrabold text-slate-800 text-sm">{validationResult.totalRecords}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Tablo Sayısı</span>
                    <span className="font-extrabold text-blue-700 text-sm">{validationResult.tableSummary.length} Tablo</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px]">Güvenlik Snapshot</span>
                    <span className="font-bold text-emerald-700 text-xs flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Otomatik Aktif
                    </span>
                  </div>
                </div>

                {/* GERİ YÜKLEME MODU SEÇİMİ */}
                <div className="space-y-2.5 pt-1">
                  <label className="text-xs font-bold text-slate-900 block">
                    Geri Yükleme Yöntemini Seçiniz:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* MOD 1: AKILLI BİRLEŞTİRME */}
                    <div
                      onClick={() => setRestoreMode('merge')}
                      className={`p-3 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        restoreMode === 'merge'
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            Akıllı Birleştirme (Tavsiye Edilen)
                          </span>
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Yedekten sonra girdiğiniz <strong>yeni kayıtlara HİÇ DOKUNMAZ</strong>. Sadece silinen veya eksik olan projeleri/verileri geri getirir.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 mt-2 block">
                        🛡️ Sıfır Veri Kaybı Riski
                      </span>
                    </div>

                    {/* MOD 2: TAM DURUM SIFIRLAMA */}
                    <div
                      onClick={() => setRestoreMode('full')}
                      className={`p-3 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        restoreMode === 'full'
                          ? 'border-rose-500 bg-rose-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-rose-950 flex items-center gap-1.5">
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                            Tam Sıfırlama (Yedeğe Dön)
                          </span>
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'full'}
                            onChange={() => setRestoreMode('full')}
                            className="text-rose-600 focus:ring-rose-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Yedek tarihinden sonra girdiğiniz <strong>tüm yeni kayıtlar silinir</strong>. Sistem tamamen yedek anındaki haline döner.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-rose-700 mt-2 block">
                        ⚠️ Yeni Kayıtlar Kaybolur
                      </span>
                    </div>
                  </div>
                </div>

                {/* TAM SIFIRLAMA İÇİN ISRARLI ONAY KUTUSU */}
                {restoreMode === 'full' && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2 animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-rose-950 space-y-1">
                        <p className="font-bold">
                          DİKKAT: {validationResult.exportDate} tarihinden şu ana kadar girdiğiniz tüm yeni işlemler silinecektir!
                        </p>
                        <p className="text-[10px] text-rose-800">
                          Eğer aradaki yeni verilerinizin kaybolmasını istemiyorsanız lütfen yukarıdan "Akıllı Birleştirme" seçeneğini kullanınız.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-rose-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmLossChecked}
                        onChange={(e) => setConfirmLossChecked(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                      />
                      <span className="text-[11px] font-bold text-rose-900 select-none">
                        {validationResult.exportDate} tarihinden sonraki yeni kayıtların silinmesini ve sistemin tam yedeğe dönmesini onaylıyorum.
                      </span>
                    </label>
                  </div>
                )}

                {/* Geri Yükleme Aksiyon Butonları */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {restoreMode === 'merge' ? '✨ Yeni kayıtlar korunacak, eksikler eklenecek.' : '⚠️ Tam sıfırlama uygulanacak.'}
                  </span>

                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={restoringBackup || (restoreMode === 'full' && !confirmLossChecked)}
                    className={`px-4 py-2 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      restoreMode === 'merge'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {restoringBackup ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Veritabanı Geri Yükleniyor...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {restoreMode === 'merge' ? 'Eksikleri ve Silinenleri Geri Yükle' : 'Tüm Yeni Verileri Sil ve Yedeğe Dön'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alt Aksiyonlar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Kapat
          </button>

          {activeTab === 'durum' && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Yenileniyor...' : 'Verileri & Bağlantıyı Yenile'}</span>
            </button>
          )}

          {activeTab === 'yedek' && (
            <button
              onClick={handleDownloadBackup}
              disabled={downloadingBackup}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Hemen Yedek İndir</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
