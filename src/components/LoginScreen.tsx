import React, { useState, useEffect } from 'react';
import { Lock, Key, Shield, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Factory, Sparkles, Delete } from 'lucide-react';
import { PWAInstallPrompt } from './PWAInstallPrompt';

interface LoginScreenProps {
  onLoginSuccess: (token: string, autoLockMinutes: number, role?: 'admin' | 'ustabasi', userName?: string, adminId?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [hasCustomPassword, setHasCustomPassword] = useState(false);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(data => {
        if (data && data.hasCustomPassword) {
          setHasCustomPassword(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleKeypadPress = (val: string) => {
    setError(null);
    if (val === 'clear') {
      setPassword('');
    } else if (val === 'backspace') {
      setPassword(prev => prev.slice(0, -1));
    } else {
      setPassword(prev => prev + val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Lütfen parolanızı veya PIN kodunuzu giriniz.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const userRole: 'admin' | 'ustabasi' = data.role === 'ustabasi' ? 'ustabasi' : 'admin';
        const userName: string = data.userName || (userRole === 'ustabasi' ? 'Ustabaşı' : '1. Yönetici');
        const adminId: string = data.adminId || (userRole === 'ustabasi' ? 'ustabasi' : 'admin1');
        localStorage.removeItem('rende_auth_token');
        sessionStorage.setItem('rende_auth_token', data.token);
        sessionStorage.setItem('rende_user_role', userRole);
        sessionStorage.setItem('rende_user_name', userName);
        sessionStorage.setItem('rende_admin_id', adminId);
        sessionStorage.setItem('rende_last_active', Date.now().toString());
        if (data.autoLockMinutes !== undefined) {
          localStorage.setItem('rende_autolock_min', data.autoLockMinutes.toString());
        }
        onLoginSuccess(data.token, data.autoLockMinutes || 15, userRole, userName, adminId);
      } else {
        setError(data.error || 'Parola veya PIN hatalı! Lütfen tekrar deneyiniz.');
      }
    } catch (err: any) {
      setError('Sunucu bağlantı hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 select-none overflow-y-auto">
      {/* Arka Plan Efekti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-900/40 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 text-white">
        <div className="absolute top-4 right-4">
          <PWAInstallPrompt variant="login" />
        </div>

        {/* Üst Logo ve Başlık */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/20 mb-4 ring-4 ring-blue-500/10">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            RENDE PORTAL
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
              GÜVENLİ GİRİŞ
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fabrika Üretim & Ekipman Yönetim Sistemi
          </p>
        </div>

        {/* Hata Bildirimi */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                Yönetici Parolası veya Hızlı PIN
              </label>
              {capsLockOn && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                  Caps Lock Açık!
                </span>
              )}
            </div>

             <div className="relative">
              <input
                type="text"
                name="rende_manual_quick_security_entry_no_autofill_pin"
                id="rende_manual_quick_security_entry_no_autofill_pin"
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyDown}
                style={{
                  WebkitTextSecurity: showPassword ? 'none' : 'disc'
                } as any}
                placeholder="PIN Kodu veya Parola..."
                autoFocus
                className="w-full pl-3.5 pr-10 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-center text-sm font-semibold tracking-widest text-white placeholder-slate-500 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                title={showPassword ? 'Gizle' : 'Göster'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sayısal Tuş Takımı (Hızlı PIN Girişi için) */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                className="py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 active:bg-blue-600 text-white font-bold text-sm border border-slate-700/60 transition-all font-mono active:scale-95 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeypadPress('clear')}
              className="py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold border border-slate-700/60 transition-all cursor-pointer"
              title="Temizle"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 active:bg-blue-600 text-white font-bold text-sm border border-slate-700/60 transition-all font-mono active:scale-95 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('backspace')}
              className="py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-700 text-slate-400 hover:text-red-300 flex items-center justify-center border border-slate-700/60 transition-all cursor-pointer"
              title="Sil"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sisteme Giriş Yap</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Alt Güvenlik Bilgisi */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>Hareketsizlik halinde otomatik kilit koruması devrededir</span>
        </div>
      </div>
    </div>
  );
};
