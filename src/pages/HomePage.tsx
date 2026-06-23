import { useEffect, useState } from 'react';
import { ArrowRight, Shield, Truck, Award, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { CARD_TYPE_COLORS } from '../lib/constants';

interface HomePageProps {
  onNavigate: (page: string) => void;
  onViewProduct: (id: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
  Fire: '🔥',
  Water: '💧',
  Grass: '🌿',
  Electric: '⚡',
  Psychic: '🔮',
  Dragon: '🐉',
};

export default function HomePage({ onNavigate, onViewProduct }: HomePageProps) {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [featRes, newRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('is_featured', true)
          .eq('in_stock', true)
          .limit(4)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('*')
          .eq('in_stock', true)
          .limit(8)
          .order('created_at', { ascending: false }),
      ]);
      setFeatured(featRes.data ?? []);
      setNewArrivals(newRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-950">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-amber-400/8 rounded-full blur-3xl" />
        </div>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-3xl">
            {/* Logo */}
            <div className="mb-8">
              <img
                src="/assets/branding/gpt-image-2_creating_a_logo_for_a_business_named_The_Card_Mon_a_trading_card_selling_company-0.jpg"
                alt="The Card Mon"
                className="h-28 sm:h-36 w-auto rounded-2xl object-contain"
              />
            </div>

            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/25 rounded-full px-4 py-1.5 mb-7">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-sm text-amber-300 font-semibold tracking-wide">Premium Pokemon Card Shop</span>
            </div>

            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6"
              style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
            >
              Build Your
              <br />
              <span className="bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                Ultimate Deck
              </span>
            </h1>

            <p className="text-lg text-gray-400 mb-10 leading-relaxed max-w-xl">
              Authenticated rare cards, vintage holographics, and competitive staples —
              all condition-graded and shipped securely to collectors worldwide.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onNavigate('catalog')}
                className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-7 py-3.5 rounded-xl font-semibold text-base transition-all shadow-lg shadow-red-900/30 hover:shadow-red-800/40"
              >
                Browse Catalog
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('catalog?type=Legendary')}
                className="inline-flex items-center justify-center gap-2 bg-white/8 hover:bg-white/12 text-white border border-white/15 px-7 py-3.5 rounded-xl font-semibold text-base transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                View Legendaries
              </button>
            </div>

            {/* Stats strip */}
            <div className="flex flex-wrap gap-8 mt-12 pt-8 border-t border-white/10">
              {[
                { value: '10,000+', label: 'Cards Listed' },
                { value: '100%', label: 'Authenticated' },
                { value: 'Free', label: 'Tracked Shipping' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
                    {value}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {[
              { icon: Shield, title: 'Authenticated Cards', desc: 'Every card verified for authenticity' },
              { icon: Truck, title: 'Secure Shipping', desc: 'Protected toploader packaging' },
              { icon: Award, title: 'Graded Condition', desc: 'PSA/CGC grades & detailed photos' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4 py-4 sm:py-0 first:pt-0 last:pb-0 sm:px-6 first:pl-0 last:pr-0">
                <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <Icon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Type */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-1">Energy Types</p>
              <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
                Browse by Type
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {['Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Dragon'].map((type) => (
              <button
                key={type}
                onClick={() => onNavigate(`catalog?type=${type}`)}
                className={`relative bg-gradient-to-br ${CARD_TYPE_COLORS[type]} rounded-2xl p-4 text-white text-center hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg overflow-hidden group`}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                <div className="relative">
                  <span className="text-2xl block mb-1">{TYPE_ICONS[type]}</span>
                  <span className="font-bold text-sm block" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
                    {type}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured cards */}
      {(loading || featured.length > 0) && (
        <section className="py-14 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-1">Hand-Picked</p>
                <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
                  Featured Cards
                </h2>
              </div>
              <button
                onClick={() => onNavigate('catalog')}
                className="text-red-600 hover:text-red-700 text-sm font-semibold flex items-center gap-1 group"
              >
                View All
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-64" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {featured.map((p) => (
                  <ProductCard key={p.id} product={p} onView={onViewProduct} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* New arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-14 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-1">Just In</p>
                <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
                  New Arrivals
                </h2>
              </div>
              <button
                onClick={() => onNavigate('catalog')}
                className="text-red-600 hover:text-red-700 text-sm font-semibold flex items-center gap-1 group"
              >
                View All
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {newArrivals.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} onView={onViewProduct} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && featured.length === 0 && newArrivals.length === 0 && (
        <section className="py-24 bg-white text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-red-400" />
            </div>
            <h2
              className="text-3xl font-bold text-gray-900 mb-3"
              style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
            >
              Cards Coming Soon
            </h2>
            <p className="text-gray-500 mb-8">
              We're curating the finest Pokemon card collection. Check back soon for incredible listings!
            </p>
            <button
              onClick={() => onNavigate('catalog')}
              className="bg-red-600 hover:bg-red-500 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-md shadow-red-900/20"
            >
              Visit Catalog
            </button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="text-white font-bold text-xl mb-1" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
                The Card Mon
              </div>
              <div className="text-xs text-gray-600 uppercase tracking-widest mb-4">Premium TCG</div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Authenticated Pokemon cards for serious collectors. Every card verified, every shipment protected.
              </p>
            </div>

            {/* Shop */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Shop</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Browse Catalog', page: 'catalog' },
                  { label: 'Featured Cards', page: 'catalog' },
                  { label: 'New Arrivals', page: 'catalog' },
                  { label: 'Sell Your Cards', page: 'sell' },
                ].map(({ label, page }) => (
                  <li key={label}>
                    <button
                      onClick={() => onNavigate(page)}
                      className="text-sm text-gray-500 hover:text-white transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Info */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Info</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'About The Card Mon', page: 'about' },
                  { label: 'FAQ', page: 'faq' },
                  { label: 'Shipping & Returns', page: 'shipping' },
                  { label: 'Contact Us', page: 'contact' },
                ].map(({ label, page }) => (
                  <li key={label}>
                    <button
                      onClick={() => onNavigate(page)}
                      className="text-sm text-gray-500 hover:text-white transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Account</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Sign In', page: 'auth' },
                  { label: 'My Orders', page: 'orders' },
                  { label: 'My Cart', page: 'cart' },
                  { label: 'Sell Submissions', page: 'sell' },
                ].map(({ label, page }) => (
                  <li key={label}>
                    <button
                      onClick={() => onNavigate(page)}
                      className="text-sm text-gray-500 hover:text-white transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-600">© 2026 The Card Mon. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <button onClick={() => onNavigate('shipping')} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                Shipping Policy
              </button>
              <button onClick={() => onNavigate('faq')} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                FAQ
              </button>
              <button onClick={() => onNavigate('contact')} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                Contact
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
