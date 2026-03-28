import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { MapPin, Plus, X, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';

// Fix for default marker icons in Leaflet with React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function Routes() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [orders, setOrders] = useState([]);

  useEffect(() => { fetchRoutes(); }, []);

  const fetchRoutes = async () => {
    try { const res = await api.get('/routes'); setRoutes(res.data.routes); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = async () => {
    setShowCreate(true);
    try {
      const res = await api.get('/orders');
      setOrders(res.data.orders.filter(o => o.status === 'assigned'));
    } catch (err) { console.error(err); }
  };

  const createRoute = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const waypoints = fd.get('waypoints') ? fd.get('waypoints').split('\n').filter(Boolean).map(w => {
        const [lat, lng] = w.split(',').map(Number);
        return { lat, lng };
      }) : [];
      await api.post('/routes', {
        order_id: parseInt(fd.get('order_id')),
        start_point: fd.get('start_point'),
        end_point: fd.get('end_point'),
        planned_distance: parseFloat(fd.get('planned_distance')) || 0,
        planned_duration: parseInt(fd.get('planned_duration')) || 0,
        waypoints
      });
      setShowCreate(false);
      fetchRoutes();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const statusColors = {
    planned: 'bg-slate-500/15 text-slate-500 border-slate-500/20',
    active: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
  };

  // Helper function to parse coordinates robustly
  const parseCoordinates = (coordString) => {
    if (!coordString) return null;
    try {
      // Handle simple "lat,lng" string
      if (typeof coordString === 'string') {
        const parts = coordString.split(',').map(n => parseFloat(n.trim()));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          return [parts[0], parts[1]];
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Route Planning</h1>
          <p className="text-slate-500 mt-1">{routes.length} routes</p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">
            <Plus size={18} /> Create Route
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Route Cards */}
        <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
          {routes.map(route => (
            <div key={route.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center">
                    <Navigation size={18} className="text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-semibold">{route.tracking_id || `Route #${route.id}`}</h3>
                    <p className="text-xs text-slate-500">{route.driver_name || 'No driver'} · {route.vehicle_plate || 'No vehicle'}</p>
                  </div>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md border ${statusColors[route.status]}`}>
                  {route.status}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-sm text-slate-600 truncate">{route.start_point}</span>
                </div>
                <div className="ml-0.5 border-l border-dashed border-slate-300 h-4" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-sm text-slate-600 truncate">{route.end_point}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-500">Distance</p>
                  <p className="text-sm text-slate-900 font-medium">{route.planned_distance || 0} km</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-500">Duration</p>
                  <p className="text-sm text-slate-900 font-medium">{route.planned_duration || 0} min</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-500">Progress</p>
                  <p className="text-sm text-slate-900 font-medium">{route.simulation_progress || 0}%</p>
                </div>
              </div>

              {/* Simulation Progress Bar */}
              {route.status === 'active' && (
                <div className="mt-3">
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-1000" style={{width: `${route.simulation_progress || 0}%`}} />
                  </div>
                  <p className="text-xs text-cyan-400 mt-1 animate-pulse">🚚 Simulating delivery...</p>
                </div>
              )}
            </div>
          ))}
          {routes.length === 0 && (
            <div className="text-center py-16 text-slate-500 border border-dashed border-slate-300 rounded-xl">No routes created yet</div>
          )}
        </div>

        {/* Right Column - Map View */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-[600px] lg:h-[800px] relative">
          {routes.length > 0 ? (
            <MapContainer 
              center={parseCoordinates(routes[0]?.start_point) || [51.505, -0.09]} 
              zoom={10} 
              style={{ height: '100%', width: '100%', background: '#ffffff' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              
              {routes.map(route => {
                const startCoord = parseCoordinates(route.start_point);
                const endCoord = parseCoordinates(route.end_point);
                
                // Only render if we have valid coordinates
                if (!startCoord || !endCoord) return null;
                
                return (
                  <div key={`map-route-${route.id}`}>
                    <Marker position={startCoord}>
                      <Popup>
                        <div className="text-slate-800">
                          <strong>Route {route.id} - Start</strong><br/>
                          {route.start_point}
                        </div>
                      </Popup>
                    </Marker>
                    <Marker position={endCoord}>
                      <Popup>
                        <div className="text-slate-800">
                          <strong>Route {route.id} - Destination</strong><br/>
                          {route.end_point}
                        </div>
                      </Popup>
                    </Marker>
                    <Polyline 
                      positions={[startCoord, endCoord]} 
                      color={route.status === 'active' ? '#06b6d4' : route.status === 'completed' ? '#10b981' : '#64748b'} 
                      weight={4}
                      dashArray={route.status === 'planned' ? '5, 10' : null}
                    />
                  </div>
                );
              })}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <MapPin size={48} className="mx-auto mb-4 opacity-50" />
                <p>Map will appear when you create routes with coordinates</p>
                <p className="text-xs mt-2">Example coordinates: 12.9716, 77.5946</p>
              </div>
            </div>
          )}
          
          {/* Map Overlay Legened */}
          <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-sm border border-slate-300 p-3 rounded-lg shadow-xl">
            <h4 className="text-xs font-semibold text-slate-900 mb-2 uppercase tracking-wider">Legend</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2"><div className="w-3 h-1 bg-cyan-500 rounded-full"></div><span className="text-slate-600">Active</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-1 bg-emerald-500 rounded-full"></div><span className="text-slate-600">Completed</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-1 bg-slate-500 border border-dashed border-slate-400 rounded-full"></div><span className="text-slate-600">Planned</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Route Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Create Route</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50"><X size={20} /></button>
            </div>
            <form onSubmit={createRoute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Order *</label>
                <select name="order_id" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" required>
                  <option value="">Select assigned order</option>
                  {orders.map(o => <option key={o.id} value={o.id}>{o.tracking_id} — {o.delivery_address}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Start Point (Lat, Lng) *</label>
                <input name="start_point" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" required placeholder="12.9716, 77.5946" />
                <p className="text-xs text-slate-500 mt-1">Must be coordinates separated by comma for map to work</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">End Point (Lat, Lng) *</label>
                <input name="end_point" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" required placeholder="13.0827, 80.2707" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Distance (km)</label>
                  <input type="number" name="planned_distance" step="0.1" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Duration (min)</label>
                  <input type="number" name="planned_duration" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:border-cyan-500 transition-all" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20">Create Route</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
