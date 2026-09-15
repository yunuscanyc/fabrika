import React, { useState, useEffect } from 'react';
import { Personel, IzinKaydi, Proje, Departman, Gorev } from '../types';
import { PersonelView } from './PersonelView';
import { IzinView } from './IzinView';
import { PuantajView } from './PuantajView';
import { IsgView } from './IsgView';
import { YevmiyeciView } from './YevmiyeciView';
import { Users, Calendar, Clock, ShieldCheck, Briefcase } from 'lucide-react';

interface PersonelHubViewProps {
  personeller: Personel[];
  izinler: IzinKaydi[];
  projeler?: Proje[];
  departmanlar: Departman[];
  gorevler: Gorev[];
  onRefresh: () => void;
  initialAltSekme?: 'liste' | 'izin' | 'puantaj' | 'isg' | 'yevmiyeci';
  initialPersonelId?: number;
  initialIsgSekme?: 'kkd' | 'saglik' | 'egitim';
}

export const PersonelHubView: React.FC<PersonelHubViewProps> = ({
  personeller,
  izinler,
  projeler = [],
  departmanlar,
  gorevler,
  onRefresh,
  initialAltSekme = 'liste',
  initialPersonelId,
  initialIsgSekme,
}) => {
  const [altSekme, setAltSekme] = useState<'liste' | 'izin' | 'puantaj' | 'isg' | 'yevmiyeci'>(initialAltSekme);

  useEffect(() => {
    if (initialAltSekme) {
      setAltSekme(initialAltSekme);
    }
  }, [initialAltSekme]);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* İkincil Sekme Barı (WPF Masaüstü TabControl mantığı) */}
      <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setAltSekme('liste')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              altSekme === 'liste'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Personel Listesi ({personeller.filter(p => p.DurumAktifMi).length})
          </button>

          <button
            onClick={() => setAltSekme('yevmiyeci')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              altSekme === 'yevmiyeci'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Yevmiyeci &amp; Proje Personeli
          </button>

          <button
            onClick={() => setAltSekme('izin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              altSekme === 'izin'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            İzinler &amp; Form Çıkarma
          </button>

          <button
            onClick={() => setAltSekme('puantaj')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              altSekme === 'puantaj'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Günlük Puantaj &amp; Mesai
          </button>

          <button
            onClick={() => setAltSekme('isg')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              altSekme === 'isg'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            İSG &amp; KKD Zimmet
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 pr-2">
          <span>Fabrika İK &amp; Proje Ekipleri</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">4857 &amp; 6331 Sayılı Kanun Uyumlu</span>
        </div>
      </div>

      {/* Alt Sekme İçeriği */}
      {altSekme === 'liste' && (
        <PersonelView
          personeller={personeller}
          departmanlar={departmanlar}
          gorevler={gorevler}
          onRefresh={onRefresh}
        />
      )}

      {altSekme === 'yevmiyeci' && (
        <YevmiyeciView
          projeler={projeler}
          departmanlar={departmanlar}
          gorevler={gorevler}
          onRefresh={onRefresh}
        />
      )}

      {altSekme === 'izin' && (
        <IzinView
          personeller={personeller}
          izinler={izinler}
          onRefresh={onRefresh}
        />
      )}

      {altSekme === 'puantaj' && (
        <PuantajView
          personeller={personeller}
          izinler={izinler}
          onRefresh={onRefresh}
        />
      )}

      {altSekme === 'isg' && (
        <IsgView
          personeller={personeller}
          onRefresh={onRefresh}
          initialPersonelId={initialPersonelId}
          initialSekme={initialIsgSekme}
        />
      )}
    </div>
  );
};
