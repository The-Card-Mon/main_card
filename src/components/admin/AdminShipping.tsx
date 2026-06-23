import { useState } from 'react';
import {
  Truck, Loader2, CheckCircle, AlertTriangle, Zap, ExternalLink, Key, RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface SSRate {
  serviceName: string;
  serviceCode: string;
  carrierCode: string;
  shipmentCost: number;
  otherCost: number;
}

async function callShipStation(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/shipstation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify(body),
  });
  return { res, data: await res.json() };
}

export default function AdminShipping() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [sampleRates, setSampleRates] = useState<SSRate[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const doFetchRates = async (setLoader: (v: boolean) => void) => {
    setLoader(true);
    try {
      const { res, data } = await callShipStation({
        action: 'rates',
        toCity: 'New York',
        toState: 'NY',
        toPostalCode: '10001',
        toCountry: 'US',
        items: [{ quantity: 1 }],
      });
      if (!res.ok || data.error) {
        setTestResult({ ok: false, message: data.error ?? 'Connection failed' });
        setSampleRates([]);
      } else {
        const rates = (data.rates ?? []) as SSRate[];
        setSampleRates(rates.slice(0, 8).sort((a: SSRate, b: SSRate) => (a.shipmentCost + a.otherCost) - (b.shipmentCost + b.otherCost)));
        setTestResult({ ok: true, message: `Connected! ${rates.length} carrier service${rates.length === 1 ? '' : 's'} available.` });
      }
    } catch (err: unknown) {
      setTestResult({ ok: false, message: (err as Error).message });
    } finally {
      setLoader(false);
    }
  };

  const handleTest = () => {
    setSampleRates([]);
    setTestResult(null);
    doFetchRates(setTesting);
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      <div className="mb-2">
        <h2 className="text-lg font-bold text-gray-900">Shipping</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          ShipStation provides live carrier rates at checkout and label generation from the Orders page.
        </p>
      </div>

      {/* Header banner */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-2xl p-5 flex gap-4">
        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 border border-gray-200">
          <Truck className="w-6 h-6 text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 mb-1">ShipStation Integration</h3>
          <p className="text-sm text-gray-600 mb-3">
            Live carrier rates are shown to customers at checkout. Create labels and auto-fill tracking numbers from the Orders page.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://ship.shipstation.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              ShipStation Dashboard
            </a>
            <a
              href="https://www.shipstation.com/docs/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              API Docs
            </a>
          </div>
        </div>
      </div>

      {/* Connection test */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-gray-500" />
          <h4 className="font-semibold text-gray-900 text-sm">Connection Status</h4>
        </div>
        <p className="text-sm text-gray-500">
          Your ShipStation API key is configured in the edge function environment. Click below to verify live carrier access.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {testResult && (
            <div className={`flex items-center gap-2 text-sm font-medium ${testResult.ok ? 'text-green-700' : 'text-red-600'}`}>
              {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Sample rates preview */}
      {sampleRates.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">Available Carrier Services</h4>
              <p className="text-xs text-gray-500 mt-0.5">Sample rates — NYC 10001 · 1 card · ~2 oz</p>
            </div>
            <button
              onClick={() => doFetchRates(setRefreshing)}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-2">
            {sampleRates.map((rate) => (
              <div key={`${rate.carrierCode}-${rate.serviceCode}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{rate.serviceName}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{rate.carrierCode}</p>
                </div>
                <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                  ${(rate.shipmentCost + rate.otherCost).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-4">
        <h4 className="font-semibold text-gray-700 text-sm">How it works</h4>
        <div className="space-y-2.5">
          {[
            { label: 'At checkout', desc: 'Live rates are fetched from ShipStation when the customer enters their ZIP code. They pick a service before paying.' },
            { label: 'In Orders', desc: 'Open any order → click "ShipStation" to create a label for the selected service. Tracking is auto-filled.' },
            { label: 'Carriers', desc: 'Any carrier connected to your ShipStation account (USPS, UPS, FedEx, etc.) appears automatically.' },
          ].map(({ label, desc }, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
