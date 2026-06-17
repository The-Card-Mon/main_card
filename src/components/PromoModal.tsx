import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ModalCard } from './admin/AdminModal';

interface PromoModalProps {
  onNavigate: (page: string) => void;
}

const SESSION_KEY = 'tcm_promo_dismissed';

export default function PromoModal({ onNavigate }: PromoModalProps) {
  const [config, setConfig] = useState<null | {
    enabled: boolean;
    title: string;
    body_text: string;
    bg_image_url: string;
    button_enabled: boolean;
    button_text: string;
    button_page: string;
  }>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    (async () => {
      const { data } = await supabase
        .from('modal_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (data?.enabled) {
        setConfig(data);
        // Small delay so the page loads first
        setTimeout(() => setVisible(true), 700);
      }
    })();
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, '1');
  };

  if (!visible || !config) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalCard config={config} onClose={dismiss} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
