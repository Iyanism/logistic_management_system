import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Package, Plus, X, Eye, ChevronDown, Filter } from 'lucide-react';

const statusColors = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  assigned: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  in_transit: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  delivered: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
};

const priorityColors = {
  normal: 'text-slate-500',
  express: 'text-amber-400',
  urgent: 'text-red-400',
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showAssign, setShowAssign] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ pickup_address: '', delivery_address: '', weight: '', dimensions: '', priority: 'normal', notes: '' });

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data.orders);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createOrder = async (e) => {
    e.preventDefault();
    try {
      await api.post('/orders', form);
      setShowCreate(false);
      setForm({ pickup_address: '', delivery_address: '', weight: '', dimensions: '', priority: 'normal', notes: '' });
      fetchOrders();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const openAssign = async (order) => {
    setShowAssign(order);
    try {
      const [d, v] = await Promise.all([api.get('/dashboard/drivers'), api.get('/vehicles')]);
      setDrivers(d.data.drivers);
      setVehicles(v.data.vehicles.filter(v => v.status === 'available'));
    } catch (err) { console.error(err); }
  };

  const assignOrder = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.put(`/orders/${showAssign.id}`, {
        assigned_driver_id: parseInt(fd.get('driver_id')),
        assigned_vehicle_id: parseInt(fd.get('vehicle_id')),
        estimated_delivery: fd.get('estimated_delivery') || null
      });
      setShowAssign(null);
      fetchOrders();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const updateStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      fetchOrders();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const fetchDetail = async (id) => {
    try {
      const res = await api.get(`/orders/${id}`);
      setShowDetail(res.data);
    } catch (err) { console.error(err); }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{user?.role === 'driver' ? 'My Trips' : 'Orders'}</h1>
          <p className="text-slate-500 mt-1">{filtered.length} orders</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'customer') && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">
            <Plus size={18} /> New Order
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'assigned', 'in_transit', 'delivered'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === s ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'}`}>
            {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tracking ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Priority</th>
                {user?.role === 'admin' && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Driver</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-cyan-400">{order.tracking_id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md border ${statusColors[order.status]}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium capitalize ${priorityColors[order.priority]}`}>{order.priority}</span>
                  </td>
                  {user?.role === 'admin' && <td className="px-4 py-3 text-sm text-slate-600">{order.customer_name || '-'}</td>}
                  <td className="px-4 py-3 text-sm text-slate-600">{order.driver_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => fetchDetail(order.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors" title="View"><Eye size={16} /></button>
                      {user?.role === 'admin' && order.status === 'pending' && (
                        <button onClick={() => openAssign(order)} className="px-2 py-1 text-xs bg-cyan-500/15 text-cyan-400 rounded-md hover:bg-cyan-500/25 transition-colors">Assign</button>
                      )}
                      {user?.role === 'driver' && order.status === 'assigned' && (
                        <button onClick={() => updateStatus(order.id, 'in_transit')} className="px-2 py-1 text-xs bg-violet-500/15 text-violet-400 rounded-md hover:bg-violet-500/25 transition-colors">Start Trip</button>
                      )}
                      {user?.role === 'driver' && order.status === 'in_transit' && (
                        <button onClick={() => updateStatus(order.id, 'delivered')} className="px-2 py-1 text-xs bg-emerald-500/15 text-emerald-400 rounded-md hover:bg-emerald-500/25 transition-colors">Complete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Create Order</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"><X size={20} /></button>
            </div>
            <form onSubmit={createOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Pickup Address *</label>
                <input value={form.pickup_address} onChange={e => setForm({...form, pickup_address: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Delivery Address *</label>
                <input value={form.delivery_address} onChange={e => setForm({...form, delivery_address: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all">
                    <option value="normal">Normal</option>
                    <option value="express">Express</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" rows={3} />
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">Create Order</button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Assign Order {showAssign.tracking_id}</h2>
              <button onClick={() => setShowAssign(null)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"><X size={20} /></button>
            </div>
            <form onSubmit={assignOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Driver *</label>
                <select name="driver_id" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" required>
                  <option value="">Select driver</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name} ({d.active_orders} active)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Vehicle *</label>
                <select name="vehicle_id" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" required>
                  <option value="">Select vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number} ({v.type})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Estimated Delivery</label>
                <input type="datetime-local" name="estimated_delivery" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">Assign</button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Order {showDetail.order.tracking_id}</h2>
              <button onClick={() => setShowDetail(null)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {[
                ['Status', showDetail.order.status],
                ['Priority', showDetail.order.priority],
                ['Pickup', showDetail.order.pickup_address],
                ['Delivery', showDetail.order.delivery_address],
                ['Customer', showDetail.order.customer_name],
                ['Driver', showDetail.order.driver_name || 'Unassigned'],
                ['Vehicle', showDetail.order.vehicle_plate || 'Unassigned'],
                ['Weight', showDetail.order.weight ? `${showDetail.order.weight} kg` : '-'],
                ['Created', new Date(showDetail.order.created_at).toLocaleString()],
                ['Est. Delivery', showDetail.order.estimated_delivery ? new Date(showDetail.order.estimated_delivery).toLocaleString() : '-'],
                ['Act. Delivery', showDetail.order.actual_delivery ? new Date(showDetail.order.actual_delivery).toLocaleString() : '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm text-slate-900 font-medium capitalize">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
