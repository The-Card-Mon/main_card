import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Star,
  Package,
  CheckSquare,
  Square,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Filter,
  Image as ImageIcon,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Tag,
  AlertCircle,
  ShoppingBag,
  Loader2,
  CheckCircle,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../types';
import { CARD_TYPES, RARITIES, CONDITIONS, SET_NAMES, POKEMON_IMAGES, RARITY_COLORS } from '../../lib/constants';

interface ProductForm {
  name: string;
  description: string;
  price: number;
  image_url: string;
  card_type: string;
  rarity: string;
  set_name: string;
  card_number: string;
  hp: number;
  in_stock: boolean;
  quantity: number;
  is_featured: boolean;
  condition: string;
  tcg_price: number | null;
  tcg_price_updated_at: string | null;
  use_custom_price: boolean;
  tcg_price_tier: string;
}

interface TcgResult {
  productId: string;
  name: string;
  setName: string;
  imageUrl: string | null;
  tcgUrl: string;
  tcgNmAvg: number | null;
  tcgLpAvg: number | null;
  tcgNmAvg7d: number | null;
  tcgNmAvg30d: number | null;
  ebayNmAvg: number | null;
  ebayNmAvg7d: number | null;
  ebayNmLow: number | null;
  ebayNmHigh: number | null;
}

interface PkmnCard {
  id: string;
  name: string;
  number: string;
  set: { name: string };
  images: { small: string; large: string };
}

const EMPTY: ProductForm = {
  name: '', description: '', price: 0, image_url: '',
  card_type: '', rarity: '', set_name: '', card_number: '',
  hp: 0, in_stock: true, quantity: 1, is_featured: false, condition: '',
  tcg_price: null, tcg_price_updated_at: null, use_custom_price: true, tcg_price_tier: 'tcgNmAvg',
};

