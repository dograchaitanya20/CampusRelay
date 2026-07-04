import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '../../components/common/UI';
import { authAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const DOCS = [
  { key:'collegeId', label:'College ID Card',  emoji:'🪪', hint:'Front side, clearly visible',         required:true,  selfieOnly:false },
  { key:'aadhaar',   label:'Aadhaar Card',      emoji:'📋', hint:'Front + back (optional but helpful)',  required:false, selfieOnly:false },
  { key:'selfie',    label:'Live Selfie',        emoji:'🤳', hint:'AI matches this with your College ID', required:true,  selfieOnly:true  },
];

const MAX_SIZE_MB   = 8;
const MIN_SIZE_KB   = 10; // real images are always >10KB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const DOC_TYPES     = [...ALLOWED_TYPES, 'application/pdf']; // aadhaar/collegeId can be PDF

export default function KYC() {
  const [files,    setFiles]    = useState({});
  const [previews, setPreviews] = useState({});
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const { refreshUser } = useAuthStore();
  const navigate = useNavigate();

  const handleFile = (key, file) => {
    if (!file) return;

    const doc       = DOCS.find(d => d.key === key);
    const allowed   = doc?.selfieOnly ? ALLOWED_TYPES : DOC_TYPES;
    const maxBytes  = MAX_SIZE_MB * 1024 * 1024;
    const minBytes  = MIN_SIZE_KB * 1024;

    // Type check
    if (!allowed.includes(file.type)) {
      const fmt = doc?.selfieOnly ? 'JPG, PNG or WEBP' : 'JPG, PNG, WEBP or PDF';
      toast.error(`${doc?.label}: only ${fmt} allowed`);
      return;
    }

    // Size checks
    if (file.size > maxBytes) {
      toast.error(`File too large — maximum ${MAX_SIZE_MB}MB`);
      return;
    }
    if (file.size < minBytes) {
      toast.error('File too small to be a valid document — use a real photo');
      return;
    }

    // Selfie must not be a PDF
    if (key === 'selfie' && file.type === 'application/pdf') {
      toast.error('Selfie must be a photo, not a PDF');
      return;
    }

    setFiles(f => ({ ...f, [key]: file }));

    // Preview: only for images (not PDF)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews(p => ({ ...p, [key]: reader.result }));
      reader.readAsDataURL(file);
    } else {
      // For PDF show a placeholder
      setPreviews(p => ({ ...p, [key]: null }));
    }
  };

  const submit = async () => {
    if (!files.collegeId || !files.selfie)
      return toast.error('College ID and Selfie are required');

    // Catch same-file-for-both trick
    if (
      files.collegeId &&
      files.selfie &&
      files.collegeId.size === files.selfie.size &&
      files.collegeId.name === files.selfie.name
    ) {
      toast.error('Selfie and College ID cannot be the same file');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      Object.entries(files).forEach(([k, v]) => form.append(k, v));
      const res = await authAPI.submitKyc(form);
      toast.success(
        res.faceMatchPassed
          ? `✅ AI Match: ${res.faceMatchScore}%! Awaiting admin approval.`
          : 'Documents submitted! Admin will review shortly.'
      );
      await refreshUser();
      setDone(true);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-campus-dark flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-10">
        <div className="text-6xl mb-5">⏳</div>
        <h2 className="text-2xl font-black text-campus-dark mb-3">Verification Pending</h2>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          AI has checked your documents.<br />
          Admin will approve within 2–4 hours.<br />
          You'll be notified once approved!
        </p>
        <div className="space-y-2 text-left mb-6">
          {['Documents Uploaded ✅', 'AI Face Match Complete ✅', 'Admin Review — Queued ⏳'].map(s => (
            <div key={s} className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              {s}
            </div>
          ))}
        </div>
        <Button className="w-full" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-campus-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-xl">📦</div>
          <span className="text-2xl font-black text-white">Campus<span className="text-brand">Relay</span></span>
        </div>

        <Card className="p-8">
          <h2 className="text-2xl font-black text-campus-dark mb-1">Verify Identity 🔐</h2>
          <p className="text-muted text-sm mb-2">Required for campus safety. All docs encrypted &amp; never shared.</p>

          <div className="bg-blue-50 rounded-xl p-3 mb-2">
            <p className="text-sm text-blue-700 font-medium">
              🤖 AI will match your selfie to your College ID in under 2 minutes.
            </p>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 mb-6">
            <p className="text-xs text-amber-700 font-medium flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Photos must be clear, unedited, and taken from the actual document.
              Max {MAX_SIZE_MB}MB per file. JPG/PNG/PDF accepted.
            </p>
          </div>

          <div className="space-y-4">
            {DOCS.map(doc => (
              <div key={doc.key}
                className={`border-2 rounded-2xl p-4 transition-colors
                  ${files[doc.key] ? 'border-success bg-emerald-50' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {doc.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-campus-dark">{doc.label}</p>
                      {doc.required && <span className="chip chip-orange text-xs">Required</span>}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{doc.hint}</p>
                    {files[doc.key] && (
                      <p className="text-xs text-success font-semibold mt-0.5">
                        ✓ {files[doc.key].name} ({(files[doc.key].size / 1024).toFixed(0)}KB)
                      </p>
                    )}
                  </div>
                  {files[doc.key]
                    ? <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
                    : <Upload className="w-5 h-5 text-muted flex-shrink-0" />}
                </div>

                {previews[doc.key] && (
                  <img src={previews[doc.key]} alt={doc.label}
                    className="w-full h-28 object-cover rounded-xl mt-3" />
                )}

                {files[doc.key] && !previews[doc.key] && (
                  <div className="mt-3 bg-gray-100 rounded-xl h-12 flex items-center justify-center">
                    <p className="text-xs text-muted font-medium">📄 PDF selected</p>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  {/* Camera — image only */}
                  <label className="flex-1 cursor-pointer">
                    <input type="file"
                      accept={doc.selfieOnly ? 'image/*' : 'image/*'}
                      capture="environment"
                      className="hidden"
                      onChange={e => handleFile(doc.key, e.target.files[0])} />
                    <div className="border border-gray-200 rounded-xl py-2 text-center text-sm font-medium text-campus-dark hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Camera
                    </div>
                  </label>
                  {/* Gallery — image or PDF for docs, image-only for selfie */}
                  <label className="flex-1 cursor-pointer">
                    <input type="file"
                      accept={doc.selfieOnly ? 'image/jpeg,image/png,image/webp' : 'image/*,application/pdf'}
                      className="hidden"
                      onChange={e => handleFile(doc.key, e.target.files[0])} />
                    <div className="border border-gray-200 rounded-xl py-2 text-center text-sm font-medium text-campus-dark hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" /> Gallery
                    </div>
                  </label>
                  {/* Remove button if file selected */}
                  {files[doc.key] && (
                    <button
                      onClick={() => {
                        setFiles(f  => { const n = { ...f };  delete n[doc.key]; return n; });
                        setPreviews(p => { const n = { ...p }; delete n[doc.key]; return n; });
                      }}
                      className="px-3 border border-red-200 rounded-xl text-red-400 hover:bg-red-50 text-xs font-bold">
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button className="w-full mt-6" loading={loading} onClick={submit}>
            Submit for Verification 🚀
          </Button>
          <p className="text-center text-xs text-muted mt-3">
            🔒 Documents stored encrypted. Used only for identity verification.
          </p>
        </Card>
      </div>
    </div>
  );
}
