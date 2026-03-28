import { useState, useEffect } from 'react';
import api from '../services/api';
import { Truck, Plus, X, Wrench, Fuel, Eye } from 'lucide-react';

const statusColors = {
  available: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  on_route: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  maintenance: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

const typeIcons = { truck: '🚛', van: '🚐', bike: '🏍️', car: '🚗' };

export default function Fleet() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showMaintenance, setShowMaintenance] = useState(null);
  const [form, setForm] = useState({ plate_number: '', type: 'truck', capacity_kg: '', fuel_level: 100 });

  useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    try { const res = await api.get('/vehicles'); setVehicles(res.data.vehicles); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createVehicle = async (e) => {
    e.preventDefault();
    try {
      await api.post('/vehicles', form);
      setShowCreate(false);
      setForm({ plate_number: '', type: 'truck', capacity_kg: '', fuel_level: 100 });
      fetchVehicles();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const fetchDetail = async (id) => {
    try { const res = await api.get(`/vehicles/${id}`); setShowDetail(res.data); }
    catch (err) { console.error(err); }
  };

  const logMaintenance = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post(`/vehicles/${showMaintenance.id}/maintenance`, {
        type: fd.get('type'),
        description: fd.get('description'),
        cost: parseFloat(fd.get('cost')) || 0,
        next_due: fd.get('next_due') || null
      });
      setShowMaintenance(null);
      fetchVehicles();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fleet Management</h1>
          <p className="text-slate-500 mt-1">{vehicles.length} vehicles</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">
          <Plus size={18} /> Add Vehicle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Available', count: vehicles.filter(v => v.status === 'available').length, color: 'text-emerald-400' },
          { label: 'On Route', count: vehicles.filter(v => v.status === 'on_route').length, color: 'text-violet-400' },
          { label: 'Maintenance', count: vehicles.filter(v => v.status === 'maintenance').length, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-sm text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map(vehicle => (
          <div key={vehicle.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{typeIcons[vehicle.type] || '🚛'}</span>
                <div>
                  <h3 className="text-slate-900 font-semibold">{vehicle.plate_number}</h3>
                  <p className="text-xs text-slate-500 capitalize">{vehicle.type} · {vehicle.capacity_kg || 0}kg</p>
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md border ${statusColors[vehicle.status]}`}>
                {vehicle.status.replace('_', ' ')}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Fuel</span>
                <span className="text-slate-900">{vehicle.fuel_level}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${vehicle.fuel_level > 50 ? 'bg-emerald-400' : vehicle.fuel_level > 20 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${vehicle.fuel_level}%` }} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Mileage</span>
                <span className="text-slate-900">{vehicle.mileage?.toLocaleString() || 0} km</span>
              </div>
              {vehicle.driver_name && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Driver</span>
                  <span className="text-cyan-400">{vehicle.driver_name}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
              <button onClick={() => fetchDetail(vehicle.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                <Eye size={14} /> Details
              </button>
              <button onClick={() => setShowMaintenance(vehicle)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                <Wrench size={14} /> Maintenance
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Add Vehicle</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"><X size={20} /></button>
            </div>
            <form onSubmit={createVehicle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Plate Number *</label>
                <input value={form.plate_number} onChange={e => setForm({...form, plate_number: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all">
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                    <option value="bike">Bike</option>
                    <option value="car">Car</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Capacity (kg)</label>
                  <input type="number" value={form.capacity_kg} onChange={e => setForm({...form, capacity_kg: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">Add Vehicle</button>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Modal */}
      {showMaintenance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Log Maintenance - {showMaintenance.plate_number}</h2>
              <button onClick={() => setShowMaintenance(null)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"><X size={20} /></button>
            </div>
            <form onSubmit={logMaintenance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Type</label>
                <select name="type" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all">
                  <option value="routine">Routine</option>
                  <option value="repair">Repair</option>
                  <option value="inspection">Inspection</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
                <textarea name="description" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Cost ($)</label>
                  <input type="number" name="cost" step="0.01" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Next Due</label>
                  <input type="date" name="next_due" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">Log Maintenance</button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{showDetail.vehicle.plate_number}</h2>
              <button onClick={() => setShowDetail(null)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {[['Type', showDetail.vehicle.type], ['Status', showDetail.vehicle.status], ['Capacity', `${showDetail.vehicle.capacity_kg} kg`], ['Fuel', `${showDetail.vehicle.fuel_level}%`], ['Mileage', `${showDetail.vehicle.mileage} km`], ['Last Maintenance', showDetail.vehicle.last_maintenance || 'Never'], ['Next Maintenance', showDetail.vehicle.next_maintenance || 'Not scheduled']].map(([l, v]) => (
                <div key={l} className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">{l}</span>
                  <span className="text-sm text-slate-900 font-medium capitalize">{v}</span>
                </div>
              ))}
            </div>
            {showDetail.maintenance_logs?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Maintenance History</h3>
                <div className="space-y-2">
                  {showDetail.maintenance_logs.map(log => (
                    <div key={log.id} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-900 capitalize">{log.type}</span>
                        <span className="text-xs text-slate-500">{new Date(log.date).toLocaleDateString()}</span>
                      </div>
                      {log.description && <p className="text-xs text-slate-500 mt-1">{log.description}</p>}
                      {log.cost > 0 && <p className="text-xs text-amber-400 mt-1">${log.cost}</p>}
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
