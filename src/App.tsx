import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { ProjelerView } from './components/ProjelerView';
import { AraclarView } from './components/AraclarView';
import { HatirlaticilarView } from './components/HatirlaticilarView';
import { PersonelHubView } from './components/PersonelHubView';
import { MakineView } from './components/MakineView';
import { SiparislerView } from './components/SiparislerView';
import { UstabasiSiparisBildirim } from './components/UstabasiSiparisBildirim';
import { AjandaBildirimBari } from './components/AjandaBildirimBari';
import { ServerSetupModal } from './components/ServerSetupModal';
import { DatabaseStatusModal, DbStatusData } from './components/DatabaseStatusModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LoginScreen } from './components/LoginScreen';
import { LockScreen } from './components/LockScreen';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { Proje, Arac, BakimKaydi, Hatirlatici, OzetIstatistikler, Personel, IzinKaydi, Makine, Departman, Gorev, AjandaBildirimi } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [userRole, setUserRole] = useState<'admin' | 'ustabasi'>('admin');
  const [currentUserName, setCurrentUserName] = useState<string>(() => sessionStorage.getItem('rende_user_name') || '1. Yönetici');
  const [currentAdminId, setCurrentAdminId] = useState<string>(() => sessionStorage.getItem('rende_admin_id') || 'admin1');
  const [unreadOrdersCount, setUnreadOrdersCount] = useState<number>(0);
  const [ajandaBildirimler, setAjandaBildirimler] = useState<AjandaBildirimi[]>([]);
  const [targetOpenHatirlaticiId, setTargetOpenHatirlaticiId] = useState<number | null>(null);
  const [personelSubTab, setPersonelSubTab] = useState<'liste' | 'izin' | 'puantaj' | 'montaj' | 'isg' | 'yevmiyeci'>('liste');
  const [selectedPersonelId, setSelectedPersonelId] = useState<number | undefined>(undefined);
  const [isgSekme, setIsgSekme] = useState<'kkd' | 'saglik' | 'egitim' | undefined>(undefined);

  // Güvenlik & Oturum Durumu
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return sessionStorage.getItem('rende_is_locked') === 'true';
  });
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

  // Oturum ve Kimlik Doğrulama Kontrolü (F5 veya Yeniden Yükleme Dahil)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = sessionStorage.getItem('rende_auth_token') || localStorage.getItem('rende_auth_token');
        const savedRole = (sessionStorage.getItem('rende_user_role') || localStorage.getItem('rende_user_role')) as 'admin' | 'ustabasi' | null;
        const savedName = sessionStorage.getItem('rende_user_name') || localStorage.getItem('rende_user_name');
        const savedAdminId = sessionStorage.getItem('rende_admin_id') || localStorage.getItem('rende_admin_id');
        const isSessionLocked = sessionStorage.getItem('rende_is_locked') === 'true' || localStorage.getItem('rende_is_locked') === 'true';

        if (savedName) setCurrentUserName(savedName);
        if (savedAdminId) setCurrentAdminId(savedAdminId);

        if (savedRole === 'ustabasi') {
          setUserRole('ustabasi');
          setActiveTab('siparisler');
        } else {
          setUserRole('admin');
        }
        const savedAutoLock = localStorage.getItem('rende_autolock_min');
        const autoLockVal = savedAutoLock ? parseInt(savedAutoLock, 10) : 15;
        setAutoLockMinutes(autoLockVal);

        if (!token) {
          const statusRes = await fetch('/api/auth/status').then(r => r.json()).catch(() => null);
          if (statusRes && statusRes.isProtectionEnabled === false) {
            setIsAuthenticated(true);
            setIsLocked(false);
            sessionStorage.removeItem('rende_is_locked');
            localStorage.removeItem('rende_is_locked');
            verileriYukle();
          } else {
            setIsAuthenticated(false);
            setIsLocked(false);
            sessionStorage.removeItem('rende_is_locked');
            localStorage.removeItem('rende_is_locked');
          }
          setAuthChecking(false);
          return;
        }

        const res = await fetch('/api/auth/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            clientUserName: savedName,
            clientAdminId: savedAdminId
          })
        });

        const data = await res.json();
        if (res.ok && data.valid) {
          setIsAuthenticated(true);
          const currentRole: 'admin' | 'ustabasi' = data.role === 'ustabasi' ? 'ustabasi' : 'admin';
          setUserRole(currentRole);
          if (data.userName) {
            setCurrentUserName(data.userName);
            sessionStorage.setItem('rende_user_name', data.userName);
            localStorage.setItem('rende_user_name', data.userName);
          }
          if (data.adminId) {
            setCurrentAdminId(data.adminId);
            sessionStorage.setItem('rende_admin_id', data.adminId);
            localStorage.setItem('rende_admin_id', data.adminId);
          }
          if (currentRole) {
            sessionStorage.setItem('rende_user_role', currentRole);
            localStorage.setItem('rende_user_role', currentRole);
          }
          if (token) {
            sessionStorage.setItem('rende_auth_token', token);
            localStorage.setItem('rende_auth_token', token);
          }
          if (currentRole === 'ustabasi') {
            setActiveTab('siparisler');
          }
          if (data.autoLockMinutes !== undefined) {
            setAutoLockMinutes(data.autoLockMinutes);
          }

          // Sayfa yenileme (F5) mi yoksa başka siteden gelme/URL yazma mı kontrol et
          let isPageReload = false;
          try {
            const navEntries = typeof performance !== 'undefined' ? performance.getEntriesByType('navigation') : [];
            if (navEntries.length > 0) {
              isPageReload = (navEntries[0] as PerformanceNavigationTiming).type === 'reload';
            } else if (typeof performance !== 'undefined' && (performance as any).navigation) {
              isPageReload = (performance as any).navigation.type === 1; // TYPE_RELOAD
            }
          } catch {}

          const lastActiveStr = sessionStorage.getItem('rende_last_active') || localStorage.getItem('rende_last_active');
          let shouldBeLocked = false;

          // GÜVENLİK PROTOKOLÜ:
          // 1. Ekran daha önceden kilitlendiyse -> KİLİTLE
          // 2. Sayfa yenileme (F5) DEĞİLSE (yani başka siteden geri gelindi, URL tekrar yazıldı, sekme yeniden açıldı) -> MUTLAKA PIN SOR
          // 3. Eğer sadece sayfa yenileme (F5) ise ve boşta kalma süresi dolmuşsa -> KİLİTLE
          // 4. Son aktiflik bilgisi yoksa -> KİLİTLE
          if (isSessionLocked) {
            shouldBeLocked = true;
          } else if (!isPageReload) {
            shouldBeLocked = true;
          } else if (lastActiveStr) {
            const lastActiveTime = parseInt(lastActiveStr, 10);
            const passedMinutes = (Date.now() - lastActiveTime) / (1000 * 60);
            if (autoLockVal > 0 && passedMinutes >= autoLockVal) {
              shouldBeLocked = true;
            }
          } else {
            shouldBeLocked = true;
          }

          if (shouldBeLocked) {
            setIsLocked(true);
            sessionStorage.setItem('rende_is_locked', 'true');
            localStorage.setItem('rende_is_locked', 'true');
          } else {
            setIsLocked(false);
            sessionStorage.removeItem('rende_is_locked');
            localStorage.removeItem('rende_is_locked');
            lastActiveRef.current = Date.now();
            sessionStorage.setItem('rende_last_active', Date.now().toString());
            localStorage.setItem('rende_last_active', Date.now().toString());
          }

          verileriYukle();
        } else {
          sessionStorage.removeItem('rende_auth_token');
          sessionStorage.removeItem('rende_is_locked');
          localStorage.removeItem('rende_auth_token');
          localStorage.removeItem('rende_is_locked');
          setIsAuthenticated(false);
          setIsLocked(false);
        }
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, []);

  // Kullanıcı Aktivitesi Takibi (Inactivity Auto-Lock Listener)
  const updateActivity = useCallback(() => {
    // Eğer ekran kilitliyse aktivite süresini güncelleme
    if (sessionStorage.getItem('rende_is_locked') === 'true') return;
    const now = Date.now();
    lastActiveRef.current = now;
    sessionStorage.setItem('rende_last_active', now.toString());
  }, []);

  useEffect(() => {
    if (!isAuthenticated || isLocked) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    let throttleTimeout: any = null;

    const handleUserActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          updateActivity();
          throttleTimeout = null;
        }, 2000);
      }
    };

    events.forEach(ev => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Periyodik boşta kalma kontrolü (Her 2 saniyede bir hassas kontrol)
    const inactivityInterval = setInterval(() => {
      if (autoLockMinutes <= 0) return;
      const lastActive = lastActiveRef.current || parseInt(sessionStorage.getItem('rende_last_active') || '0', 10);
      const idleMs = Date.now() - lastActive;
      const timeoutMs = autoLockMinutes * 60 * 1000;

      if (idleMs >= timeoutMs) {
        setIsLocked(true);
        sessionStorage.setItem('rende_is_locked', 'true');
      }
    }, 2500);

    // Sekme odağı değişimi kontrolü (Başka sekmeden veya kilit ekranından dönüldüğünde)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoLockMinutes > 0) {
        const lastActive = parseInt(sessionStorage.getItem('rende_last_active') || Date.now().toString(), 10);
        if (Date.now() - lastActive >= autoLockMinutes * 60 * 1000) {
          setIsLocked(true);
          sessionStorage.setItem('rende_is_locked', 'true');
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

  // Sayfadan ayrılma, başka siteye geçiş veya geri/ileri önbelleği (bfcache) güvenliği
  useEffect(() => {
    // 1. Kullanıcı sayfadan ayrılırken (başka siteye giderken, sekme kapatılırken) HEMEN KİLİTLE
    const handleLeavePage = () => {
      const hasToken = sessionStorage.getItem('rende_auth_token') || localStorage.getItem('rende_auth_token');
      if (hasToken) {
        sessionStorage.setItem('rende_is_locked', 'true');
        localStorage.setItem('rende_is_locked', 'true');
      }
    };

    // 2. Tarayıcı Geri/İleri (bfcache) önbelleğinden dönüldüğünde anında kilit ekranını göster
    const handlePageShow = (event: PageTransitionEvent) => {
      const hasToken = sessionStorage.getItem('rende_auth_token') || localStorage.getItem('rende_auth_token');
      if (hasToken && event.persisted) {
        setIsLocked(true);
        sessionStorage.setItem('rende_is_locked', 'true');
        localStorage.setItem('rende_is_locked', 'true');
      }
    };

    // 3. Sekmeden başka sekmeye geçildiğinde ve 60 saniyeden fazla kalındığında kilitle
    const handleGlobalVisibility = () => {
      if (document.visibilityState === 'hidden') {
        sessionStorage.setItem('rende_hidden_at', Date.now().toString());
      } else if (document.visibilityState === 'visible') {
        const hiddenAtStr = sessionStorage.getItem('rende_hidden_at');
        if (hiddenAtStr) {
          const hiddenMs = Date.now() - parseInt(hiddenAtStr, 10);
          // Sekmeden 60 saniyeden uzun süre ayrıldıysa güvenlik için kilitle
          if (hiddenMs >= 60 * 1000) {
            setIsLocked(true);
            sessionStorage.setItem('rende_is_locked', 'true');
            localStorage.setItem('rende_is_locked', 'true');
          }
          sessionStorage.removeItem('rende_hidden_at');
        }
      }
    };

    window.addEventListener('pagehide', handleLeavePage);
    window.addEventListener('beforeunload', handleLeavePage);
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleGlobalVisibility);

    return () => {
      window.removeEventListener('pagehide', handleLeavePage);
      window.removeEventListener('beforeunload', handleLeavePage);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleGlobalVisibility);
    };
  }, []);

  // Ajanda Bildirimlerini ve Güncel Hatırlatıcı Listesini Getir (Canlı Senkronizasyon)
  const yukleAjandaBildirimleri = useCallback(async () => {
    if (userRole !== 'admin') return;
    try {
      const uName = sessionStorage.getItem('rende_user_name') || currentUserName || '1. Yönetici';
      
      if (activeTab === 'hatirlaticilar') {
        const [resBildirim, resHatirlatici] = await Promise.all([
          fetch(`/api/ajanda/bildirimler?user=${encodeURIComponent(uName)}`),
          fetch('/api/hatirlaticilar')
        ]);

        if (resBildirim.ok) {
          const data = await resBildirim.json();
          if (data && Array.isArray(data.bildirimler)) {
            setAjandaBildirimler(data.bildirimler);
          }
        }

        if (resHatirlatici.ok) {
          const hList = await resHatirlatici.json();
          if (Array.isArray(hList)) {
            setHatirlaticilar(hList);
          }
        }
      } else {
        const resBildirim = await fetch(`/api/ajanda/bildirimler?user=${encodeURIComponent(uName)}`);
        if (resBildirim.ok) {
          const data = await resBildirim.json();
          if (data && Array.isArray(data.bildirimler)) {
            setAjandaBildirimler(data.bildirimler);
          }
        }
      }
    } catch (e) {}
  }, [userRole, currentUserName, activeTab]);

  // Periyodik Ajanda Bildirim Polling (4 saniyede bir)
  useEffect(() => {
    if (!isAuthenticated || isLocked || userRole !== 'admin') return;
    yukleAjandaBildirimleri();
    const notifTimer = setInterval(() => {
      yukleAjandaBildirimleri();
    }, 4000);
    return () => clearInterval(notifTimer);
  }, [isAuthenticated, isLocked, userRole, yukleAjandaBildirimleri]);

  const handleMarkAjandaRead = async (notificationId?: number, hatirlaticiId?: number) => {
    const uName = currentUserName || sessionStorage.getItem('rende_user_name') || '1. Yönetici';
    try {
      await fetch('/api/ajanda/bildirimler/okundu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, hatirlaticiId, userName: uName })
      });
      setAjandaBildirimler(prev => prev.map(b => {
        const match = (notificationId && b.Id === notificationId) || (hatirlaticiId && b.HatirlaticiId === hatirlaticiId);
        if (match) {
          return { ...b, Okundu: true, OkuyanKisiler: [...(b.OkuyanKisiler || []), uName] };
        }
        return b;
      }));
    } catch (e) {}
  };

  const handleMarkAllAjandaRead = async () => {
    const uName = currentUserName || sessionStorage.getItem('rende_user_name') || '1. Yönetici';
    try {
      await fetch('/api/ajanda/bildirimler/hepsini-oku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: uName })
      });
      setAjandaBildirimler(prev => prev.map(b => ({
        ...b,
        Okundu: true,
        OkuyanKisiler: [...(b.OkuyanKisiler || []), uName]
      })));
    } catch (e) {}
  };

  const handleOpenHatirlaticiFromNotification = (hatirlaticiId: number) => {
    setActiveTab('hatirlaticilar');
    setTargetOpenHatirlaticiId(hatirlaticiId);
    handleMarkAjandaRead(undefined, hatirlaticiId);
  };

  const handleLoginSuccess = (token: string, lockMin: number, role?: 'admin' | 'ustabasi', userName?: string, adminId?: string) => {
    sessionStorage.removeItem('rende_is_locked');
    localStorage.removeItem('rende_is_locked');
    sessionStorage.setItem('rende_last_active', Date.now().toString());
    localStorage.setItem('rende_last_active', Date.now().toString());
    lastActiveRef.current = Date.now();
    setIsAuthenticated(true);
    setIsLocked(false);
    setAutoLockMinutes(lockMin);
    const resolvedRole: 'admin' | 'ustabasi' = role === 'ustabasi' ? 'ustabasi' : 'admin';
    setUserRole(resolvedRole);
    if (userName) setCurrentUserName(userName);
    if (adminId) setCurrentAdminId(adminId);
    if (resolvedRole === 'ustabasi') {
      setActiveTab('siparisler');
    } else {
      setActiveTab('dashboard');
    }
    verileriYukle();
    if (resolvedRole === 'admin') {
      yukleAjandaBildirimleri();
    }
  };

  const handleUnlock = (role?: 'admin' | 'ustabasi', userName?: string, adminId?: string) => {
    sessionStorage.removeItem('rende_is_locked');
    localStorage.removeItem('rende_is_locked');
    sessionStorage.setItem('rende_last_active', Date.now().toString());
    localStorage.setItem('rende_last_active', Date.now().toString());
    lastActiveRef.current = Date.now();
    setIsLocked(false);
    if (role) {
      setUserRole(role);
      if (role === 'ustabasi') {
        setActiveTab('siparisler');
      }
    }
    if (userName) setCurrentUserName(userName);
    if (adminId) setCurrentAdminId(adminId);
    if (role === 'admin' || userRole === 'admin') {
      yukleAjandaBildirimleri();
    }
  };

  const handleManualLock = () => {
    sessionStorage.setItem('rende_is_locked', 'true');
    localStorage.setItem('rende_is_locked', 'true');
    setIsLocked(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('rende_auth_token');
    sessionStorage.removeItem('rende_auth_token');
    sessionStorage.removeItem('rende_last_active');
    localStorage.removeItem('rende_last_active');
    sessionStorage.removeItem('rende_user_role');
    localStorage.removeItem('rende_user_role');
    sessionStorage.removeItem('rende_user_name');
    localStorage.removeItem('rende_user_name');
    sessionStorage.removeItem('rende_admin_id');
    localStorage.removeItem('rende_admin_id');
    sessionStorage.removeItem('rende_is_locked');
    localStorage.removeItem('rende_is_locked');
    setIsAuthenticated(false);
    setIsLocked(false);
  };

  // Sekme değiştiğinde sadece o sekmeye ait detay verilerini yükle (Lazy Loading)
  useEffect(() => {
    if (!isAuthenticated || isLocked) return;

    const yukleAktifSekmeVerisi = async () => {
      try {
        if (activeTab === 'dashboard') {
          const [resOzet, resDbStatus, resSiparisOzet] = await Promise.all([
            fetch('/api/ozet').then(r => r.json()).catch(() => null),
            fetch('/api/db-status').then(r => r.json()).catch(() => null),
            fetch('/api/siparisler/ozet').then(r => r.json()).catch(() => null),
          ]);
          if (resOzet) {
            if (resSiparisOzet && resSiparisOzet.bekleyen !== undefined) {
              resOzet.bekleyenSiparisSayisi = resSiparisOzet.bekleyen;
            }
            setOzet(resOzet);
          }
          if (resSiparisOzet && resSiparisOzet.okunmamisUstabasi !== undefined) {
            setUnreadOrdersCount(resSiparisOzet.okunmamisUstabasi);
          }
          if (resDbStatus) setDbStatus(resDbStatus);
        } else if (activeTab === 'projeler') {
          const resProjeler = await fetch('/api/projeler').then(r => r.json()).catch(() => []);
          if (Array.isArray(resProjeler)) setProjeler(resProjeler);
        } else if (activeTab === 'araclar') {
          const resAraclar = await fetch('/api/araclar').then(r => r.json()).catch(() => []);
          if (Array.isArray(resAraclar)) setAraclar(resAraclar);
        } else if (activeTab === 'hatirlaticilar') {
          const resHatirlaticilar = await fetch('/api/hatirlaticilar').then(r => r.json()).catch(() => []);
          if (Array.isArray(resHatirlaticilar)) {
            setHatirlaticilar(resHatirlaticilar);
            try {
              localStorage.setItem('fabrika_hatirlaticilar_cache_v2', JSON.stringify(resHatirlaticilar));
            } catch (e) {}
          }
        } else if (activeTab === 'personel') {
          const [resPersoneller, resIzinler, resDepartmanlar, resGorevler] = await Promise.all([
            fetch('/api/personeller').then(r => r.json()).catch(() => []),
            fetch('/api/izinler').then(r => r.json()).catch(() => []),
            fetch('/api/departmanlar').then(r => r.json()).catch(() => []),
            fetch('/api/gorevler').then(r => r.json()).catch(() => []),
          ]);
          if (Array.isArray(resPersoneller)) setPersoneller(resPersoneller);
          if (Array.isArray(resIzinler)) setIzinler(resIzinler);
          if (Array.isArray(resDepartmanlar)) setDepartmanlar(resDepartmanlar);
          if (Array.isArray(resGorevler)) setGorevler(resGorevler);
        } else if (activeTab === 'makineler') {
          const resMakineler = await fetch('/api/makineler').then(r => r.json()).catch(() => []);
          if (Array.isArray(resMakineler)) setMakineler(resMakineler);
        }
      } catch (err) {
        console.error('Sekme verisi senkronizasyon hatası:', err);
      }
    };

    yukleAktifSekmeVerisi();
  }, [activeTab, isAuthenticated, isLocked]);

  // Verileri API'den yükleme (Optimize edilmiş, sadece aktif sekme ve genel durum yüklenir)
  const verileriYukle = async () => {
    try {
      setYukleniyor(true);
      const [resOzet, resDbStatus, resSiparisOzet] = await Promise.all([
        fetch('/api/ozet').then(r => r.json()).catch(() => null),
        fetch('/api/db-status').then(r => r.json()).catch(() => null),
        fetch('/api/siparisler/ozet').then(r => r.json()).catch(() => null),
      ]);

      if (resOzet) {
        if (resSiparisOzet && resSiparisOzet.bekleyen !== undefined) {
          resOzet.bekleyenSiparisSayisi = resSiparisOzet.bekleyen;
        }
        setOzet(resOzet);
      }
      if (resSiparisOzet && resSiparisOzet.okunmamisUstabasi !== undefined) {
        setUnreadOrdersCount(resSiparisOzet.okunmamisUstabasi);
      }
      if (resDbStatus) setDbStatus(resDbStatus);

      // Sadece aktif olan sekmenin detay verisini çek
      if (activeTab === 'projeler') {
        const resProjeler = await fetch('/api/projeler').then(r => r.json()).catch(() => []);
        if (Array.isArray(resProjeler)) setProjeler(resProjeler);
      } else if (activeTab === 'araclar') {
        const resAraclar = await fetch('/api/araclar').then(r => r.json()).catch(() => []);
        if (Array.isArray(resAraclar)) setAraclar(resAraclar);
      } else if (activeTab === 'hatirlaticilar') {
        const resHatirlaticilar = await fetch('/api/hatirlaticilar').then(r => r.json()).catch(() => []);
        if (Array.isArray(resHatirlaticilar)) {
          setHatirlaticilar(resHatirlaticilar);
          try {
            localStorage.setItem('fabrika_hatirlaticilar_cache_v2', JSON.stringify(resHatirlaticilar));
          } catch (e) {}
        }
      } else if (activeTab === 'personel') {
        const [resPersoneller, resIzinler, resDepartmanlar, resGorevler] = await Promise.all([
          fetch('/api/personeller').then(r => r.json()).catch(() => []),
          fetch('/api/izinler').then(r => r.json()).catch(() => []),
          fetch('/api/departmanlar').then(r => r.json()).catch(() => []),
          fetch('/api/gorevler').then(r => r.json()).catch(() => []),
        ]);
        if (Array.isArray(resPersoneller)) setPersoneller(resPersoneller);
        if (Array.isArray(resIzinler)) setIzinler(resIzinler);
        if (Array.isArray(resDepartmanlar)) setDepartmanlar(resDepartmanlar);
        if (Array.isArray(resGorevler)) setGorevler(resGorevler);
      } else if (activeTab === 'makineler') {
        const resMakineler = await fetch('/api/makineler').then(r => r.json()).catch(() => []);
        if (Array.isArray(resMakineler)) setMakineler(resMakineler);
      }

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const res = await fetch('/api/hatirlaticilar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-name': currentUserName
        },
        body: JSON.stringify({
          ...h,
          YapanKisi: currentUserName
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('Yüklenen görseller Nginx/Sunucu yükleme sınırını aştı (413 Request Entity Too Large). Nginx yapılandırma dosyanıza (nginx.conf) "client_max_body_size 100M;" ekleyip "sudo nginx -s reload" komutuyla kotayı artırabilirsiniz.');
        }
        const txt = await res.text();
        throw new Error(`Sunucu Hatası (${res.status}): ${txt || res.statusText}`);
      }
      const yeni = await res.json();
      setHatirlaticilar(prev => [yeni, ...prev]);
      fetch('/api/ozet').then(r => r.json()).then(setOzet);
      yukleAjandaBildirimleri();
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Kayıt işlemi zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
      }
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
      const payload = { 
        TamamlandiMi: tamamlandi,
        YapanKisi: currentUserName
      };

      const res = await fetch(`/api/hatirlaticilar/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-name': currentUserName
        },
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
      yukleAjandaBildirimleri();
    } catch (err) {
      console.error('Hatırlatıcı güncelleme hatası:', err);
      verileriYukle();
    }
  };

  // Hatırlatıcı Tüm Alanları Güncelle
  const handleUpdateHatirlatici = async (id: number, fields: Partial<Hatirlatici>) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const res = await fetch(`/api/hatirlaticilar/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-name': currentUserName
        },
        body: JSON.stringify({
          ...fields,
          YapanKisi: currentUserName
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('Yüklenen görseller Nginx/Sunucu yükleme sınırını aştı (413 Request Entity Too Large). Nginx yapılandırma dosyanıza (nginx.conf) "client_max_body_size 100M;" ekleyip "sudo nginx -s reload" komutuyla kotayı artırabilirsiniz.');
        }
        const txt = await res.text();
        throw new Error(`Sunucu Hatası (${res.status}): ${txt || res.statusText}`);
      }
      const guncellenen = await res.json();
      setHatirlaticilar(prev =>
        prev.map(h => (h.Id === id ? guncellenen : h))
      );
      fetch('/api/ozet').then(r => r.json()).then(setOzet);
      yukleAjandaBildirimleri();
      return guncellenen;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Güncelleme işlemi zaman aşımına uğradı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
      }
      console.error('Hatırlatıcı güncelleme hatası:', err);
      throw err;
    }
  };

  // Hatırlatıcı Sil
  const handleDeleteHatirlatici = async (id: number) => {
    try {
      const res = await fetch(`/api/hatirlaticilar/${id}?yapan=${encodeURIComponent(currentUserName)}`, { 
        method: 'DELETE',
        headers: { 'x-user-name': currentUserName }
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Sunucu Hatası (${res.status}): ${txt || res.statusText}`);
      }
      setHatirlaticilar(prev => prev.filter(h => h.Id !== id));
      fetch('/api/ozet').then(r => r.json()).then(setOzet);
      yukleAjandaBildirimleri();
      return true;
    } catch (err) {
      console.error('Hatırlatıcı silme hatası:', err);
      throw err;
    }
  };

  // Okunmamış Ajanda Bildirimleri ve Hatırlatıcı ID'leri
  const unreadAjandaNotifs = ajandaBildirimler.filter(b => !b.Okundu && b.YapanKisi !== currentUserName);
  const unreadNotifHatirlaticiIds = unreadAjandaNotifs
    .map(b => b.HatirlaticiId)
    .filter((id): id is number => typeof id === 'number' && id > 0);
  const unreadAjandaCount = unreadAjandaNotifs.length;

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
        userRole={userRole}
        unreadOrdersCount={unreadOrdersCount}
        unreadAjandaCount={unreadAjandaCount}
        currentUserName={currentUserName}
      />

      {/* Admin için Ustabaşı Yeni Sipariş Canlı Bildirimi */}
      {userRole === 'admin' && (
        <UstabasiSiparisBildirim
          userRole={userRole}
          onNavigateToSiparisler={() => {
            setActiveTab('siparisler');
            setUnreadOrdersCount(0);
          }}
          onNewOrderDetected={() => {
            setUnreadOrdersCount(prev => prev + 1);
            fetch('/api/siparisler/ozet').then(r => r.json()).then(o => {
              if (o && o.bekleyen !== undefined && ozet) {
                setOzet({ ...ozet, bekleyenSiparisSayisi: o.bekleyen });
              }
            });
          }}
        />
      )}

      {/* Çoklu Yönetici Ajanda Değişiklik Bildirim Çubuğu (İlgili hatırlatma incelenene kadar kalkmaz) */}
      {userRole === 'admin' && (
        <AjandaBildirimBari
          bildirimler={ajandaBildirimler}
          currentUserName={currentUserName}
          onOpenHatirlatici={handleOpenHatirlaticiFromNotification}
          onMarkRead={handleMarkAjandaRead}
          onMarkAllRead={handleMarkAllAjandaRead}
        />
      )}

      {/* Ana İçerik Alanı */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {yukleniyor && (
          <div className="flex items-center justify-center p-8 text-xs text-slate-500">
            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></span>
            Veriler senkronize ediliyor...
          </div>
        )}

        {/* Ustabaşı Modunda Doğrudan ve Yalnızca Sipariş Modülü Açılır */}
        {userRole === 'ustabasi' ? (
          <SiparislerView
            userRole="ustabasi"
            onOrderAdded={() => {
              verileriYukle();
            }}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                ozet={ozet}
                onNavigateTab={handleNavigateTab}
                dbStatus={dbStatus}
                onOpenDbModal={() => setDbModalOpen(true)}
                onToggleTamamlandi={handleToggleTamamlandi}
              />
            )}

            {activeTab === 'siparisler' && (
              <SiparislerView
                userRole="admin"
                onOrderAdded={() => {
                  verileriYukle();
                }}
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
                unreadNotifHatirlaticiIds={unreadNotifHatirlaticiIds}
                ajandaBildirimler={ajandaBildirimler}
                currentUserName={currentUserName}
                onHatirlaticiInspected={(id) => handleMarkAjandaRead(undefined, id)}
                onMarkNotificationRead={handleMarkAjandaRead}
                targetOpenHatirlaticiId={targetOpenHatirlaticiId}
                onClearTargetOpenHatirlaticiId={() => setTargetOpenHatirlaticiId(null)}
              />
            )}
          </>
        )}
      </main>

      {/* Güvenlik & Parola Ayarları Modalı */}
      {userRole === 'admin' && (
        <SecuritySettingsModal
          isOpen={securityModalOpen}
          onClose={() => setSecurityModalOpen(false)}
          onSettingsUpdated={(newMin) => setAutoLockMinutes(newMin)}
          currentUserName={currentUserName}
        />
      )}

      {/* Telefondan Bağlanma Rehberi Modalı */}
      {userRole === 'admin' && (
        <ServerSetupModal
          isOpen={serverGuideOpen}
          onClose={() => setServerGuideOpen(false)}
        />
      )}

      {/* PostgreSQL Veritabanı Durumu & Teşhis Modalı */}
      {userRole === 'admin' && (
        <DatabaseStatusModal
          isOpen={dbModalOpen}
          onClose={() => setDbModalOpen(false)}
          dbStatus={dbStatus}
          onRefresh={handleRefreshDb}
        />
      )}

      {/* Mobil Cihazlar İçin Dokunmatik Alt Çubuk */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        badgeCounts={{
          bakim: ozet?.bakimBekleyenArac,
          hatirlatici: ozet?.bugunBitenGorevler,
          siparis: unreadOrdersCount,
          ajandaBildirim: unreadAjandaCount,
        }}
      />

      {/* Ağ Bağlantı Takibi */}
      <OfflineIndicator />
    </div>
  );
}
