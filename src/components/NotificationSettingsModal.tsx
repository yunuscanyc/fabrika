import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Shield, RefreshCw, Layers, BookOpen, FolderGit2, Truck, Users, ShoppingBag } from 'lucide-react';

export interface NotificationSettings {
  // Ajanda & Hatırlatıcılar
  hatirlatici_eklendi: boolean;
  hatirlatici_duzenlendi: boolean;
  hatirlatici_silindi: boolean;

  // Ceride
  ceride_eklendi: boolean;
  ceride_duzenlendi: boolean;
  ceride_silindi: boolean;

  // Projeler
  proje_eklendi: boolean;
  proje_duzenlendi: boolean;
  proje_silindi: boolean;

  // Araç & Makine Bakım
  bakim_eklendi: boolean;
  bakim_duzenlendi: boolean;

  // Personel & İK
  personel_eklendi: boolean;
  puantaj_girildi: boolean;

  // Sipariş & Satınalma
  siparis_eklendi: boolean;
  siparis_durum_degisti: boolean;
  siparis_silindi: boolean;
}

const defaultSettings: NotificationSettings = {
  hatirlatici_eklendi: true,
  hatirlatici_duzenlendi: true,
  hatirlatici_silindi: true,

  ceride_eklendi: true,
  ceride_duzenlendi: true,
  ceride_silindi: true,

  proje_eklendi: true,
  proje_duzenlendi: true,
  proje_silindi: true,

  bakim_eklendi: true,
  bakim_duzenlendi: true,

  personel_eklendi: true,
  puantaj_girildi: true,

  siparis_eklendi: true,
  siparis_durum_degisti: true,
  siparis_silindi: true
};

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notification-settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...defaultSettings, ...(data || {}) });
      }
    } catch (e) {
      console.error('Failed to load notification settings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Bildirim tercihleri başarıyla kaydedildi!' });
        setTimeout(() => {
          setMessage(null);
          onClose();
        }, 1200);
      } else {
        throw new Error('Kaydedilemedi');
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: 'Tercihler kaydedilirken hata oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAll = (value: boolean) => {
    const updated: NotificationSettings = { ...settings };
    (Object.keys(updated) as (keyof NotificationSettings)[]).forEach(k => {
      updated[k] = value;
    });
    setSettings(updated);
  };

  const toggleKey = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Üst Başlık Barı */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight">Bildirim Tercihleri Merkezi</h3>
              <p className="text-xs text-slate-400">Hangi işlemler için anlık mobil &amp; web bildirimi gönderileceğini seçin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hızlı Seçim Barı */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 text-xs">
          <span className="font-bold text-slate-600 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-600" />
            Yönetici Bildirim Filtresi
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleAll(true)}
              className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-lg transition"
            >
              Tümünü Aç
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition"
            >
              Tümünü Kapat
            </button>
          </div>
        </div>

        {/* İçerik / Kategoriler */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span>Bildirim ayarları yükleniyor...</span>
            </div>
          ) : (
            <>
              {message && (
                <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <Check className="w-4 h-4" />
                  <span>{message.text}</span>
                </div>
              )}

              {/* 1. Ajanda & Hatırlatıcılar */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200/80 pb-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span>Ajanda &amp; Hatırlatıcı Bildirimleri</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Yeni Hatırlatıcı Eklendiğinde</span>
                    <input
                      type="checkbox"
                      checked={settings.hatirlatici_eklendi}
                      onChange={() => toggleKey('hatirlatici_eklendi')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Hatırlatıcı Düzenlendiğinde</span>
                    <input
                      type="checkbox"
                      checked={settings.hatirlatici_duzenlendi}
                      onChange={() => toggleKey('hatirlatici_duzenlendi')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Hatırlatıcı Silindiğinde</span>
                    <input
                      type="checkbox"
                      checked={settings.hatirlatici_silindi}
                      onChange={() => toggleKey('hatirlatici_silindi')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* 2. Ceride Kayıtları */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200/80 pb-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>Şantiye &amp; İşletme Ceridesi (Günlük Olaylar)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Yeni Ceride Kaydı Oluşunca</span>
                    <input
                      type="checkbox"
                      checked={settings.ceride_eklendi}
                      onChange={() => toggleKey('ceride_eklendi')}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Ceride Kaydı Düzenlenince</span>
                    <input
                      type="checkbox"
                      checked={settings.ceride_duzenlendi}
                      onChange={() => toggleKey('ceride_duzenlendi')}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Ceride Kaydı Silinince</span>
                    <input
                      type="checkbox"
                      checked={settings.ceride_silindi}
                      onChange={() => toggleKey('ceride_silindi')}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* 3. Projeler */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200/80 pb-2">
                  <FolderGit2 className="w-4 h-4 text-emerald-600" />
                  <span>Proje &amp; Ağaç Yönetimi</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Yeni Proje Açıldığında</span>
                    <input
                      type="checkbox"
                      checked={settings.proje_eklendi}
                      onChange={() => toggleKey('proje_eklendi')}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Proje Durumu Değiştiğinde</span>
                    <input
                      type="checkbox"
                      checked={settings.proje_duzenlendi}
                      onChange={() => toggleKey('proje_duzenlendi')}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Proje Silindiğinde</span>
                    <input
                      type="checkbox"
                      checked={settings.proje_silindi}
                      onChange={() => toggleKey('proje_silindi')}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* 4. Araç & Makine Bakım */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200/80 pb-2">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  <span>Araç, Makine &amp; Bakım İşlemleri</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Yeni Bakım Kaydı Eklendiğinde</span>
                    <input
                      type="checkbox"
                      checked={settings.bakim_eklendi}
                      onChange={() => toggleKey('bakim_eklendi')}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Bakım / Muayene Güncellenince</span>
                    <input
                      type="checkbox"
                      checked={settings.bakim_duzenlendi}
                      onChange={() => toggleKey('bakim_duzenlendi')}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* 5. Personel & Puantaj */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200/80 pb-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Personel &amp; Puantaj Girişleri</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Yeni Personel Eklendiğinde</span>
                    <input
                      type="checkbox"
                      checked={settings.personel_eklendi}
                      onChange={() => toggleKey('personel_eklendi')}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Günlük Puantaj / Mesai Girilince</span>
                    <input
                      type="checkbox"
                      checked={settings.puantaj_girildi}
                      onChange={() => toggleKey('puantaj_girildi')}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* 6. Sipariş & Satınalma */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200/80 pb-2">
                  <ShoppingBag className="w-4 h-4 text-rose-600" />
                  <span>Sipariş &amp; Satınalma Talepleri</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Yeni Sipariş Oluşturulduğunda</span>
                    <input
                      type="checkbox"
                      checked={settings.siparis_eklendi}
                      onChange={() => toggleKey('siparis_eklendi')}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Sipariş Durumu Değiştiğinde</span>
                    <input
                      type="checkbox"
                      checked={settings.siparis_durum_degisti}
                      onChange={() => toggleKey('siparis_durum_degisti')}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <span className="font-semibold text-slate-700">Sipariş Silindiğinde</span>
                    <input
                      type="checkbox"
                      checked={settings.siparis_silindi}
                      onChange={() => toggleKey('siparis_silindi')}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Alt Butonlar */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200 text-xs font-bold transition"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Tercihleri Kaydet</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
