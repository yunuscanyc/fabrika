import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Personel } from '../types';
import { User, ChevronDown, Check, X, Search, Briefcase, Building2 } from 'lucide-react';

export interface PersonelComboboxProps {
  personeller: Personel[];
  value: string;
  onChange: (val: string, secilenPersonel?: Personel) => void;
  placeholder?: string;
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  allowCustom?: boolean;
  className?: string;
  inputClassName?: string;
  variant?: 'light' | 'dark';
  helperText?: string;
}

export const PersonelCombobox: React.FC<PersonelComboboxProps> = ({
  personeller,
  value,
  onChange,
  placeholder = 'Personel seçin veya yazın...',
  label,
  name,
  required = false,
  disabled = false,
  allowCustom = true,
  className = '',
  inputClassName = '',
  variant = 'light',
  helperText
}) => {
  const [acik, setAcik] = useState(false);
  const [aramaMetni, setAramaMetni] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dışarıdan gelen value değiştiğinde arama metnini senkronize et
  useEffect(() => {
    setAramaMetni(value || '');
  }, [value]);

  // Dışarı tıklandığında dropdown'ı kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAcik(false);
        // Eğer custom girişe izin verilmiyorsa ve geçerli personel seçilmediyse geri al
        if (!allowCustom) {
          const varMi = personeller.some(p => p.AdSoyad.toLowerCase() === (value || '').toLowerCase());
          if (!varMi) {
            setAramaMetni(value || '');
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, allowCustom, personeller]);

  // Aktif personelleri filtrele
  const filtrelenmisPersoneller = useMemo(() => {
    const q = (aramaMetni || '').trim().toLowerCase();
    const aktifler = (personeller || []).filter(p => p.DurumAktifMi !== false);

    if (!q) return aktifler;

    return aktifler.filter(p => {
      const adMatch = (p.AdSoyad || '').toLowerCase().includes(q);
      const depMatch = (p.Departman || '').toLowerCase().includes(q);
      const gorMatch = (p.Gorev || '').toLowerCase().includes(q);
      const telMatch = (p.Telefon || '').replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
      return adMatch || depMatch || gorMatch || telMatch;
    });
  }, [personeller, aramaMetni]);

  const handleSelect = (p: Personel) => {
    setAramaMetni(p.AdSoyad);
    onChange(p.AdSoyad, p);
    setAcik(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAramaMetni(val);
    setAcik(true);
    
    if (allowCustom) {
      const eslesen = personeller.find(p => p.AdSoyad.toLowerCase() === val.toLowerCase());
      onChange(val, eslesen);
    }
  };

  const handleTemizle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAramaMetni('');
    onChange('', undefined);
    if (inputRef.current) inputRef.current.focus();
  };

  const isDark = variant === 'dark';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Hidden input for standard form submissions if name is provided */}
      {name && <input type="hidden" name={name} value={aramaMetni} />}

      <div className="relative">
        <div className={`absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}>
          <User className="w-3.5 h-3.5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={aramaMetni}
          onChange={handleInputChange}
          onFocus={() => setAcik(true)}
          disabled={disabled}
          required={required && !aramaMetni}
          placeholder={placeholder}
          className={`w-full pl-8 pr-16 py-2 text-xs rounded-lg transition focus:outline-none ${
            isDark
              ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-amber-500'
              : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${inputClassName}`}
        />

        <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-0.5">
          {aramaMetni && !disabled && (
            <button
              type="button"
              onClick={handleTemizle}
              className={`p-1 rounded-md hover:bg-slate-200/50 transition ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Temizle"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={() => !disabled && setAcik(prev => !prev)}
            className={`p-1 rounded-md transition ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${acik ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {helperText && (
        <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{helperText}</p>
      )}

      {/* DROPDOWN MENU */}
      {acik && !disabled && (
        <div className={`absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border shadow-xl transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-800 divide-y divide-slate-800/60'
            : 'bg-white border-slate-200 divide-y divide-slate-100'
        }`}>
          {/* Üst Bilgi Başlığı */}
          <div className={`px-3 py-1.5 text-[10px] font-semibold flex items-center justify-between ${
            isDark ? 'bg-slate-950/60 text-slate-400' : 'bg-slate-50 text-slate-500'
          }`}>
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              Mevcut Şirket Çalışanları
            </span>
            <span>{filtrelenmisPersoneller.length} Kişi</span>
          </div>

          <div className="py-1">
            {filtrelenmisPersoneller.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                {aramaMetni ? `"${aramaMetni}" ile eşleşen personel bulunamadı.` : 'Kayıtlı aktif personel bulunamadı.'}
                {allowCustom && aramaMetni && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => {
                        onChange(aramaMetni, undefined);
                        setAcik(false);
                      }}
                      className="text-[11px] text-indigo-600 hover:underline font-semibold"
                    >
                      "{aramaMetni}" özel isim olarak kullan
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filtrelenmisPersoneller.map(p => {
                const seciliMi = (value || '').toLowerCase() === p.AdSoyad.toLowerCase();
                return (
                  <button
                    key={p.PersonelId}
                    type="button"
                    onClick={() => handleSelect(p)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs transition cursor-pointer ${
                      seciliMi
                        ? isDark
                          ? 'bg-amber-950/40 text-amber-300 font-bold'
                          : 'bg-indigo-50/90 text-indigo-900 font-bold'
                        : isDark
                        ? 'text-slate-200 hover:bg-slate-800'
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        seciliMi
                          ? isDark ? 'bg-amber-500 text-black' : 'bg-indigo-600 text-white'
                          : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {p.AdSoyad.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{p.AdSoyad}</span>
                          {p.Departman && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0 ${
                              isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {p.Departman}
                            </span>
                          )}
                        </div>
                        {p.Gorev && (
                          <div className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {p.Gorev} {p.Telefon ? `• ${p.Telefon}` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {seciliMi && (
                      <Check className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-indigo-600'}`} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
