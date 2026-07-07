import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input, Textarea, Card, SectionLabel } from '../../components/common/UI';
import useAuthStore from '../../store/authStore';
import useDeliveryStore from '../../store/deliveryStore';

const APPS = [
  { key:'zomato',   label:'Zomato',   emoji:'🍕', color:'#CB202D' },
  { key:'blinkit',  label:'Blinkit',  emoji:'⚡', color:'#F8CB2E' },
  { key:'swiggy',   label:'Swiggy',   emoji:'🛵', color:'#FC8019' },
  { key:'amazon',   label:'Amazon',   emoji:'📦', color:'#FF9900' },
  { key:'flipkart', label:'Flipkart', emoji:'🛍️', color:'#2874F0' },
  { key:'other',    label:'Other',    emoji:'📫', color:'#7B7B8F' },
];

const MIN_COMM    = 30;
const PLATFORM_CUT= 7;

export default function PostDelivery() {
  const user    = useAuthStore(s => s.user);
  const create  = useDeliveryStore(s => s.create);
  const navigate = useNavigate();

  const [app,     setApp]     = useState('');
  const [desc,    setDesc]    = useState('');
  const [fragile, setFragile] = useState(false);
  const [fromT,   setFromT]   = useState('14:00');
  const [toT,     setToT]     = useState('14:30');
  const [block,   setBlock]   = useState(user?.college?.hostelBlock || '');
  const [landmark,setLandmark]= useState('');
  const [comm,    setComm]    = useState(MIN_COMM);
  const [loading, setLoading] = useState(false);

  const total     = comm + PLATFORM_CUT;
  const canAfford = (user?.wallet?.balance || 0) >= total;

  const submit = async () => {
    if (!app)           return toast.error('Select a delivery app');
    if (!desc.trim())   return toast.error('Add a package description');
    if (!block.trim())  return toast.error('Enter hostel block');
    if (!canAfford)     return toast.error(`Need ₹${total} in wallet. Add money first.`);

    setLoading(true);
    try {
      const today = new Date().toDateString();
      const res   = await create({
        app, description: desc, isFragile: fragile,
        windowFrom:  new Date(`${today} ${fromT}`).toISOString(),
        windowTo:    new Date(`${today} ${toT}`).toISOString(),
        hostelBlock: block, roomNumber: '', landmark,
        commission:  comm,
      });
      toast.success('🎉 Request posted! Carriers nearby can see it.');
      navigate(`/track/${res.delivery._id}`, {
        state: { pickupOtp: res.pickupOtp, deliveryOtp: res.deliveryOtp },
      });
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Post Delivery Request</h1>
          <p className="text-muted text-sm mt-1">Someone will pick it up on their way in</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* App Selector */}
        <Card>
          <SectionLabel>Delivery App</SectionLabel>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {APPS.map(a => (
              <button key={a.key} onClick={() => setApp(a.key)}
                className={`rounded-xl p-3 flex flex-col items-center gap-1.5 border-2 transition-all ${
                  app === a.key ? 'border-brand bg-orange-50' : 'border-transparent hover:border-gray-200'
                }`}>
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-xs font-semibold text-campus-dark">{a.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Package Info */}
        <Card>
          <SectionLabel>Package Details</SectionLabel>
          <Textarea label="Description" placeholder="e.g. 2 boxes biryani, 1 cold drink — Zomato order" value={desc}
            onChange={e => setDesc(e.target.value)} rows={3} />
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${fragile ? 'bg-brand border-brand' : 'border-gray-300'}`}
              onClick={() => setFragile(v => !v)}>
              {fragile && <span className="text-white text-xs font-black">✓</span>}
            </div>
            <span className="text-sm font-medium text-campus-dark">🥚 Mark as fragile — handle with care</span>
          </label>
        </Card>

        {/* Delivery Window */}
        <Card>
          <SectionLabel className="flex items-center gap-2"><Clock className="w-3 h-3" />Delivery Window</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Input label="From" type="time" value={fromT} onChange={e => setFromT(e.target.value)} />
            <Input label="To"   type="time" value={toT}   onChange={e => setToT(e.target.value)} />
          </div>
          <p className="text-xs text-muted">Give a 30-min buffer around the expected delivery time</p>
        </Card>

        {/* Destination */}
        <Card>
          <SectionLabel className="flex items-center gap-2"><MapPin className="w-3 h-3" />Delivery Destination</SectionLabel>
          <Input label="Hostel Block" placeholder="e.g. Block C" value={block} onChange={e => setBlock(e.target.value)} />
          <Input label="Room Number" placeholder="e.g. C-204"
  value={room} onChange={e => setRoom(e.target.value)} />
          <Input label="Landmark (optional)" placeholder="e.g. Near the water cooler" value={landmark}
            onChange={e => setLandmark(e.target.value)} />
        </Card>

        {/* Commission */}
        <Card className="bg-orange-50 border-orange-200">
          <SectionLabel>Commission Offer</SectionLabel>
          <div className="flex items-center gap-4 mb-3">
            <button onClick={() => setComm(c => Math.max(MIN_COMM, c - 5))}
              className="w-10 h-10 rounded-xl border-2 border-brand text-brand font-black text-xl hover:bg-orange-100 transition-colors flex items-center justify-center">−</button>
            <div className="flex-1 text-center">
              <p className="text-4xl font-black text-brand">₹{comm}</p>
              <p className="text-xs text-muted mt-1">Higher = faster pickup!</p>
            </div>
            <button onClick={() => setComm(c => Math.min(100, c + 5))}
              className="w-10 h-10 rounded-xl bg-brand text-white font-black text-xl hover:bg-brand-dark transition-colors flex items-center justify-center">+</button>
          </div>

          <div className="bg-white rounded-xl p-3 space-y-2">
            {[['Commission', `₹${comm}`], ['Platform fee', `₹${PLATFORM_CUT}`]].map(([k,v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-muted">{k}</span><span className="font-semibold">{v}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex justify-between text-sm font-bold">
              <span>Total deducted</span><span className="text-campus-dark">₹{total}</span>
            </div>
          </div>

          <div className="mt-3 bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-700 font-medium">
              🔒 ₹{total} locked in escrow. Released to carrier only after OTP confirmation.
            </p>
          </div>

          {!canAfford && (
            <div className="mt-2 bg-red-50 rounded-xl p-3">
              <p className="text-xs text-danger font-medium">
                ⚠️ Insufficient balance. Add ₹{total - (user?.wallet?.balance || 0)} more.
              </p>
            </div>
          )}

          <p className="text-xs text-muted mt-3 text-center">
            ⏱ Commission auto-rises ₹5 every 5 min if no carrier accepts
          </p>
        </Card>

       <Button onClick={submit} loading={loading} disabled={!canAfford || !user?.isActive} className="w-full" size="lg">
  {!user?.isActive ? '⏳ Account pending KYC approval' : `🚀 Post Request — ₹${comm}`}
</Button>
      </div>
    </div>
  );
}
