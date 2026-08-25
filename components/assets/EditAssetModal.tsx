import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit3,
  X,
  Camera,
  Loader2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { BUCKETS, uploadFile } from '@/lib/supabase/storage';
import { updateAssetAction } from '@/app/actions/assets';
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

interface EditAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    warehouse_id: string;
    asset_code: string;
    name: string;
    category_id?: string | null;
    area_id?: string | null;
    location_id?: string | null;
    photo_url?: string | null;
    status: string;
    installed_date?: string | null;
    specification?: {
      brand?: string | null;
      model?: string | null;
      serial_number?: string | null;
      condition?: 'good' | 'fair' | 'damaged' | 'critical';
      notes?: string | null;
    };
  };
  categories: CategoryItem[];
  areas: AreaItem[];
  locations: LocationItem[];
}

export function EditAssetModal({
  isOpen,
  onClose,
  asset,
  categories,
  areas,
  locations,
}: EditAssetModalProps) {
  const router = useRouter();

  const [name, setName] = useState(asset.name || '');
  const [categoryId, setCategoryId] = useState(asset.category_id || '');
  const [areaId, setAreaId] = useState(asset.area_id || '');
  const [locationId, setLocationId] = useState(asset.location_id || '');
  const [brand, setBrand] = useState(asset.specification?.brand || '');
  const [model, setModel] = useState(asset.specification?.model || '');
  const [serialNumber, setSerialNumber] = useState(asset.specification?.serial_number || '');
  const [condition, setCondition] = useState<'good' | 'fair' | 'damaged' | 'critical'>(
    asset.specification?.condition || 'good'
  );
  const [status, setStatus] = useState<'active' | 'inactive' | 'maintenance' | 'retired'>(
    (asset.status as any) || 'active'
  );
  const [installedDate, setInstalledDate] = useState(asset.installed_date || '');
  const [notes, setNotes] = useState(asset.specification?.notes || '');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Preserve existing referenced master values even if inactive
  const effectiveCategories = useMemo(() => {
    if (asset.category_id && !categories.some((c) => c.id === asset.category_id)) {
      const currentName = (asset as any)?.category?.name || 'Kategori Terpilih';
      return [{ id: asset.category_id, name: `${currentName} (Nonaktif)` }, ...categories];
    }
    return categories;
  }, [categories, asset]);

  const effectiveAreas = useMemo(() => {
    if (asset.area_id && !areas.some((a) => a.id === asset.area_id)) {
      const currentName = (asset as any)?.area?.name || 'Area Terpilih';
      return [{ id: asset.area_id, name: `${currentName} (Nonaktif)`, warehouse_id: asset.warehouse_id }, ...areas];
    }
    return areas;
  }, [areas, asset]);

  const effectiveLocations = useMemo(() => {
    if (asset.location_id && !locations.some((l) => l.id === asset.location_id)) {
      const currentName = (asset as any)?.location?.name || 'Lokasi Terpilih';
      return [{ id: asset.location_id, name: `${currentName} (Nonaktif)`, area_id: asset.area_id }, ...locations];
    }
    return locations;
  }, [locations, asset]);

  const filteredLocations = effectiveLocations.filter((l) => l.area_id === areaId);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Nama Aset wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      let photoUrl: string | null = null;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop() || 'jpg';
        const photoPath = `${asset.warehouse_id}/${crypto.randomUUID()}.${fileExt}`;
        await uploadFile(BUCKETS.ASSET_PHOTOS, photoPath, photoFile, photoFile.type);
        photoUrl = photoPath;
      }

      const res = await updateAssetAction(asset.id, {
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
        throw new Error(res.error || 'Gagal memperbarui aset.');
      }

      onClose();
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memperbarui aset.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95 relative">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Ubah Master Aset</h3>
              <p className="text-[11px] font-mono font-bold text-blue-600">{asset.asset_code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="px-5 sm:px-6 py-4 overflow-y-auto overscroll-contain flex-1 space-y-4 touch-pan-y">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Kategori Aset"
              value={categoryId}
              onChange={setCategoryId}
              placeholder="-- Pilih Kategori --"
              options={effectiveCategories.map((c) => ({ value: c.id, label: c.name }))}
            />

            <Select
              label="Area Penempatan"
              value={areaId}
              onChange={(val) => {
                setAreaId(val);
                setLocationId('');
              }}
              placeholder="-- Pilih Area --"
              options={effectiveAreas.map((a) => ({ value: a.id, label: a.name }))}
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

          {/* Photo Update */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              Perbarui Foto Aset
            </label>
            <div className="flex items-center gap-3">
              {photoPreview ? (
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-950/70 text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-500 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 cursor-pointer transition-colors shrink-0">
                  <Camera className="w-4 h-4 mb-0.5" />
                  <span className="text-[9px] font-bold">Ganti Foto</span>
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                </label>
              )}
              <p className="text-[11px] text-slate-400 leading-snug">
                Pilih foto baru jika ingin mengganti gambar dokumentasi fisik aset.
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
        </div>

        {/* Sticky Actions Footer */}
        <div
          className="flex items-center gap-2 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs shrink-0 rounded-b-3xl"
          style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
}
