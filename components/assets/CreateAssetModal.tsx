'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  X,
  Upload,
  Camera,
  Loader2,
  AlertCircle,
  Package,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BUCKETS, uploadFile } from '@/lib/supabase/storage';
import { createAssetAction } from '@/app/actions/assets';
import { Select } from '@/components/shared/Select';

interface CategoryItem {
  id: string;
  name: string;
}

interface AreaItem {
  id: string;
  name: string;
  warehouse_id: string;
}

interface LocationItem {
  id: string;
  name: string;
  area_id: string;
}

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseId: string;
  categories: CategoryItem[];
  areas: AreaItem[];
  locations: LocationItem[];
}

export function CreateAssetModal({
  isOpen,
  onClose,
  warehouseId,
  categories,
  areas,
  locations,
}: CreateAssetModalProps) {
  const router = useRouter();

  const [assetCode, setAssetCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [condition, setCondition] = useState<'good' | 'fair' | 'damaged' | 'critical'>('good');
  const [status, setStatus] = useState<'active' | 'inactive' | 'maintenance' | 'retired'>('active');
  const [installedDate, setInstalledDate] = useState('');
  const [notes, setNotes] = useState('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredLocations = locations.filter((l) => l.area_id === areaId);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCode.trim()) {
      setErrorMessage('Kode Aset wajib diisi.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Nama Aset wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      let photoUrl: string | null = null;

      // 1. Upload photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop() || 'jpg';
        const photoPath = `${warehouseId}/${crypto.randomUUID()}.${fileExt}`;
        await uploadFile(BUCKETS.ASSET_PHOTOS, photoPath, photoFile, photoFile.type);
        photoUrl = photoPath;
      }

      // 2. Call Server Action
      const res = await createAssetAction({
        warehouseId,
        assetCode: assetCode.trim().toUpperCase(),
        name: name.trim(),
        categoryId: categoryId || null,
        areaId: areaId || null,
        locationId: locationId || null,
        brand: brand.trim() || null,
        model: model.trim() || null,
        serialNumber: serialNumber.trim() || null,
        condition,
        status,
        installedDate: installedDate || null,
        photoUrl,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        throw new Error(res.error || 'Gagal menambahkan aset.');
      }

      onClose();
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 my-8 animate-in zoom-in-95 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-extrabold text-slate-900">Tambah Master Aset Baru</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Asset Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Kode Aset <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value.toUpperCase())}
                placeholder="Contoh: BDG-FL-001"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Nama Aset <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Forklift Electric 2.5 Ton"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
          </div>

          {/* Row 2: Category & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Kategori Aset"
              value={categoryId}
              onChange={setCategoryId}
              placeholder="-- Pilih Kategori --"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />

            <Select
              label="Area Penempatan"
              value={areaId}
              onChange={(val) => {
                setAreaId(val);
                setLocationId('');
              }}
              placeholder="-- Pilih Area --"
              options={areas.map((a) => ({ value: a.id, label: a.name }))}
            />

            <Select
              label="Lokasi Spesifik"
              value={locationId}
              disabled={!areaId}
              onChange={setLocationId}
              placeholder={areaId ? '-- Pilih Lokasi --' : 'Pilih Area dulu'}
              options={filteredLocations.map((l) => ({ value: l.id, label: l.name }))}
            />
          </div>

          {/* Row 3: Brand, Model, Serial Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Merek (Brand)
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Contoh: Toyota / Zebra"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Tipe / Model
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Contoh: 8FBE20"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Nomor Seri (Serial No)
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Contoh: SN-TY-88910"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Row 4: Condition, Status, Installed Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Kondisi Fisik"
              value={condition}
              onChange={(val) => setCondition(val as any)}
              options={[
                { value: 'good', label: 'Baik (Good)' },
                { value: 'fair', label: 'Cukup (Fair)' },
                { value: 'damaged', label: 'Ada Kerusakan (Damaged)' },
                { value: 'critical', label: 'Kritis (Critical)' },
              ]}
            />

            <Select
              label="Status Operasional"
              value={status}
              onChange={(val) => setStatus(val as any)}
              options={[
                { value: 'active', label: 'Aktif (Ready)' },
                { value: 'maintenance', label: 'Dalam Maintenance' },
                { value: 'inactive', label: 'Non-Aktif / Idle' },
                { value: 'retired', label: 'Afkir (Retired)' },
              ]}
            />

            <div className="space-y-1">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Tanggal Pengadaan
              </label>
              <input
                type="date"
                value={installedDate}
                onChange={(e) => setInstalledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Foto Aset
            </label>
            <div className="flex items-center gap-3">
              {photoPreview ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-950/70 text-white hover:bg-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-500 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 cursor-pointer transition-colors shrink-0">
                  <Camera className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-bold">Pilih Foto</span>
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                </label>
              )}
              <p className="text-[11px] text-slate-400 leading-snug">
                Unggah foto fisik aset untuk memudahkan identifikasi saat proses inspeksi dan pelaporan kendala.
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Catatan / Petunjuk Tambahan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Jadwal servis berkala tiap tanggal 10..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !assetCode.trim() || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Simpan Master Aset</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
