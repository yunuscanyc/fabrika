import React from 'react';
import {
  Users,
  Building2,
  HardHat,
  BadgeCheck,
  Archive,
  Plus,
  Phone,
  MessageSquare,
  UserMinus,
  RefreshCw,
  User
} from 'lucide-react';
import { formatTarihTR } from '../utils/dateUtils';

interface ProjeKadrosuProps {
  seciliProje: any;
  aktifPersoneller: any[];
  atananYevmiyeciler: any[];
  ekipAnaSekme: string;
  setEkipAnaSekme: (val: string) => void;
  personelGorunumSekmesi: string;
  setPersonelGorunumSekmesi: (val: string) => void;
  arsivPersoneller: any[];
  seciliProjePersoneller: any[];
  setSeciliAtaPersonelId: (val: string) => void;
  setSeciliAtaProjeGorevi: (val: string) => void;
  setSeciliAtaBaslangicTarihi: (val: string) => void;
  setSeciliAtaNotlar: (val: string) => void;
  setPersonelAtaModalAcik: (val: boolean) => void;
  handlePersonelProjedenCikar: (pp: any) => void;
  handlePersonelTekrarGorevlendir: (pp: any) => void;
  ustaGorunumSekmesi: string;
  setUstaGorunumSekmesi: (val: string) => void;
  arsivdekiKayitlar: any[];
  projeUstaGecmisi: any[];
  setYevmiyeciAtaModalAcik: (val: boolean) => void;
  handleYevmiyeciProjedenCikar: (y: any) => void;
  handleArsivdenTekrarAta: (y: any) => void;
}

