import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQPageProps {
  onNavigate: (page: string) => void;
}

const SECTIONS = [
  {
    label: 'Ordering & Payment',
    color: 'text-blue-600',
    items: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex, Discover) processed securely through Stripe. All transactions are encrypted end-to-end.',
      },
      {
        q: 'Is it safe to pay on The Card Mon?',
        a: 'Yes. Payments are handled entirely by Stripe, a PCI-DSS Level 1 certified payment processor. We never store your card details on our servers.',
      },
      {
        q: 'Can I cancel or change an order after placing it?',
        a: 'Orders can be cancelled within 1 hour of placement by contacting us. Once an order has been packed or shipped, we are unable to modify or cancel it. Please double-check your cart before completing checkout.',
      },
      {
        q: 'Will I receive a receipt?',
        a: 'Yes, an order confirmation is recorded under "My Orders" as soon as payment is confirmed. We recommend taking a screenshot or noting your order ID for reference.',
      },
    ],
  },
  {
    label: 'Shipping',
    color: 'text-green-600',
    items: [
      {
        q: 'How long does shipping take?',
        a: 'Domestic US orders typically arrive within 3–7 business days. International orders take 7–21 business days depending on destination and customs. All orders are sent with tracking.',
      },
      {
        q: 'Is shipping free?',
        a: 'Yes — all orders ship free, regardless of order size or destination.',
      },
      {
        q: 'How are cards packaged?',
        a: 'Every card is sleeved, placed in a rigid toploader, wrapped in a team bag, and shipped inside a padded, rigid mailer. We take packaging seriously to ensure cards arrive in the same condition they left us.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Yes. We ship worldwide. International buyers are responsible for any import duties or customs fees imposed by their country. We are not responsible for delays caused by customs.',
      },
      {
        q: 'My order shows delivered but I didn\'t receive it — what should I do?',
        a: 'First, check with neighbors and your local post office. If the package is still missing after 3 business days, contact us with your order ID and we\'ll file a claim with the carrier.',
      },
    ],
  },
  {
    label: 'Card Condition & Authentication',
    color: 'text-amber-600',
    items: [
      {
        q: 'How do you grade card conditions?',
        a: 'We use a 5-tier system aligned with industry standards: Mint, Near Mint, Excellent, Good, and Lightly Played. Each grade has strict criteria including corner wear, surface marks, and print quality. Full descriptions are available on our About page.',
      },
      {
        q: 'How do you verify authenticity?',
        a: 'Every card is inspected under magnification and lighting for print quality, font consistency, card thickness, texture, and the signature "light test." Cards failing any check are rejected and never listed.',
      },
      {
        q: 'Are PSA or CGC graded cards available?',
        a: 'Select high-value listings include professional PSA or CGC grades. This is noted in the product description. Ungraded cards carry our own in-house condition assessment.',
      },
      {
        q: 'What if I believe my card is counterfeit?',
        a: 'Contact us immediately with photos. If we determine it is a fake, we will issue a full refund and cover return shipping. Our authentication guarantee means you are never out of pocket for a counterfeit.',
      },
    ],
  },
  {
    label: 'Selling Cards',
    color: 'text-purple-600',
    items: [
      {
        q: 'How do I sell my cards on The Card Mon?',
        a: 'Visit the "Sell Cards" page and submit a listing with photos, card details, and your asking price. Our team reviews every submission typically within 1–3 business days and will send an offer if we\'re interested.',
      },
      {
        q: 'What types of cards do you buy?',
        a: 'We purchase all official Pokemon TCG cards in any condition, with priority given to holo rares, ex/GX/V cards, first editions, and graded slabs. We also buy bulk lots — just describe your collection.',
      },
      {
        q: 'How is my offer determined?',
        a: 'Offers are based on current TCGPlayer market prices, condition, and demand. We aim to be fair and competitive. You\'ll see a breakdown when we make an offer.',
      },
      {
        q: 'How do I get paid after accepting an offer?',
        a: 'Once you accept an offer and ship the cards to us (we cover shipping), payment is released within 2 business days of us receiving and verifying the cards. Payment is sent via PayPal or bank transfer.',
      },
    ],
  },
  {
    label: 'Returns & Refunds',
    color: 'text-red-600',
    items: [
      {
        q: 'What is your return policy?',
        a: 'We accept returns within 14 days of delivery. Cards must be returned in the same condition they were received, in the original packaging. See our Shipping & Returns page for full details.',
      },
      {
        q: 'What if my card arrives damaged?',
        a: 'Photograph the damage immediately, including the packaging, and contact us within 48 hours of delivery. We will issue a full refund or replacement at no cost to you.',
      },
      {
        q: 'How do I start a return?',
        a: 'Email us from the Contact page with your order ID and reason for return. We\'ll send a prepaid return label within 1 business day.',
      },
      {
        q: 'When will I receive my refund?',
        a: 'Refunds are processed within 2–5 business days of us receiving the returned card. The credit appears on your statement depending on your bank, typically within 3–7 days.',
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-900 leading-snug">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        )}
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function FAQPage({ onNavigate }: FAQPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gray-950 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-3">Help Center</p>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
          >
            Frequently Asked Questions
          </h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Everything you need to know about buying, selling, and collecting with The Card Mon.
            Can't find an answer?{' '}
            <button
              onClick={() => onNavigate('contact')}
              className="text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
            >
              Contact us
            </button>{' '}
            and we'll help.
          </p>
        </div>
      </section>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {SECTIONS.map(({ label, color, items }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className={`font-bold text-base ${color}`}>{label}</h2>
            </div>
            <div className="px-6">
              {items.map(({ q, a }) => (
                <FAQItem key={q} q={q} a={a} />
              ))}
            </div>
          </div>
        ))}

        {/* Still need help */}
        <div className="bg-gray-950 rounded-2xl p-8 text-center">
          <h3
            className="text-xl font-bold text-white mb-2"
            style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
          >
            Still have questions?
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Our team typically responds within a few hours during business hours.
          </p>
          <button
            onClick={() => onNavigate('contact')}
            className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-900/30"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
