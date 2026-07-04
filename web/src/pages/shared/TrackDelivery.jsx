import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, MessageSquare, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, OtpInput, Avatar, Badge, LiveDot, Timeline, Modal, StarRating } from '../../components/common/UI';
import { APPS, STATUS } from '../../components/delivery/DeliveryCard';
import useAuthStore from '../../store/authStore';
import useDeliveryStore from '../../store/deliveryStore';

import { deliveryAPI, ratingsAPI } from '../../services/api';
import { joinDeliveryRoom, leaveDeliveryRoom, on, off } from '../../services/socket';

export default function TrackDelivery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);
  const {
    active, fetchActive, updateActiveStatus, updateCarrierLocation,
    activeOtps, clearActiveOtps,
  } = useDeliveryStore();

  // ── OTPs from store (survive refresh as long as tab is open) ────
  const pickupOtp   = activeOtps?.deliveryId === id ? activeOtps.pickupOtp   : null;
  const deliveryOtp = activeOtps?.deliveryId === id ? activeOtps.deliveryOtp : null;

  const [otp,         setOtp]         = useState('');
  const [otpModal,    setOtpModal]    = useState(false);
  const [otpMode,     setOtpMode]     = useState('');
  const [otpLoading,  setOtpLoading]  = useState(false);
  const [anomaly,     setAnomaly]     = useState(false);
  const [rateModal,   setRateModal]   = useState(false);
  const [stars,       setStars]       = useState(5);
  const [rateLoading, setRateLoading] = useState(false);
  const watchRef = useRef(null);

  const uid        = user?._id?.toString();
  const isReceiver = active?.receiver?._id?.toString() === uid || active?.receiver?.toString() === uid;
  const isCarrier  = active?.carrier?._id?.toString()  === uid || active?.carrier?.toString()  === uid;
  const app        = APPS[active?.package?.app] || APPS.other;

  useEffect(() => {
    fetchActive(id);
    joinDeliveryRoom(id);

    if (!activeOtps || activeOtps.deliveryId !== id) {
    deliveryAPI.getOtps(id)
      .then(res => {
        useDeliveryStore.setState({
          activeOtps: {
            deliveryId:  id,
            pickupOtp:   res.pickupOtp,
            deliveryOtp: res.deliveryOtp,
          }
        });
      })
      .catch(() => {});
  }

    const onPickup    = () => { updateActiveStatus('pickup_verified'); toast.success('📦 Parcel picked up at gate!'); fetchActive(id); };
    const onCompleted = () => { updateActiveStatus('delivered'); setRateModal(true); fetchActive(id); clearActiveOtps(); };
    const onCancelled = () => { updateActiveStatus('cancelled'); toast.error('Delivery was cancelled'); fetchActive(id); };
    const onLocation  = (d) => { if (d.deliveryId === id) updateCarrierLocation(d.lat, d.lng); };
    const onAnomalyFn = () => setAnomaly(true);
    const onAccepted  = () => { fetchActive(id); toast.success('🎉 A carrier accepted your request!'); };

    on('pickup_verified',    onPickup);
    on('delivery_completed', onCompleted);
    on('delivery_cancelled', onCancelled);
    on('carrier_location',   onLocation);
    on('carrier_anomaly',    onAnomalyFn);
    on('delivery_accepted',  onAccepted);

    return () => {
      leaveDeliveryRoom(id);
      off('pickup_verified',    onPickup);
      off('delivery_completed', onCompleted);
      off('delivery_cancelled', onCancelled);
      off('carrier_location',   onLocation);
      off('carrier_anomaly',    onAnomalyFn);
      off('delivery_accepted',  onAccepted);
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [id]);

  const startGPS = () => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      pos => deliveryAPI.updateLocation(id, { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {}),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };

  useEffect(() => {
    if (active && isCarrier && ['accepted', 'pickup_verified', 'in_transit'].includes(active.status)) {
      startGPS();
    }
  }, [active?._id, active?.status, isCarrier]);

  const confirmOtp = async () => {
    if (otp.length < 4) return toast.error('Enter 4-digit OTP');
    setOtpLoading(true);
    try {
      if (otpMode === 'pickup') {
        await deliveryAPI.verifyPickup(id, { otp });
        toast.success('✅ Pickup verified! Head to the hostel.');
        updateActiveStatus('pickup_verified');
        if (isCarrier) startGPS();
      } else {
        await deliveryAPI.confirmDelivery(id, { otp });
        toast.success('🎉 Delivered! Payment released.');
        updateActiveStatus('delivered');
        clearActiveOtps();
        setRateModal(true);
      }
      setOtpModal(false);
      setOtp('');
      fetchActive(id);
    } catch (e) { toast.error(e.message); }
    finally { setOtpLoading(false); }
  };

  const handleRefreshOtp = async () => {
    try {
      const res = await deliveryAPI.refreshOtp(id);
      // Push new OTP into the store so the displayed cards update immediately
      useDeliveryStore.setState(s => ({
        activeOtps: {
          ...s.activeOtps,
          deliveryId:  id,
          pickupOtp:   res.pickupOtp   ?? s.activeOtps?.pickupOtp,
          deliveryOtp: res.deliveryOtp ?? s.activeOtps?.deliveryOtp,
        },
      }));
      toast.success('🔄 OTP refreshed!');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const submitRating = async () => {
    setRateLoading(true);
    try {
      await ratingsAPI.submit(id, { stars });
      toast.success('⭐ Rating submitted!');
      setRateModal(false);
      navigate(isCarrier ? '/carrier' : '/dashboard');
    } catch (e) { toast.error(e.message); }
    finally { setRateLoading(false); }
  };

  const cancelDelivery = async () => {
    if (!confirm('Cancel this delivery? Full refund will be issued.')) return;
    try {
      await deliveryAPI.cancel(id, 'Cancelled by receiver');
      toast.success('Cancelled. Refund issued.');
      navigate('/dashboard');
    } catch (e) { toast.error(e.message); }
  };

  if (!active) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-4xl mb-3">📦</div>
        <p className="text-muted">Loading delivery...</p>
      </div>
    </div>
  );

  const steps = [
    { label:'Request Posted',     sub: active.createdAt   ? new Date(active.createdAt).toLocaleTimeString()   : '', done: true },
    { label:'Carrier Found',      sub: active.carrier?.fullName || '',                                              done: ['accepted','pickup_verified','in_transit','delivered'].includes(active.status), active: active.status === 'pending' },
    { label:'Parcel Picked Up',   sub: active.pickedUpAt  ? new Date(active.pickedUpAt).toLocaleTimeString()  : '', done: ['pickup_verified','in_transit','delivered'].includes(active.status),           active: active.status === 'accepted' },
    { label:'En Route to Hostel', sub: '',                                                                          done: ['in_transit','delivered'].includes(active.status),                               active: active.status === 'pickup_verified' },
    { label:'Delivered ✅',        sub: active.deliveredAt ? new Date(active.deliveredAt).toLocaleTimeString() : '', done: active.status === 'delivered',                                                   active: active.status === 'in_transit' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Live Tracking</h1>
          <p className="text-muted text-sm mt-1">Delivery {active.deliveryCode}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={STATUS[active.status]?.color || 'gray'}>{STATUS[active.status]?.label}</Badge>
          <Link to={`/chat/${id}`}>
            <Button variant="muted" size="sm" icon={MessageSquare}>Chat</Button>
          </Link>
        </div>
      </div>

      {/* Anomaly Alert */}
      {anomaly && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-yellow-800">Carrier appears far from campus</p>
            <p className="text-xs text-yellow-600">Please contact them via chat</p>
          </div>
          <Link to={`/chat/${id}`}><Button size="sm" variant="ghost">Chat →</Button></Link>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left col */}
        <div className="space-y-4">
          {/* Map placeholder */}
          <Card className="overflow-hidden p-0">
            <div className="bg-gradient-to-br from-emerald-50 to-green-100 h-48 relative flex items-center justify-center">
              {[0,1,2,3].map(i => (
                <React.Fragment key={i}>
                  <div className="absolute inset-x-0" style={{top:`${25*i}%`,height:'1px',backgroundColor:'rgba(0,0,0,0.05)'}} />
                  <div className="absolute inset-y-0" style={{left:`${25*i}%`,width:'1px',backgroundColor:'rgba(0,0,0,0.05)'}} />
                </React.Fragment>
              ))}
              <div className="absolute top-8 left-12 text-center">
                <div className="w-9 h-9 bg-campus-dark rounded-xl flex items-center justify-center text-lg shadow-lg">🏫</div>
                <p className="text-xs font-bold text-campus-dark mt-1">Main Gate</p>
              </div>
              {active.carrierLat && (
                <div className="absolute" style={{bottom:'30%',right:'25%'}}>
                  <div className="relative">
                    <div className="w-11 h-11 bg-brand rounded-full flex items-center justify-center text-xl shadow-lg shadow-brand/30 animate-bounce">🛵</div>
                    <div className="absolute -inset-1 bg-brand/20 rounded-full animate-ping" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-8 right-8">
                <div className="w-9 h-9 bg-success rounded-xl flex items-center justify-center text-lg shadow-lg">🏠</div>
                <p className="text-xs font-bold text-success mt-1 text-right">{active.destination?.hostelBlock}</p>
              </div>
              {!active.carrierLat && (
                <div className="text-center z-10">
                  <Navigation className="w-6 h-6 text-muted mx-auto mb-1" />
                  <p className="text-sm text-muted font-medium">Waiting for carrier location...</p>
                </div>
              )}
            </div>
          </Card>

          {/* Carrier info */}
          {active.carrier && (
            <Card>
              <div className="flex items-center gap-3">
                <Avatar name={active.carrier.fullName} size="lg" />
                <div className="flex-1">
                  <p className="font-black text-campus-dark">{active.carrier.fullName}</p>
                  <StarRating value={active.carrier.rating?.average || 0} />
                  <p className="text-xs text-muted mt-1">{active.carrier.stats?.deliveriesAsCarrier || 0} deliveries completed</p>
                </div>
                {active.carrierLat && <LiveDot label="Live" />}
              </div>
            </Card>
          )}

          {/* OTPs for receiver — from store, not navigation state */}
          {isReceiver && pickupOtp && active.status !== 'delivered' && (
            <Card className="bg-orange-50 border-orange-200">
              <p className="font-black text-brand mb-3">🔑 Your OTPs — Share with carrier</p>
              <button onClick={handleRefreshOtp}
              className="text-xs text-brand font-bold hover:underline">
        🔄 Refresh OTP
      </button>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'PICKUP OTP',   code: pickupOtp,   used: ['pickup_verified','in_transit','delivered'].includes(active.status) },
                  { label:'DELIVERY OTP', code: deliveryOtp, used: active.status === 'delivered' },
                ].map(o => (
                  <div key={o.label} className={`border-2 rounded-xl p-3 text-center ${o.used ? 'border-success bg-emerald-50' : 'border-brand bg-white'}`}>
                    <p className="text-xs font-black text-muted mb-1">{o.label}</p>
                    <p className={`text-3xl font-black tracking-[0.3em] ${o.used ? 'text-success line-through' : 'text-brand'}`}>{o.code}</p>
                    <p className="text-xs text-muted mt-1">{o.used ? '✅ Used' : 'Share when carrier arrives'}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Timeline */}
          <Card>
            <h3 className="font-black text-campus-dark mb-4">Progress</h3>
            <Timeline steps={steps} />
          </Card>

          {/* Package info */}
          <Card>
            <h3 className="font-black text-campus-dark mb-3">Package Details</h3>
            <div className="space-y-2 text-sm">
              {[
                ['App',         `${app.emoji} ${app.label}`],
                ['Item',        active.package?.description],
              ['Deliver to', active.destination?.hostelBlock || '—'],
                ['Commission',  `₹${active.commission?.current}`],
                ['Delivery ID', active.deliveryCode],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted font-medium">{k}</span>
                  <span className="font-bold text-campus-dark text-right max-w-[60%]">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Action buttons */}
          <div className="space-y-2">
            {isCarrier && active.status === 'accepted' && (
              <Button className="w-full" onClick={() => { setOtpMode('pickup'); setOtpModal(true); }}>
                📦 I've Reached the Gate — Enter Pickup OTP
              </Button>
            )}
            {isCarrier && active.status === 'pickup_verified' && (
              <Button className="w-full" onClick={() => { setOtpMode('delivery'); setOtpModal(true); }}>
                🏠 I'm at the Hostel — Confirm Delivery
              </Button>
            )}

            <Link to={`/chat/${id}`} className="block">
              <Button variant="muted" className="w-full" icon={MessageSquare}>Open Chat</Button>
            </Link>

            {['accepted','pickup_verified','in_transit'].includes(active.status) && (
              <Link to={`/dispute/${id}`} className="block">
                <Button variant="ghost" className="w-full text-muted border-gray-200 hover:border-danger hover:text-danger">
                  ⚠️ Report an Issue
                </Button>
              </Link>
            )}

            {isReceiver && active.status === 'pending' && (
              <Button variant="danger" className="w-full" onClick={cancelDelivery}>
                Cancel Request
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      <Modal open={otpModal} onClose={() => { setOtpModal(false); setOtp(''); }}
        title={otpMode === 'pickup' ? '📦 Verify Pickup OTP' : '🔑 Confirm Delivery OTP'}>
        <p className="text-sm text-muted mb-1">
          {isCarrier ? 'Enter the OTP shared by the receiver' : 'Share this OTP with your carrier to confirm'}
        </p>
        <OtpInput value={otp} onChange={setOtp} />
        <Button className="w-full" loading={otpLoading} onClick={confirmOtp}>Confirm ✅</Button>
        <Button variant="muted" className="w-full mt-2" onClick={() => { setOtpModal(false); setOtp(''); }}>Cancel</Button>
      </Modal>

      {/* Rate Modal */}
      <Modal open={rateModal} onClose={() => { setRateModal(false); navigate(isCarrier ? '/carrier' : '/dashboard'); }} title="🎉 Rate Your Experience">
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">{isCarrier ? '💰' : '🎉'}</div>
          <p className="font-black text-xl text-campus-dark">
            {isCarrier ? `₹${active.commission?.paid || active.commission?.current} Earned!` : 'Parcel Delivered!'}
          </p>
          <p className="text-sm text-muted mt-1">
            {isCarrier ? 'Payment credited to your wallet' : 'Your order arrived safely'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 mb-5">
          <p className="text-sm font-semibold text-campus-dark mb-3 text-center">
            Rate {isReceiver ? active.carrier?.fullName : active.receiver?.fullName}
          </p>
          <div className="flex justify-center">
            <StarRating value={stars} interactive onRate={setStars} size="lg" />
          </div>
          <p className="text-xs text-muted text-center mt-2">
            {stars === 5 ? 'Excellent! 🌟' : stars === 4 ? 'Good 😊' : stars === 3 ? 'Average 😐' : stars <= 2 ? 'Poor 😕' : ''}
          </p>
        </div>
        <Button className="w-full" loading={rateLoading} onClick={submitRating}>Submit Rating ⭐</Button>
        <Button variant="muted" className="w-full mt-2"
          onClick={() => { setRateModal(false); navigate(isCarrier ? '/carrier' : '/dashboard'); }}>
          Skip
        </Button>
      </Modal>
    </div>
  );
}
