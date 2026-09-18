import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { ProjelerView } from './components/ProjelerView';
import { AraclarView } from './components/AraclarView';
import { HatirlaticilarView } from './components/HatirlaticilarView';
import { PersonelHubView } from './components/PersonelHubView';
import { MakineView } from './components/MakineView';
import { ServerSetupModal } from './components/ServerSetupModal';
import { DatabaseStatusModal, DbStatusData } from './components/DatabaseStatusModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LoginScreen } from './components/LoginScreen';
import { LockScreen } from './components/LockScreen';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { Proje, Arac, BakimKaydi, Hatirlatici, OzetIstatistikler, Personel, IzinKaydi, Makine, Departman, Gorev } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'personel' | 'makineler' | 'projeler' | 'araclar' | 'hatirlaticilar'>('dashboard');
  const [personelSubTab, setPersonelSubTab] = useState<'liste' | 'izin' | 'puantaj' | 'montaj' | 'isg' | 'yevmiyeci'>('liste');
  const [selectedPersonelId, setSelectedPersonelId] = useState<number | undefined>(undefined);
  const [isgSekme, setIsgSekme] = useState<'kkd' | 'saglik' | 'egitim' | undefined>(undefined);

  // Güvenlik & Oturum Durumu
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(15);
  const [securityModalOpen, setSecurityModalOpen] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const lastActiveRef = useRef<number>(Date.now());

  const handleNavigateTab = (
    tab: string,
    subTab?: 'liste' | 'izin' | 'puantaj' | 'montaj' | 'isg' | 'yevmiyeci',
    personelId?: number,
    isgSekmeTarget?: 'kkd' | 'saglik' | 'egitim'
  ) => {
    setActiveTab(tab as any);
    if (subTab) setPersonelSubTab(subTab);
    if (personelId !== undefined) setSelectedPersonelId(personelId);
    if (isgSekmeTarget) setIsgSekme(isgSekmeTarget);
  };
  const [serverGuideOpen, setServerGuideOpen] = useState(false);
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatusData | null>(null);

  // Veriler
  const [ozet, setOzet] = useState<OzetIstatistikler | null>(null);
  const [projeler, setProjeler] = useState<Proje[]>([]);
  const [araclar, setAraclar] = useState<Arac[]>([]);
  const [hatirlaticilar, setHatirlaticilar] = useState<Hatirlatici[]>([]);
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [izinler, setIzinler] = useState<IzinKaydi[]>([]);
  const [makineler, setMakineler] = useState<Makine[]>([]);
  const [departmanlar, setDepartmanlar] = useState<Departman[]>([]);
  const [gorevler, setGorevler] = useState<Gorev[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Oturum ve Kimlik Doğrulama Kontrolü
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Eski localStorage token kalıntılarını temizle (sekme kapanınca oturum kesin kapansın)
        localStorage.removeItem('rende_auth_token');
        const token = sessionStorage.getItem('rende_auth_token');
        const savedAutoLock = localStorage.getItem('rende_autolock_min');
        const autoLockVal = savedAutoLock ? parseInt(savedAutoLock, 10) : 15;
        setAutoLockMinutes(autoLockVal);

        if (!token) {
          const statusRes = await fetch('/api/auth/status').then(r => r.json()).catch(() => null);
          if (statusRes && statusRes.isProtectionEnabled === false) {
            setIsAuthenticated(true);
            setIsLocked(false);
            verileriYukle();
          } else {
            setIsAuthenticated(false);
          }
          setAuthChecking(false);
          return;
        }

        const res = await fetch('/api/auth/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await res.json();
        if (res.ok && data.valid) {
          setIsAuthenticated(true);
          if (data.autoLockMinutes !== undefined) {
            setAutoLockMinutes(data.autoLockMinutes);
          }
          // Son aktivite kontrolü (oturum süresi aşılmışsa kilit ekranı açılır)
          const lastActiveStr = sessionStorage.getItem('rende_last_active');
          if (lastActiveStr) {
            const lastActiveTime = parseInt(lastActiveStr, 10);
            const passedMinutes = (Date.now() - lastActiveTime) / (1000 * 60);
            if (autoLockVal > 0 && passedMinutes >= autoLockVal) {
              setIsLocked(true);
            }
          }
          verileriYukle();
        } else {
          sessionStorage.removeItem('rende_auth_token');
          setIsAuthenticated(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  // Kullanıcı Aktivitesi Takibi (Inactivity Auto-Lock)
  const updateActivity = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;
    sessionStorage.setItem('rende_last_active', now.toString());
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isLocked) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    let throttleTimeout: any = null;

    const handleUserActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          updateActivity();
          throttleTimeout = null;
        }, 3000);
      }
    };

    events.forEach(ev => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Periyodik kontrol
    const inactivityInterval = setInterval(() => {
      if (autoLockMinutes <= 0) return;
      const lastActive = lastActiveRef.current || parseInt(sessionStorage.getItem('rende_last_active') || '0', 10);
      const idleMs = Date.now() - lastActive;
      const timeoutMs = autoLockMinutes * 60 * 1000;

      if (idleMs >= timeoutMs) {
        setIsLocked(true);
      }
    }, 10000);

    // Sekme odağı değişimi kontrolü
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoLockMinutes > 0) {
        const lastActive = parseInt(sessionStorage.getItem('rende_last_active') || Date.now().toString(), 10);
        if (Date.now() - lastActive >= autoLockMinutes * 60 * 1000) {
          setIsLocked(true);
        } else {
          updateActivity();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleUserActivity));
      clearInterval(inactivityInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [isAuthenticated, isLocked, autoLockMinutes, updateActivity]);

  const handleLoginSuccess = (token: string, lockMin: number) => {
    setIsAuthenticated(true);
    setIsLocked(false);
    setAutoLockMinutes(lockMin);
    lastActiveRef.current = Date.now();
    verileriYukle();
  };

  const handleUnlock = () => {
    setIsLocked(false);
    lastActiveRef.current = Date.now();
    sessionStorage.setItem('rende_last_active', Date.now().toString());
  };

  const handleManualLock = () => {
    setIsLocked(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('rende_auth_token');
    sessionStorage.removeItem('rende_auth_token');
    sessionStorage.removeItem('rende_last_active');
    setIsAuthenticated(false);
    setIsLocked(false);
  };

  // Verileri API'den yükleme
  const verileriYukle = async () => {
    try {
      setYukleniyor(true);
      const [
        resOzet,
        resProjeler,
        resAraclar,
        resHatirlaticilar,
        resDbStatus,
        resPersoneller,
        resIzinler,
        resMakineler,
        resDepartmanlar,
        resGorevler
      ] = await Promise.all([
        fetch('/api/ozet').then(r => r.json()).catch(() => null),
        fetch('/api/projeler').then(r => r.json()).catch(() => []),
        fetch('/api/araclar').then(r => r.json()).catch(() => []),
        fetch('/api/hatirlaticilar').then(r => r.json()).catch(() => []),
        fetch('/api/db-status').then(r => r.json()).catch(() => null),
        fetch('/api/personeller').then(r => r.json()).catch(() => []),
        fetch('/api/izinler').then(r => r.json()).catch(() => []),
        fetch('/api/makineler').then(r => r.json()).catch(() => []),
        fetch('/api/departmanlar').then(r => r.json()).catch(() => []),
        fetch('/api/gorevler').then(r => r.json()).catch(() => []),
      ]);

      if (resOzet) setOzet(resOzet);
      if (Array.isArray(resProjeler)) setProjeler(resProjeler);
      if (Array.isArray(resAraclar)) setAraclar(resAraclar);
      if (Array.isArray(resHatirlaticilar) && resHatirlaticilar.length > 0) {
        setHatirlaticilar(resHatirlaticilar);
        try {
          localStorage.setItem('fabrika_hatirlaticilar_cache_v2', JSON.stringify(resHatirlaticilar));
        } catch (e) {}
      } else {
        try {
          const cached = localStorage.getItem('fabrika_hatirlaticilar_cache_v2');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setHatirlaticilar(parsed);
            }
          }
        } catch (e) {}
      }
      if (resDbStatus) setDbStatus(resDbStatus);
      if (Array.isArray(resPersoneller)) setPersoneller(resPersoneller);
      if (Array.isArray(resIzinler)) setIzinler(resIzinler);
      if (Array.isArray(resMakineler)) setMakineler(resMakineler);
      if (Array.isArray(resDepartmanlar)) setDepartmanlar(resDepartmanlar);
      if (Array.isArray(resGorevler)) setGorevler(resGorevler);
    } catch (err) {
      console.error('API Veri yükleme hatası:', err);
    } finally {
      setYukleniyor(false);
    }
  };

  const handleRefreshDb = async () => {
    try {
      await fetch('/api/db-reconnect', { method: 'POST' });
      await verileriYukle();
    } catch (err) {
      console.error('DB yenileme hatası:', err);
    }
  };

  useEffect(() => {
    verileriYukle();
  }, []);

  // Proje Kaydet / Güncelle
  const handleSaveProje = async (proje: Proje) => {
    try {
      const varMi = projeler.some(p => p.ProjeId === proje.ProjeId);
      if (varMi) {
        const res = await fetch(`/api/projeler/${proje.ProjeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proje),
        });
        const guncel = await res.json();
        setProjeler(prev => prev.map(p => p.ProjeId === proje.ProjeId ? guncel : p));
      } else {
        const res = await fetch('/api/projeler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proje),
        });
        const yeni = await res.json();
        setProjeler(prev => [yeni, ...prev]);
      }
      // Özeti güncelle
      fetch('/api/ozet').then(r => r.json()).then(setOzet);
    } catch (err) {
      console.error('Proje kaydetme hatası:', err);
    }
  };

  // Proje Sil
  const handleDeleteProje = async (id: number) => {
    try {
      await fetch(`/api/projeler/${id}`, { method: 'DELETE' });
      setProjeler(prev => prev.filter(p => p.ProjeId !== id));
      fetch('/api/ozet').then(r => r.json()).then(setOzet);
    } catch (err) {
      console.error('Proje silme hatası:', err);
    }
  };

  // Araç Kaydet / Güncelle
  const handleSaveArac = async (arac: Arac) => {
    try {
      const varMi = araclar.some(a => a.AracId === arac.AracId);
      if (varMi) {
        await fetch(`/api/araclar/${arac.AracId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(arac),
        });
        setAraclar(prev => prev.map(a => a.AracId === arac.AracId ? arac : a));
      } else {
        const res = await fetch('/api/araclar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(arac),
        });
        const yeni = await res.json();
        setAraclar(prev => [yeni, ...prev]);
      }
      fetch('/api/ozet').then(r => r.json()).then(setOzet);
    } catch (err) {
      console.error('Araç kaydetme hatası:', err);
    }
  };

  // Bakım Ekle
  const handleAddBakim = async (aracId: number, bakim: Partial<BakimKaydi>) => {
    try {
      const res = await fetch(`/api/araclar/${aracId}/bakimlar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bakim),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Bakım eklenemedi (${res.status})`);
      }
      const yeniBakim: BakimKaydi = await res.json();

      setAraclar(prev =>
        prev.map(a => {
          if (Number(a.AracId) === Number(aracId)) {
            const gecmis = (a.BakimGecmisi || []).filter(b => b.BakimId !== yeniBakim.BakimId);
            const sonKm = Number(yeniBakim.YapilanKmVeyaSaat) || 0;
            const guncelKm = Math.max(Number(a.GuncelKmVeyaSaat) || 0, sonKm);
            return {
              ...a,
              SonBakimTarihi: yeniBakim.BakimTarihi || a.SonBakimTarihi,
              SonBakimKmVeyaSaat: sonKm || a.SonBakimKmVeyaSaat,
              GuncelKmVeyaSaat: guncelKm,
              BakimGecmisi: [yeniBakim, ...gecmis],
            };
          }
          return a;
        })
      );
      fetch('/api/ozet').then(r => r.json()).then(setOzet).catch(() => {});
      return yeniBakim;
    } catch (err) {
      console.error('Bakım ekleme hatası:', err);
      throw err;
    }
  };

  // Bakım Güncelle
  const handleUpdateBakim = async (aracId: number, bakimId: number, bakim: Partial<BakimKaydi>) => {
    try {
      const res = await fetch(`/api/araclar/${aracId}/bakimlar/${bakimId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bakim),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Bakım güncellenemedi (${res.status})`);
      }
      const guncel = await res.json();

      setAraclar(prev =>
        prev.map(a => {
          if (Number(a.AracId) === Number(aracId) && a.BakimGecmisi) {
            return {
              ...a,
              BakimGecmisi: a.BakimGecmisi.map(b => (b.BakimId === bakimId ? (guncel || { ...b, ...bakim }) : b)),
            };
          }
          return a;
        })
      );
      fetch('/api/ozet').then(r => r.json()).then(setOzet).catch(() => {});
      return guncel;
    } catch (err) {
      console.error('Bakım güncelleme hatası:', err);
      throw err;
    }
  };

  // Bakım Sil
  const handleDeleteBakim = async (aracId: number, bakimId: number) => {
    try {
      const res = await fetch(`/api/araclar/${aracId}/bakimlar/${bakimId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Bakım silinemedi (${res.status})`);
      }

      setAraclar(prev =>
        prev.map(a => {
          if (Number(a.AracId) === Number(aracId) && a.BakimGecmisi) {
            return {
              ...a,
              BakimGecmisi: a.BakimGecmisi.filter(b => b.BakimId !== bakimId),
            };
          }
          return a;
        })
      );
      fetch('/api/ozet').then(r => r.json()).then(setOzet).catch(() => {});
    } catch (err) {
      console.error('Bakım silme hatası:', err);
      throw err;
    }
  };

  // Hatırlatıcı Ekle
  const handleAddHatirlatici = async (h: Partial<Hatirlatici>): Promise<boolean> => {
    try {
      const res = await fetch('/api/hatirlaticilar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(h),
      });
      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('Yüklenen görseller sunucu/Nginx boyut sınırını aştı (413 Payload Too Large). Görseller otomatik optimize edildi; lütfen tekrar deneyin veya Nginx ayarlarında client_max_body_size değerini artırın.');
        }
        const txt = await res.text();
        throw new Error(`Sunucu Hatası (${res.status}): ${txt || res.statusText}`);
      }
      const yeni = await res.json();
      setHatirlaticilar(prev => [yeni, ...prev]);
      fetch('/api/ozet').then(r => r.json()).then(setOzet);
      return true;
    } catch (err) {
      console.error('Hatırlatıcı ekleme hatası:', err);
      throw err;
    }
  };

  // Hatırlatıcı Tamamlandı / Açık Durumu
  const handleToggleTamamlandi = async (id: number, tamamlandi: boolean) => {
    // 1. İyimser Arayüz Güncellemesi (Optimistic UI)
    setHatirlaticilar(prev => {
      const guncel = prev.map(h => (h.Id === id ? { ...h, TamamlandiMi: tamamlandi } : h));
      try {
        localStorage.setItem('fabrika_hatirlaticilar_cache_v2', JSON.stringify(guncel));
      } catch (e) {}
      return guncel;
    });
    setOzet(prev => {
      if (!prev) return prev;
      const guncelGorevler = (prev.gorevListesi || []).map(g =>
        g.id === id ? { ...g, tamamlandiMi: tamamlandi } : g
      );
      return {
        ...prev,
        gorevListesi: guncelGorevler
      };
    });

    try {
      const existing = hatirlaticilar.find(h => h.Id === id);
      const payload = existing
        ? { ...existing, TamamlandiMi: tamamlandi }
        : { TamamlandiMi: tamamlandi };

      const res = await fetch(`/api/hatirlaticilar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Sunucu Hatası (${res.status}): ${txt || res.statusText}`);
      }
      const guncel = await res.json();
      setHatirlaticilar(prev =>
        prev.map(h => (h.Id === id ? { ...h, ...guncel } : h))
      );
      fetch('/api/ozet').then(r => r.json()).then(setOzet);
    } catch (err) {
      console.error('Hatırlatıcı güncelleme hatası:', err);
      verileriYukle();
    }
  };

  // Hatırlatıcı Tüm Alanları Güncelle
  const handleUpdateHatirlatici = async (id: number, fields: Partial<Hatirlatici>) => {
    try {
      const res = await fetch(`/api/hatirlaticilar/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('Yüklenen görseller sunucu/Nginx boyut sınırını aştı (413 Payload Too Large). Görseller otomatik optimize edildi; lütfen tekrar deneyin veya Nginx ayarlarında client_max_body_size değerini artırın.');
        }
        const txt = await res.text();
        throw new Error(`Sunucu Hatası (${res.status}): ${txt || res.statusText}`);
      }
      const guncellenen = await res.json();
      setHatirlaticilar(prev =>
        prev.map(h => (h.Id === id ? guncellenen : h))
      );
      fetch('/api/ozet').then(r => r.json()).then(setOzet);
      return guncellenen;
    } catch (err) {
      console.error('Hatırlatıcı güncelleme hatası:', err);
      throw err;
    }
  };

  // Hatırlatıcı Sil
  const handleDeleteHatirlatici = async (id: number) => {
    try {
      const res = await fetch(`/api/hatirlaticilar/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Sunucu Hatası (${res.status}): ${txt || res.statusText}`);
      }
      setHatirlaticilar(prev => prev.filter(h => h.Id !== id));
      fetch('/api/ozet').then(r => r.json()).then(setOzet);
      return true;
    } catch (err) {
      console.error('Hatırlatıcı silme hatası:', err);
      throw err;
    }
  };

  // Başlangıç Oturum Kontrolü Yükleniyor Ekranı
  if (authChecking) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400">Güvenlik kontrolü yapılıyor...</p>
      </div>
    );
  }

  // Giriş Yapılmamışsa Giriş Ekranı
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans relative">
      {/* Otomatik Kilit Ekranı (Masadan kalkıldığında veya elle kilitlendiğinde) */}
      {isLocked && (
        <LockScreen
          onUnlock={handleUnlock}
          onLogout={handleLogout}
          autoLockMinutes={autoLockMinutes}
        />
      )}

      {/* Üst Navigasyon Çubuğu */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenServerGuide={() => setServerGuideOpen(true)}
        dbStatus={dbStatus}
        onOpenDbModal={() => setDbModalOpen(true)}
        onLock={handleManualLock}
        onOpenSecuritySettings={() => setSecurityModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Ana İçerik Alanı */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {yukleniyor && (
          <div className="flex items-center justify-center p-8 text-xs text-slate-500">
            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></span>
            Veriler senkronize ediliyor...
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            ozet={ozet}
            onNavigateTab={handleNavigateTab}
            dbStatus={dbStatus}
            onOpenDbModal={() => setDbModalOpen(true)}
            onToggleTamamlandi={handleToggleTamamlandi}
          />
        )}

        {activeTab === 'personel' && (
          <PersonelHubView
            personeller={personeller}
            izinler={izinler}
            projeler={projeler}
            departmanlar={departmanlar}
            gorevler={gorevler}
            onRefresh={verileriYukle}
            initialAltSekme={personelSubTab}
            initialPersonelId={selectedPersonelId}
            initialIsgSekme={isgSekme}
          />
        )}

        {activeTab === 'makineler' && (
          <MakineView
            makineler={makineler}
            personeller={personeller}
            onRefresh={verileriYukle}
          />
        )}

        {activeTab === 'projeler' && (
          <ProjelerView
            projeler={projeler}
            personeller={personeller}
            onSaveProje={handleSaveProje}
            onDeleteProje={handleDeleteProje}
          />
        )}

        {activeTab === 'araclar' && (
          <AraclarView
            araclar={araclar}
            personeller={personeller}
            onSaveArac={handleSaveArac}
            onAddBakim={handleAddBakim}
            onUpdateBakim={handleUpdateBakim}
            onDeleteBakim={handleDeleteBakim}
          />
        )}

        {activeTab === 'hatirlaticilar' && (
          <HatirlaticilarView
            hatirlaticilar={hatirlaticilar}
            personeller={personeller}
            onAddHatirlatici={handleAddHatirlatici}
            onToggleTamamlandi={handleToggleTamamlandi}
            onUpdateHatirlatici={handleUpdateHatirlatici}
            onDeleteHatirlatici={handleDeleteHatirlatici}
          />
        )}
      </main>

      {/* Güvenlik & Parola Ayarları Modalı */}
      <SecuritySettingsModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
        onSettingsUpdated={(newMin) => setAutoLockMinutes(newMin)}
      />

      {/* Telefondan Bağlanma Rehberi Modalı */}
      <ServerSetupModal
        isOpen={serverGuideOpen}
        onClose={() => setServerGuideOpen(false)}
      />

      {/* PostgreSQL Veritabanı Durumu & Teşhis Modalı */}
      <DatabaseStatusModal
        isOpen={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
        dbStatus={dbStatus}
        onRefresh={handleRefreshDb}
      />

      {/* Mobil Cihazlar İçin Dokunmatik Alt Çubuk */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        badgeCounts={{
          bakim: ozet?.bakimBekleyenArac,
          hatirlatici: ozet?.bugunBitenGorevler,
        }}
      />

      {/* Ağ Bağlantı Takibi */}
      <OfflineIndicator />
    </div>
  );
}
