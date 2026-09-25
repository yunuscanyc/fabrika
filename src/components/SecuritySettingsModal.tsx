import React, { useState, useEffect } from 'react';
import { X, Shield, Key, Lock, Clock, CheckCircle2, AlertCircle, Save, Hash, Bell, Smartphone, Send, Radio } from 'lucide-react';
import { 
  isPushNotificationSupported, 
  getNotificationPermission, 
  getCurrentPushSubscription, 
  subscribeToPushNotifications, 
  unsubscribeFromPushNotifications, 
  sendTestPushNotification 
} from '../utils/pushManager';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: (newAutoLockMin: number) => void;
  currentUserName?: string;
}

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated,
  currentUserName = '1. Yönetici'
}) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Push Bildirim Durumu
  const [pushSupported, setPushSupported] = useState<boolean>(true);
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  // Mevcut Ayarlar Bilgisi
  const [currentSavedAdminPin, setCurrentSavedAdminPin] = useState<string>('');
  const [currentSavedAdminPin2, setCurrentSavedAdminPin2] = useState<string>('');
  const [currentSavedUstabasiPin, setCurrentSavedUstabasiPin] = useState<string>('');
  const [yonetici1Ad, setYonetici1Ad] = useState<string>('1. Yönetici');
  const [yonetici2Ad, setYonetici2Ad] = useState<string>('2. Yönetici');

  // Form Alanları
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [newPin2, setNewPin2] = useState('');
  const [confirmPin2, setConfirmPin2] = useState('');
  const [newUstabasiPin, setNewUstabasiPin] = useState('');
  const [confirmUstabasiPin, setConfirmUstabasiPin] = useState('');
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(15);
  const [isProtectionEnabled, setIsProtectionEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      setPushMsg(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNewPin('');
      setConfirmPin('');
      setNewPin2('');
      setConfirmPin2('');
      setNewUstabasiPin('');
      setConfirmUstabasiPin('');
      setFetching(true);

      setPushSupported(isPushNotificationSupported());
      getCurrentPushSubscription().then(sub => {
        setPushSubscribed(Boolean(sub));
      }).catch(() => {});

      fetch('/api/auth/status')
        .then(r => r.json())
        .then(data => {
          if (data) {
            setAutoLockMinutes(data.autoLockMinutes ?? 15);
            setIsProtectionEnabled(data.isProtectionEnabled ?? true);
            if (data.quickPin) setCurrentSavedAdminPin(data.quickPin);
            if (data.quickPin2) setCurrentSavedAdminPin2(data.quickPin2);
            if (data.yonetici1Ad) setYonetici1Ad(data.yonetici1Ad);
            if (data.yonetici2Ad) setYonetici2Ad(data.yonetici2Ad);
            if (data.ustabasiPin) setCurrentSavedUstabasiPin(data.ustabasiPin);
          }
        })
        .catch(() => {})
        .finally(() => setFetching(false));
    }
  }, [isOpen]);

  const handleTogglePush = async () => {
    setPushLoading(true);
    setPushMsg(null);
    try {
      if (pushSubscribed) {
        await unsubscribeFromPushNotifications();
        setPushSubscribed(false);
        setPushMsg('Bu cihazdaki push bildirim aboneliği kapatıldı.');
      } else {
        const res = await subscribeToPushNotifications(currentUserName, currentUserName.includes('2') ? 'admin2' : 'admin1');
        if (res.success) {
          setPushSubscribed(true);
          setPushMsg('✅ Tebrikler! Cep telefonu bildirimleri başarıyla aktifleştirildi.');
        } else {
          setPushMsg(`❌ ${res.error || 'Bildirim izni verilemedi.'}`);
        }
      }
    } catch (e: any) {
      setPushMsg(`❌ Hata: ${e.message}`);
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setPushLoading(true);
    setPushMsg(null);
    try {
      const res = await sendTestPushNotification(currentUserName);
      if (res.success) {
        setPushMsg('📱 Test bildirimi telefonunuza/cihazınıza gönderildi! Bildirim çubuğunu kontrol ediniz.');
      } else {
        setPushMsg(`❌ ${res.error || 'Test bildirimi gönderilemedi.'}`);
      }
    } catch (e: any) {
      setPushMsg(`❌ Hata: ${e.message}`);
    } finally {
      setPushLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (isProtectionEnabled && !currentPassword.trim()) {
      setError('Güvenlik doğrulaması için lütfen mevcut yönetici parolanızı veya yönetici PIN kodunuzu giriniz.');
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setError('Yeni parola en az 4 karakter olmalıdır.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('Yeni parolalar birbiriyle eşleşmiyor.');
      return;
    }

    if (newPin) {
      if (!/^\d{4,8}$/.test(newPin.trim())) {
        setError('1. Yönetici Hızlı PIN sadece 4 ile 8 hane arasındaki rakamlardan oluşmalıdır.');
        return;
      }
      if (newPin !== confirmPin) {
        setError('Belirlediğiniz 1. Yönetici PIN kodları birbiriyle eşleşmiyor.');
        return;
      }
    }

    if (newPin2) {
      if (!/^\d{4,8}$/.test(newPin2.trim())) {
        setError('2. Yönetici Hızlı PIN sadece 4 ile 8 hane arasındaki rakamlardan oluşmalıdır.');
        return;
      }
      if (newPin2 !== confirmPin2) {
        setError('Belirlediğiniz 2. Yönetici PIN kodları birbiriyle eşleşmiyor.');
        return;
      }
    }

    if (newUstabasiPin) {
      if (!/^\d{4,8}$/.test(newUstabasiPin.trim())) {
        setError('Ustabaşı PIN sadece 4 ile 8 hane arasındaki rakamlardan oluşmalıdır.');
        return;
      }
      if (newUstabasiPin !== confirmUstabasiPin) {
        setError('Belirlediğiniz yeni Ustabaşı PIN kodları birbiriyle eşleşmiyor.');
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim() || undefined,
          newPin: newPin.trim() || undefined,
          newPin2: newPin2.trim() || undefined,
          yonetici1Ad: yonetici1Ad.trim() || '1. Yönetici',
          yonetici2Ad: yonetici2Ad.trim() || '2. Yönetici',
          newUstabasiPin: newUstabasiPin.trim() || undefined,
          autoLockMinutes: Number(autoLockMinutes),
          isProtectionEnabled
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Güvenlik ayarları başarıyla güncellendi!');
        localStorage.setItem('rende_autolock_min', autoLockMinutes.toString());
        if (onSettingsUpdated) {
          onSettingsUpdated(autoLockMinutes);
        }
        if (data.settings?.quickPin) setCurrentSavedAdminPin(data.settings.quickPin);
        if (data.settings?.quickPin2 !== undefined) setCurrentSavedAdminPin2(data.settings.quickPin2);
        if (data.settings?.ustabasiPin) setCurrentSavedUstabasiPin(data.settings.ustabasiPin);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setNewPin('');
        setConfirmPin('');
        setNewPin2('');
        setConfirmPin2('');
        setNewUstabasiPin('');
        setConfirmUstabasiPin('');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(data.error || 'Ayarlar kaydedilemedi. Parolanızı veya PIN kodunuzu kontrol ediniz.');
      }
    } catch (err: any) {
      setError('Sunucu bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 my-auto flex flex-col max-h-[92vh]">
        {/* Modal Başlık (Sabit Sticky Header) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Güvenlik &amp; Parola Ayarları</h3>
              <p className="text-[11px] text-slate-300">Gizli PIN, parola, bildirim ve otomatik kilit yönetimi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal İçerik (Kaydırılabilir Gövde) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {fetching ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs">Güvenlik parametreleri yükleniyor...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              {/* Bildirimler */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* 1. Otomatik Kilit Süresi */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Hareketsizlik Otomatik Kilit Süresi
                </label>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Masadan ayrıldığınızda ekranın otomatik kilitlenme süresi.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { label: '5 dk', value: 5 },
                    { label: '10 dk', value: 10 },
                    { label: '15 dk', value: 15 },
                    { label: '30 dk', value: 30 },
                    { label: '60 dk', value: 60 },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAutoLockMinutes(opt.value)}
                      className={`py-2 px-1 rounded-lg text-xs font-semibold border transition-all text-center ${
                        autoLockMinutes === opt.value
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.value} dk
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 1. Yönetici Hızlı PIN Tanımlama */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-blue-600" />
                      1. Yönetici Hızlı PIN (4-8 Hane)
                    </label>
                    <p className="text-[11px] text-blue-800/80 mt-0.5">
                      1. Yönetici için giriş ve kilit açma PIN kodu.
                    </p>
                  </div>
                  {currentSavedAdminPin && (
                    <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200 shrink-0">
                      Aktif: {currentSavedAdminPin}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      1. Yönetici İsmi / Etiketi
                    </label>
                    <input
                      type="text"
                      value={yonetici1Ad}
                      onChange={(e) => setYonetici1Ad(e.target.value)}
                      placeholder="Örn: 1. Yönetici (Ahmet Bey)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Yeni 1. Yönetici PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      autoComplete="new-password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder={currentSavedAdminPin ? `Mevcut: ${currentSavedAdminPin}` : '1. PIN (••••)'}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      1. PIN Tekrar
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      autoComplete="new-password"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="1. PIN tekrar (••••)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. 2. Yönetici Hızlı PIN Tanımlama (Diğer Yönetici İçin) */}
              <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-indigo-600" />
                      2. Yönetici Hızlı PIN (4-8 Hane)
                    </label>
                    <p className="text-[11px] text-indigo-800/80 mt-0.5">
                      Diğer yönetici bu PIN ile giriş yaptığında ekranında ajanda bildirimlerini görecektir.
                    </p>
                  </div>
                  {currentSavedAdminPin2 ? (
                    <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md border border-indigo-200 shrink-0">
                      Aktif: {currentSavedAdminPin2}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                      Tanımlı Değil
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      2. Yönetici İsmi / Etiketi
                    </label>
                    <input
                      type="text"
                      value={yonetici2Ad}
                      onChange={(e) => setYonetici2Ad(e.target.value)}
                      placeholder="Örn: 2. Yönetici (Mehmet Bey)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Yeni 2. Yönetici PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      autoComplete="new-password"
                      value={newPin2}
                      onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, ''))}
                      placeholder={currentSavedAdminPin2 ? `Mevcut: ${currentSavedAdminPin2}` : '2. PIN (••••)'}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      2. PIN Tekrar
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      autoComplete="new-password"
                      value={confirmPin2}
                      onChange={(e) => setConfirmPin2(e.target.value.replace(/\D/g, ''))}
                      placeholder="2. PIN tekrar (••••)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Ustabaşı Özel PIN Kodu (Sadece Sipariş Girişi) */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-amber-700" />
                      Ustabaşı Özel PIN Kodu (Sadece Sipariş Girişi)
                    </label>
                    <p className="text-[11px] text-amber-800/80 mt-0.5">
                      Ustabaşı bu PIN ile giriş yaptığında <strong>yalnızca Sipariş Giriş ve Takip ekranını</strong> görür. Fabrika genel yönetimine ve diğer modüllere erişemez.
                    </p>
                  </div>
                  {currentSavedUstabasiPin && (
                    <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300 shrink-0">
                      Aktif: {currentSavedUstabasiPin}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      Yeni Ustabaşı PIN (4-8 Hane)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      autoComplete="new-password"
                      value={newUstabasiPin}
                      onChange={(e) => setNewUstabasiPin(e.target.value.replace(/\D/g, ''))}
                      placeholder={currentSavedUstabasiPin ? `Mevcut: ${currentSavedUstabasiPin}` : 'Ustabaşı PIN girin (••••)'}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-mono tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                      Ustabaşı PIN Tekrar
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      autoComplete="new-password"
                      value={confirmUstabasiPin}
                      onChange={(e) => setConfirmUstabasiPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ustabaşı PIN tekrar (••••)"
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-mono tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Cep Telefonu & Web Push Anlık Bildirim Butonu */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <label className="text-xs font-bold text-slate-800">
                      Cep Telefonu Anlık Bildirimleri ({currentUserName})
                    </label>
                  </div>
                  {pushSubscribed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md">
                      <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                      <span>Aktif</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                      Kapalı
                    </span>
                  )}
                </div>

                {pushMsg && (
                  <div className={`p-2 rounded-lg text-xs font-semibold ${
                    pushMsg.startsWith('✅') 
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                      : pushMsg.startsWith('📱')
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {pushMsg}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePush}
                    disabled={pushLoading || !pushSupported}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                      pushSubscribed
                        ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>{pushSubscribed ? 'Bildirimleri Kapat' : 'Bildirimleri Aç'}</span>
                  </button>

                  {pushSubscribed && (
                    <button
                      type="button"
                      onClick={handleTestPush}
                      disabled={pushLoading}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Test Bildirimi Gönder"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Test Et</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 5. Parola Değiştirme (Tamamen Maskeli / Güvenli) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-blue-600" />
                  Yönetici Parolasını Güncelle
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Yeni Parola
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Değişmeyecekse boş bırakın"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Yeni Parola Tekrar
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Yeni parolayı tekrar girin"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Onay İçin Mevcut Parola veya Yönetici PIN */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Mevcut Yönetici Parolası veya Yönetici PIN Doğrulaması <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Değişiklikleri kaydetmek için lütfen mevcut yönetici parolanızı veya geçerli yönetici PIN kodunuzu giriniz.
                </p>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Mevcut yönetici parolası veya PIN kodunuz..."
                  required
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Kaydet & İptal */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Değişiklikleri Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

