import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Textarea, SectionLabel } from '../../components/common/UI';
import { deliveryAPI } from '../../services/api';

const REASONS = [
  { key: 'not_received',    label: '📭 Parcel Not Received',   desc: 'Carrier marked delivered but I never got it' },
  { key: 'damaged',         label: '💔 Parcel Damaged',         desc: 'Item was damaged during delivery' },
  { key: 'wrong_item',      label: '🔄 Wrong Item Delivered',   desc: 'Received a different order' },
  { key: 'carrier_missing', label: '🚫 Carrier Unreachable',    desc: 'Carrier not responding or disappeared' },
  { key: 'otp_issue',       label: '🔑 OTP Problem',            desc: 'Issue with OTP verification' },
  { key: 'other',           label: '❓ Other Issue',            desc: 'Something else went wrong' },
];

export default function Dispute() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [reason,  setReason]  = useState('');
  const [desc,    setDesc]    = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason)      return toast.error('Select a reason');
    if (!desc.trim()) return toast.error('Describe the issue');
    setLoading(true);
    try {
      await deliveryAPI.dispute(id, { reason, description: desc });
      toast.success('⚖️ Dispute raised. Our team will review within 24 hours.');
      navigate('/dashboard');
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Report an Issue</h1>
          <p className="text-muted text-sm mt-1">Admin reviews within 24 hours</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-5 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800 font-medium leading-relaxed">
          Raising a dispute freezes all payments until resolved. Please only use this for genuine issues.
        </p>
      </div>

      <Card className="mb-4">
        <SectionLabel>Select Reason</SectionLabel>
        <div className="space-y-2">
          {REASONS.map(r => (
            <button key={r.key} onClick={() => setReason(r.key)}
              className={`w-full text-left border-2 rounded-xl p-3 transition-all ${reason === r.key ? 'border-brand bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-campus-dark">{r.label}</p>
                  <p className="text-xs text-muted mt-0.5">{r.desc}</p>
                </div>
                {reason === r.key && (
                  <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-black">✓</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-5">
        <Textarea label="Describe the Issue" placeholder="Give as much detail as possible — what happened, when, what you expected..."
          value={desc} onChange={e => setDesc(e.target.value)} rows={5} />
      </Card>

      <div className="flex gap-3">
        <Button variant="muted" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
        <Button variant="danger" className="flex-1" loading={loading} onClick={submit}>Submit Dispute ⚖️</Button>
      </div>
    </div>
  );
}