type SortField = 'name' | 'price' | 'quantity' | 'created_at';

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterRarity, setFilterRarity] = useState('');
  const [filterStock, setFilterStock] = useState<'all' | 'in' | 'out'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // eBay listing state
  const [ebayLoading, setEbayLoading] = useState<Set<string>>(new Set());
  const [ebayToast, setEbayToast] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const showEbayToast = (id: string, msg: string, ok: boolean) => {
    setEbayToast({ id, msg, ok });
    setTimeout(() => setEbayToast(null), 4000);
  };

  const ebayAction = async (product: Product, action: 'create' | 'revise' | 'end') => {
    setEbayLoading((prev) => new Set(prev).add(product.id));
    try {
      const { data, error } = await supabase.functions.invoke('ebay-listing', {
        body: { action, product_id: product.id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const msgs = { create: 'Listed on eBay!', revise: 'eBay listing updated.', end: 'eBay listing ended.' };
      showEbayToast(product.id, msgs[action], true);
      await fetchProducts();
    } catch (err: any) {
      showEbayToast(product.id, err.message ?? 'eBay action failed', false);
      await fetchProducts();
    } finally {
      setEbayLoading((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
    }
  };

  // TCG pricing state
  const [tcgLoading, setTcgLoading] = useState(false);
  const [tcgResults, setTcgResults] = useState<TcgResult[]>([]);
  const [tcgError, setTcgError] = useState<string | null>(null);
  const [showTcgResults, setShowTcgResults] = useState(false);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [updateAllResult, setUpdateAllResult] = useState<{ updated: number; skipped: number } | null>(null);

  // Card image search state
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [imageSearchResults, setImageSearchResults] = useState<PkmnCard[]>([]);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);
  const imageSearchRef = useRef<HTMLDivElement>(null);

  // Inline pricing after picking a card from the image search
  const [cardPickStep, setCardPickStep] = useState<'grid' | 'pricing'>('grid');
  const [pickedCard, setPickedCard] = useState<PkmnCard | null>(null);
  const [inlinePriceLoading, setInlinePriceLoading] = useState(false);
  const [inlinePriceResults, setInlinePriceResults] = useState<TcgResult[]>([]);
  const [inlinePriceError, setInlinePriceError] = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts(data ?? []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let r = [...products];
    if (search) {
      const s = search.toLowerCase();
      r = r.filter((p) => p.name.toLowerCase().includes(s) || (p.set_name ?? '').toLowerCase().includes(s));
    }
    if (filterType) r = r.filter((p) => p.card_type === filterType);
    if (filterRarity) r = r.filter((p) => p.rarity === filterRarity);
    if (filterStock === 'in') r = r.filter((p) => p.in_stock && p.quantity > 0);
    if (filterStock === 'out') r = r.filter((p) => !p.in_stock || p.quantity === 0);
    r.sort((a, b) => {
      let av: any = a[sortField];
      let bv: any = b[sortField];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return r;
  }, [products, search, filterType, filterRarity, filterStock, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortAsc ? <ChevronUp className="w-3 h-3 text-gray-600" /> : <ChevronDown className="w-3 h-3 text-gray-600" />;
  };

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} card${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    await supabase.from('products').delete().in('id', [...selected]);
    setSelected(new Set());
    fetchProducts();
  };

  const bulkToggleFeatured = async (featured: boolean) => {
    if (!selected.size) return;
    await supabase.from('products').update({ is_featured: featured }).in('id', [...selected]);
    setSelected(new Set());
    fetchProducts();
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name, description: p.description ?? '', price: p.price,
      image_url: p.image_url ?? '', card_type: p.card_type ?? '',
      rarity: p.rarity ?? '', set_name: p.set_name ?? '',
      card_number: p.card_number ?? '', hp: p.hp ?? 0,
      in_stock: p.in_stock, quantity: p.quantity, is_featured: p.is_featured,
      condition: p.condition ?? '',
      tcg_price: p.tcg_price ?? null,
      tcg_price_updated_at: p.tcg_price_updated_at ?? null,
      use_custom_price: p.use_custom_price ?? true,
      tcg_price_tier: (p as any).tcg_price_tier ?? 'tcgNmAvg',
    });
    setPreviewUrl(p.image_url ?? '');
    setTcgResults([]);
    setTcgError(null);
    setShowTcgResults(false);
    setShowImageSearch(false);
    setImageSearchResults([]);
    setShowForm(true);
  };

  const startNew = () => {
    setEditingId(null);
    setForm(EMPTY);
    setPreviewUrl('');
    setTcgResults([]);
    setTcgError(null);
    setShowTcgResults(false);
    setShowImageSearch(false);
    setImageSearchResults([]);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const setField = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const fetchTCGPrice = async () => {
    if (!form.name.trim()) return;
    setTcgLoading(true);
    setTcgError(null);
    setTcgResults([]);
    setShowTcgResults(true);

    try {
      const { data, error } = await supabase.functions.invoke('tcg-pricing', {
        body: { name: form.name.trim(), set_name: form.set_name || undefined },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      setTcgResults(data.results ?? []);
    } catch (err: any) {
      setTcgError(err.message ?? 'Failed to fetch TCG pricing');
    } finally {
      setTcgLoading(false);
    }
  };

  const applyTCGPrice = (price: number, tierKey: string) => {
    setForm((prev) => ({
      ...prev,
      tcg_price: price,
      tcg_price_updated_at: new Date().toISOString(),
      use_custom_price: false,
      price: price,
      tcg_price_tier: tierKey,
    }));
    setShowTcgResults(false);
  };

  const searchCardImages = async (query: string) => {
    if (!query.trim()) return;
    setImageSearchLoading(true);
    setImageSearchError(null);
    setImageSearchResults([]);
    try {
      const q = encodeURIComponent(`name:"${query.trim()}"`);
      const res = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=${q}&pageSize=24&select=id,name,number,set,images`,
        { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
      );
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      setImageSearchResults(json.data ?? []);
      if ((json.data ?? []).length === 0) setImageSearchError('No cards found. Try a shorter name.');
    } catch (err: any) {
      setImageSearchError(err.message ?? 'Failed to search card images');
    } finally {
      setImageSearchLoading(false);
    }
  };

  const openImageSearch = () => {
    setShowImageSearch(true);
    setCardPickStep('grid');
    setPickedCard(null);
    setImageSearchQuery(form.name.trim());
    setImageSearchResults([]);
    setImageSearchError(null);
    setInlinePriceResults([]);
    setInlinePriceError(null);
    if (form.name.trim()) searchCardImages(form.name.trim());
    setTimeout(() => imageSearchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  };

  const closeImageSearch = () => {
    setShowImageSearch(false);
    setCardPickStep('grid');
    setPickedCard(null);
  };

  const pickCardImage = async (card: PkmnCard) => {
    setForm((prev) => ({
      ...prev,
      image_url: card.images.large,
      name: prev.name.trim() ? prev.name : card.name,
      set_name: card.set.name,
      card_number: card.number,
    }));
    setPreviewUrl(card.images.large);
    setPickedCard(card);
    setCardPickStep('pricing');
    setInlinePriceLoading(true);
    setInlinePriceError(null);
    setInlinePriceResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('tcg-pricing', {
        body: { name: card.name, set_name: card.set.name },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setInlinePriceResults(data.results ?? []);
    } catch (err: any) {
      setInlinePriceError(err.message ?? 'Failed to fetch pricing');
    } finally {
      setInlinePriceLoading(false);
    }
  };

  const applyInlinePrice = (price: number, tierKey: string) => {
    setForm((prev) => ({
      ...prev,
      tcg_price: price,
      tcg_price_updated_at: new Date().toISOString(),
      use_custom_price: false,
      price,
      tcg_price_tier: tierKey,
    }));
    closeImageSearch();
  };

  const updateAllPrices = async () => {
    setUpdatingAll(true);
    setUpdateAllResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('price-auto-update', { body: {} });
      if (error) throw error;
      setUpdateAllResult({ updated: data.updated ?? 0, skipped: data.skipped ?? 0 });
      await fetchProducts();
    } catch {
      setUpdateAllResult({ updated: 0, skipped: -1 });
    } finally {
      setUpdatingAll(false);
    }
  };

  const activePrice = form.use_custom_price ? form.price : (form.tcg_price ?? form.price);

  const handleSave = async () => {
    const priceToSave = form.use_custom_price ? form.price : (form.tcg_price ?? form.price);
    if (!form.name.trim() || priceToSave <= 0) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: priceToSave,
      image_url: form.image_url.trim() || null,
      card_type: form.card_type || null,
      rarity: form.rarity || null,
      set_name: form.set_name || null,
      card_number: form.card_number.trim() || null,
      hp: form.hp || null,
      in_stock: form.in_stock,
      quantity: form.quantity,
      is_featured: form.is_featured,
      condition: form.condition || null,
      tcg_price: form.tcg_price,
      tcg_price_updated_at: form.tcg_price_updated_at,
      use_custom_price: form.use_custom_price,
      tcg_price_tier: form.tcg_price_tier,
    };
    if (editingId) {
      await supabase.from('products').update(payload).eq('id', editingId);
    } else {
      await supabase.from('products').insert(payload);
    }
    setSaving(false);
    closeForm();
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this card?')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const toggleFeatured = async (p: Product) => {
    await supabase.from('products').update({ is_featured: !p.is_featured }).eq('id', p.id);
    fetchProducts();
  };

  const toggleStock = async (p: Product) => {
    await supabase.from('products').update({ in_stock: !p.in_stock }).eq('id', p.id);
    fetchProducts();
  };

  return (
    <div className="p-6 lg:p-8 space-y-5">
      {/* eBay toast */}
      {ebayToast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
          ebayToast.ok
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {ebayToast.ok
            ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            : <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
          <span className="max-w-xs">{ebayToast.msg}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or set..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
            showFilters || filterType || filterRarity || filterStock !== 'all'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {(filterType || filterRarity || filterStock !== 'all') && (
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-gray-500">{selected.size} selected</span>
              <button
                onClick={() => bulkToggleFeatured(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <Star className="w-3.5 h-3.5" /> Feature
              </button>
              <button
                onClick={bulkDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </>
          )}
          <button
            onClick={updateAllPrices}
            disabled={updatingAll}
            title="Re-fetch TCG prices for all auto-priced cards"
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${updatingAll ? 'animate-spin' : ''}`} />
            {updatingAll ? 'Updating...' : 'Update Prices'}
          </button>
          {updateAllResult && (
            <span className="text-xs text-gray-500">
              {updateAllResult.skipped === -1
                ? 'Update failed'
                : `Updated ${updateAllResult.updated} card${updateAllResult.updated !== 1 ? 's' : ''}`}
            </span>
          )}
          <button
            onClick={startNew}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Card
          </button>
        </div>
      </div>

      {/* Filter strip */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">All Types</option>
                {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Rarity</label>
              <select value={filterRarity} onChange={(e) => setFilterRarity(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">All Rarities</option>
                {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Stock</label>
              <select value={filterStock} onChange={(e) => setFilterStock(e.target.value as any)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="all">All Stock</option>
                <option value="in">In Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
          </div>
          {(filterType || filterRarity || filterStock !== 'all') && (
            <button onClick={() => { setFilterType(''); setFilterRarity(''); setFilterStock('all'); }} className="mt-3 text-xs text-red-600 hover:text-red-700 font-medium">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{filtered.length}</span> products
          </p>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="w-10 px-4 py-3">
                    <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                      {allSelected ? <CheckSquare className="w-4 h-4 text-red-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => toggleSort('name')}>
                    <span className="flex items-center gap-1">Card <SortIcon field="name" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type / Rarity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => toggleSort('price')}>
                    <span className="flex items-center gap-1">Price <SortIcon field="price" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700" onClick={() => toggleSort('quantity')}>
                    <span className="flex items-center gap-1">Stock <SortIcon field="quantity" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Flags</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">eBay</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${selected.has(p.id) ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleOne(p.id)} className="text-gray-400 hover:text-gray-600">
                        {selected.has(p.id) ? <CheckSquare className="w-4 h-4 text-red-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.set_name ?? '—'}{p.card_number ? ` · #${p.card_number}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{p.card_type ?? '—'}</p>
                      {p.rarity && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${RARITY_COLORS[p.rarity] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {p.rarity}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-900">${p.price.toFixed(2)}</p>
                      {!p.use_custom_price && p.tcg_price !== null && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full mt-0.5">
                          <TrendingUp className="w-2.5 h-2.5" />TCG
                        </span>
                      )}
                      {p.use_custom_price && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full mt-0.5">
                          <Tag className="w-2.5 h-2.5" />Custom
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStock(p)}
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border cursor-pointer transition-colors ${
                          p.in_stock && p.quantity > 0
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        }`}
                        title="Click to toggle stock status"
                      >
                        {p.in_stock && p.quantity > 0
                          ? <><Eye className="w-3 h-3" />{p.quantity} in stock</>
                          : <><EyeOff className="w-3 h-3" />Out of stock</>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleFeatured(p)}
                          title={p.is_featured ? 'Remove from featured' : 'Add to featured'}
                          className={`p-1.5 rounded-md transition-colors ${p.is_featured ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'}`}
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        {p.condition && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{p.condition}</span>
                        )}
                      </div>
                    </td>
                    {/* eBay status + actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {ebayLoading.has(p.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        ) : p.ebay_listing_status === 'active' ? (
                          <>
                            <a
                              href={p.ebay_listing_url ?? '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 transition-colors"
                            >
                              <ShoppingBag className="w-2.5 h-2.5" />
                              Live
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <button
                              onClick={() => ebayAction(p, 'revise')}
                              title="Sync price & details to eBay"
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => { if (confirm('End this eBay listing?')) ebayAction(p, 'end'); }}
                              title="End eBay listing"
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </>
                        ) : p.ebay_listing_status === 'error' ? (
                          <button
                            onClick={() => ebayAction(p, 'create')}
                            title={p.ebay_listing_error ?? 'eBay error — click to retry'}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full hover:bg-red-100 transition-colors"
                          >
                            <AlertCircle className="w-2.5 h-2.5" />
                            Error
                          </button>
                        ) : p.ebay_listing_status === 'ended' ? (
                          <button
                            onClick={() => ebayAction(p, 'create')}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-full hover:bg-gray-200 transition-colors"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            Relist
                          </button>
                        ) : (
                          <button
                            onClick={() => ebayAction(p, 'create')}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                          >
                            <ShoppingBag className="w-2.5 h-2.5" />
                            List
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {products.length === 0 ? 'No products yet — add your first card!' : 'No products match your filters.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Card' : 'Add New Card'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editingId ? 'Update product details' : 'List a new card for sale'}</p>
              </div>
              <button onClick={closeForm} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Image preview */}
              {previewUrl && (
                <div className="relative rounded-xl overflow-hidden h-40 bg-gray-100">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Card Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g. Charizard VMAX Rainbow Rare"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                    placeholder="Describe the card's artwork, special features..."
                  />
                </div>

                {/* ── PRICING SECTION ── */}
                <div className="sm:col-span-2">
                  <div className="rounded-xl border-2 border-blue-100 bg-blue-50/40 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Pricing</span>
                      </div>
                      {/* Price mode toggle */}
                      <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5 gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setField('use_custom_price', false);
                            if (form.tcg_price) setField('price', form.tcg_price);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            !form.use_custom_price
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <TrendingUp className="w-3 h-3" />
                          TCG Price
                        </button>
                        <button
                          type="button"
                          onClick={() => setField('use_custom_price', true)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            form.use_custom_price
                              ? 'bg-gray-800 text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <Tag className="w-3 h-3" />
                          Custom
                        </button>
                      </div>
                    </div>

                    {/* TCG lookup row */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={fetchTCGPrice}
                        disabled={!form.name.trim() || tcgLoading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${tcgLoading ? 'animate-spin' : ''}`} />
                        {tcgLoading ? 'Searching...' : 'Fetch from PokéTrace'}
                      </button>
                      {form.tcg_price !== null && !form.use_custom_price && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 rounded-lg border border-blue-200">
                          <span className="text-xs text-blue-700 font-semibold">
                            Market: ${form.tcg_price.toFixed(2)}
                          </span>
                          {form.tcg_price_updated_at && (
                            <span className="text-[10px] text-blue-500">
                              · {formatTimeAgo(form.tcg_price_updated_at)}
                            </span>
                          )}
                        </div>
                      )}
                      {!form.name.trim() && (
                        <span className="text-xs text-gray-400">Enter card name first</span>
                      )}
                    </div>

                    {/* TCG error */}
                    {tcgError && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{tcgError}</span>
                      </div>
                    )}

                    {/* TCG results dropdown */}
                    {showTcgResults && !tcgLoading && (
                      <div className="space-y-2">
                        {tcgResults.length === 0 ? (
                          <p className="text-xs text-gray-500 text-center py-2">No matches found on TCGPlayer.</p>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500 font-medium">
                              {tcgResults.length} result{tcgResults.length !== 1 ? 's' : ''} — click a price to apply it:
                            </p>
                            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                              {tcgResults.map((r) => {
                                const tiers: { label: string; tierKey: string; sublabel?: string; value: number | null; highlight?: boolean }[] = [
                                  { label: 'TCG NM', tierKey: 'tcgNmAvg',    sublabel: 'near mint avg',  value: r.tcgNmAvg,    highlight: true },
                                  { label: 'TCG LP', tierKey: 'tcgLpAvg',    sublabel: 'lightly played', value: r.tcgLpAvg },
                                  { label: 'TCG 7d', tierKey: 'tcgNmAvg7d',  sublabel: '7-day avg',      value: r.tcgNmAvg7d },
                                  { label: 'TCG 30d',tierKey: 'tcgNmAvg30d', sublabel: '30-day avg',     value: r.tcgNmAvg30d },
                                  { label: 'eBay NM',tierKey: 'ebayNmAvg',   sublabel: 'near mint avg',  value: r.ebayNmAvg },
                                  { label: 'eBay 7d',tierKey: 'ebayNmAvg7d', sublabel: 'ebay 7-day',     value: r.ebayNmAvg7d },
                                  { label: 'eBay Low', tierKey: 'ebayNmLow',  sublabel: 'ebay nm low',  value: r.ebayNmLow },
                                  { label: 'eBay High',tierKey: 'ebayNmHigh', sublabel: 'ebay nm high', value: r.ebayNmHigh },
                                ];
                                const available = tiers.filter((t) => t.value !== null);
                                return (
                                  <div key={r.productId} className="bg-white border border-gray-200 rounded-lg p-2.5 space-y-2">
                                    <div className="flex items-center gap-2">
                                      {r.imageUrl && (
                                        <img src={r.imageUrl} alt={r.name} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-900 truncate">{r.name}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{r.setName}</p>
                                      </div>
                                      <a
                                        href={r.tcgUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 text-gray-300 hover:text-blue-500 transition-colors"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                    {available.length === 0 ? (
                                      <p className="text-[10px] text-gray-400">No prices available</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {available.map((t) => (
                                          <button
                                            key={t.label}
                                            type="button"
                                            title={t.sublabel}
                                            onClick={() => applyTCGPrice(t.value!, t.tierKey)}
                                            className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
                                              t.highlight
                                                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-400'
                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-400'
                                            }`}
                                          >
                                            <span className={`text-xs font-bold ${t.highlight ? 'text-blue-700' : 'text-gray-700'}`}>
                                              ${t.value!.toFixed(2)}
                                            </span>
                                            <span className="text-[9px] text-gray-400 uppercase tracking-wide">{t.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowTcgResults(false)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {/* Active price display / custom price input */}
                    {form.use_custom_price ? (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                          Custom Price (USD) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={form.price || ''}
                            onChange={(e) => setField('price', parseFloat(e.target.value) || 0)}
                            className="w-full pl-7 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-white rounded-lg border border-blue-200 px-3 py-2.5">
                        <div>
                          <p className="text-xs text-gray-500">Active selling price</p>
                          <p className="text-lg font-bold text-gray-900">
                            {form.tcg_price !== null ? `$${form.tcg_price.toFixed(2)}` : <span className="text-gray-400 text-sm">Fetch a price above</span>}
                          </p>
                        </div>
                        {form.tcg_price !== null && (
                          <button
                            type="button"
                            onClick={() => { setField('use_custom_price', true); setField('price', form.tcg_price!); }}
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                          >
                            Override
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Quantity Available</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setField('quantity', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Condition</label>
                  <select
                    value={form.condition}
                    onChange={(e) => setField('condition', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select condition</option>
                    {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Type + Rarity */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Card Type</label>
                  <select
                    value={form.card_type}
                    onChange={(e) => setField('card_type', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select type</option>
                    {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Rarity</label>
                  <select
                    value={form.rarity}
                    onChange={(e) => setField('rarity', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select rarity</option>
                    {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Set + Card Number */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Card Set</label>
                  <select
                    value={form.set_name}
                    onChange={(e) => setField('set_name', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select set</option>
                    {SET_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Card Number</label>
                  <input
                    type="text"
                    value={form.card_number}
                    onChange={(e) => setField('card_number', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g. 4/102"
                  />
                </div>

                {/* HP */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">HP</label>
                  <input
                    type="number"
                    min="0"
                    value={form.hp || ''}
                    onChange={(e) => setField('hp', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g. 330"
                  />
                </div>

                {/* Image URL */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Card Image</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={form.image_url}
                      onChange={(e) => { setField('image_url', e.target.value); setPreviewUrl(e.target.value); }}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="https://... or search below"
                    />
                    <button
                      type="button"
                      onClick={openImageSearch}
                      className="flex items-center gap-1.5 px-3 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-sm"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Search Photos
                    </button>
                  </div>

                  {/* Image search panel */}
                  {showImageSearch && (
                    <div ref={imageSearchRef} className="rounded-xl border border-yellow-200 bg-yellow-50/40 p-4 space-y-3">
                      {cardPickStep === 'grid' ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <input
                                type="text"
                                value={imageSearchQuery}
                                onChange={(e) => setImageSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchCardImages(imageSearchQuery)}
                                placeholder="e.g. Charizard VMAX"
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
                                autoFocus
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => searchCardImages(imageSearchQuery)}
                              disabled={!imageSearchQuery.trim() || imageSearchLoading}
                              className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              {imageSearchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                              {imageSearchLoading ? 'Searching...' : 'Search'}
                            </button>
                            <button type="button" onClick={closeImageSearch} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {imageSearchError && !imageSearchLoading && (
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              {imageSearchError}
                            </div>
                          )}

                          {imageSearchResults.length > 0 && (
                            <>
                              <p className="text-xs text-gray-500 font-medium">
                                {imageSearchResults.length} result{imageSearchResults.length !== 1 ? 's' : ''} — click a card to use its photo and auto-load prices:
                              </p>
                              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1">
                                {imageSearchResults.map((card) => (
                                  <button
                                    key={card.id}
                                    type="button"
                                    onClick={() => pickCardImage(card)}
                                    title={`${card.name} · ${card.set.name} #${card.number}`}
                                    className="group relative rounded-lg overflow-hidden border-2 border-transparent hover:border-yellow-400 transition-all hover:scale-105 hover:shadow-md active:scale-95"
                                  >
                                    <img src={card.images.small} alt={card.name} className="w-full aspect-[245/342] object-cover bg-gray-100" loading="lazy" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                  </button>
                                ))}
                              </div>
                            </>
                          )}

                          {!imageSearchLoading && imageSearchResults.length === 0 && !imageSearchError && (
                            <p className="text-xs text-gray-400 text-center py-3">Type a card name and press Search.</p>
                          )}
                        </>
                      ) : (
                        /* Step 2: inline price selection */
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {pickedCard && (
                                <img src={pickedCard.images.small} alt={pickedCard.name} className="w-9 h-12 object-cover rounded-md shadow-sm flex-shrink-0" />
                              )}
                              <div>
                                <p className="text-xs font-bold text-gray-800">Step 2 — Select a price tier</p>
                                {pickedCard && (
                                  <p className="text-[10px] text-gray-500 mt-0.5">{pickedCard.name} · {pickedCard.set.name} #{pickedCard.number}</p>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCardPickStep('grid')}
                              className="text-xs text-yellow-700 hover:text-yellow-900 font-semibold flex items-center gap-1"
                            >
                              ← Back
                            </button>
                          </div>

                          {inlinePriceLoading && (
                            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                              Fetching market prices from PokéTrace...
                            </div>
                          )}

                          {inlinePriceError && !inlinePriceLoading && (
                            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              <span>{inlinePriceError}</span>
                            </div>
                          )}

                          {!inlinePriceLoading && inlinePriceResults.length > 0 && (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {inlinePriceResults.map((r) => {
                                const tiers: { label: string; tierKey: string; sublabel?: string; value: number | null; highlight?: boolean }[] = [
                                  { label: 'TCG NM',    tierKey: 'tcgNmAvg',    sublabel: 'near mint avg',  value: r.tcgNmAvg,    highlight: true },
                                  { label: 'TCG LP',    tierKey: 'tcgLpAvg',    sublabel: 'lightly played', value: r.tcgLpAvg },
                                  { label: 'TCG 7d',    tierKey: 'tcgNmAvg7d',  sublabel: '7-day avg',      value: r.tcgNmAvg7d },
                                  { label: 'TCG 30d',   tierKey: 'tcgNmAvg30d', sublabel: '30-day avg',     value: r.tcgNmAvg30d },
                                  { label: 'eBay NM',   tierKey: 'ebayNmAvg',   sublabel: 'ebay nm avg',    value: r.ebayNmAvg },
                                  { label: 'eBay 7d',   tierKey: 'ebayNmAvg7d', sublabel: 'ebay 7-day',     value: r.ebayNmAvg7d },
                                  { label: 'eBay Low',  tierKey: 'ebayNmLow',   sublabel: 'ebay nm low',    value: r.ebayNmLow },
                                  { label: 'eBay High', tierKey: 'ebayNmHigh',  sublabel: 'ebay nm high',   value: r.ebayNmHigh },
                                ];
                                const available = tiers.filter((t) => t.value !== null);
                                return (
                                  <div key={r.productId} className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                      {r.imageUrl && <img src={r.imageUrl} alt={r.name} className="w-7 h-7 object-cover rounded flex-shrink-0" />}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-900 truncate">{r.name}</p>
                                        <p className="text-[10px] text-gray-500">{r.setName}</p>
                                      </div>
                                      <a href={r.tcgUrl} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500 transition-colors">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                    {available.length === 0 ? (
                                      <p className="text-[10px] text-gray-400">No prices available on PokéTrace</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {available.map((t) => (
                                          <button
                                            key={t.label}
                                            type="button"
                                            title={t.sublabel}
                                            onClick={() => applyInlinePrice(t.value!, t.tierKey)}
                                            className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
                                              t.highlight
                                                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-400'
                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-400'
                                            }`}
                                          >
                                            <span className={`text-xs font-bold ${t.highlight ? 'text-blue-700' : 'text-gray-700'}`}>
                                              ${t.value!.toFixed(2)}
                                            </span>
                                            <span className="text-[9px] text-gray-400 uppercase tracking-wide">{t.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {!inlinePriceLoading && inlinePriceResults.length === 0 && !inlinePriceError && (
                            <p className="text-xs text-gray-400 text-center py-3">No pricing data found on PokéTrace for this card.</p>
                          )}

                          <div className="flex items-center justify-between border-t border-yellow-100 pt-2">
                            <p className="text-xs text-gray-400">You can also set the price manually in the form.</p>
                            <button type="button" onClick={closeImageSearch} className="text-xs font-semibold text-gray-500 hover:text-gray-700 underline">
                              Continue without price
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-2 mb-2">Or pick a sample image:</p>
                  <div className="flex flex-wrap gap-2">
                    {POKEMON_IMAGES.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setField('image_url', url); setPreviewUrl(url); }}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${form.image_url === url ? 'border-red-500 scale-110 shadow-md' : 'border-transparent hover:border-gray-300'}`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div
                        onClick={() => setField('in_stock', !form.in_stock)}
                        className="relative cursor-pointer rounded-full transition-colors"
                        style={{ width: 40, height: 22, backgroundColor: form.in_stock ? '#22c55e' : '#d1d5db' }}
                      >
                        <div className="absolute bg-white rounded-full shadow transition-all" style={{ width: 18, height: 18, top: 2, left: form.in_stock ? 20 : 2 }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">In Stock</p>
                        <p className="text-xs text-gray-400">Visible to customers</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div
                        onClick={() => setField('is_featured', !form.is_featured)}
                        className="relative cursor-pointer rounded-full transition-colors"
                        style={{ width: 40, height: 22, backgroundColor: form.is_featured ? '#f59e0b' : '#d1d5db' }}
                      >
                        <div className="absolute bg-white rounded-full shadow transition-all" style={{ width: 18, height: 18, top: 2, left: form.is_featured ? 20 : 2 }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Featured</p>
                        <p className="text-xs text-gray-400">Show on home page</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 flex items-center justify-between px-6 py-4">
              <p className="text-xs text-gray-400">
                Active price: <span className="font-semibold text-gray-700">
                  {activePrice > 0 ? `$${activePrice.toFixed(2)}` : '—'}
                </span>
                {!form.use_custom_price && form.tcg_price && (
                  <span className="ml-1.5 text-blue-500">(TCG Market)</span>
                )}
              </p>
              <div className="flex items-center gap-3">
                <button onClick={closeForm} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim() || activePrice <= 0}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Card' : 'Add Card'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
