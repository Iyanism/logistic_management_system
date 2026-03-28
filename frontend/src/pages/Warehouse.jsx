import { useState, useEffect } from 'react';
import api from '../services/api';
import { Warehouse as WarehouseIcon, Plus, X, ArrowUpRight, ArrowDownRight, Package, Clock } from 'lucide-react';

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', capacity: 1000 });

  useEffect(() => { fetchWarehouses(); }, []);

  const fetchWarehouses = async () => {
    try { const res = await api.get('/warehouses'); setWarehouses(res.data.warehouses); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchItems = async (id) => {
    setSelectedWarehouse(id);
    try { const res = await api.get(`/warehouses/${id}/items`); setItems(res.data.items); }
    catch (err) { console.error(err); }
  };

  const createWarehouse = async (e) => {
    e.preventDefault();
    try { await api.post('/warehouses', form); setShowCreate(false); setForm({ name: '', location: '', capacity: 1000 }); fetchWarehouses(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const receiveItem = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post(`/warehouses/${selectedWarehouse}/items`, {
        item_description: fd.get('item_description'),
        zone: fd.get('zone'),
        shelf: fd.get('shelf'),
        pallet: fd.get('pallet')
      });
      setShowReceive(false);
      fetchItems(selectedWarehouse);
      fetchWarehouses();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const dispatchItem = async (itemId) => {
    try {
      await api.put(`/warehouses/items/${itemId}/dispatch`);
      fetchItems(selectedWarehouse);
      fetchWarehouses();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouse Management</h1>
          <p className="text-slate-500 mt-1">{warehouses.length} warehouses</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">
          <Plus size={18} /> Add Warehouse
        </button>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map(wh => {
          const utilPct = wh.capacity > 0 ? Math.round((wh.current_utilization / wh.capacity) * 100) : 0;
          return (
            <div key={wh.id} onClick={() => fetchItems(wh.id)} className={`bg-white border rounded-xl p-5 cursor-pointer hover:border-slate-300 transition-all ${selectedWarehouse === wh.id ? 'border-cyan-500/50' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-slate-900 font-semibold">{wh.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{wh.location || 'No location set'}</p>
                </div>
                <WarehouseIcon size={20} className="text-slate-500" />
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">Capacity</span>
                  <span className={`font-medium ${utilPct > 80 ? 'text-red-400' : utilPct > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>{utilPct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${utilPct > 80 ? 'bg-red-400' : utilPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{width: `${utilPct}%`}} />
                </div>
                <p className="text-xs text-slate-500 mt-1">{wh.current_utilization} / {wh.capacity} items · {wh.items_count || 0} stored</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Items Table */}
      {selectedWarehouse && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Items in Warehouse</h3>
            <button onClick={() => setShowReceive(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 text-sm font-medium transition-colors">
              <ArrowDownRight size={14} /> Receive Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tracking</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Dwell Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-900">{item.item_description || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{[item.zone, item.shelf, item.pallet].filter(Boolean).join(' / ') || '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-cyan-400">{item.tracking_id || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${item.dwell_hours > 48 ? 'text-red-400' : item.dwell_hours > 24 ? 'text-amber-400' : 'text-slate-600'}`}>
                        {item.dwell_hours ? `${item.dwell_hours}h` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md border ${item.status === 'stored' ? 'bg-blue-500/15 text-blue-400 border-blue-500/20' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.status === 'stored' && (
                        <button onClick={() => dispatchItem(item.id)} className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500/15 text-amber-400 rounded-md hover:bg-amber-500/25 transition-colors">
                          <ArrowUpRight size={12} /> Dispatch
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-500">No items in this warehouse</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Warehouse Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Add Warehouse</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"><X size={20} /></button>
            </div>
            <form onSubmit={createWarehouse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Location</label>
                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Capacity (items)</label>
                <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">Add Warehouse</button>
            </form>
          </div>
        </div>
      )}

      {/* Receive Item Modal */}
      {showReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Receive Item</h2>
              <button onClick={() => setShowReceive(false)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"><X size={20} /></button>
            </div>
            <form onSubmit={receiveItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
                <input name="item_description" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Zone</label>
                  <input name="zone" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" placeholder="A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Shelf</label>
                  <input name="shelf" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" placeholder="3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Pallet</label>
                  <input name="pallet" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" placeholder="P1" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">Receive Item</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
