import { useEffect, useState, useMemo } from 'react';
import {
  Search, X, Clock, AlertCircle, Truck, CheckCircle, ChevronRight,
  Package, MapPin, Calendar, DollarSign, Trash2, RotateCcw, Loader2,
  AlertTriangle, XCircle, Save, Zap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface OrderWithItems {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
  total: number;
  tax_amount: number;
  shipping_address: string | null;
  shipping_method_name: string | null;
  shipping_cost: number;
  tracking_number: string | null;
  tracking_carrier: string | null;
  shipped_at: string | null;
  created_at: string;
  stripe_payment_intent_id: string | null;
  stripe_refund_id: string | null;
  order_items: {
    id: string;
    quantity: number;
    price: number;
    product_id: string;
    product?: { name: string; image_url: string | null; card_type: string | null };
  }[];
}

const STATUS = {
  pending:    { icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  label: 'Pending' },
  processing: { icon: AlertCircle,   color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   label: 'Processing' },
  shipped:    { icon: Truck,         color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Shipped' },
  delivered:  { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200',  label: 'Delivered' },
  refunded:   { icon: RotateCcw,     color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    label: 'Refunded' },
  cancelled:  { icon: XCircle,       color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200',   label: 'Cancelled' },
} as const;

const STATUS_ORDER = ['pending', 'processing', 'shipped', 'delivered'] as const;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS[status as keyof typeof STATUS] ?? STATUS.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

interface EasyShipRate {
  courier_service_id: string;
  courier_name: string;
  service_name: string;
  total_charge: number;
  currency: string;
  min_delivery_time: number;
  max_delivery_time: number;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Refund state
  const [refundTarget, setRefundTarget] = useState<OrderWithItems | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [refundMsg, setRefundMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<OrderWithItems | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Tracking state
  const [trackingNum, setTrackingNum] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);
  const [trackingMsg, setTrackingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // EasyShip state
  const [easyshipOpen, setEasyshipOpen] = useState(false);
  const [easyshipRates, setEasyshipRates] = useState<EasyShipRate[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [creatingShipment, setCreatingShipment] = useState<string | null>(null);
  const [shipmentMsg, setShipmentMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { fetchOrders(); }, []);

  const openOrder = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setTrackingNum(order.tracking_number ?? '');
    setTrackingCarrier(order.tracking_carrier ?? '');
    setTrackingMsg(null);
    setEasyshipOpen(false);
    setEasyshipRates([]);
    setRatesError(null);
    setShipmentMsg(null);
  };

  const saveTracking = async () => {
    if (!selectedOrder) return;
    setSavingTracking(true);
    setTrackingMsg(null);
    const { error } = await supabase
      .from('orders')
      .update({
        tracking_number: trackingNum.trim() || null,
        tracking_carrier: trackingCarrier.trim() || null,
        shipped_at: trackingNum.trim() ? (selectedOrder.shipped_at ?? new Date().toISOString()) : null,
      })
      .eq('id', selectedOrder.id);
    if (error) {
      setTrackingMsg({ type: 'error', text: error.message });
    } else {
      setTrackingMsg({ type: 'success', text: 'Tracking info saved.' });
      await fetchOrders();
      setSelectedOrder((prev) =>
        prev ? { ...prev, tracking_number: trackingNum.trim() || null, tracking_carrier: trackingCarrier.trim() || null } : null
      );
      setTimeout(() => setTrackingMsg(null), 2500);
    }
    setSavingTracking(false);
  };

  const callEasyship = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/easyship`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    });
    return { res, data: await res.json() };
  };

  const fetchEasyshipRates = async (order: OrderWithItems) => {
    setLoadingRates(true);
    setRatesError(null);
    setEasyshipRates([]);
    try {
      // Parse address: "123 Main St, New York, NY 10001, US"
      const parts = (order.shipping_address ?? '').split(', ');
      const address = parts[0] ?? '';
      const cityStateZip = parts[2] ?? '';
      const [city, stateZip] = cityStateZip.split(', ');
      const [state, zip] = (stateZip ?? '').split(' ');
      const country = parts[3] ?? 'US';

      const items = order.order_items.map((item) => ({
        description: item.product?.name ?? 'Pokemon Card',
        quantity: item.quantity,
        value: item.price,
      }));

      const { res, data } = await callEasyship({
        action: 'rates',
        destination_country_alpha2: country.length === 2 ? country : 'US',
        destination_city: city ?? '',
        destination_state: state ?? '',
        destination_postal_code: zip ?? '',
        items,
      });

      if (!res.ok || data.error) {
        setRatesError(data.error ?? 'Failed to fetch rates');
      } else {
        setEasyshipRates(data.rates ?? []);
      }
    } catch (err: any) {
      setRatesError(err.message);
    } finally {
      setLoadingRates(false);
    }
  };

  const createEasyshipShipment = async (order: OrderWithItems, rate: EasyShipRate) => {
    setCreatingShipment(rate.courier_service_id);
    setShipmentMsg(null);
    try {
      const parts = (order.shipping_address ?? '').split(', ');
      const address = parts[0] ?? '';
      const cityStateZip = parts[2] ?? '';
      const [city, stateZip] = cityStateZip.split(', ');
      const [state, zip] = (stateZip ?? '').split(' ');
      const country = parts[3] ?? 'US';

      const items = order.order_items.map((item) => ({
        description: item.product?.name ?? 'Pokemon Card',
        quantity: item.quantity,
        value: item.price,
      }));

      const { res, data } = await callEasyship({
        action: 'create_shipment',
        order_id: order.id,
        destination_name: 'Customer',
        destination_address: address,
        destination_city: city ?? '',
        destination_state: state ?? '',
        destination_postal_code: zip ?? '',
        destination_country_alpha2: country.length === 2 ? country : 'US',
        courier_service_id: rate.courier_service_id,
        items,
      });

      if (!res.ok || data.error) {
        setShipmentMsg({ type: 'error', text: data.error ?? 'Failed to create shipment' });
      } else {
        const trackNum = data.shipment?.tracking_number ?? data.shipment?.easyship_shipment_id ?? '';
        const carrier = data.shipment?.selected_courier?.name ?? rate.courier_name;
        setTrackingNum(trackNum);
        setTrackingCarrier(carrier);
        setShipmentMsg({ type: 'success', text: `Shipment created via ${carrier}! Tracking auto-filled below.` });
        setEasyshipOpen(false);
        await fetchOrders();
        setSelectedOrder((prev) => prev
          ? { ...prev, tracking_number: trackNum, tracking_carrier: carrier }
          : null
        );
      }
    } catch (err: any) {
      setShipmentMsg({ type: 'error', text: err.message });
    } finally {
      setCreatingShipment(null);
    }
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(name, image_url, card_type))')
      .order('created_at', { ascending: false });
    setOrders((data as OrderWithItems[]) ?? []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let r = [...orders];
    if (search) {
      const s = search.toLowerCase();
      r = r.filter((o) => o.id.toLowerCase().includes(s) || o.user_id.toLowerCase().includes(s));
    }
    if (filterStatus) r = r.filter((o) => o.status === filterStatus);
    return r;
  }, [orders, search, filterStatus]);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    await supabase.from('orders').update({ status }).eq('id', orderId);
    await fetchOrders();
    setUpdating(null);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => prev ? { ...prev, status } : null);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    setRefundMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/refund-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ order_id: refundTarget.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Refund failed');
      setRefundMsg({ type: 'success', text: `Refund issued — Stripe ID: ${data.refund_id}` });
      await fetchOrders();
      setTimeout(() => { setRefundTarget(null); setRefundMsg(null); }, 2500);
    } catch (err: any) {
      setRefundMsg({ type: 'error', text: err.message });
    } finally {
      setRefunding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('orders').delete().eq('id', deleteTarget.id);
    setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
    if (selectedOrder?.id === deleteTarget.id) setSelectedOrder(null);
    setDeleteTarget(null);
    setDeleting(false);
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => { counts[o.status] = (counts[o.status] ?? 0) + 1; });
    return counts;
  }, [orders]);

  const isRefundable = (o: OrderWithItems) =>
    o.payment_status === 'paid' && !!o.stripe_payment_intent_id && o.status !== 'refunded';

  return (
    <div className="p-6 lg:p-8 space-y-5">
      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${!filterStatus ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
        >
          All <span className="ml-1 opacity-60">{orders.length}</span>
        </button>
        {Object.entries(STATUS).map(([s, cfg]) => {
          const Icon = cfg.icon;
          const count = statusCounts[s] ?? 0;
          if (count === 0 && !['pending','processing','shipped','delivered'].includes(s)) return null;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s === filterStatus ? '' : s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filterStatus === s ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
              {count > 0 && <span className="ml-0.5 opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => openOrder(order)}>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold font-mono text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[120px]">{order.user_id.slice(0, 12)}...</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex -space-x-2">
                        {order.order_items.slice(0, 3).map((item, i) => (
                          <div key={i} className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white overflow-hidden flex-shrink-0">
                            {item.product?.image_url ? <img src={item.product.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-3 h-3 text-gray-400" /></div>}
                          </div>
                        ))}
                        {order.order_items.length > 3 && <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500 font-medium">+{order.order_items.length - 3}</div>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-gray-900">${Number(order.total).toFixed(2)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={order.status} /></td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      {order.status !== 'refunded' && order.status !== 'cancelled' ? (
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          disabled={updating === order.id}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                        </select>
                      ) : (
                        <StatusBadge status={order.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">{orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Order detail drawer ────────────────────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 flex-shrink-0">
              <div>
                <p className="font-bold text-gray-900 font-mono">Order #{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-gray-400">{new Date(selectedOrder.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEasyshipOpen((v) => !v);
                    if (!easyshipOpen) fetchEasyshipRates(selectedOrder);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  EasyShip
                </button>
                {isRefundable(selectedOrder) && (
                  <button
                    onClick={() => { setRefundTarget(selectedOrder); setSelectedOrder(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Refund
                  </button>
                )}
                <button
                  onClick={() => { setDeleteTarget(selectedOrder); setSelectedOrder(null); }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete order"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setSelectedOrder(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Status pipeline */}
              <div className="px-6 pt-5 pb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order Status</p>
                {selectedOrder.status === 'refunded' || selectedOrder.status === 'cancelled' ? (
                  <div className="mb-4"><StatusBadge status={selectedOrder.status} /></div>
                ) : (
                  <>
                    <div className="flex items-center gap-1 mb-4">
                      {STATUS_ORDER.map((s, i) => {
                        const reached = STATUS_ORDER.indexOf(selectedOrder.status as any) >= i;
                        const cfg = STATUS[s];
                        const Icon = cfg.icon;
                        return (
                          <div key={s} className="flex-1 flex items-center gap-1">
                            <div className={`flex-1 h-1.5 rounded-full transition-colors ${reached ? 'bg-red-500' : 'bg-gray-200'}`} />
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${reached ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-gray-50 border-gray-200 text-gray-300'}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            {i < STATUS_ORDER.length - 1 && <div className={`flex-1 h-1.5 rounded-full transition-colors ${STATUS_ORDER.indexOf(selectedOrder.status as any) > i ? 'bg-red-500' : 'bg-gray-200'}`} />}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 font-medium -mt-1">
                      {STATUS_ORDER.map((s) => <span key={s}>{STATUS[s].label}</span>)}
                    </div>
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Update Status</label>
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                        disabled={!!updating}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-gray-100" />

              {/* Items */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Items ({selectedOrder.order_items.length})</p>
                <div className="space-y-3">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                        {item.product?.image_url ? <img src={item.product.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{item.product?.name ?? 'Unknown Card'}</p>
                        <p className="text-xs text-gray-400">{item.product?.card_type ?? ''} · Qty {item.quantity}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">${item.price.toFixed(2)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* EasyShip panel */}
              {easyshipOpen && (
                <div className="px-6 py-4 space-y-3 bg-blue-50/50">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />EasyShip Rates
                    </p>
                    <button onClick={() => setEasyshipOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>

                  {shipmentMsg && (
                    <div className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border ${shipmentMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {shipmentMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
                      {shipmentMsg.text}
                    </div>
                  )}

                  {loadingRates && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span className="ml-2 text-sm text-blue-600">Fetching live rates...</span>
                    </div>
                  )}

                  {ratesError && (
                    <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Could not fetch rates</p>
                        <p className="mt-0.5 text-red-600">{ratesError}</p>
                        <p className="mt-1 text-gray-500">Make sure EASYSHIP_API_KEY is set in Supabase edge function secrets.</p>
                      </div>
                    </div>
                  )}

                  {!loadingRates && !ratesError && easyshipRates.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-blue-600 font-medium">Select a carrier to create shipment:</p>
                      {easyshipRates.slice(0, 6).map((rate) => (
                        <button
                          key={rate.courier_service_id}
                          onClick={() => createEasyshipShipment(selectedOrder, rate)}
                          disabled={!!creatingShipment}
                          className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left disabled:opacity-60"
                        >
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            {creatingShipment === rate.courier_service_id
                              ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                              : <Truck className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">{rate.courier_name}</p>
                            <p className="text-[10px] text-gray-500">{rate.service_name} · {rate.min_delivery_time}–{rate.max_delivery_time} days</p>
                          </div>
                          <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                            {rate.currency} {Number(rate.total_charge).toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-gray-100" />

              {/* Tracking */}
              <div className="px-6 py-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tracking</p>
                {trackingMsg && (
                  <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${trackingMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {trackingMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
                    {trackingMsg.text}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Carrier</label>
                  <select
                    value={trackingCarrier}
                    onChange={(e) => setTrackingCarrier(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    <option value="">Select carrier...</option>
                    {['USPS', 'UPS', 'FedEx', 'DHL', 'Amazon Logistics', 'OnTrac', 'Other'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tracking Number</label>
                  <input
                    value={trackingNum}
                    onChange={(e) => setTrackingNum(e.target.value)}
                    placeholder="e.g. 9400111899223387623910"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                  />
                </div>
                <button
                  onClick={saveTracking}
                  disabled={savingTracking}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {savingTracking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {savingTracking ? 'Saving...' : 'Save Tracking'}
                </button>
                {selectedOrder.shipped_at && (
                  <p className="text-xs text-gray-400 text-center">
                    Marked shipped {new Date(selectedOrder.shipped_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="border-t border-gray-100" />

              {/* Summary */}
              <div className="px-6 py-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order Summary</p>
                <div className="flex items-center gap-3 text-sm">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Subtotal</span>
                  <span className="ml-auto font-bold text-gray-900">${(Number(selectedOrder.total) - Number(selectedOrder.tax_amount ?? 0) - Number(selectedOrder.shipping_cost ?? 0)).toFixed(2)}</span>
                </div>
                {Number(selectedOrder.shipping_cost) > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <Truck className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{selectedOrder.shipping_method_name ?? 'Shipping'}</span>
                    <span className="ml-auto font-semibold text-gray-700">${Number(selectedOrder.shipping_cost).toFixed(2)}</span>
                  </div>
                )}
                {Number(selectedOrder.shipping_cost) === 0 && selectedOrder.shipping_method_name && (
                  <div className="flex items-center gap-3 text-sm">
                    <Truck className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{selectedOrder.shipping_method_name}</span>
                    <span className="ml-auto font-semibold text-green-600">Free</span>
                  </div>
                )}
                {Number(selectedOrder.tax_amount) > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Tax</span>
                    <span className="ml-auto font-semibold text-gray-700">${Number(selectedOrder.tax_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm border-t border-gray-100 pt-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 font-semibold">Total</span>
                  <span className="ml-auto font-bold text-gray-900 text-base">${Number(selectedOrder.total).toFixed(2)}</span>
                </div>
                {selectedOrder.stripe_refund_id && (
                  <div className="flex items-center gap-3 text-sm">
                    <RotateCcw className="w-4 h-4 text-red-400" />
                    <span className="text-red-600">Refund ID: {selectedOrder.stripe_refund_id.slice(0, 14)}...</span>
                  </div>
                )}
                <div className="flex items-start gap-3 text-sm pt-1">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Shipping Address</p>
                    <p className="text-gray-800 text-sm">{selectedOrder.shipping_address ?? 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Placed</span>
                  <span className="ml-auto text-gray-800">{new Date(selectedOrder.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setSelectedOrder(null)} className="w-full py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                Close <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Refund Confirm Modal ───────────────────────────────────────────── */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
              <RotateCcw className="w-5 h-5 text-orange-600" />
            </div>
            {refundMsg ? (
              <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${refundMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {refundMsg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                {refundMsg.text}
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h3 className="font-bold text-gray-900 mb-1">Issue Full Refund?</h3>
                  <p className="text-sm text-gray-500">
                    A full refund of <span className="font-semibold text-gray-700">${Number(refundTarget.total).toFixed(2)}</span> will be issued via Stripe for order <span className="font-mono font-semibold">#{refundTarget.id.slice(0, 8).toUpperCase()}</span>. Product stock will be restored.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setRefundTarget(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={handleRefund} disabled={refunding} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                    {refunding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    {refunding ? 'Processing...' : 'Issue Refund'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-gray-900 mb-1">Delete Order?</h3>
              <p className="text-sm text-gray-500">
                Order <span className="font-mono font-semibold">#{deleteTarget.id.slice(0, 8).toUpperCase()}</span> will be permanently deleted. This does <span className="font-semibold">not</span> issue a refund.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
