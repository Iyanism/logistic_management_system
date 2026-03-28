import { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Star, Package, Eye, X } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(null);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try { const res = await api.get('/customers'); setCustomers(res.data.customers); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchDetail = async (id) => {
    try { const res = await api.get(`/customers/${id}`); setShowDetail(res.data); }
    catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="text-slate-500 mt-1">{customers.length} registered customers</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Orders</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Delivered</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {(c.full_name || c.username || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-900 font-medium">{c.full_name || c.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{c.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{c.phone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">{c.total_orders}</td>
                  <td className="px-4 py-3 text-sm text-emerald-400">{c.delivered_orders}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Star size={14} className={c.avg_rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />
                      <span className="text-sm text-slate-900">{c.avg_rating ? c.avg_rating.toFixed(1) : '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => fetchDetail(c.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-500">No customers registered</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{showDetail.customer.full_name || showDetail.customer.username}</h2>
              <button onClick={() => setShowDetail(null)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"><X size={20} /></button>
            </div>
            <div className="space-y-3 mb-4">
              {[['Email', showDetail.customer.email], ['Phone', showDetail.customer.phone || '-'], ['Address', showDetail.customer.address || '-'], ['Member Since', new Date(showDetail.customer.created_at).toLocaleDateString()]].map(([l, v]) => (
                <div key={l} className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">{l}</span>
                  <span className="text-sm text-slate-900">{v}</span>
                </div>
              ))}
            </div>

            {showDetail.orders?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Order History ({showDetail.orders.length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {showDetail.orders.map(o => (
                    <div key={o.id} className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <span className="text-sm font-mono text-cyan-400">{o.tracking_id}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs font-medium capitalize px-2 py-1 rounded-md ${o.status === 'delivered' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{o.status.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showDetail.feedbacks?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Feedback</h3>
                <div className="space-y-2">
                  {showDetail.feedbacks.map(f => (
                    <div key={f.id} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />)}
                        <span className="text-xs text-slate-500 ml-2">{f.tracking_id}</span>
                      </div>
                      {f.comment && <p className="text-xs text-slate-600 mt-1">{f.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
