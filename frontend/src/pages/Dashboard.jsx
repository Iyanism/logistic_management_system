import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Package, Truck, Warehouse as WarehouseIcon, MapPin, AlertTriangle,
  TrendingUp, Clock, CheckCircle, ArrowUpRight, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      if (user?.role === 'admin') {
        const [statsRes, alertsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/alerts')
        ]);
        setStats(statsRes.data.stats);
        setCharts(statsRes.data.charts);
        setAlerts(alertsRes.data.alerts);
      } else {
        const ordersRes = await api.get('/orders');
        const orders = ordersRes.data.orders;
        setStats({
          orders: {
            total: orders.length,
            pending: orders.filter(o => o.status === 'pending').length,
            in_transit: orders.filter(o => o.status === 'in_transit').length,
            delivered: orders.filter(o => o.status === 'delivered').length
          }
        });
      }
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const statCards = user?.role === 'admin' ? [
    { icon: Package, label: 'Total Orders', value: stats?.orders?.total || 0, sub: `${stats?.orders?.pending || 0} pending`, color: 'from-cyan-500 to-blue-600', shadowColor: 'shadow-cyan-500/20' },
    { icon: Truck, label: 'Active Vehicles', value: stats?.vehicles?.on_route || 0, sub: `${stats?.vehicles?.available || 0} available`, color: 'from-violet-500 to-purple-600', shadowColor: 'shadow-violet-500/20' },
    { icon: TrendingUp, label: 'On-Time Rate', value: `${stats?.onTimeRate || 100}%`, sub: `${stats?.orders?.delivered || 0} delivered`, color: 'from-emerald-500 to-green-600', shadowColor: 'shadow-emerald-500/20' },
    { icon: WarehouseIcon, label: 'Warehouse', value: `${stats?.warehouseUtilization || 0}%`, sub: 'utilization', color: 'from-amber-500 to-orange-600', shadowColor: 'shadow-amber-500/20' },
  ] : [
    { icon: Package, label: 'Total Orders', value: stats?.orders?.total || 0, sub: 'all time', color: 'from-cyan-500 to-blue-600', shadowColor: 'shadow-cyan-500/20' },
    { icon: Clock, label: 'Pending', value: stats?.orders?.pending || 0, sub: 'awaiting', color: 'from-amber-500 to-orange-600', shadowColor: 'shadow-amber-500/20' },
    { icon: Activity, label: 'In Transit', value: stats?.orders?.in_transit || 0, sub: 'on the way', color: 'from-violet-500 to-purple-600', shadowColor: 'shadow-violet-500/20' },
    { icon: CheckCircle, label: 'Delivered', value: stats?.orders?.delivered || 0, sub: 'completed', color: 'from-emerald-500 to-green-600', shadowColor: 'shadow-emerald-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {user?.role === 'admin' ? 'Dashboard' : `Welcome, ${user?.full_name || user?.username}`}
        </h1>
        <p className="text-slate-500 mt-1">
          {user?.role === 'admin' ? 'Overview of your logistics operations' : 'Your order overview'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg ${card.shadowColor} group-hover:scale-110 transition-transform`}>
                  <Icon size={20} className="text-slate-900" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orders Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Orders (Last 7 Days)</h3>
            {charts?.recentOrdersByDay?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts.recentOrdersByDay}>
                  <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 12 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155' }} />
                  <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">No order data yet</div>
            )}
          </div>

          {/* Order Status Pie */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Orders by Status</h3>
            {charts?.ordersByStatus?.length > 0 ? (
              <div className="flex items-center">
                <ResponsiveContainer width="60%" height={250}>
                  <PieChart>
                    <Pie data={charts.ordersByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={2} stroke="#ffffff">
                      {charts.ordersByStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#334155' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {charts.ordersByStatus.map((item, i) => (
                    <div key={item.status} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-sm text-slate-500 capitalize">{item.status.replace('_', ' ')}</span>
                      <span className="text-sm text-slate-900 font-medium ml-auto">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-500">No order data yet</div>
            )}
          </div>
        </div>
      )}

      {/* Alerts */}
      {user?.role === 'admin' && alerts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            Active Alerts ({alerts.length})
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {alerts.map((alert, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                alert.severity === 'high' ? 'bg-red-500/5 border-red-500/20' :
                alert.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/20' :
                'bg-blue-500/5 border-blue-500/20'
              }`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  alert.severity === 'high' ? 'bg-red-400' :
                  alert.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'
                }`} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
