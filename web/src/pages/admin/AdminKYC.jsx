import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Avatar, Badge, EmptyState, Modal, SectionLabel } from '../../components/common/UI';
import { adminAPI } from '../../services/api';

export default function AdminKYC() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing,   setProcessing]   = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const r = await adminAPI.getKyc(); setUsers(r.users || []); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const approve = async (uid, name) => {
    setProcessing(uid);
    try {
      await adminAPI.approveKyc(uid);
      toast.success(`✅ ${name} approved!`);
      setUsers(u => u.filter(x => x._id !== uid));
    } catch (e) { toast.error(e.message); }
    finally { setProcessing(null); }
  };

  const reject = async () => {
    if (!rejectReason.trim()) return toast.error('Enter a rejection reason');
    setProcessing(rejectModal._id);
    try {
      await adminAPI.rejectKyc(rejectModal._id, rejectReason);
      toast.success(`❌ ${rejectModal.fullName} rejected`);
      setUsers(u => u.filter(x => x._id !== rejectModal._id));
      setRejectModal(null); setRejectReason('');
    } catch (e) { toast.error(e.message); }
    finally { setProcessing(null); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">KYC Queue</h1>
          <p className="text-muted text-sm mt-1">{users.length} pending review</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-xl hover:bg-gray-100">
          <RefreshCw className={`w-5 h-5 text-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse"/>)}</div>
      ) : users.length === 0 ? (
        <EmptyState emoji="✅" title="All caught up!" subtitle="No pending KYC reviews." />
      ) : (
        <div className="space-y-4">
          {users.map(u => (
            <Card key={u._id}>
              <div className="flex items-start gap-4">
                <Avatar name={u.fullName} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-campus-dark">{u.fullName}</h3>
                    <Badge color={u.kyc?.faceMatchPassed ? 'green' : 'yellow'}>
                      🤖 AI: {u.kyc?.faceMatchPassed ? `${u.kyc.faceMatchScore}% ✓` : 'Low confidence'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted mt-1">{u.phone} · {u.college?.branch} · Year {u.college?.year}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Submitted: {u.kyc?.submittedAt ? new Date(u.kyc.submittedAt).toLocaleString() : '—'}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      { label:'College ID', url: u.kyc?.collegeIdUrl },
                      { label:'Aadhaar',    url: u.kyc?.aadhaarUrl   },
                      { label:'Selfie',     url: u.kyc?.selfieUrl    },
                    ].map(doc => (
                      <button key={doc.label}
                        onClick={() => doc.url && setPreview({ url: doc.url, label: doc.label })}
                        disabled={!doc.url}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                          doc.url ? 'border-gray-200 hover:border-brand hover:text-brand cursor-pointer' : 'border-gray-100 text-gray-300 cursor-not-allowed'
                        }`}>
                        <Eye className="w-3 h-3" /> {doc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <Button
                  variant="success" size="sm" className="flex-1"
                  icon={CheckCircle}
                  loading={processing === u._id}
                  onClick={() => approve(u._id, u.fullName)}>
                  Approve
                </Button>
                <Button
                  variant="danger" size="sm" className="flex-1"
                  icon={XCircle}
                  onClick={() => { setRejectModal(u); setRejectReason(''); }}>
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Doc preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.label || 'Document'} maxWidth="max-w-lg">
        {preview?.url?.startsWith('dev://') ? (
          <div className="bg-gray-100 rounded-2xl h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">🖼️</div>
              <p className="text-sm text-muted font-medium">Dev mode — no actual upload</p>
              <p className="text-xs text-muted mt-1">{preview.url}</p>
            </div>
          </div>
        ) : (
          <img src={preview?.url} alt={preview?.label} className="w-full rounded-2xl object-cover max-h-96" />
        )}
      </Modal>

      {/* Reject reason modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title={`Reject ${rejectModal?.fullName}`}>
        <p className="text-sm text-muted mb-3">Provide a reason. The user will be notified.</p>
        <div className="space-y-2 mb-4">
          {['Documents not clear — please re-upload','College ID not visible','Selfie does not match ID','Aadhaar required for verification','Other'].map(r => (
            <button key={r} onClick={() => setRejectReason(r)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium border transition-all ${rejectReason === r ? 'border-danger bg-red-50 text-danger' : 'border-gray-200 hover:border-gray-300'}`}>
              {r}
            </button>
          ))}
        </div>
        <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
          placeholder="Or type a custom reason..."
          className="input-field mb-4" />
        <div className="flex gap-3">
          <Button variant="muted" className="flex-1" onClick={() => setRejectModal(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" loading={!!processing} onClick={reject}>Reject KYC</Button>
        </div>
      </Modal>
    </div>
  );
}
