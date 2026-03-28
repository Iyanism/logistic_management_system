import { useState, useEffect } from 'react';
import api from '../services/api';
import { Bell, Check, CheckCheck, Package, Truck, AlertTriangle, Clock } from 'lucide-react';

const typeIcons = {
  order_assigned: Package,
  order_ready: Package,
  trip_started: Truck,
  trip_completed: Check,
  shipment_delayed: AlertTriangle,
  maintenance_due: Truck,
  dwell_time: Clock,
};

const typeColors = {
  order_assigned: 'from-cyan-500 to-blue-600',
  order_ready: 'from-emerald-500 to-green-600',
  trip_started: 'from-violet-500 to-purple-600',
  trip_completed: 'from-emerald-500 to-green-600',
  shipment_delayed: 'from-red-500 to-rose-600',
  maintenance_due: 'from-amber-500 to-orange-600',
  dwell_time: 'from-amber-500 to-orange-600',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try { const res = await api.get('/notifications'); setNotifications(res.data.notifications); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try { await api.put(`/notifications/${id}/read`); fetchNotifications(); }
    catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try { await api.put('/notifications/read-all'); fetchNotifications(); }
    catch (err) { console.error(err); }
  };

  const filtered = filter === 'all' ? notifications :
    filter === 'unread' ? notifications.filter(n => !n.is_read) :
    notifications.filter(n => n.is_read);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 text-sm text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 transition-colors">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {['all', 'unread', 'read'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${filter === f ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(notif => {
          const Icon = typeIcons[notif.type] || Bell;
          const color = typeColors[notif.type] || 'from-slate-500 to-slate-600';
          return (
            <div key={notif.id} className={`bg-white border rounded-xl p-4 flex items-start gap-4 transition-all hover:border-slate-300 ${notif.is_read ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}>
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon size={16} className="text-slate-900" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-medium ${notif.is_read ? 'text-slate-500' : 'text-slate-900'}`}>{notif.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                  </div>
                  {!notif.is_read && (
                    <button onClick={() => markRead(notif.id)} className="p-1 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-50 transition-colors flex-shrink-0" title="Mark read">
                      <Check size={14} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
              </div>
              {!notif.is_read && <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 mt-2" />}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Bell size={48} className="mx-auto mb-4 opacity-30" />
            <p>No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}
