import React, { useState } from 'react';
import { Personel, Departman, Gorev } from '../types';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  Building2, 
  Briefcase, 
  Calendar, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
  Settings,
  Plus,
  X,
  HeartPulse,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { formatTarihTR } from '../utils/dateUtils';

interface PersonelViewProps {
  personeller: Personel[];
  departmanlar: Departman[];
  gorevler: Gorev[];
  onRefresh: () => void;
  onSelectPersonel?: (p: Personel) => void;
}

export const PersonelView: React.FC<PersonelViewProps> = ({
  personeller,
  departmanlar,
  gorevler,
  onRefresh,
}) => {
  const [arama, setArama] = useState('');
  const [durumFiltre, setDurumFiltre] = useState<'tumu' | 'aktif' | 'pasif'>('aktif');
  const [departmanFiltre, setDepartmanFiltre] = useState('Tümü');
  const [seciliPersonel, setSeciliPersonel] = useState<Personel | null>(null);
  const [modalAcik, setModalAcik] = useState(false);
  const [islemSuruyor, setIslemSuruyor] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [newDepAd, setNewDepAd] = useState('');
  const [newGorevAd, setNewGorevAd] = useState('');

  // Form State
  const [formTC, setFormTC] = useState('');
  const [formAdSoyad, setFormAdSoyad] = useState('');
  const [formTelefon, setFormTelefon] = useState('');
  const [formEposta, setFormEposta] = useState('');
  const [formDepartman, setFormDepartman] = useState('');
  const [formGorev, setFormGorev] = useState('');
  const [formIseGiris, setFormIseGiris] = useState('');
  const [formIstenCikis, setFormIstenCikis] = useState('');
  const [formDogumTarihi, setFormDogumTarihi] = useState('1990-01-01');
  const [formDevredenIzin, setFormDevredenIzin] = useState<number>(0);
  const [formKanGrubu, setFormKanGrubu] = useState('Bilinmiyor');
  const [formAcilKisi, setFormAcilKisi] = useState('');
  const [formAcilTel, setFormAcilTel] = useState('');
  const [formAktif, setFormAktif] = useState(true);

  // İSG & Sağlık Raporu Form Alanları
  const [formSaglikEkle, setFormSaglikEkle] = useState(false);
  const [formMuayeneTarihi, setFormMuayeneTarihi] = useState(new Date().toISOString().split('T')[0]);
  const [formMuayeneTuru, setFormMuayeneTuru] = useState('Periyodik Sağlık Muayenesi');
  const [formSaglikGecerlilikAy, setFormSaglikGecerlilikAy] = useState(12);
  const [formSaglikSonuc, setFormSaglikSonuc] = useState('Çalışmaya Uygundur');

  const [formEgitimEkle, setFormEgitimEkle] = useState(false);
  const [formEgitimTarihi, setFormEgitimTarihi] = useState(new Date().toISOString().split('T')[0]);
  const [formEgitimKonusu, setFormEgitimKonusu] = useState('Temel İSG Eğitimi (Tehlikeli Sınıf)');
  const [formEgitimGecerlilikYil, setFormEgitimGecerlilikYil] = useState(2);
  const [formEgitimSureSaat, setFormEgitimSureSaat] = useState(12);

  const uniqueDepartmanlar = Array.from(new Set(departmanlar.map(d => d.Ad))).sort();

  const filtrelenmis = personeller.filter(p => {
    const matchArama = 
      p.AdSoyad.toLowerCase().includes(arama.toLowerCase()) ||
      p.TCKimlikNo.includes(arama) ||
      (p.Departman && p.Departman.toLowerCase().includes(arama.toLowerCase())) ||
      (p.Gorev && p.Gorev.toLowerCase().includes(arama.toLowerCase()));

    const matchDurum = 
      durumFiltre === 'tumu' ? true :
      durumFiltre === 'aktif' ? p.DurumAktifMi :
      !p.DurumAktifMi;

    const matchDep = departmanFiltre === 'Tümü' || p.Departman === departmanFiltre;

    return matchArama && matchDurum && matchDep;
  });

  const handleYeniEkle = () => {
    setSeciliPersonel(null);
    setFormTC('');
    setFormAdSoyad('');
    setFormTelefon('');
    setFormEposta('');
    setFormDepartman(departmanlar[0]?.Ad || '');
    setFormGorev(gorevler[0]?.Ad || '');
    setFormIseGiris(new Date().toISOString().split('T')[0]);
    setFormIstenCikis('');
    setFormDogumTarihi('1990-01-01');
    setFormDevredenIzin(0);
    setFormKanGrubu('Bilinmiyor');
    setFormAcilKisi('');
    setFormAcilTel('');
    setFormAktif(true);

    // Sağlık ve İSG İsteğe Bağlı
    setFormSaglikEkle(true);
    setFormMuayeneTarihi(new Date().toISOString().split('T')[0]);
    setFormMuayeneTuru('Periyodik Sağlık Muayenesi');
    setFormSaglikGecerlilikAy(12);
    setFormSaglikSonuc('Çalışmaya Uygundur');

    setFormEgitimEkle(true);
    setFormEgitimTarihi(new Date().toISOString().split('T')[0]);
    setFormEgitimKonusu('Temel İSG Eğitimi (Tehlikeli Sınıf)');
    setFormEgitimGecerlilikYil(2);
    setFormEgitimSureSaat(12);

    setModalAcik(true);
  };

  const handleDuzenle = (p: Personel) => {
    setSeciliPersonel(p);
    setFormTC(p.TCKimlikNo || '');
    setFormAdSoyad(p.AdSoyad || '');
    setFormTelefon(p.Telefon || '');
    setFormEposta(p.Eposta || '');
    setFormDepartman(p.Departman || '');
    setFormGorev(p.Gorev || '');
    setFormIseGiris(p.IseGirisTarihi || '');
    setFormIstenCikis(p.IstenCikisTarihi || '');
    setFormDogumTarihi(p.DogumTarihi || '1990-01-01');
    setFormDevredenIzin(Number(p.DevredenIzinGunu || 0));
    setFormKanGrubu(p.KanGrubu || 'Bilinmiyor');
    setFormAcilKisi(p.AcilDurumKisisi || '');
    setFormAcilTel(p.AcilDurumTelefonu || '');
    setFormAktif(p.DurumAktifMi);

    setFormSaglikEkle(false);
    setFormEgitimEkle(false);

    setModalAcik(true);
  };

  const handleKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAdSoyad.trim()) {
      alert('Lütfen personelin adını ve soyadını giriniz.');
      return;
    }

    setIslemSuruyor(true);
    try {
      const payload = {
        TCKimlikNo: formTC.trim(),
        AdSoyad: formAdSoyad.trim(),
        Telefon: formTelefon.trim(),
        Eposta: formEposta.trim(),
        Departman: formDepartman.trim(),
        Gorev: formGorev.trim(),
        IseGirisTarihi: formIseGiris || new Date().toISOString().split('T')[0],
        IstenCikisTarihi: formIstenCikis || null,
        DogumTarihi: formDogumTarihi || '1990-01-01',
        DevredenIzinGunu: Number(formDevredenIzin || 0),
        KanGrubu: formKanGrubu,
        AcilDurumKisisi: formAcilKisi.trim(),
        AcilDurumTelefonu: formAcilTel.trim(),
        DurumAktifMi: formAktif
      };

      let targetPersonelId = seciliPersonel?.PersonelId;

      if (seciliPersonel) {
        await fetch(`/api/personeller/${seciliPersonel.PersonelId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        const res = await fetch('/api/personeller', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const createdP = await res.json();
        targetPersonelId = createdP.PersonelId || createdP.id;
      }

      // Otomatik Sağlık Raporu Ekle
      if (formSaglikEkle && targetPersonelId) {
        await fetch('/api/isg/saglik-raporlari', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            PersonelId: targetPersonelId,
            MuayeneTuru: formMuayeneTuru,
            MuayeneTarihi: formMuayeneTarihi,
            GecerlilikSuresiAy: Number(formSaglikGecerlilikAy),
            SaglikKurulusu: 'Yetkili OSGB Sağlık Birimi',
            Sonuc: formSaglikSonuc,
            RaporNo: '',
            Aciklama: 'Personel kaydından eklendi'
          })
        });
      }

      // Otomatik İSG Eğitimi Ekle
      if (formEgitimEkle && targetPersonelId) {
        await fetch('/api/isg/egitimler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            PersonelId: targetPersonelId,
            EgitimKonusu: formEgitimKonusu,
            EgiticiAdSoyad: 'İSG Uzmanı - OSGB',
            EgitimTarihi: formEgitimTarihi,
            SureSaat: Number(formEgitimSureSaat),
            GecerlilikYil: Number(formEgitimGecerlilikYil),
            Aciklama: 'Personel kaydından eklendi'
          })
        });
      }

      setModalAcik(false);
      onRefresh();
    } catch (err: any) {
      alert('Kayıt sırasında hata oluştu: ' + err.message);
    } finally {
      setIslemSuruyor(false);
    }
  };

  const handleSilPasif = async (p: Personel) => {
    if (!confirm(`"${p.AdSoyad}" adlı çalışanı pasife almak istediğinize emin misiniz?`)) return;
    try {
      await fetch(`/api/personeller/${p.PersonelId}`, { method: 'DELETE' });
      onRefresh();
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & İstatistik Çubuğu */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white tracking-wide">Personel & İnsan Kaynakları</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Özlük bilgileri, departmanlar, aktif/pasif çalışanlar ve iletişim rehberi
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
            <span className="text-slate-400">Toplam:</span>
            <span className="font-bold text-white">{personeller.length}</span>
            <span className="text-slate-500">|</span>
            <span className="text-emerald-400 font-semibold">{personeller.filter(p => p.DurumAktifMi).length} Aktif</span>
          </div>
          <button
            onClick={handleYeniEkle}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg shadow-md transition"
          >
            <UserPlus className="w-4 h-4" />
            Yeni Personel
          </button>
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg shadow-md transition border border-slate-700"
            title="Departman ve Görev Ayarları"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Departman &amp; Görev Ayarları</span>
          </button>
        </div>
      </div>

      {/* Arama ve Filtreleme */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="İsim, TCKN, departman veya görev ara..."
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Durum:</span>
          <select
            value={durumFiltre}
            onChange={(e: any) => setDurumFiltre(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none"
          >
            <option value="aktif">Sadece Aktifler</option>
            <option value="tumu">Tümü</option>
            <option value="pasif">Ayrılanlar (Pasif)</option>
          </select>
        </div>

        {departmanlar.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Departman:</span>
            <select
              value={departmanFiltre}
              onChange={(e) => setDepartmanFiltre(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none"
            >
              <option value="Tümü">Tüm Departmanlar</option>
              {departmanlar.map(d => (
                <option key={d.Id} value={d.Ad}>{d.Ad}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Personel Listesi Tablosu */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Adı Soyadı</th>
                <th className="py-3 px-4">Departman & Görev</th>
                <th className="py-3 px-4">İletişim</th>
                <th className="py-3 px-4">İşe Giriş</th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtrelenmis.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                    Filtreye uygun personel kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filtrelenmis.map((p) => (
                  <tr 
                    key={p.PersonelId} 
                    className="hover:bg-slate-800/40 transition group cursor-pointer"
                    onClick={() => handleDuzenle(p)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white group-hover:text-blue-400 transition flex items-center gap-2">
                        <span>{p.AdSoyad}</span>
                        {p.TCKimlikNo && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                            {p.TCKimlikNo}
                          </span>
                        )}
                      </div>
                      {p.KanGrubu && (
                        <div className={`text-xs mt-0.5 ${p.KanGrubu === 'Bilinmiyor' ? 'text-slate-400' : 'text-rose-400/80'}`}>
                          Kan: {p.KanGrubu}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>{p.Departman || 'Genel'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                        <span>{p.Gorev || '-'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{p.Telefon || '-'}</span>
                      </div>
                      {p.Eposta && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-sky-400" />
                          <span>{p.Eposta}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>{formatTarihTR(p.IseGirisTarihi)}</span>
                      </div>
                      {p.IstenCikisTarihi && (
                        <div className="text-rose-400 mt-0.5">Çıkış: {formatTarihTR(p.IstenCikisTarihi)}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {p.DurumAktifMi ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-950/80 text-rose-400 border border-rose-800">
                          <XCircle className="w-3 h-3" />
                          Ayrıldı
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDuzenle(p)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded transition"
                          title="Düzenle"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {p.DurumAktifMi && (
                          <button
                            onClick={() => handleSilPasif(p)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition"
                            title="Pasife Al"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Personel Ekle / Düzenle Modalı */}
      {modalAcik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                {seciliPersonel ? 'Personel Bilgilerini Düzenle' : 'Yeni Personel Kartı'}
              </h2>
              <button
                onClick={() => setModalAcik(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleKaydet} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Adı Soyadı *</label>
                  <input
                    type="text"
                    required
                    value={formAdSoyad}
                    onChange={(e) => setFormAdSoyad(e.target.value)}
                    placeholder="Örn: Mehmet Öz"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">T.C. Kimlik No (11 Hane)</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={formTC}
                    onChange={(e) => setFormTC(e.target.value)}
                    placeholder="12345678901"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Departman</label>
                  <select
                    value={formDepartman}
                    onChange={(e) => setFormDepartman(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Seçiniz...</option>
                    {departmanlar.map(dep => (
                      <option key={dep.Id} value={dep.Ad}>{dep.Ad}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Görevi / Unvanı</label>
                  <select
                    value={formGorev}
                    onChange={(e) => setFormGorev(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Seçiniz...</option>
                    {gorevler.map(role => (
                      <option key={role.Id} value={role.Ad}>{role.Ad}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Telefon No</label>
                  <input
                    type="text"
                    value={formTelefon}
                    onChange={(e) => setFormTelefon(e.target.value)}
                    placeholder="0532 123 45 67"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">E-Posta</label>
                  <input
                    type="email"
                    value={formEposta}
                    onChange={(e) => setFormEposta(e.target.value)}
                    placeholder="mehmet@rendemobilya.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">İşe Giriş Tarihi</label>
                  <input
                    type="date"
                    value={formIseGiris}
                    onChange={(e) => setFormIseGiris(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Doğum Tarihi</label>
                  <input
                    type="date"
                    value={formDogumTarihi}
                    onChange={(e) => setFormDogumTarihi(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    İş Kanunu m.53: 50+ yaş çalışanlara yıllık izin en az 20 gündür
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-400 mb-1">
                    Eski Programdan Devir İzni (Gün)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formDevredenIzin}
                    onChange={(e) => setFormDevredenIzin(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-950 border border-amber-500/50 rounded-lg text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    İlk kullanıma özel: Eski masaüstü programındaki devreden bakiye
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">İşten Çıkış Tarihi</label>
                  <input
                    type="date"
                    value={formIstenCikis}
                    onChange={(e) => setFormIstenCikis(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Kan Grubu</label>
                  <select
                    value={formKanGrubu}
                    onChange={(e) => setFormKanGrubu(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Bilinmiyor">Bilinmiyor / Belirtilmedi</option>
                    <option value="A Rh+">A Rh+</option>
                    <option value="A Rh-">A Rh-</option>
                    <option value="B Rh+">B Rh+</option>
                    <option value="B Rh-">B Rh-</option>
                    <option value="AB Rh+">AB Rh+</option>
                    <option value="AB Rh-">AB Rh-</option>
                    <option value="0 Rh+">0 Rh+</option>
                    <option value="0 Rh-">0 Rh-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Acil Durum Kişisi</label>
                  <input
                    type="text"
                    value={formAcilKisi}
                    onChange={(e) => setFormAcilKisi(e.target.value)}
                    placeholder="Adı Soyadı / Yakınlığı"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Acil Durum Telefonu</label>
                  <input
                    type="text"
                    value={formAcilTel}
                    onChange={(e) => setFormAcilTel(e.target.value)}
                    placeholder="0532 999 88 77"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Sağlık Raporu Ekleme Bölümü */}
                <div className="col-span-full border-t border-slate-800/80 pt-4 mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="chkSaglikEkle"
                      checked={formSaglikEkle}
                      onChange={(e) => setFormSaglikEkle(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 bg-slate-950 border-slate-800 focus:ring-0"
                    />
                    <label htmlFor="chkSaglikEkle" className="text-sm font-bold text-rose-400 flex items-center gap-1.5 cursor-pointer">
                      <HeartPulse className="w-4 h-4" />
                      Periyodik Sağlık Raporu / Muayene Bilgisi Ekle
                    </label>
                  </div>

                  {formSaglikEkle && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-rose-950/20 p-3 rounded-lg border border-rose-900/40 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Muayene Tarihi</label>
                        <input
                          type="date"
                          value={formMuayeneTarihi}
                          onChange={(e) => setFormMuayeneTarihi(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Geçerlilik (Süre/Ay)</label>
                        <select
                          value={formSaglikGecerlilikAy}
                          onChange={(e) => setFormSaglikGecerlilikAy(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
                        >
                          <option value={12}>12 Ay (1 Yıl - Tehlikeli)</option>
                          <option value={24}>24 Ay (2 Yıl - Az Tehlikeli)</option>
                          <option value={6}>6 Ay (Çok Tehlikeli)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Muayene Sonucu</label>
                        <select
                          value={formSaglikSonuc}
                          onChange={(e) => setFormSaglikSonuc(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
                        >
                          <option value="Çalışmaya Uygundur">Çalışmaya Uygundur</option>
                          <option value="Kısmi / Şartlı Uygun">Kısmi / Şartlı Uygun</option>
                          <option value="Uygun Değil">Uygun Değil</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* İSG Eğitimi Ekleme Bölümü */}
                <div className="col-span-full border-t border-slate-800/80 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="chkEgitimEkle"
                      checked={formEgitimEkle}
                      onChange={(e) => setFormEgitimEkle(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800 focus:ring-0"
                    />
                    <label htmlFor="chkEgitimEkle" className="text-sm font-bold text-blue-400 flex items-center gap-1.5 cursor-pointer">
                      <GraduationCap className="w-4 h-4" />
                      İSG Eğitimi & Sertifika Kaydı Ekle
                    </label>
                  </div>

                  {formEgitimEkle && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-blue-950/20 p-3 rounded-lg border border-blue-900/40 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Eğitim Tarihi</label>
                        <input
                          type="date"
                          value={formEgitimTarihi}
                          onChange={(e) => setFormEgitimTarihi(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Eğitim Konusu</label>
                        <input
                          type="text"
                          value={formEgitimKonusu}
                          onChange={(e) => setFormEgitimKonusu(e.target.value)}
                          placeholder="Temel İSG Eğitimi"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1">Sertifika Geçerliliği (Yıl)</label>
                        <select
                          value={formEgitimGecerlilikYil}
                          onChange={(e) => setFormEgitimGecerlilikYil(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
                        >
                          <option value={1}>1 Yıl (Çok Tehlikeli)</option>
                          <option value={2}>2 Yıl (Tehlikeli Sınıf)</option>
                          <option value={3}>3 Yıl (Az Tehlikeli Sınıf)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="chkDurumAktif"
                    checked={formAktif}
                    onChange={(e) => setFormAktif(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800 focus:ring-0"
                  />
                  <label htmlFor="chkDurumAktif" className="text-sm font-medium text-slate-300 cursor-pointer">
                    Personel Aktif Çalışıyor
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAcik(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={islemSuruyor}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow transition disabled:opacity-50"
                >
                  {islemSuruyor ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Departman & Görev Yönetimi Ayarlar Modalı */}
      {settingsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">Departman &amp; Görev Yönetimi</h3>
                  <p className="text-xs text-slate-400">Tüm personel ve yevmiyecilerin ortak listelerini dinamik olarak yönetin</p>
                </div>
              </div>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50">
              {/* DEPARTMANLAR COLUMN */}
              <div className="flex flex-col space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h4 className="text-sm font-bold text-slate-200">1. Departman Kur / Kapat</h4>
                  <p className="text-xs text-slate-400">Yeni departman ekleyebilir veya mevcut departmanları kapatabilirsiniz</p>
                </div>

                {/* Ekleme Formu */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newDepAd.trim()) return;
                    try {
                      const res = await fetch('/api/departmanlar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ Ad: newDepAd.trim() })
                      });
                      if (res.ok) {
                        setNewDepAd('');
                        onRefresh();
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newDepAd}
                    onChange={(e) => setNewDepAd(e.target.value)}
                    placeholder="Yeni Departman Adı..."
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Ekle
                  </button>
                </form>

                {/* Departman Listesi */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl max-h-[300px] overflow-y-auto divide-y divide-slate-800">
                  {departmanlar.length === 0 ? (
                    <p className="p-4 text-xs text-slate-500 text-center">Tanımlı departman bulunmuyor.</p>
                  ) : (
                    departmanlar.map(d => (
                      <div key={d.Id} className="flex items-center justify-between p-3 hover:bg-slate-900/40 transition">
                        <span className="text-sm text-slate-200 font-medium">{d.Ad}</span>
                        <button
                          onClick={async () => {
                            if (!confirm(`"${d.Ad}" departmanını silmek istediğinize emin misiniz?`)) return;
                            try {
                              const res = await fetch(`/api/departmanlar/${d.Id}`, { method: 'DELETE' });
                              if (res.ok) {
                                onRefresh();
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Departmanı Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* GÖREVLER COLUMN */}
              <div className="flex flex-col space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h4 className="text-sm font-bold text-slate-200">2. Görev &amp; Unvan Tanımları</h4>
                  <p className="text-xs text-slate-400">Tüm uzmanlık alanları, ustalar ve yevmiyeci görevlerini buradan yönetin</p>
                </div>

                {/* Ekleme Formu */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newGorevAd.trim()) return;
                    try {
                      const res = await fetch('/api/gorevler', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ Ad: newGorevAd.trim() })
                      });
                      if (res.ok) {
                        setNewGorevAd('');
                        onRefresh();
                      }
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newGorevAd}
                    onChange={(e) => setNewGorevAd(e.target.value)}
                    placeholder="Yeni Görev / Unvan..."
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Ekle
                  </button>
                </form>

                {/* Görev Listesi */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl max-h-[300px] overflow-y-auto divide-y divide-slate-800">
                  {gorevler.length === 0 ? (
                    <p className="p-4 text-xs text-slate-500 text-center">Tanımlı görev bulunmuyor.</p>
                  ) : (
                    gorevler.map(g => (
                      <div key={g.Id} className="flex items-center justify-between p-3 hover:bg-slate-900/40 transition">
                        <span className="text-sm text-slate-200 font-medium">{g.Ad}</span>
                        <button
                          onClick={async () => {
                            if (!confirm(`"${g.Ad}" görevini/unvanını silmek istediğinize emin misiniz?`)) return;
                            try {
                              const res = await fetch(`/api/gorevler/${g.Id}`, { method: 'DELETE' });
                              if (res.ok) {
                                onRefresh();
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Görevi Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-sm transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
