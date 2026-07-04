import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Clock, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { Card, Avatar, Badge, StarRating, Button } from '../common/UI';

export const APPS = {
  zomato:   { emoji:'🍕', label:'Zomato',   color:'#CB202D' },
  blinkit:  { emoji:'⚡', label:'Blinkit',  color:'#F8CB2E' },
  swiggy:   { emoji:'🛵', label:'Swiggy',   color:'#FC8019' },
  amazon:   { emoji:'📦', label:'Amazon',   color:'#FF9900' },
  flipkart: { emoji:'🛍️', label:'Flipkart', color:'#2874F0' },
  other:    { emoji:'📫', label:'Other',    color:'#7B7B8F' },
};

export const STATUS = {
  pending:         { label:'Finding Carrier',   color:'orange' },
  accepted:        { label:'Carrier Assigned',  color:'blue'   },
  pickup_verified: { label:'Parcel Picked Up',  color:'yellow' },
  in_transit:      { label:'On the Way',        color:'blue'   },
  delivered:       { label:'Delivered ✅',       color:'green'  },
  cancelled:       { label:'Cancelled',         color:'red'    },
  disputed:        { label:'Disputed ⚠️',        color:'yellow' },
};

export function FeedCard({ delivery, onAccept, loading }) {
  const app  = APPS[delivery.package?.app] || APPS.other;
  const comm = delivery.commission?.current || 30;
  const bumped = (delivery.commission?.bumpCount || 0) > 0;

  return (
    <Card urgent={comm >= 45} className="hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: app.color + '18' }}>
          {app.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-campus-dark text-sm">{app.label} Order</h3>
            {bumped && <Badge color="orange">⬆ Rising</Badge>}
          </div>
          <p className="text-xs text-muted truncate">{delivery.package?.description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-black text-brand">₹{comm}</p>
          <p className="text-xs text-muted">earn</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {delivery.destination?.hostelBlock} · {delivery.destination?.roomNumber}
        </span>
        {delivery.window?.from && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(delivery.window.from).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
            –{new Date(delivery.window.to).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
        <Avatar name={delivery.receiver?.fullName} size="xs" />
        <span className="text-xs text-muted">{delivery.receiver?.fullName}</span>
        <StarRating value={delivery.receiver?.rating?.average || 0} size="sm" />
        <span className="ml-auto text-xs text-muted">
          {formatDistanceToNow(new Date(delivery.createdAt || Date.now()), { addSuffix: true })}
        </span>
      </div>

      {comm < 50 && (
        <div className="mt-3 bg-orange-50 rounded-xl px-3 py-2 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-brand" />
          <p className="text-xs text-brand font-medium">Commission rises ₹5 in ~5 min if not accepted</p>
        </div>
      )}

      <Button onClick={onAccept} loading={loading} className="w-full mt-3">
        ⚡ Accept — Earn ₹{comm}
      </Button>
    </Card>
  );
}

export function HistoryCard({ delivery, role, onClick }) {
  const app    = APPS[delivery.package?.app] || APPS.other;
  const status = STATUS[delivery.status] || { label: delivery.status, color: 'gray' };
  const other  = role === 'receiver' ? delivery.carrier : delivery.receiver;

  return (
    <Card onClick={onClick} className={clsx('hover:shadow-md transition-shadow', onClick && 'cursor-pointer')}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: app.color + '18' }}>
          {app.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-sm text-campus-dark">{app.label}</p>
            <Badge color={status.color}>{status.label}</Badge>
          </div>
          <p className="text-xs text-muted truncate">{delivery.package?.description}</p>
          {other && (
            <p className="text-xs text-muted mt-1">
              {role === 'receiver' ? '🛵' : '👤'} {other.fullName || 'Unassigned'}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className={clsx('text-sm font-black', role === 'carrier' ? 'text-success' : 'text-campus-dark')}>
            {role === 'carrier' ? '+' : ''}₹{delivery.commission?.paid || delivery.commission?.current || 30}
          </p>
          <p className="text-xs text-muted mt-1">
            {formatDistanceToNow(new Date(delivery.createdAt || Date.now()), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Card>
  );
}
