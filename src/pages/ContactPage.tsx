import { useState } from 'react';
import { Mail, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ContactPageProps {
  onNavigate: (page: string) => void;
}

const SUBJECTS = [
  'Order issue',
  'Return / refund request',
  'Shipping question',
  'Card authentication question',
  'Selling my cards',
  'Account help',
  'Other',
];

export default function ContactPage({ onNavigate }: ContactPageProps) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const valid = form.name.trim() && form.email.trim() && form.subject && form.message.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);

    const { data: inserted, error: dbErr } = await supabase
      .from('contact_submissions')
      .insert({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject,
        message: form.message.trim(),
      })
      .select('id')
      .single();

    if (dbErr) {
      setError('Something went wrong. Please try again or email us directly.');
      setSubmitting(false);
      return;
    }

    // Auto-create a support ticket for every contact form submission
    await supabase.rpc('create_support_ticket', {
      p_subject: form.subject,
      p_customer_name: form.name.trim(),
      p_customer_email: form.email.trim(),
      p_message: form.message.trim(),
      p_source: 'contact_form',
      p_contact_submission_id: inserted?.id ?? null,
    });

    setSent(true);
    setSubmitting(false);
  };

  const fieldClass =
    'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white transition-colors placeholder-gray-400';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2
            className="text-2xl font-bold text-gray-900 mb-2"
            style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
          >
            Message Sent!
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-7">
            We've received your message and will get back to you within a few hours during
            business hours (Mon–Fri, 9am–6pm ET).
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onNavigate('home')}
              className="bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold text-sm transition-all"
            >
              Back to Home
            </button>
            <button
              onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
              className="text-gray-500 hover:text-gray-700 text-sm transition-colors py-2"
            >
              Send another message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gray-950 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-3">Support</p>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
          >
            Get in Touch
          </h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-xl">
            Have a question, need help with an order, or want to discuss selling your collection?
            We're here for you.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Contact info sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2
                className="text-base font-bold text-gray-900 mb-5"
                style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
              >
                Contact Info
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Email</div>
                    <div className="text-sm text-gray-800">support@thecardmon.com</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Response Time</div>
                    <div className="text-sm text-gray-800">Within a few hours</div>
                    <div className="text-xs text-gray-400">Mon–Fri, 9am–6pm ET</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Best For</div>
                    <div className="text-sm text-gray-800">Orders, returns, selling</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 text-sm mb-3">Quick Links</h3>
              <div className="space-y-2">
                {[
                  { label: 'View FAQ', page: 'faq' },
                  { label: 'Shipping & Returns', page: 'shipping' },
                  { label: 'My Orders', page: 'orders' },
                  { label: 'Sell Cards', page: 'sell' },
                ].map(({ label, page }) => (
                  <button
                    key={page}
                    onClick={() => onNavigate(page)}
                    className="w-full text-left text-sm text-red-600 hover:text-red-700 py-1 flex items-center justify-between group"
                  >
                    <span>{label}</span>
                    <span className="text-gray-300 group-hover:text-red-400 transition-colors">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
              <h2
                className="text-base font-bold text-gray-900 mb-6"
                style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}
              >
                Send a Message
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Your Name</label>
                    <input
                      value={form.name}
                      onChange={set('name')}
                      placeholder="John Doe"
                      className={fieldClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="john@example.com"
                      className={fieldClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Subject</label>
                  <select value={form.subject} onChange={set('subject')} className={fieldClass} required>
                    <option value="">Select a topic...</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Message</label>
                  <textarea
                    value={form.message}
                    onChange={set('message')}
                    placeholder="Describe your question or issue in as much detail as possible. Include your order ID if relevant."
                    rows={6}
                    className={`${fieldClass} resize-none`}
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!valid || submitting}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-red-900/20"
                >
                  {submitting ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
