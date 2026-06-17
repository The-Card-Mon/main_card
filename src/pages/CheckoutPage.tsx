import { useState, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { ArrowLeft, ArrowRight, CheckCircle, Lock, Package, ShoppingBag } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const STRIPE_KEY = 'pk_live_51TgD1JKG4lPUYddupc0dnUE02tO1ZVrI4aBZpH7XvyGSgyAb0BDPldF6CtJUgEUKrghu65kTuVYK48ZLDrezbdbd000rpgHH4Z';

interface ShippingData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const EMPTY_SHIPPING: ShippingData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
};

// ─── Order Summary sidebar ──────────────────────────────────────────────────

function OrderSummary() {
  const { items, totalPrice } = useCart();
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 sticky top-24">
      <h3 className="font-bold text-gray-900 text-base mb-4">Order Summary</h3>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex-shrink-0 overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Package className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 leading-snug truncate">{product.name}</p>
              <p className="text-xs text-gray-400">×{quantity}</p>
            </div>
            <p className="text-sm font-bold text-gray-900 flex-shrink-0">
              ${(product.price * quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-semibold text-gray-900">${totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Shipping</span>
          <span className="font-semibold text-green-600">Free</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-3 mt-1">
          <span className="font-bold text-gray-900">Total</span>
          <span className="font-bold text-gray-900 text-lg" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
            ${totalPrice.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Shipping Form ───────────────────────────────────────────────────

interface ShippingFormProps {
  shipping: ShippingData;
  onChange: (data: ShippingData) => void;
  onContinue: () => void;
  loading: boolean;
  onNavigate: (page: string) => void;
}

function ShippingForm({ shipping, onChange, onContinue, loading, onNavigate }: ShippingFormProps) {
  const set = (field: keyof ShippingData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...shipping, [field]: e.target.value });

  const valid =
    shipping.firstName.trim() &&
    shipping.lastName.trim() &&
    shipping.email.trim() &&
    shipping.address1.trim() &&
    shipping.city.trim() &&
    shipping.state.trim() &&
    shipping.zip.trim();

  const fieldClass =
    'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white transition-colors placeholder-gray-400';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

  return (
    <div>
      <button
        onClick={() => onNavigate('cart')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to cart
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
        Contact & Shipping
      </h2>

      <div className="space-y-5">
        {/* Contact */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Contact</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelClass}>First Name</label>
              <input value={shipping.firstName} onChange={set('firstName')} placeholder="John" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Last Name</label>
              <input value={shipping.lastName} onChange={set('lastName')} placeholder="Doe" className={fieldClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={shipping.email} onChange={set('email')} placeholder="john@example.com" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Phone (optional)</label>
              <input type="tel" value={shipping.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" className={fieldClass} />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Shipping Address</p>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Address Line 1</label>
              <input value={shipping.address1} onChange={set('address1')} placeholder="123 Main St" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Address Line 2 (optional)</label>
              <input value={shipping.address2} onChange={set('address2')} placeholder="Apt, suite, unit, etc." className={fieldClass} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className={labelClass}>City</label>
                <input value={shipping.city} onChange={set('city')} placeholder="New York" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input value={shipping.state} onChange={set('state')} placeholder="NY" maxLength={2} className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>ZIP</label>
                <input value={shipping.zip} onChange={set('zip')} placeholder="10001" className={fieldClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <select value={shipping.country} onChange={set('country')} className={fieldClass}>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="JP">Japan</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={!valid || loading}
        className="mt-8 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-red-900/20"
      >
        {loading ? (
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <>
            Continue to Payment
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}

// ─── Step 2: Payment Form (inner — uses Stripe hooks) ───────────────────────

interface PaymentFormInnerProps {
  shipping: ShippingData;
  totalPrice: number;
  onBack: () => void;
  onSuccess: (paymentIntentId: string) => void;
}

function PaymentFormInner({ shipping, totalPrice, onBack, onSuccess }: PaymentFormInnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);
  const [elementError, setElementError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMsg(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
        payment_method_data: {
          billing_details: {
            name: `${shipping.firstName} ${shipping.lastName}`,
            email: shipping.email,
            phone: shipping.phone || undefined,
            address: {
              line1: shipping.address1,
              line2: shipping.address2 || undefined,
              city: shipping.city,
              state: shipping.state,
              postal_code: shipping.zip,
              country: shipping.country,
            },
          },
        },
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMsg(error.message ?? 'Payment failed. Please try again.');
      setProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setErrorMsg('Unexpected payment status. Please contact support.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to shipping
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
        Payment
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Shipping to {shipping.firstName} {shipping.lastName} · {shipping.city}, {shipping.state}
      </p>

      <div className="border border-gray-200 rounded-xl p-4 bg-white min-h-[120px] relative">
        {!elementReady && !elementError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full" />
          </div>
        )}
        {elementError && (
          <div className="text-sm text-red-600 py-4 text-center">{elementError}</div>
        )}
        <PaymentElement
          onReady={() => setElementReady(true)}
          onLoadError={(e) => setElementError((e as { error?: { message?: string } }).error?.message ?? 'Failed to load payment form. Please refresh and try again.')}
          options={{ layout: 'tabs' }}
        />
      </div>

      {errorMsg && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
        <Lock className="w-3 h-3" />
        <span>Payments are secured and encrypted by Stripe</span>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing || !elementReady}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-red-900/20"
      >
        {processing ? (
          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Pay ${totalPrice.toFixed(2)}
          </>
        )}
      </button>
    </form>
  );
}

// ─── Confirmation Screen ─────────────────────────────────────────────────────

function ConfirmationScreen({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-green-100">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
          Order Confirmed!
        </h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Payment received. We'll pack your cards with care and ship them with tracking — check your orders page for updates.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => onNavigate('orders')}
            className="bg-gray-900 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all"
          >
            View My Orders
          </button>
          <button
            onClick={() => onNavigate('catalog')}
            className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md shadow-red-900/20"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main CheckoutPage ───────────────────────────────────────────────────────

export default function CheckoutPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState<'shipping' | 'payment' | 'done'>('shipping');
  const [shipping, setShipping] = useState<ShippingData>({
    ...EMPTY_SHIPPING,
    email: user?.email ?? '',
  });
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const stripePromise = useMemo(() => loadStripe(STRIPE_KEY ?? ''), []);
  const stripeOptions = useMemo(
    () => clientSecret ? { clientSecret, appearance: { theme: 'stripe' as const } } : undefined,
    [clientSecret]
  );

  if (items.length === 0 && step !== 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6 text-sm">Add some cards before checking out.</p>
          <button
            onClick={() => onNavigate('catalog')}
            className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all"
          >
            Browse Catalog
          </button>
        </div>
      </div>
    );
  }

  if (confirmed) return <ConfirmationScreen onNavigate={onNavigate} />;

  const handleContinueToPayment = async () => {
    setLoadingIntent(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { onNavigate('auth'); return; }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create payment intent');

      setClientSecret(data.client_secret);
      setStep('payment');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoadingIntent(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!user) return;
    const shippingAddress = [
      shipping.address1,
      shipping.address2,
      `${shipping.city}, ${shipping.state} ${shipping.zip}`,
      shipping.country,
    ].filter(Boolean).join(', ');

    try {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total: totalPrice,
          shipping_address: shippingAddress,
          status: 'pending',
          stripe_payment_intent_id: paymentIntentId,
          payment_status: 'paid',
        })
        .select()
        .single();

      if (orderErr || !order) throw orderErr ?? new Error('Failed to record order');

      await supabase.from('order_items').insert(
        items.map((i) => ({
          order_id: order.id,
          product_id: i.product.id,
          quantity: i.quantity,
          price: i.product.price,
        }))
      );

      clearCart();
      setStep('done');
      setConfirmed(true);
    } catch {
      alert('Payment succeeded but failed to save order. Please contact support.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Rajdhani, Inter, sans-serif' }}>
            Checkout
          </h1>
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            <span className={`font-semibold ${step === 'shipping' ? 'text-red-600' : 'text-gray-400'}`}>
              1. Shipping
            </span>
            <span className="text-gray-300">→</span>
            <span className={`font-semibold ${step === 'payment' ? 'text-red-600' : 'text-gray-400'}`}>
              2. Payment
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left: active step */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            {step === 'shipping' && (
              <ShippingForm
                shipping={shipping}
                onChange={setShipping}
                onContinue={handleContinueToPayment}
                loading={loadingIntent}
                onNavigate={onNavigate}
              />
            )}
            {step === 'payment' && clientSecret && stripeOptions && (
              <Elements stripe={stripePromise} options={stripeOptions}>
                <PaymentFormInner
                  shipping={shipping}
                  totalPrice={totalPrice}
                  onBack={() => setStep('shipping')}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            )}
          </div>

          {/* Right: order summary */}
          <div className="lg:col-span-2">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
