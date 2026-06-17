import { Shield, Award, Truck, Users, CheckCircle, Star } from 'lucide-react';

interface AboutPageProps {
  onNavigate: (page: string) => void;
}

export default function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-amber-500/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-3">Our Story</p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
            style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
          >
            The Home of
            <br />
            <span className="bg-gradient-to-r from-red-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
              Premium Pokemon Cards
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
            The Card Mon was built by collectors, for collectors. We exist to make
            acquiring authenticated, condition-graded Pokemon cards simple,
            transparent, and trustworthy.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: '10,000+', label: 'Cards in Catalog' },
              { value: '5,000+', label: 'Happy Collectors' },
              { value: '100%', label: 'Authenticated' },
              { value: '4.9★', label: 'Average Rating' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div
                  className="text-3xl font-bold text-gray-900 mb-1"
                  style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
                >
                  {value}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-3">Our Mission</p>
              <h2
                className="text-3xl font-bold text-gray-900 mb-5 leading-tight"
                style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
              >
                Authenticity First. Always.
              </h2>
              <p className="text-gray-600 mb-5 leading-relaxed">
                Counterfeit cards have plagued the Pokemon community for decades. We got tired of
                collectors being burned by fakes, misrepresented conditions, and shady sellers with
                no accountability.
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Every card on The Card Mon goes through our authentication process before it ever
                appears in the catalog. We check print quality, font consistency, texture, and
                illumination against certified originals. If we have any doubt, it doesn't list.
              </p>
              <ul className="space-y-3">
                {[
                  'Multi-point physical authentication on every card',
                  'Accurate condition grading matched to industry standards',
                  'High-resolution photography from multiple angles',
                  'Sealed in protective toploaders for all shipments',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Shield, title: 'Authentication', desc: 'Physical and digital checks on every single card before listing.' },
                { icon: Award, title: 'Expert Grading', desc: 'Cards graded by experienced collectors using PSA-aligned standards.' },
                { icon: Truck, title: 'Safe Shipping', desc: 'Rigid toploaders, team bags, and tracked postage on every order.' },
                { icon: Users, title: 'Community First', desc: 'Built and trusted by serious collectors across the world.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center mb-3">
                    <Icon className="w-4.5 h-4.5 text-red-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grading guide */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-2">Transparency</p>
            <h2
              className="text-3xl font-bold text-gray-900"
              style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
            >
              How We Grade Conditions
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
              Every card is listed with a condition grade. Here's exactly what each grade means
              so you know what you're getting before you buy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                grade: 'Mint',
                color: 'bg-emerald-50 border-emerald-200',
                badge: 'bg-emerald-500',
                desc: 'Perfect card. Sharp corners, zero scratches, no print defects. As good as the day it was printed.',
              },
              {
                grade: 'Near Mint',
                color: 'bg-green-50 border-green-200',
                badge: 'bg-green-500',
                desc: 'Minimal handling. Possibly one tiny edge nick only visible under close inspection. Excellent for raw display.',
              },
              {
                grade: 'Excellent',
                color: 'bg-blue-50 border-blue-200',
                badge: 'bg-blue-500',
                desc: 'Light play. Small edge wear and possible minor surface marks. Looks great in a sleeve.',
              },
              {
                grade: 'Good',
                color: 'bg-amber-50 border-amber-200',
                badge: 'bg-amber-500',
                desc: 'Moderate wear. Noticeable creases or surface marks. Completely playable; not ideal for grading.',
              },
              {
                grade: 'Lightly Played',
                color: 'bg-orange-50 border-orange-200',
                badge: 'bg-orange-500',
                desc: 'Heavy play wear, scuffs, or minor whitening. Affordable entry to rare cards for gameplay.',
              },
            ].map(({ grade, color, badge, desc }) => (
              <div key={grade} className={`${color} border rounded-2xl p-5`}>
                <div className={`${badge} text-white text-xs font-bold px-2.5 py-1 rounded-full inline-block mb-3`}>
                  {grade}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-widest mb-2">Reviews</p>
            <h2
              className="text-3xl font-bold text-gray-900"
              style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
            >
              What Collectors Say
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                name: 'Marcus T.',
                location: 'Chicago, IL',
                quote: 'Finally a shop that actually grades honestly. Bought a Near Mint Charizard and it was exactly as described — pristine.',
              },
              {
                name: 'Priya S.',
                location: 'Austin, TX',
                quote: 'The authentication guarantee sealed it for me. I\'ve been burned by fakes before, not here. First purchase won\'t be my last.',
              },
              {
                name: 'Daniel K.',
                location: 'Seattle, WA',
                quote: 'Shipping is top tier. Every card arrives in a rigid mailer with a toploader. They clearly care about what they\'re sending.',
              },
            ].map(({ name, location, quote }) => (
              <div key={name} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-4 italic">"{quote}"</p>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{name}</div>
                  <div className="text-xs text-gray-400">{location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-950 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-3xl font-bold text-white mb-4"
            style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
          >
            Ready to Start Collecting?
          </h2>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            Browse thousands of authenticated cards and find the ones that belong in your collection.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onNavigate('catalog')}
              className="bg-red-600 hover:bg-red-500 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-red-900/30"
            >
              Browse the Catalog
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="bg-white/8 hover:bg-white/12 border border-white/15 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all"
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
