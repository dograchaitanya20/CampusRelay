import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Tabs, EmptyState, Button } from '../../components/common/UI';
import { HistoryCard } from '../../components/delivery/DeliveryCard';
import useAuthStore from '../../store/authStore';
import useDeliveryStore from '../../store/deliveryStore';

const TABS = [
  { key: 'all',       label: 'All'       },
  { key: 'active',    label: 'Active'    },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const ACTIVE_STATUSES = ['pending','accepted','pickup_verified','in_transit'];

export default function Orders() {
  const user                                   = useAuthStore(s => s.user);
  const { myDeliveries, myLoading, fetchMyDeliveries } = useDeliveryStore();
  const [tab, setTab]                          = useState('all');
  const navigate                               = useNavigate();
  const role                                   = user?.activeRole || 'receiver';

  useEffect(() => { fetchMyDeliveries(role); }, [role]);

  const filtered = myDeliveries.filter(d => {
    if (tab === 'all')       return true;
    if (tab === 'active')    return ACTIVE_STATUSES.includes(d.status);
    if (tab === 'delivered') return d.status === 'delivered';
    if (tab === 'cancelled') return ['cancelled','disputed'].includes(d.status);
    return true;
  });

  const activeCount    = myDeliveries.filter(d => ACTIVE_STATUSES.includes(d.status)).length;
  const deliveredCount = myDeliveries.filter(d => d.status === 'delivered').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{role === 'carrier' ? 'My Deliveries' : 'My Orders'}</h1>
          <p className="text-muted text-sm mt-1">
            {myDeliveries.length} total · {activeCount} active · {deliveredCount} delivered
          </p>
        </div>
        <button onClick={() => fetchMyDeliveries(role)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors" disabled={myLoading}>
          <RefreshCw className={`w-5 h-5 text-muted ${myLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-5 space-y-3">
        {myLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map(d => (
            <HistoryCard
              key={d._id}
              delivery={d}
              role={role}
              onClick={() => navigate(`/track/${d._id}`)}
            />
          ))
        ) : (
          <EmptyState
            emoji={tab === 'active' ? '⏳' : '📭'}
            title={tab === 'active' ? 'No active deliveries' : 'Nothing here yet'}
            subtitle={
              role === 'receiver'
                ? 'Post a request when your order is on the way!'
                : 'Go online to start accepting deliveries and earning.'
            }
            action={
              role === 'receiver'
                ? <Button onClick={() => navigate('/post')}>Post a Request</Button>
                : <Button onClick={() => navigate('/carrier')}>Go to Carrier Dashboard</Button>
            }
          />
        )}
      </div>
    </div>
  );
}
