import { useEffect, useRef, useState } from 'react';
import {
  Megaphone,
  Upload,
  Eye,
  EyeOff,
  CheckCircle,
  X,
  ExternalLink,
  Image as ImageIcon,
  Type,
  MousePointerClick,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ModalConfig {
  enabled: boolean;
  title: string;
  body_text: string;
  bg_image_url: string;
  button_enabled: boolean;
  button_text: string;
  button_page: string;
}

const PAGE_OPTIONS = [
  { value: 'catalog', label: 'Catalog' },
  { value: 'sell', label: 'Sell Cards' },
  { value: 'about', label: 'About Us' },
  { value: 'faq', label: 'FAQ' },
  { value: 'shipping', label: 'Shipping & Returns' },
  { value: 'contact', label: 'Contact Us' },
  { value: 'auth', label: 'Sign In / Sign Up' },
];

const DEFAULT: ModalConfig = {
  enabled: false,
  title: 'Welcome to The Card Mon',
  body_text: 'Discover authenticated Pokemon cards for every collector.',
  bg_image_url: '',
  button_enabled: false,
  button_text: 'Shop Now',
  button_page: 'catalog',
};

export default function AdminModal() {
  const [config, setConfig] = useState<ModalConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('modal_config').select('*').eq('id', 1).maybeSingle();
      if (data) {
        setConfig({
          enabled: data.enabled,
          title: data.title,
          body_text: data.body_text,
          bg_image_url: data.bg_image_url,
          button_enabled: data.button_enabled,
          button_text: data.button_text,
          button_page: data.button_page,
        });
      }
      setLoading(false);
    })();
  }, []);

  const update = (field: keyof ModalConfig) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setConfig((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleEnabled = async () => {
    const next = !config.enabled;
    setConfig((prev) => ({ ...prev, enabled: next }));
    await supabase
      .from('modal_config')
      .update({ enabled: next, updated_at: new Date().toISOString() })
      .eq('id', 1);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setUploadError(null);

    const ext = file.name.split('.').pop();
    const path = `bg-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('modal-images').upload(path, file, { upsert: true });

    if (error) {
      setUploadError('Upload failed: ' + error.message);
      setUploadingImage(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('modal-images').getPublicUrl(path);
    setConfig((prev) => ({ ...prev, bg_image_url: urlData.publicUrl }));
    setUploadingImage(false);
  };

  const clearImage = () => setConfig((prev) => ({ ...prev, bg_image_url: '' }));

  const save = async () => {
    setSaving(true);
    await supabase
      .from('modal_config')
      .update({ ...config, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';
  const fieldClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors bg-white';

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Master toggle */}
        <div className={`rounded-2xl border-2 transition-colors p-5 flex items-center justify-between gap-4 ${
          config.enabled ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.enabled ? 'bg-red-600' : 'bg-gray-200'}`}>
              <Megaphone className={`w-5 h-5 ${config.enabled ? 'text-white' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Promotional Pop-up</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {config.enabled ? 'Visible to all visitors — showing now' : 'Hidden from all visitors'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleEnabled}
            className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors focus:outline-none ${
              config.enabled ? 'bg-red-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                config.enabled ? 'left-[26px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <Type className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Content</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className={labelClass}>Headline</label>
              <input value={config.title} onChange={update('title')} className={fieldClass} placeholder="e.g. New Arrivals Just Dropped!" />
            </div>
            <div>
              <label className={labelClass}>Body Text</label>
              <textarea
                value={config.body_text}
                onChange={update('body_text')}
                rows={3}
                className={`${fieldClass} resize-none`}
                placeholder="e.g. Authenticated rare cards added every week."
              />
            </div>
          </div>
        </div>

        {/* Background image */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <ImageIcon className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Background Image</h3>
            <span className="text-xs text-gray-400 ml-1">(optional)</span>
          </div>
          <div className="p-6 space-y-4">
            {/* Current image preview */}
            {config.bg_image_url && (
              <div className="relative rounded-xl overflow-hidden h-36 bg-gray-100">
                <img src={config.bg_image_url} alt="Background" className="w-full h-full object-cover" />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Upload file */}
            <div>
              <label className={labelClass}>Upload Image</label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingImage}
                className="flex items-center gap-2 border border-dashed border-gray-300 hover:border-red-400 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl px-4 py-3 text-sm font-medium transition-all w-full justify-center"
              >
                {uploadingImage ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Choose file to upload</>
                )}
              </button>
              {uploadError && <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>}
              <p className="text-xs text-gray-400 mt-1.5">JPG, PNG, WebP or GIF — max 5 MB</p>
            </div>

            {/* Or paste URL */}
            <div>
              <label className={labelClass}>Or paste an image URL</label>
              <input
                value={config.bg_image_url}
                onChange={update('bg_image_url')}
                className={fieldClass}
                placeholder="https://images.pexels.com/..."
              />
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2.5 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2.5">
              <MousePointerClick className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Call-to-Action Button</h3>
              <span className="text-xs text-gray-400">(optional)</span>
            </div>
            <button
              onClick={() => setConfig((prev) => ({ ...prev, button_enabled: !prev.button_enabled }))}
              className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors ${config.button_enabled ? 'bg-red-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${config.button_enabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          <div className={`p-6 space-y-4 transition-opacity ${config.button_enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Button Text</label>
                <input value={config.button_text} onChange={update('button_text')} className={fieldClass} placeholder="Shop Now" />
              </div>
              <div>
                <label className={labelClass}>Destination Page</label>
                <select value={config.button_page} onChange={update('button_page')} className={fieldClass}>
                  {PAGE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 bg-white px-4 py-2.5 rounded-xl transition-all"
          >
            <Eye className="w-4 h-4" />
            Preview Modal
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : saved ? (
              <><CheckCircle className="w-4 h-4 text-green-400" /> Saved!</>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {/* Preview overlay */}
      {showPreview && (
        <ModalPreview config={config} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

function ModalPreview({ config, onClose }: { config: ModalConfig; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -top-8 right-0 flex items-center gap-1.5 text-xs text-white/60">
          <EyeOff className="w-3 h-3" />
          Preview only — click outside to close
        </div>
        <ModalCard config={config} onClose={onClose} onNavigate={() => {}} isPreview />
      </div>
    </div>
  );
}

export function ModalCard({
  config,
  onClose,
  onNavigate,
  isPreview = false,
}: {
  config: ModalConfig;
  onClose: () => void;
  onNavigate: (page: string) => void;
  isPreview?: boolean;
}) {
  const hasBg = Boolean(config.bg_image_url);

  return (
    <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
      {/* Background */}
      {hasBg ? (
        <>
          <img
            src={config.bg_image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/15 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl" />
          </div>
        </div>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Content */}
      <div className="relative z-10 px-8 pb-8 pt-12">
        <div className="mb-1">
          <span className="text-[10px] font-semibold text-red-400 uppercase tracking-widest">
            The Card Mon
          </span>
        </div>
        <h2
          className="text-3xl font-bold text-white leading-tight mb-3"
          style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
        >
          {config.title || 'Your Headline Here'}
        </h2>
        {config.body_text && (
          <p className="text-sm text-white/75 leading-relaxed mb-6">{config.body_text}</p>
        )}

        {config.button_enabled && config.button_text && (
          <button
            onClick={() => { if (!isPreview) { onNavigate(config.button_page); onClose(); } }}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-900/40"
          >
            {config.button_text}
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
