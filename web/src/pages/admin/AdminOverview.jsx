import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { StatCard, Card, SectionLabel, Badge, Avatar } from '../../components/common/UI';
import { adminAPI } from '../../services/api';
import { on, off } from '../../services/socket';

export default function AdminOverview() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const onDispute = d => toast.error(`⚖️ New dispute: ${d.deliveryCode} — ${d.reason}`);
    on('admin_new_dispute', onDispute);
    return () => off('admin_new_dispute', onDispute);
  }, []);

  const load = async () => {
    setLoading(true);
    try { const r = await adminAPI.getStats(); setStats(r.stats); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Overview</h1>
          <p className="text-muted text-sm mt-1">Real-time stats &amp; health</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-xl hover:bg-gray-100">
          <RefreshCw className={`w-5 h-5 text-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Active Users"    value={stats.users}       icon="👥" />
            <StatCard label="Carriers"        value={stats.carriers}    icon="🛵" color="text-success" />
            <StatCard label="Today's Orders"  value={stats.todayD}      icon="📦" color="text-brand" />
            <StatCard label="Monthly Orders"  value={stats.monthD}      icon="📅" />
            <StatCard label="Open Disputes"   value={stats.disputes}    icon="⚖️" color="text-danger" />
            <StatCard label="Pending KYC"     value={stats.pendingKyc}  icon="🔐" color="text-warning" />
            <StatCard label="Monthly Revenue" value={`₹${stats.revenue?.toFixed(0) || 0}`} icon="💰" color="text-success" sub="Platform cut (₹7/delivery)" />
            <StatCard label="Avg Commission"  value="₹32" icon="📊" sub="Paid to carriers" />
          </div>

          {/* Revenue card */}
          <Card className="bg-campus-dark mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Platform Revenue This Month</p>
                <p className="text-white text-4xl font-black">₹{stats.revenue?.toFixed(2) || '0.00'}</p>
                <p className="text-white/40 text-sm mt-1">₹7 platform cut per delivery · {stats.monthD} deliveries</p>
              </div>
              <div className="text-5xl opacity-20">💸</div>
            </div>
          </Card>

          {/* Top carriers */}
          {stats.topCarriers?.length > 0 && (
            <Card>
              <SectionLabel>Top Carriers This Month</SectionLabel>
              <div className="space-y-3">
                {stats.topCarriers.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-lg font-black text-muted w-6">#{i + 1}</span>
                    <Avatar name={c.name} size="sm" color={i === 0 ? 'brand' : 'gray'} />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-campus-dark">{c.name}</p>
                      <p className="text-xs text-muted">{c.count} deliveries · ⭐ {c.rating?.toFixed(1) || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-success">₹{c.earned}</p>
                      <p className="text-xs text-muted">earned</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
