import { Truck, RotateCcw, Package, Clock, Globe, AlertCircle, CheckCircle } from 'lucide-react';

interface ShippingReturnsPageProps {
  onNavigate: (page: string) => void;
}

export default function ShippingReturnsPage({ onNavigate }: ShippingReturnsPageProps) {
  const sectionHead = 'text-xl font-bold text-gray-900 mb-5';
  const subHead = 'font-semibold text-gray-800 text-sm mb-2';
  const body = 'text-sm text-gray-600 leading-relaxed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gray-950 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-3">Policies</p>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
          >
            Shipping & Returns
          </h1>
          <p className="text-gray-400 text-base max-w-xl leading-relaxed">
            We want every purchase to be worry-free. Here's everything you need to know about
            how we ship and what happens if something isn't right.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">

        {/* Shipping overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Truck, title: 'Free Shipping', desc: 'On every order, every time. No minimum spend required.' },
            { icon: Clock, title: '3–7 Business Days', desc: 'Domestic US delivery. Tracking included on all orders.' },
            { icon: Globe, title: 'Ships Worldwide', desc: 'International delivery in 7–21 business days.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm text-center">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1.5">{title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Shipping policy */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className={sectionHead} style={{ fontFamily: 'Rajdhani, Inter, sans-serif', margin: 0 }}>
              Shipping Policy
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className={subHead}>Processing Time</h3>
              <p className={body}>
                Orders are processed and dispatched within 1–2 business days of payment confirmation
                (Monday–Friday, excluding public holidays). You will receive a tracking number by
                email once your order ships.
              </p>
            </div>

            <div>
              <h3 className={subHead}>Domestic Shipping (United States)</h3>
              <div className="border border-gray-100 rounded-xl overflow-hidden mt-2">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estimated Delivery</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-gray-800">Standard (USPS First Class)</td>
                      <td className="px-4 py-3 text-gray-600">3–7 business days</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">Free</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-800">Priority (USPS Priority Mail)</td>
                      <td className="px-4 py-3 text-gray-600">1–3 business days</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">Free</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className={subHead}>International Shipping</h3>
              <p className={body}>
                We ship to most countries worldwide via USPS International or equivalent. Delivery
                times are 7–21 business days. International buyers are responsible for any customs
                duties, import taxes, or fees imposed by their country — these are not included in
                the order total and are outside our control.
              </p>
            </div>

            <div>
              <h3 className={subHead}>Packaging</h3>
              <p className={body}>
                Cards are individually sleeved, placed in a rigid penny sleeve and toploader, wrapped
                in a team bag, and sealed in a padded rigid mailer. For orders with multiple cards,
                each card is protected individually before being boxed together. We do not cut corners
                on packaging.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                The Card Mon is not responsible for delays caused by carrier issues, customs, or
                circumstances beyond our control (weather, public holidays, etc.).
              </p>
            </div>
          </div>
        </div>

        {/* Returns policy */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className={sectionHead} style={{ fontFamily: 'Rajdhani, Inter, sans-serif', margin: 0 }}>
              Return Policy
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className={subHead}>14-Day Return Window</h3>
              <p className={body}>
                We accept returns within 14 days of the delivery date. To be eligible for a return,
                the card must be in its original condition as received and in its original protective
                packaging. Cards that have been damaged, repackaged, or tampered with cannot be returned.
              </p>
            </div>

            <div>
              <h3 className={subHead}>How to Start a Return</h3>
              <ol className="list-none space-y-2">
                {[
                  'Visit the Contact page and submit a return request with your order ID.',
                  'We\'ll review your request and respond within 1 business day.',
                  'We\'ll email you a prepaid USPS return shipping label at no cost to you.',
                  'Pack the card securely in its original toploader/packaging and drop it off.',
                  'Once we receive and inspect the card, we issue your refund within 2–5 business days.',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-600 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className={subHead}>Damaged on Arrival</h3>
              <p className={body}>
                If your card arrives damaged — whether from a packaging failure or carrier mishandling —
                photograph the damage and the packaging immediately and contact us within 48 hours
                of delivery. We will issue a full refund or send a replacement at no cost, and file
                a claim with the carrier on your behalf.
              </p>
            </div>

            <div>
              <h3 className={subHead}>Authentication Guarantee</h3>
              <p className={body}>
                If you believe a card you received is not authentic, contact us immediately with photos.
                If we confirm it is not genuine (which has never happened, but we stand behind this policy),
                we will issue a full refund and cover all return shipping. No questions asked.
              </p>
            </div>

            <div>
              <h3 className={subHead}>Non-Returnable Items</h3>
              <ul className="space-y-1.5">
                {[
                  'Cards that have been removed from their toploader or sleeve',
                  'Cards purchased in "Good" or "Lightly Played" condition (condition as described)',
                  'Sealed products once opened',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0 mt-1.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Refunds */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <h2 className={sectionHead} style={{ fontFamily: 'Rajdhani, Inter, sans-serif', margin: 0 }}>
              Refunds
            </h2>
          </div>
          <div className="space-y-4">
            <p className={body}>
              Approved refunds are processed back to your original payment method within 2–5 business
              days of us receiving the returned card. Depending on your bank or card issuer, the credit
              may take an additional 3–7 business days to appear on your statement.
            </p>
            <p className={body}>
              We do not charge restocking fees. You will receive 100% of the purchase price back,
              with no deductions.
            </p>
          </div>
        </div>

        {/* Packaging detail */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className={sectionHead} style={{ fontFamily: 'Rajdhani, Inter, sans-serif', margin: 0 }}>
              Packaging Standards
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { step: '1', title: 'Card Sleeve', desc: 'Every card enters a soft penny sleeve to protect surface and edges.' },
              { step: '2', title: 'Rigid Toploader', desc: 'A hard 3×4 toploader locks the card rigid and prevents bending.' },
              { step: '3', title: 'Team Bag', desc: 'The toploader is sealed in a resealable team bag to prevent moisture.' },
              { step: '4', title: 'Rigid Mailer', desc: 'Everything goes into a padded rigid mailer that cannot be folded by carriers.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-4 bg-gray-50 rounded-xl p-4">
                <div className="w-7 h-7 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                  {step}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm mb-1">{title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gray-950 rounded-2xl p-8 text-center">
          <h3
            className="text-xl font-bold text-white mb-2"
            style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
          >
            Have a specific question?
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Our support team is here to help with any shipping or return situation.
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
