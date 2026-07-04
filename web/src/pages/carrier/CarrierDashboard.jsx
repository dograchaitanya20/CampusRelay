import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, StatCard, Toggle, EmptyState, Badge, LiveDot } from '../../components/common/UI';
import { FeedCard } from '../../components/delivery/DeliveryCard';
import useAuthStore from '../../store/authStore';
import useDeliveryStore from '../../store/deliveryStore';
import { on, off, goCarrierOnline, goCarrierOffline } from '../../services/socket';
import { usersAPI } from '../../services/api';

export default function CarrierDashboard() {
  const user                                        = useAuthStore(s => s.user);
  const { feed, feedLoading, fetchFeed, addToFeed,
          removeFromFeed, bumpCommissions, accept } = useDeliveryStore();
  const navigate                                    = useNavigate();

  const [online,    setOnline]    = useState(false);
  const [accepting, setAccepting] = useState(null);
  const [newFlash,  setNewFlash]  = useState(null);

  useEffect(() => {
    fetchFeed();

    // Re-fetch when tab regains focus to clear any stale state
    const onVisible = () => { if (!document.hidden) fetchFeed(); };
    document.addEventListener('visibilitychange', onVisible);

    const onNew = (d) => {
      // Double-check: never add a delivery the current user posted
      if ((d.receiver?._id || d.receiver)?.toString() === user?._id?.toString()) return;
      addToFeed(d);
      setNewFlash(d._id);
      setTimeout(() => setNewFlash(null), 4000);
      if (Notification.permission === 'granted') {
        new Notification('📦 New Delivery Request!', {
          body: `${d.package?.description} — Earn ₹${d.commission?.current}`,
          icon: '/favicon.ico',
        });
      }
    };
    const onTaken     = d => removeFromFeed(d.deliveryId || d._id);
    const onCancelled = d => removeFromFeed(d.deliveryId || d._id);
    const onBumped    = () => bumpCommissions();

    on('new_delivery',            onNew);
    on('delivery_taken',          onTaken);
    on('delivery_cancelled_feed', onCancelled);
    on('commissions_bumped',      onBumped);

    if (Notification.permission === 'default') Notification.requestPermission();

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      off('new_delivery',            onNew);
      off('delivery_taken',          onTaken);
      off('delivery_cancelled_feed', onCancelled);
      off('commissions_bumped',      onBumped);
    };
  }, [user?._id]);

  const toggleOnline = async (val) => {
    setOnline(val);
    if (val) {
      goCarrierOnline();
      try { await usersAPI.setOnlineStatus(true); } catch {}
      toast.success('🟢 You\'re online! Delivery requests will appear here.');
    } else {
      goCarrierOffline();
      try { await usersAPI.setOnlineStatus(false); } catch {}
    }
  };

  const handleAccept = async (deliveryId) => {
    setAccepting(deliveryId);
    try {
      const res = await accept(deliveryId);
      toast.success('⚡ Accepted! Head to the main gate now.');
      navigate(`/track/${res.delivery._id}`);
    } catch (e) {
      toast.error(e.message === 'Sorry! Someone else just accepted this.'
        ? '⚡ Too slow! Someone beat you to it.'
        : e.message);
      fetchFeed();
    } finally { setAccepting(null); }
  };

  // Filter out deliveries posted by this carrier (when they also have receiver role)
  const visibleFeed = feed.filter(d => {
    const receiverId = d.receiver?._id || d.receiver;
    return receiverId?.toString() !== user?._id?.toString();
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Carrier Dashboard</h1>
          <div className="text-muted text-sm mt-1">
            {online
              ? <LiveDot label="Online — accepting requests" />
              : 'Go online to start earning'}
          </div>
        </div>
        <button onClick={fetchFeed} disabled={feedLoading}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <RefreshCw className={`w-5 h-5 text-muted ${feedLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Wallet Balance"   value={`₹${user?.wallet?.balance?.toFixed(0) || 0}`}     icon="💰" color="text-success" />
        <StatCard label="Total Deliveries" value={user?.stats?.deliveriesAsCarrier || 0}              icon="🛵" />
        <StatCard label="Total Earned"     value={`₹${user?.wallet?.totalEarned?.toFixed(0) || 0}`}  icon="📈" color="text-brand" />
        <StatCard label="Trust Score"      value={user?.rating?.average?.toFixed(1) || '—'}           icon="⭐" color="text-yellow-500"
          sub={`${user?.rating?.count || 0} ratings · 🔥${user?.stats?.streak || 0} day streak`} />
      </div>

      {/* Online toggle */}
      <Card className="mb-5">
        <Toggle
          checked={online}
          onChange={toggleOnline}
          label={online ? '🟢 You\'re Online' : '⚫ You\'re Offline'}
          sublabel={online
            ? 'You are visible to receivers. New requests appear below in real-time.'
            : 'Toggle to start receiving delivery requests from hostel students.'}
        />
        {!online && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-muted">
            💡 You earn <span className="font-bold text-brand">₹30–₹100</span> per delivery.
            Commission rises every 5 min an order isn't accepted.
          </div>
        )}
      </Card>

      {/* Live feed */}
      {online && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-campus-dark flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand" /> Live Requests
            </h2>
            {visibleFeed.length > 0 && (
              <Badge color="orange">{visibleFeed.length} available</Badge>
            )}
          </div>

          {feedLoading && visibleFeed.length === 0 ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : visibleFeed.length > 0 ? (
            <div className="space-y-3">
              {visibleFeed.map(d => (
                <div key={d._id}
                  className={`transition-all duration-300 ${newFlash === d._id ? 'ring-2 ring-brand ring-offset-2 rounded-2xl' : ''}`}>
                  {newFlash === d._id && (
                    <div className="bg-brand text-white text-xs font-bold px-3 py-1.5 rounded-t-2xl -mb-1 flex items-center gap-1.5">
                      <span className="animate-pulse">●</span> New request just posted!
                    </div>
                  )}
                  <FeedCard
                    delivery={d}
                    onAccept={() => handleAccept(d._id)}
                    loading={accepting === d._id}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState emoji="📭" title="No requests right now"
              subtitle="New delivery requests from hostel students will appear here instantly. Keep this tab open!" />
          )}
        </div>
      )}

      {!online && (
        <EmptyState emoji="⚫" title="You're offline"
          subtitle="Toggle the switch above to start receiving live delivery requests and earning money." />
      )}
    </div>
  );
}
