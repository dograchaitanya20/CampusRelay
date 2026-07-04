import React, { useEffect, useState } from 'react';
import { RefreshCw, Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Avatar, Badge, EmptyState, Modal } from '../../components/common/UI';
import { adminAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

const REASON_LABELS = {
  not_received:    '📭 Parcel Not Received',
  damaged:         '💔 Parcel Damaged',
  wrong_item:      '🔄 Wrong Item',
  carrier_missing: '🚫 Carrier Unreachable',
  otp_issue:       '🔑 OTP Problem',
  other:           '❓ Other',
};

export default function AdminDisputes() {
  const [disputes,  setDisputes]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [resolveModal, setResolveModal] = useState(null);
  const [favouring,    setFavouring]    = useState('');
  const [resolution,   setResolution]   = useState('');
  const [processing,   setProcessing]   = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const r = await adminAPI.getDisputes(); setDisputes(r.disputes || []); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const resolve = async () => {
    if (!favouring)          return toast.error('Select who to favour');
    if (!resolution.trim())  return toast.error('Enter resolution notes');
    setProcessing(resolveModal._id);
    try {
      await adminAPI.resolveDispute(resolveModal._id, { favouring, resolution });
      toast.success('⚖️ Dispute resolved!');
      setDisputes(d => d.filter(x => x._id !== resolveModal._id));
      setResolveModal(null); setFavouring(''); setResolution('');
    } catch (e) { toast.error(e.message); }
    finally { setProcessing(null); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Disputes</h1>
          <p className="text-muted text-sm mt-1">{disputes.length} open disputes</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-xl hover:bg-gray-100">
          <RefreshCw className={`w-5 h-5 text-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse"/>)}</div>
      ) : disputes.length === 0 ? (
        <EmptyState emoji="⚖️" title="No open disputes" subtitle="All disputes have been resolved." />
      ) : (
        <div className="space-y-4">
          {disputes.map(d => (
            <Card key={d._id} className="border-l-4 border-l-danger">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-campus-dark">{d.deliveryCode}</h3>
                    <Badge color="red">⚠️ Open</Badge>
                  </div>
                  <p className="text-sm font-bold text-danger">
                    {REASON_LABELS[d.dispute?.reason] || d.dispute?.reason}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Raised {d.dispute?.raisedBy?.fullName ? `by ${d.dispute.raisedBy.fullName} · ` : ''}
                    {formatDistanceToNow(new Date(d.updatedAt || Date.now()), { addSuffix: true })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-brand">₹{d.commission?.current}</p>
                  <p className="text-xs text-muted">in dispute</p>
                </div>
              </div>

              {/* Description */}
              {d.dispute?.description && (
                <div className="bg-red-50 rounded-xl p-3 mb-3">
                  <p className="text-sm text-danger font-medium">{d.dispute.description}</p>
                </div>
              )}

              {/* Parties */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[
                  { label: '👤 Receiver', user: d.receiver },
                  { label: '🛵 Carrier',  user: d.carrier  },
                ].map(({ label, user: u }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-muted font-semibold mb-1">{label}</p>
                    {u ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={u.fullName} size="xs" />
                        <div>
                          <p className="text-sm font-bold">{u.fullName}</p>
                          <p className="text-xs text-muted">{u.phone}</p>
                        </div>
                      </div>
                    ) : <p className="text-sm text-muted">Not assigned</p>}
                  </div>
                ))}
              </div>

              {/* Package */}
              <div className="flex items-center gap-4 text-sm text-muted mb-4 px-1">
                <span>📦 {d.package?.description}</span>
                <span>🏠 {d.destination?.hostelBlock} · {d.destination?.roomNumber}</span>
              </div>

              <Button className="w-full" icon={Scale}
                onClick={() => { setResolveModal(d); setFavouring(''); setResolution(''); }}>
                Resolve Dispute ⚖️
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      <Modal open={!!resolveModal} onClose={() => setResolveModal(null)} title="Resolve Dispute ⚖️" maxWidth="max-w-lg">
        <p className="text-sm text-muted mb-4">
          Review the case and decide in favour of one party. Payments will be settled accordingly.
        </p>

        <p className="text-xs font-black text-muted uppercase tracking-wider mb-2">Rule in Favour Of</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { key: 'receiver', label: '👤 Receiver', desc: 'Full refund issued to receiver' },
            { key: 'carrier',  label: '🛵 Carrier',  desc: 'Commission paid to carrier'    },
          ].map(o => (
            <button key={o.key} onClick={() => setFavouring(o.key)}
              className={`border-2 rounded-xl p-3 text-left transition-all ${
                favouring === o.key ? 'border-brand bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <p className="font-bold text-sm text-campus-dark">{o.label}</p>
              <p className="text-xs text-muted mt-0.5">{o.desc}</p>
            </button>
          ))}
        </div>

        <label className="input-label">Resolution Notes</label>
        <textarea value={resolution} onChange={e => setResolution(e.target.value)}
          placeholder="Explain the decision — this will be shown to both parties..."
          rows={3} className="input-field w-full resize-none mb-5" />

        <div className="bg-yellow-50 rounded-xl p-3 mb-5">
          <p className="text-xs text-yellow-700 font-medium">
            ⚠️ This action is irreversible. Both parties will be notified via push notification.
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="muted" className="flex-1" onClick={() => setResolveModal(null)}>Cancel</Button>
          <Button className="flex-1" loading={!!processing} onClick={resolve}>Confirm Resolution</Button>
        </div>
      </Modal>
    </div>
  );
}
