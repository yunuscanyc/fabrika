import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle2, AlertTriangle, X, Table, Server, Settings, Link } from 'lucide-react';

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
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  isOpen,
  onClose,
  dbStatus,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'durum' | 'ayarlar'>('durum');
  const [refreshing, setRefreshing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Form state
  const [connectionString, setConnectionString] = useState('');
  const [host, setHost] = useState(dbStatus?.host || 'localhost');
  const [port, setPort] = useState(String(dbStatus?.port || '5432'));
  const [database, setDatabase] = useState(dbStatus?.database || 'FabrikaYonetimDB');
  const [user, setUser] = useState(dbStatus?.user || 'postgres');
  const [password, setPassword] = useState('');
  const [ssl, setSsl] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSuccess(null);
    setConfigError(null);

    try {
      const payload = connectionString.trim()
        ? { connectionString: connectionString.trim() }
        : {
            host: host.trim(),
            port: port.trim(),
            database: database.trim(),
            user: user.trim(),
            password,
            ssl: ssl ? 'true' : 'false'
          };

      const res = await fetch('/api/db-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.connected) {
        setConfigSuccess('PostgreSQL veritabanınıza başarıyla bağlanıldı! Canlı veriler yüklendi.');
        await onRefresh();
        setActiveTab('durum');
      } else {
        setConfigError(data.lastDbError || 'Veritabanına bağlanılamadı. Bilgileri kontrol ediniz.');
        await onRefresh();
      }
    } catch (err: any) {
      setConfigError(err.message || 'Bağlantı isteği başarısız oldu.');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Başlık */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                dbStatus?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                PostgreSQL Veritabanı
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
                {dbStatus?.database || 'FabrikaYonetimDB'} @ {dbStatus?.host || 'localhost'}:{dbStatus?.port || 5432}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sekmeler */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('durum')}
            className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'durum'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Bağlantı &amp; Tablo Durumu</span>
          </button>
          <button
            onClick={() => setActiveTab('ayarlar')}
            className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'ayarlar'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Bağlantı Ayarları Yapılandır</span>
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
                      Sistem doğrudan canlı <strong>{dbStatus.database}</strong> veritabanınızdan veri okumaktadır.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-900">
                      Canlı PostgreSQL Veritabanı Bağlantısı Bekleniyor
                    </p>
                    <p>
                      Kendi sunucunuzdaki veritabanına bağlanmak için <strong>Bağlantı Ayarları Yapılandır</strong> sekmesini kullanabilirsiniz.
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

            {/* Tablo Listesi */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-slate-500" />
                  Tespit Edilen Tablolar &amp; Canlı Kayıt Sayıları
                </span>
                <span className="text-[11px] text-slate-500">
                  {Object.keys(dbStatus?.detectedTables || {}).length} tablo eşleşti
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'Personeller', label: 'Personeller' },
                  { key: 'Departmanlar', label: 'Departmanlar' },
                  { key: 'Gorevler', label: 'Görevler' },
                  { key: 'Izinler', label: 'İzinler' },
                  { key: 'Puantajlar', label: 'Puantaj Kayıtları' },
                  { key: 'Makineler', label: 'Makineler' },
                  { key: 'MakineBakimlari', label: 'Makine Bakımları' },
                  { key: 'Projeler', label: 'Projeler' },
                  { key: 'Araclar', label: 'Araçlar' },
                  { key: 'Yevmiyeciler', label: 'Yevmiyeciler' },
                  { key: 'KkdZimmetler', label: 'KKD Zimmetleri' },
                  { key: 'SaglikRaporlari', label: 'Sağlık Raporları' },
                  { key: 'IsgEgitimleri', label: 'İSG Eğitimleri' },
                  { key: 'Hatirlaticilar', label: 'Hatırlatıcılar' },
                ].map((item) => {
                  const detected = dbStatus?.detectedTables?.[item.key];
                  const count = dbStatus?.tableCounts?.[item.key];
                  return (
                    <div
                      key={item.key}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 text-[11px]">{item.label}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {detected ? `"${detected}"` : 'Tablo yok'}
                        </p>
                      </div>
                      <div className="text-right">
                        {detected ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {count !== undefined ? `${count} kayıt` : 'Var'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-600">
                            Mevcut Değil
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. AYARLAR SEKMESİ */}
        {activeTab === 'ayarlar' && (
          <form onSubmit={handleSaveConfig} className="space-y-3 text-xs">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
              Kendi PostgreSQL sunucu bilgilerinizi aşağıdan güncelleyip anında test edebilirsiniz.
            </div>

            {configSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{configSuccess}</span>
              </div>
            )}

            {configError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-mono text-[11px]">
                <AlertTriangle className="w-4 h-4 text-rose-600 inline mr-1" />
                Hata: {configError}
              </div>
            )}

            {/* Connection String (Opsiyonel Kolay Bağlantı) */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <Link className="w-3.5 h-3.5 text-blue-600" />
                Doğrudan Connection URL (Önerilen - Kolay Bağlantı)
              </label>
              <input
                type="text"
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                placeholder="postgresql://kullanici:sifre@sunucu-ip:5432/veritabani_adi"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">
                Eğer Connection URI girerseniz aşağıdaki alanlar devre dışı kalır.
              </span>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase">veya tek tek girin</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <label className="font-bold text-slate-700">Host (Sunucu / IP)</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  disabled={!!connectionString.trim()}
                  placeholder="localhost veya IP"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Port</label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  disabled={!!connectionString.trim()}
                  placeholder="5432"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Veritabanı Adı (Database)</label>
                <input
                  type="text"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  disabled={!!connectionString.trim()}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Kullanıcı (User)</label>
                <input
                  type="text"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  disabled={!!connectionString.trim()}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Şifre (Password)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!!connectionString.trim()}
                  placeholder="PostgreSQL şifresi"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="sslCheck"
                  checked={ssl}
                  onChange={(e) => setSsl(e.target.checked)}
                  disabled={!!connectionString.trim()}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sslCheck" className="text-slate-700 font-medium cursor-pointer">
                  SSL Kullan (Bulut DB için)
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingConfig}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${savingConfig ? 'animate-spin' : ''}`} />
                <span>{savingConfig ? 'Test Ediliyor & Kaydediliyor...' : 'Bağlantıyı Test Et ve Kaydet'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Alt Aksiyonlar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Kapat
          </button>

          {activeTab === 'durum' && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Yenileniyor...' : 'Verileri & Bağlantıyı Yenile'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
