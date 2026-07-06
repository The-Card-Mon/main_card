import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SocialLinks {
  instagram: string;
  tiktok: string;
  facebook: string;
  twitter: string;
  youtube: string;
}

interface FooterProps {
  onNavigate: (page: string) => void;
}

// SVG icons for platforms not in lucide-react
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.52V6.76a4.85 4.85 0 01-1.02-.07z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TwitterXIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
  </svg>
);

export default function Footer({ onNavigate }: FooterProps) {
  const [social, setSocial] = useState<SocialLinks>({
    instagram: '', tiktok: '', facebook: '', twitter: '', youtube: '',
  });

  useEffect(() => {
    supabase
      .from('modal_config')
      .select('social_instagram, social_tiktok, social_facebook, social_twitter, social_youtube')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setSocial({
            instagram: data.social_instagram ?? '',
            tiktok: data.social_tiktok ?? '',
            facebook: data.social_facebook ?? '',
            twitter: data.social_twitter ?? '',
            youtube: data.social_youtube ?? '',
          });
        }
      });
  }, []);

  const socialLinks = [
    { key: 'instagram', href: social.instagram, Icon: InstagramIcon, label: 'Instagram', hoverClass: 'hover:text-pink-500 hover:bg-pink-50' },
    { key: 'tiktok',    href: social.tiktok,    Icon: TikTokIcon,    label: 'TikTok',    hoverClass: 'hover:text-gray-900 hover:bg-gray-100' },
    { key: 'facebook',  href: social.facebook,  Icon: FacebookIcon,  label: 'Facebook',  hoverClass: 'hover:text-blue-600 hover:bg-blue-50' },
    { key: 'twitter',   href: social.twitter,   Icon: TwitterXIcon,  label: 'X / Twitter', hoverClass: 'hover:text-gray-900 hover:bg-gray-100' },
    { key: 'youtube',   href: social.youtube,   Icon: YouTubeIcon,   label: 'YouTube',   hoverClass: 'hover:text-red-600 hover:bg-red-50' },
  ].filter((s) => s.href);

  return (
    <footer className="bg-gray-900 text-gray-400 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-gray-800">

          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <img
                src="/assets/branding/gpt-image-2_creating_a_logo_for_a_business_named_The_Card_Mon_a_trading_card_selling_company-0.jpg"
                alt="The Card Mon"
                className="w-9 h-9 rounded-lg object-cover"
              />
              <span className="text-white font-bold text-base" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
                The Card Mon
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-500 mb-5">
              Premium Pokemon trading cards — singles, sets, and mystery boxes for collectors of every level.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2">
                {socialLinks.map(({ key, href, Icon, label, hoverClass }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 bg-gray-800 transition-all duration-150 ${hoverClass}`}
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Shop</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'All Cards', page: 'catalog' },
                { label: 'Mystery Boxes', page: 'mystery-boxes' },
                { label: 'Sell Cards', page: 'sell' },
              ].map(({ label, page }) => (
                <li key={page}>
                  <button
                    onClick={() => onNavigate(page)}
                    className="hover:text-white transition-colors"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'About Us', page: 'about' },
                { label: 'Contact', page: 'contact' },
                { label: 'FAQ', page: 'faq' },
              ].map(({ label, page }) => (
                <li key={page}>
                  <button
                    onClick={() => onNavigate(page)}
                    className="hover:text-white transition-colors"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'Shipping & Returns', page: 'shipping' },
                { label: 'Track My Order', page: 'orders' },
                { label: 'My Account', page: 'account' },
              ].map(({ label, page }) => (
                <li key={page}>
                  <button
                    onClick={() => onNavigate(page)}
                    className="hover:text-white transition-colors"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>&copy; {new Date().getFullYear()} The Card Mon. All rights reserved.</p>
          <p>Pokemon and all related names are trademarks of Nintendo / Game Freak.</p>
        </div>
      </div>
    </footer>
  );
}
