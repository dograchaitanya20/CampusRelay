import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Input, Select } from '../../components/common/UI';
import useAuthStore from '../../store/authStore';

const STEPS = ['Account', 'Role & College', 'Review'];

export default function Register() {
  const [step,  setStep]  = useState(0);
  const [roles, setRoles] = useState(['receiver']);
  const [form,  setForm]  = useState({
    fullName: '', phone: '', password: '', confirm: '',
    branch: '', year: '1', hostelBlock: '', roomNumber: '', upiId: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleRole = r =>
    setRoles(p => p.includes(r) ? (p.length > 1 ? p.filter(x => x !== r) : p) : [...p, r]);

  // ── FIX: every failure must return false explicitly ──────────────
  const validate0 = () => {
    if (!form.fullName.trim()) {
      toast.error('Enter your full name'); return false;
    }
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      toast.error('Enter a valid 10-digit Indian mobile number'); return false;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters'); return false;
    }
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match'); return false;
    }
    return true;
  };

  const validate1 = () => {
    if (!form.branch.trim()) {
      toast.error('Enter your branch & course'); return false;
    }
    if (roles.includes('receiver') && !form.hostelBlock.trim()) {
      toast.error('Enter your hostel block'); return false;
    }
    if (roles.includes('receiver') && !form.roomNumber.trim()) {
      toast.error('Enter your room number'); return false;
    }
    if (roles.includes('carrier') && form.upiId && !/^[\w.\-]{3,}@[a-zA-Z]{3,}$/.test(form.upiId)) {
      toast.error('Invalid UPI ID format (e.g. name@upi)'); return false;
    }
    return true;
  };

  const submit = async () => {
    setLoading(true);
    try {
      const res = await register({
        fullName: form.fullName.trim(),
        phone:    form.phone.trim(),
        password: form.password,
        roles,
        upiId:    form.upiId.trim(),
        college: {
          branch:       form.branch.trim(),
          year:         parseInt(form.year),
          hostelBlock:  form.hostelBlock.trim(),
          roomNumber:   form.roomNumber.trim(),
          isDayScholar: roles.includes('carrier'),
        },
      });
      toast.success('Account created! Upload your KYC documents 🎉');
      navigate('/kyc');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-campus-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-xl">📦</div>
          <span className="text-2xl font-black text-white">Campus<span className="text-brand">Relay</span></span>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 ${i <= step ? 'text-brand' : 'text-gray-300'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black
                    ${i < step ? 'bg-brand text-white' : i === step ? 'bg-brand/10 text-brand border-2 border-brand' : 'bg-gray-100 text-gray-400'}`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className="text-xs font-semibold hidden sm:block">{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 ${i < step ? 'bg-brand' : 'bg-gray-100'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── Step 0: Account ─────────────────────────────────── */}
          {step === 0 && (
            <>
              <h2 className="text-2xl font-black text-campus-dark mb-1">Create Account</h2>
              <p className="text-muted text-sm mb-6">Join CampusRelay in 3 quick steps</p>

              <Input label="Full Name" placeholder="As on College ID"
                value={form.fullName} onChange={e => f('fullName', e.target.value)}
                autoCapitalize="words" />

              <Input label="Phone Number" placeholder="10-digit mobile (starts with 6-9)"
                value={form.phone}
                onChange={e => f('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric" maxLength={10} />

              <Input label="Password" placeholder="Minimum 6 characters"
                value={form.password} onChange={e => f('password', e.target.value)}
                type="password" />

              <Input label="Confirm Password" placeholder="Re-enter password"
                value={form.confirm} onChange={e => f('confirm', e.target.value)}
                type="password" />

              <Button className="w-full" onClick={() => validate0() && setStep(1)}>
                Next →
              </Button>
            </>
          )}

          {/* ── Step 1: Role & College ───────────────────────────── */}
          {step === 1 && (
            <>
              <h2 className="text-2xl font-black text-campus-dark mb-1">Your Role</h2>
              <p className="text-muted text-sm mb-5">You can hold both roles simultaneously</p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { key:'receiver', emoji:'🏠', title:'Hostel Student', desc:'Get parcels delivered to your room' },
                  { key:'carrier',  emoji:'🛵', title:'Day Scholar',    desc:'Earn ₹30+ picking up parcels'      },
                ].map(r => (
                  <button key={r.key} onClick={() => toggleRole(r.key)}
                    className={`border-2 rounded-2xl p-4 text-left transition-all
                      ${roles.includes(r.key) ? 'border-brand bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="text-2xl mb-2">{r.emoji}</div>
                    <p className="font-bold text-sm text-campus-dark">{r.title}</p>
                    <p className="text-xs text-muted mt-1">{r.desc}</p>
                    {roles.includes(r.key) && (
                      <div className="mt-2"><span className="chip chip-orange text-xs">✓ Selected</span></div>
                    )}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input label="Branch & Course" placeholder="e.g. BTech CSE"
                  value={form.branch} onChange={e => f('branch', e.target.value)} className="mb-0" />
                <Select label="Year" value={form.year} onChange={e => f('year', e.target.value)} className="mb-0">
                  {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                </Select>
              </div>

              {roles.includes('receiver') && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Input label="Hostel Block" placeholder="e.g. Block C"
                    value={form.hostelBlock} onChange={e => f('hostelBlock', e.target.value)} className="mb-0" />
                  <Input label="Room Number"  placeholder="e.g. C-204"
                    value={form.roomNumber}  onChange={e => f('roomNumber', e.target.value)}  className="mb-0" />
                </div>
              )}

              {roles.includes('carrier') && (
                <Input label="UPI ID (to receive earnings)" placeholder="yourname@upi"
                  value={form.upiId} onChange={e => f('upiId', e.target.value)} className="mt-3" />
              )}

              <div className="flex gap-3 mt-5">
                <Button variant="muted" onClick={() => setStep(0)} className="flex-1">← Back</Button>
                <Button className="flex-1" onClick={() => validate1() && setStep(2)}>Next →</Button>
              </div>
            </>
          )}

          {/* ── Step 2: Review ──────────────────────────────────── */}
          {step === 2 && (
            <>
              <h2 className="text-2xl font-black text-campus-dark mb-1">Almost Done! 🎉</h2>
              <p className="text-muted text-sm mb-5">Review your details before creating account</p>

              <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-2">
                {[
                  ['Name',    form.fullName],
                  ['Phone',   form.phone],
                  ['Role',    roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(' + ')],
                  ['Branch',  form.branch],
                  ['Block',   form.hostelBlock || 'Day Scholar'],
                  ['Room',    form.roomNumber  || '—'],
                  ['UPI',     form.upiId       || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-muted font-medium">{k}</span>
                    <span className="font-bold text-campus-dark">{v}</span>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-50 rounded-xl p-3 mb-5">
                <p className="text-sm text-emerald-700 font-medium">
                  📋 Next: Upload your College ID &amp; selfie for AI verification
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="muted" onClick={() => setStep(1)} className="flex-1">← Edit</Button>
                <Button className="flex-1" loading={loading} onClick={submit}>Create Account →</Button>
              </div>
            </>
          )}

          <p className="text-center text-sm text-muted mt-5">
            Already registered?{' '}
            <Link to="/login" className="text-brand font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
