import { useState } from 'react';
import api from '../services/api';
import { Search, Package, MapPin, Clock, CheckCircle, Truck, AlertCircle } from 'lucide-react';

const statusSteps = ['pending', 'assigned', 'in_transit', 'delivered'];
const statusInfo = {
  pending: { label: 'Order Placed', icon: Package, color: 'text-amber-400' },
  assigned: { label: 'Driver Assigned', icon: Truck, color: 'text-blue-400' },
  in_transit: { label: 'In Transit', icon: MapPin, color: 'text-violet-400' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'text-emerald-400' },
};

export default function TrackOrder() {
  const [trackingId, setTrackingId] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    setError('');
    setOrder(null);
    setLoading(true);
    try {
      const res = await api.get(`/orders/track/${trackingId}`);
      setOrder(res.data.order);
    } catch (err) {
      setError(err.response?.data?.error || 'Order not found.');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = order ? statusSteps.indexOf(order.status) : -1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Track Your Shipment</h1>
        <p className="text-slate-500 mt-1">Enter your tracking ID to see the status</p>
      </div>

      <form onSubmit={handleTrack} className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={trackingId}
            onChange={e => setTrackingId(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all"
            placeholder="e.g. LMS-A1B2C3D4"
            required
          />
        </div>
        <button type="submit" disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50">
          {loading ? 'Tracking...' : 'Track'}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {order && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Tracking ID</p>
              <p className="text-xl font-bold font-mono text-cyan-400">{order.tracking_id}</p>
            </div>
            <span className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-lg capitalize ${
              order.status === 'delivered' ? 'bg-emerald-500/15 text-emerald-400' :
              order.status === 'in_transit' ? 'bg-violet-500/15 text-violet-400' :
              order.status === 'assigned' ? 'bg-blue-500/15 text-blue-400' :
              'bg-amber-500/15 text-amber-400'
            }`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>

          {/* Progress Timeline */}
          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200" />
            <div className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500" style={{width: `${(currentStep / (statusSteps.length - 1)) * 100}%`}} />
            {statusSteps.map((step, i) => {
              const info = statusInfo[step];
              const Icon = info.icon;
              const isComplete = i <= currentStep;
              const isCurrent = i === currentStep;
              return (
                <div key={step} className="relative flex flex-col items-center gap-2 z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCurrent ? 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/30 scale-110' :
                    isComplete ? 'bg-cyan-500/20 border-2 border-cyan-400' :
                    'bg-slate-50 border-2 border-slate-300'
                  }`}>
                    <Icon size={16} className={isComplete ? 'text-cyan-400' : 'text-slate-500'} />
                  </div>
                  <span className={`text-xs font-medium ${isComplete ? 'text-slate-900' : 'text-slate-500'}`}>{info.label}</span>
                </div>
              );
            })}
          </div>

          {/* Order Details */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div>
              <p className="text-xs text-slate-500">Pickup</p>
              <p className="text-sm text-slate-900 mt-1">{order.pickup_address}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Delivery</p>
              <p className="text-sm text-slate-900 mt-1">{order.delivery_address}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Priority</p>
              <p className="text-sm text-slate-900 mt-1 capitalize">{order.priority}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Created</p>
              <p className="text-sm text-slate-900 mt-1">{new Date(order.created_at).toLocaleString()}</p>
            </div>
            {order.estimated_delivery && (
              <div>
                <p className="text-xs text-slate-500">Est. Delivery</p>
                <p className="text-sm text-slate-900 mt-1">{new Date(order.estimated_delivery).toLocaleString()}</p>
              </div>
            )}
            {order.actual_delivery && (
              <div>
                <p className="text-xs text-slate-500">Delivered At</p>
                <p className="text-sm text-emerald-400 mt-1">{new Date(order.actual_delivery).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
