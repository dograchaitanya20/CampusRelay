import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Package, TrendingUp, Clock, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, StatCard, Button, Badge, Avatar, EmptyState, LiveDot } from '../../components/common/UI';
import { HistoryCard, STATUS } from '../../components/delivery/DeliveryCard';
import useAuthStore from '../../store/authStore';
import useDeliveryStore from '../../store/deliveryStore';
import { on, off } from '../../services/socket';

export default function ReceiverDashboard() {
  const user = useAuthStore(s => s.user);
  const { refreshUser } = useAuthStore();
  const { myDeliveries, myLoading, fetchMyDeliveries, updateActiveStatus } = useDeliveryStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyDeliveries('receiver');
    const onAccepted  = () => { fetchMyDeliveries('receiver'); refreshUser(); };
    const onCompleted = () => { fetchMyDeliveries('receiver'); refreshUser(); };

    on('delivery_accepted',  onAccepted);
    on('delivery_completed', onCompleted);

    return () => {
      off('delivery_accepted',  onAccepted);
      off('delivery_completed', onCompleted);
    };
  }, []);

  const active = myDeliveries.find(d =>
    ['pending', 'accepted', 'pickup_verified', 'in_transit'].includes(d.status)
  );

  const history = myDeliveries
    .filter(d => ['delivered', 'cancelled', 'disputed'].includes(d.status))
    .slice(0, 5);

  const totalSpent = myDeliveries
    .filter(d => d.status === 'delivered')
    .reduce((s, d) => s + (d.commission?.current || 0), 0);

  // ✅ ADD HERE
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? 'Good morning'
      : hour < 17
      ? 'Good afternoon'
      : 'Good evening';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {greeting}, {user?.fullName?.split(' ')[0]} 👋
          </h1>

          <p className="text-muted text-sm mt-1">
            {user?.isActive
              ? 'Account verified · Ready to go'
              : '⏳ Account pending KYC approval'}
          </p>
        </div>

        {/* Post Request — disabled for unverified accounts */}
        {user?.isActive ? (
          <Link to="/post">
            <Button icon={Package}>Post Request</Button>
          </Link>
        ) : (
          <Button icon={Package} disabled title="Complete KYC to post a request">
            Post Request
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Wallet Balance" value={`₹${user?.wallet?.balance?.toFixed(0) || 0}`} icon="💰" color="text-brand" />
        <StatCard label="Total Orders"   value={user?.stats?.deliveriesAsReceiver || 0}         icon="📦" />
        <StatCard label="Total Spent"    value={`₹${user?.wallet?.totalSpent?.toFixed(0) || 0}`} icon="💸" />
        <StatCard label="Trust Score"    value={user?.rating?.average?.toFixed(1) || '—'}        icon="⭐" color="text-yellow-500" sub={`${user?.rating?.count || 0} reviews`} />
      </div>

      {/* Active delivery banner */}
      {active && (
        <Card urgent className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LiveDot />
              <h3 className="font-black text-campus-dark">Active Delivery</h3>
            </div>
            <Badge color={active.status === 'pending' ? 'orange' : 'blue'}>
              {STATUS[active.status]?.label}
            </Badge>
          </div>

          {active.carrier ? (
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={active.carrier.fullName} />
              <div>
                <p className="font-bold text-sm">{active.carrier.fullName}</p>
                <p className="text-xs text-muted">⭐ {active.carrier.rating?.average?.toFixed(1)} · {active.carrier.stats?.deliveriesAsCarrier || 0} deliveries</p>
              </div>
              <div className="ml-auto flex gap-2">
                <Link to={`/chat/${active._id}`}>
                  <Button variant="muted" size="sm">💬 Chat</Button>
                </Link>
                <Link to={`/track/${active._id}`}>
                  <Button size="sm">📍 Track</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-0.5">
                {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-brand animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
              <p className="text-sm text-muted">Looking for a carrier nearby...</p>
              <span className="ml-auto chip chip-orange">₹{active.commission?.current}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-xs text-muted bg-gray-50 rounded-xl p-3">
            <div><p className="font-semibold text-campus-dark">{active.package?.app?.toUpperCase()}</p><p>App</p></div>
            <div><p className="font-semibold text-campus-dark">{active.destination?.hostelBlock}</p><p>Block</p></div>
            <div><p className="font-semibold text-campus-dark">₹{active.commission?.current}</p><p>Commission</p></div>
          </div>
        </Card>
      )}

      {/* Recent orders */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-campus-dark">Recent Orders</h2>
        <Link to="/orders" className="text-brand text-sm font-semibold hover:underline">View all →</Link>
      </div>

      {myLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-3">
          {history.map(d => (
            <HistoryCard key={d._id} delivery={d} role="receiver"
              onClick={() => navigate(`/track/${d._id}`)} />
          ))}
        </div>
      ) : !active && (
        <EmptyState emoji="📦" title="No deliveries yet"
          subtitle="Post a request when your Zomato or Blinkit order is on the way!"
          action={<Link to="/post"><Button>Post Your First Request</Button></Link>} />
      )}
    </div>
  );
}