export const ProjeKadrosu: React.FC<ProjeKadrosuProps> = ({
  seciliProje,
  aktifPersoneller,
  atananYevmiyeciler,
  ekipAnaSekme,
  setEkipAnaSekme,
  personelGorunumSekmesi,
  setPersonelGorunumSekmesi,
  arsivPersoneller,
  seciliProjePersoneller,
  setSeciliAtaPersonelId,
  setSeciliAtaProjeGorevi,
  setSeciliAtaBaslangicTarihi,
  setSeciliAtaNotlar,
  setPersonelAtaModalAcik,
  handlePersonelProjedenCikar,
  handlePersonelTekrarGorevlendir,
  ustaGorunumSekmesi,
  setUstaGorunumSekmesi,
  arsivdekiKayitlar,
  projeUstaGecmisi,
  setYevmiyeciAtaModalAcik,
  handleYevmiyeciProjedenCikar,
  handleArsivdenTekrarAta
}) => {
  return (
    <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Üst Başlık ve Ana Sekmeler */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Proje Saha Kadrosu &amp; Ekip Yönetimi
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {aktifPersoneller.length + atananYevmiyeciler.length} Sahada Aktif ({aktifPersoneller.length} Kadrolu + {atananYevmiyeciler.length} Usta)
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Kendi kadrolu şirket çalışanlarımız ve harici yevmiyeci saha ustalarının görev &amp; arşiv takibi
            </p>
          </div>
        </div>

        {/* Ana Ekip Sekmeleri */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-xs font-semibold self-start md:self-auto">
          <button
            type="button"
            onClick={() => setEkipAnaSekme('personel')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              ekipAnaSekme === 'personel'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Şirket Personellerimiz ({aktifPersoneller.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setEkipAnaSekme('yevmiyeci')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              ekipAnaSekme === 'yevmiyeci'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            <span>Yevmiyeci Ustalar ({atananYevmiyeciler.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setEkipAnaSekme('ozet')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              ekipAnaSekme === 'ozet'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BadgeCheck className="w-3.5 h-3.5" />
            <span>Genel Ekip Özeti</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SEKME: ŞİRKET PERSONELLERİMİZ (KADROLU ÇALIŞANLAR) */}
      {/* ========================================================================= */}
      {ekipAnaSekme === 'personel' && (
        <div className="space-y-3">
          {/* Alt Filtreler ve Görevlendir Butonu */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
            <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPersonelGorunumSekmesi('aktif')}
                className={`px-2.5 py-1 rounded-md transition ${
                  personelGorunumSekmesi === 'aktif'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aktif Çalışanlar ({aktifPersoneller.length})
              </button>
              <button
                type="button"
                onClick={() => setPersonelGorunumSekmesi('arsiv')}
                className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                  personelGorunumSekmesi === 'arsiv'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Archive className="w-3 h-3" />
                <span>Proje Arşivi ({arsivPersoneller.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setPersonelGorunumSekmesi('hepsi')}
                className={`px-2.5 py-1 rounded-md transition ${
                  personelGorunumSekmesi === 'hepsi'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tümü ({seciliProjePersoneller.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSeciliAtaPersonelId('');
                setSeciliAtaProjeGorevi('Şantiye Şefi');
                setSeciliAtaBaslangicTarihi(new Date().toISOString().split('T')[0]);
                setSeciliAtaNotlar('');
                setPersonelAtaModalAcik(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Kadrolu Personel Görevlendir</span>
            </button>
          </div>

          {/* AKTİF KADROLU PERSONEL LİSTESİ */}
          {personelGorunumSekmesi === 'aktif' && (
            <div>
              {aktifPersoneller.length === 0 ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Bu projede şu anda aktif görevlendirilmiş kadrolu çalışanımız bulunmuyor.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {arsivPersoneller.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPersonelGorunumSekmesi('arsiv')}
                        className="text-xs text-slate-600 hover:text-slate-800 underline font-medium cursor-pointer"
                      >
                        Geçmişteki {arsivPersoneller.length} personeli gör
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSeciliAtaPersonelId('');
                        setSeciliAtaProjeGorevi('Şantiye Şefi');
                        setSeciliAtaBaslangicTarihi(new Date().toISOString().split('T')[0]);
                        setSeciliAtaNotlar('');
                        setPersonelAtaModalAcik(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition"
                    >
                      + Personel Görevlendir
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {aktifPersoneller.map(pp => (
                    <div
                      key={pp.KayitId}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs hover:border-blue-300 hover:shadow-sm transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {pp.AdSoyad.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <p className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">{pp.AdSoyad}</p>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {pp.Departman ? `${pp.Departman} • ` : ''}{pp.SirketGorevi || 'Şirket Personeli'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Projedeki Görevi & Başlangıç Tarihi */}
                        <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-2 text-[11px] text-blue-950 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-blue-700 font-medium">Proje Görevi:</span>
                            <span className="font-bold px-2 py-0.5 rounded bg-blue-100/80 text-blue-800 text-[10px]">
                              {pp.ProjeGorevi || 'Şantiye Sorumlusu'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-slate-500">Görev Başlangıcı:</span>
                            <span className="font-mono font-medium">
                              {pp.BaslangicTarihi ? formatTarihTR(pp.BaslangicTarihi) : 'Belirtilmedi'}
                            </span>
                          </div>
                          {pp.Notlar && (
                            <p className="text-[10px] text-slate-500 pt-1 border-t border-blue-200/40 line-clamp-2">
                              📝 {pp.Notlar}
                            </p>
                          )}
                        </div>

                        {pp.Telefon && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {pp.Telefon}
                            </span>
                            <div className="flex items-center gap-1">
                              <a
                                href={`tel:${pp.Telefon}`}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                                title="Ara"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                              <a
                                href={`https://wa.me/${pp.Telefon.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                                title="WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handlePersonelProjedenCikar(pp)}
                          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition shadow-2xs"
                          title="Bu çalışanı projeden çıkar ve geçmiş görev kaydını arşive kaydet"
                        >
                          <UserMinus className="w-3.5 h-3.5 text-rose-600" />
                          <span>Projeden Çıkar &amp; Arşive Al</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ARŞİVDEKİ ŞİRKET PERSONELLERİ */}
          {personelGorunumSekmesi === 'arsiv' && (
            <div>
              {arsivPersoneller.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-xs text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-slate-400" />
                    <span>Bu proje için henüz arşivlenmiş geçmiş personel görevi bulunmuyor.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Projede daha önce görev alıp tamamlanan çalışanlarımız:</span>
                    <span className="font-semibold text-slate-700">{arsivPersoneller.length} Arşiv Kaydı</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {arsivPersoneller.map(pp => (
                      <div
                        key={pp.KayitId}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {pp.AdSoyad.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">{pp.AdSoyad}</h4>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    Arşivde
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">{pp.ProjeGorevi || 'Proje Görevlisi'}</p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50/90 rounded-lg p-2 text-[11px] text-slate-600 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Görev Tarihleri:</span>
                              <span className="font-medium font-mono">
                                {pp.BaslangicTarihi ? formatTarihTR(pp.BaslangicTarihi) : '-'} {pp.BitisTarihi ? `→ ${formatTarihTR(pp.BitisTarihi)}` : ''}
                              </span>
                            </div>
                            {pp.Notlar && (
                              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 line-clamp-2">
                                📝 {pp.Notlar}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          {pp.Telefon ? (
                            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {pp.Telefon}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Tel yok</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePersonelTekrarGorevlendir(pp)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                            title="Bu personeli tekrar bu projeye görevlendir"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Yeniden Görevlendir</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TÜM KAYITLAR SEKME GÖRÜNÜMÜ */}
          {personelGorunumSekmesi === 'hepsi' && (
            <div>
              {seciliProjePersoneller.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl">
                  Bu projeye ait herhangi bir kadrolu personel kaydı bulunamadı.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {seciliProjePersoneller.map(pp => (
                    <div
                      key={pp.KayitId}
                      className={`bg-white border rounded-xl p-3.5 shadow-xs flex flex-col justify-between transition ${
                        pp.AktifMi ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              pp.AktifMi ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {pp.AdSoyad.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${pp.AktifMi ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-900">{pp.AdSoyad}</h4>
                              </div>
                              <p className="text-[11px] text-blue-600 font-semibold">{pp.ProjeGorevi || 'Proje Görevlisi'}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            pp.AktifMi
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {pp.AktifMi ? 'Aktif Görevde' : 'Arşivde / Bitti'}
                          </span>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-2 text-[11px] text-slate-600 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Tarih:</span>
                            <span className="font-mono">
                              {pp.BaslangicTarihi ? formatTarihTR(pp.BaslangicTarihi) : '-'} {pp.BitisTarihi ? `→ ${formatTarihTR(pp.BitisTarihi)}` : ''}
                            </span>
                          </div>
                          {pp.Notlar && (
                            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/50 line-clamp-1">
                              {pp.Notlar}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        {pp.AktifMi ? (
                          <button
                            type="button"
                            onClick={() => handlePersonelProjedenCikar(pp)}
                            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition shadow-2xs"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>Projeden Çıkar &amp; Arşive Al</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePersonelTekrarGorevlendir(pp)}
                            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Yeniden Görevlendir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SEKME: YEVMİYECİ & SAHA USTALARI */}
      {/* ========================================================================= */}
      {ekipAnaSekme === 'yevmiyeci' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
            <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setUstaGorunumSekmesi('aktif')}
                className={`px-2.5 py-1 rounded-md transition ${
                  ustaGorunumSekmesi === 'aktif'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aktif Ustalar ({atananYevmiyeciler.length})
              </button>
              <button
                type="button"
                onClick={() => setUstaGorunumSekmesi('arsiv')}
                className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                  ustaGorunumSekmesi === 'arsiv'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Archive className="w-3 h-3" />
                <span>Proje Arşivi ({arsivdekiKayitlar.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setUstaGorunumSekmesi('hepsi')}
                className={`px-2.5 py-1 rounded-md transition ${
                  ustaGorunumSekmesi === 'hepsi'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tümü ({projeUstaGecmisi.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setYevmiyeciAtaModalAcik(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Usta Görevlendir</span>
            </button>
          </div>

          {/* AKTİF YEVMİYECİLER */}
          {ustaGorunumSekmesi === 'aktif' && (
            <div>
              {atananYevmiyeciler.length === 0 ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Bu projede şu anda aktif görevli usta bulunmuyor.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {arsivdekiKayitlar.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setUstaGorunumSekmesi('arsiv')}
                        className="text-xs text-slate-600 hover:text-slate-800 underline font-medium cursor-pointer"
                      >
                        Geçmişte çalışan {arsivdekiKayitlar.length} ustayı gör
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setYevmiyeciAtaModalAcik(true)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition"
                    >
                      + Usta Görevlendir
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {atananYevmiyeciler.map(y => (
                    <div
                      key={y.YevmiyeciId}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs hover:border-indigo-300 hover:shadow-sm transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              <p className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">{y.AdSoyad}</p>
                            </div>
                            <p className="text-[11px] font-semibold text-indigo-600 line-clamp-1 mt-0.5">{y.UzmanlikAlani}</p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            {y.GunlukYevmiye ? `${y.GunlukYevmiye.toLocaleString('tr-TR')} ₺/gün` : 'Yevmiye Yok'}
                          </span>
                        </div>

                        {y.Telefon && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {y.Telefon}
                            </span>
                            <div className="flex items-center gap-1">
                              <a
                                href={`tel:${y.Telefon}`}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                                title="Ara"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={`https://wa.me/${y.Telefon.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                                title="WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleYevmiyeciProjedenCikar(y)}
                          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition shadow-2xs"
                          title="Bu ustayı projeden çıkar ve geçmiş çalışma kaydını arşive kaydet"
                        >
                          <UserMinus className="w-3.5 h-3.5 text-rose-600" />
                          <span>Projeden Çıkar &amp; Arşive Al</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ARŞİVDEKİ YEVMİYECİLER */}
          {ustaGorunumSekmesi === 'arsiv' && (
            <div>
              {arsivdekiKayitlar.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-xs text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-slate-400" />
                    <span>Bu proje için henüz arşivlenmiş geçmiş usta kaydı bulunmuyor.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Projede daha önce görev alıp tamamlanan ustalar:</span>
                    <span className="font-semibold text-slate-700">{arsivdekiKayitlar.length} Arşiv Kaydı</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {arsivdekiKayitlar.map((item, idx) => (
                      <div
                        key={`${item.yevmiyeci.YevmiyeciId}-${item.kayit.KayitId || idx}`}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                <h4 className="font-bold text-xs sm:text-sm text-slate-900">{item.yevmiyeci.AdSoyad}</h4>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  Arşivde
                                </span>
                              </div>
                              <p className="text-[11px] font-medium text-slate-600">{item.yevmiyeci.UzmanlikAlani}</p>
                            </div>

                            <div className="text-right shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                item.kayit.OdemeDurumu === 'Odendi'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : item.kayit.OdemeDurumu === 'KismenOdendi'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {item.kayit.OdemeDurumu === 'Odendi' ? 'Ödendi' : item.kayit.OdemeDurumu === 'KismenOdendi' ? 'Kısmen Ödendi' : 'Ödeme Bekliyor'}
                              </span>
                            </div>
                          </div>

                          <div className="bg-slate-50/80 rounded-lg p-2 text-[11px] text-slate-600 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Çalışma Tarihleri:</span>
                              <span className="font-medium font-mono">
                                {item.kayit.BaslangicTarihi} {item.kayit.BitisTarihi ? `→ ${item.kayit.BitisTarihi}` : ''}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Süre &amp; Yevmiye:</span>
                              <span className="font-medium">
                                {item.kayit.GunSayisi} gün × {item.kayit.GunlukUcret?.toLocaleString('tr-TR')} ₺ = <strong>{item.kayit.ToplamUcret?.toLocaleString('tr-TR')} ₺</strong>
                              </span>
                            </div>
                            {item.kayit.Aciklama && (
                              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 line-clamp-2">
                                📝 {item.kayit.Aciklama}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          {item.yevmiyeci.Telefon ? (
                            <div className="flex items-center gap-1">
                              <a
                                href={`tel:${item.yevmiyeci.Telefon}`}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3 text-slate-500" />
                                <span>{item.yevmiyeci.Telefon}</span>
                              </a>
                              <a
                                href={`https://wa.me/${item.yevmiyeci.Telefon.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                                title="WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Tel yok</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleArsivdenTekrarAta(item.yevmiyeci)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                            title="Bu ustayı tekrar bu projeye ata"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Yeniden Görevlendir</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TÜM KAYITLAR SEKME GÖRÜNÜMÜ */}
          {ustaGorunumSekmesi === 'hepsi' && (
            <div>
              {projeUstaGecmisi.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl">
                  Bu projeye ait herhangi bir usta kaydı bulunamadı.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projeUstaGecmisi.map((item, idx) => (
                    <div
                      key={`${item.yevmiyeci.YevmiyeciId}-${item.kayit.KayitId || idx}`}
                      className={`bg-white border rounded-xl p-3.5 shadow-xs flex flex-col justify-between transition ${
                        item.isAktif ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${item.isAktif ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                              <h4 className="font-bold text-xs sm:text-sm text-slate-900">{item.yevmiyeci.AdSoyad}</h4>
                            </div>
                            <p className="text-[11px] font-semibold text-indigo-600 mt-0.5">{item.yevmiyeci.UzmanlikAlani}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            item.isAktif
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {item.isAktif ? 'Aktif Çalışıyor' : 'Arşivde / Bitti'}
                          </span>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-2 text-[11px] text-slate-600 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Tarih:</span>
                            <span className="font-mono">{item.kayit.BaslangicTarihi} {item.kayit.BitisTarihi ? `→ ${item.kayit.BitisTarihi}` : ''}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Hak Ediş:</span>
                            <span className="font-bold text-slate-800">{item.kayit.ToplamUcret?.toLocaleString('tr-TR')} ₺</span>
                          </div>
                          {item.kayit.Aciklama && (
                            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/50 line-clamp-1">
                              {item.kayit.Aciklama}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        {item.isAktif ? (
                          <button
                            type="button"
                            onClick={() => handleYevmiyeciProjedenCikar(item.yevmiyeci)}
                            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition shadow-2xs"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>Projeden Çıkar &amp; Arşive Al</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleArsivdenTekrarAta(item.yevmiyeci)}
                            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Yeniden Görevlendir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SEKME: GENEL SAHA KADROSU ÖZETİ */}
      {/* ========================================================================= */}
      {ekipAnaSekme === 'ozet' && (
        <div className="space-y-4">
          {/* KPI İstatistikleri */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">Kadrolu Şirket Personeli</p>
                <p className="text-base font-bold text-slate-900">{aktifPersoneller.length} Kişi Aktif</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">Yevmiyeci Saha Ustaları</p>
                <p className="text-base font-bold text-slate-900">{atananYevmiyeciler.length} Usta Aktif</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">Toplam Sahadaki Ekip Gücü</p>
                <p className="text-base font-bold text-emerald-700">{aktifPersoneller.length + atananYevmiyeciler.length} Çalışan</p>
              </div>
            </div>
          </div>

          {/* Hızlı İletişim & Saha Kadro Listesi */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Sahadaki Aktif Ekip İletişim Rehberi
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                {aktifPersoneller.length + atananYevmiyeciler.length} Kişi
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {aktifPersoneller.map(pp => (
                <div key={pp.KayitId} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50/60 transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                      🏢
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{pp.AdSoyad}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Kadrolu ({pp.ProjeGorevi || 'Şantiye'})
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">{pp.Departman || 'Personel'} • {pp.SirketGorevi || 'Çalışan'}</p>
                    </div>
                  </div>

                  {pp.Telefon ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`tel:${pp.Telefon}`}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{pp.Telefon}</span>
                      </a>
                      <a
                        href={`https://wa.me/${pp.Telefon.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400">Tel yok</span>
                  )}
                </div>
              ))}

              {atananYevmiyeciler.map(y => (
                <div key={y.YevmiyeciId} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50/60 transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                      🛠️
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{y.AdSoyad}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Yevmiyeci Usta ({y.UzmanlikAlani})
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">Günlük Yevmiye: {y.GunlukYevmiye ? `${y.GunlukYevmiye.toLocaleString('tr-TR')} ₺` : 'Belirtilmedi'}</p>
                    </div>
                  </div>

                  {y.Telefon ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`tel:${y.Telefon}`}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{y.Telefon}</span>
                      </a>
                      <a
                        href={`https://wa.me/${y.Telefon.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400">Tel yok</span>
                  )}
                </div>
              ))}

              {aktifPersoneller.length === 0 && atananYevmiyeciler.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  Şu an bu projede aktif görevli şirket personeli veya usta bulunmuyor.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
