import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '../../components/common/UI';
import { authAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { on, off } from '../../services/socket';

const DOCS = [
  { key:'collegeId', label:'College ID Card',  emoji:'🪪', hint:'Front side, clearly visible — good lighting',  required:true,  camOnly:false },
  { key:'aadhaar',   label:'Aadhaar Card',      emoji:'📋', hint:'Front + back (optional but recommended)',      required:false, camOnly:false },
  { key:'selfie',    label:'Live Selfie',       emoji:'🤳', hint:'Look straight at camera, good lighting — AI matches this to your College ID', required:true, camOnly:true },
];

const TIPS = [
  'Use good lighting — avoid shadows on your face',
  'Hold College ID flat and still while photographing',
  'Remove glasses for your selfie if possible',
  'Ensure your full face is visible in the selfie',
];

export default function KYC() {
  const [files,     setFiles]     = useState({});
  const [previews,  setPreviews]  = useState({});
  const [loading,   setLoading]   = useState(false);
  const [status,    setStatus]    = useState('idle'); // idle | uploading | verifying | approved | rejected
  const [score,     setScore]     = useState(null);
  const [rejectMsg, setRejectMsg] = useState('');
  const { refreshUser } = useAuthStore();
  const navigate = useNavigate();

  // Listen for real-time auto-approval from server
  useEffect(() => {
    on('kyc_approved', async () => {
      setStatus('approved');
      setScore(prev => prev);
      await refreshUser();
    });
    return () => off('kyc_approved');
  }, []);

  const handleFile = (key, file) => {
    if (!file) return;
    // Validate file type
    if (!file.type.startsWith('image/'))
      return toast.error('Please upload an image file');
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024)
      return toast.error('File too large — max 5MB');

    setFiles(f => ({ ...f, [key]: file }));
    const reader = new FileReader();
    reader.onloadend = () => setPreviews(p => ({ ...p, [key]: reader.result }));
    reader.readAsDataURL(file);
  };

  const removeFile = (key) => {
    setFiles(f   => { const n = {...f};   delete n[key]; return n; });
    setPreviews(p => { const n = {...p};  delete n[key]; return n; });
  };

  const submit = async () => {
    if (!files.collegeId) return toast.error('College ID is required');
    if (!files.selfie)    return toast.error('Selfie is required');

    setLoading(true);
    setStatus('uploading');

    try {
      setStatus('verifying');
      const form = new FormData();
      Object.entries(files).forEach(([k, v]) => form.append(k, v));
      const res = await authAPI.submitKyc(form);

      setScore(res.faceMatchScore);

      if (res.autoApproved) {
        // Instantly approved by AWS Rekognition
        setStatus('approved');
        await refreshUser();
        toast.success('🎉 Identity verified instantly!');
      } else if (!res.success) {
        // Rejected
        setStatus('rejected');
        setRejectMsg(res.message);
      } else {
        // Submitted but pending admin (dev mode or low confidence)
        setStatus('pending');
        await refreshUser();
        toast.success('Documents submitted! Awaiting admin review.');
      }
    } catch (e) {
      // API returned error (e.g. face mismatch)
      setStatus('rejected');
      setScore(e.response?.data?.faceMatchScore || null);
      setRejectMsg(e.message || 'Verification failed. Please try again.');
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFiles({});
    setPreviews({});
    setStatus('idle');
    setScore(null);
    setRejectMsg('');
  };

  // ── AUTO APPROVED ──────────────────────────────────────────────────────────
  if (status === 'approved') return (
    <div className="min-h-screen bg-campus-dark flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-10">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-2xl font-black text-campus-dark mb-2">Identity Verified! 🎉</h2>
        <p className="text-muted text-sm mb-2">AWS Rekognition confirmed your identity</p>
        {score && (
          <div className="bg-emerald-50 rounded-xl p-3 mb-5">
            <p className="text-sm font-bold text-success">AI Confidence: {score}%</p>
            <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-success rounded-full transition-all" style={{ width: `${score}%` }} />
            </div>
          </div>
        )}
        <div className="space-y-2 text-left mb-6">
          {['Face match verified ✅', 'No duplicate account found ✅', 'Account activated instantly ✅'].map(s => (
            <div key={s} className="flex items-center gap-2 text-sm font-medium text-campus-dark">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" /> {s}
            </div>
          ))}
        </div>
        <Button className="w-full" onClick={() => navigate('/dashboard')}>
          Go to Dashboard →
        </Button>
      </Card>
    </div>
  );

  // ── PENDING ADMIN ──────────────────────────────────────────────────────────
  if (status === 'pending') return (
    <div className="min-h-screen bg-campus-dark flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-10">
        <div className="text-6xl mb-5">⏳</div>
        <h2 className="text-2xl font-black text-campus-dark mb-2">Under Review</h2>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          Documents submitted. Admin will review within 2–4 hours. You'll be notified once approved.
        </p>
        <Button className="w-full" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </Card>
    </div>
  );

  // ── REJECTED ───────────────────────────────────────────────────────────────
  if (status === 'rejected') return (
    <div className="min-h-screen bg-campus-dark flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-10">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle className="w-10 h-10 text-danger" />
        </div>
        <h2 className="text-2xl font-black text-campus-dark mb-2">Verification Failed</h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-left">
          <p className="text-sm font-bold text-danger mb-1">Reason:</p>
          <p className="text-sm text-danger">{rejectMsg}</p>
          {score !== null && score > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted">Face match confidence: {score}% (need 80%+)</p>
              <div className="h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-danger rounded-full" style={{ width: `${score}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 mb-5 text-left">
          <p className="text-xs font-bold text-yellow-700 mb-2">Tips to pass verification:</p>
          {TIPS.map(t => <p key={t} className="text-xs text-yellow-600 mb-1">• {t}</p>)}
        </div>
        <Button className="w-full" onClick={reset}>Try Again →</Button>
        <p className="text-xs text-muted mt-3">You have unlimited retry attempts</p>
      </Card>
    </div>
  );

  // ── UPLOADING / VERIFYING ──────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-campus-dark flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-10">
        <Loader2 className="w-12 h-12 text-brand animate-spin mx-auto mb-5" />
        <h2 className="text-xl font-black text-campus-dark mb-2">
          {status === 'uploading' ? 'Uploading Documents...' : 'Running AI Verification...'}
        </h2>
        <p className="text-muted text-sm">
          {status === 'uploading'
            ? 'Securely uploading your documents to encrypted storage'
            : 'AWS Rekognition is comparing your selfie to your College ID'}
        </p>
        <div className="mt-5 space-y-2">
          {[
            { label: 'Upload documents',        done: status !== 'uploading' },
            { label: 'AI face comparison',       done: status === 'approved'  },
            { label: 'Duplicate account check',  done: status === 'approved'  },
            { label: 'Activate account',         done: status === 'approved'  },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 text-sm">
              {s.done
                ? <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                : <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />}
              <span className={s.done ? 'text-success font-medium' : 'text-muted'}>{s.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // ── UPLOAD FORM ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-campus-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-xl">📦</div>
          <span className="text-2xl font-black text-white">Campus<span className="text-brand">Relay</span></span>
        </div>

        <Card className="p-8">
          <h2 className="text-2xl font-black text-campus-dark mb-1">Verify Identity 🔐</h2>
          <p className="text-muted text-sm mb-4">Required for campus safety. Documents encrypted and never shared.</p>

          {/* AI badge */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6 flex items-center gap-3">
            <div className="text-2xl">🤖</div>
            <div>
              <p className="text-sm font-bold text-blue-700">Powered by AWS Rekognition</p>
              <p className="text-xs text-blue-500">Identity verified in under 30 seconds. Auto-approved if match ≥ 80%.</p>
            </div>
          </div>

          <div className="space-y-4 mb-5">
            {DOCS.map(doc => (
              <div key={doc.key}
                className={`border-2 rounded-2xl p-4 transition-all ${
                  files[doc.key] ? 'border-success bg-emerald-50' : 'border-gray-200'
                }`}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {doc.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-campus-dark">{doc.label}</p>
                      {doc.required
                        ? <span className="chip chip-orange text-xs">Required</span>
                        : <span className="chip chip-gray text-xs">Optional</span>}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{doc.hint}</p>
                  </div>
                  {files[doc.key]
                    ? <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    : <Upload className="w-4 h-4 text-muted flex-shrink-0 mt-0.5" />}
                </div>

                {/* Preview */}
                {previews[doc.key] && (
                  <div className="relative mt-3">
                    <img src={previews[doc.key]} alt={doc.label}
                      className="w-full h-32 object-cover rounded-xl" />
                    <button onClick={() => removeFile(doc.key)}
                      className="absolute top-2 right-2 w-7 h-7 bg-danger rounded-full flex items-center justify-center text-white text-xs font-bold hover:bg-red-700 transition-colors">
                      ✕
                    </button>
                  </div>
                )}

                     {/* Upload buttons */}
                {!files[doc.key] && (
                  <div className="flex gap-2 mt-3">
                    <label className="flex-1 cursor-pointer">
                      <input type="file" accept="image/*,application/pdf" className="hidden"
                        onChange={e => handleFile(doc.key, e.target.files[0])} />
                      <div className="border border-gray-200 rounded-xl py-2 text-center text-sm font-medium text-campus-dark hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Upload
                      </div>
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 rounded-xl p-3 mb-5">
            <p className="text-xs font-bold text-yellow-700 mb-1.5">💡 Tips for instant approval</p>
            {TIPS.map(t => <p key={t} className="text-xs text-yellow-600 mb-0.5">• {t}</p>)}
          </div>

          <Button className="w-full" loading={loading} onClick={submit}>
            Verify Identity — Instant Result 🚀
          </Button>
          <p className="text-center text-xs text-muted mt-3">
            🔒 Encrypted upload · Deleted after verification · Never shared
          </p>
        </Card>
      </div>
    </div>
  );
}
