import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Star, Package, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Input, Avatar, Badge, StarRating, SectionLabel, Divider } from '../../components/common/UI';
import useAuthStore from '../../store/authStore';
import { usersAPI, authAPI } from '../../services/api';

export default function Profile() {
  const { user, logout, refreshUser, switchRole } = useAuthStore();
  const navigate = useNavigate();
  const [editing, setEditing]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [form, setForm] = useState({
    fullName:    user?.fullName    || '',
    email:       user?.email       || '',
    upiId:       user?.upiId       || '',
    hostelBlock: user?.college?.hostelBlock || '',
    roomNumber:  user?.college?.roomNumber  || '',
    branch:      user?.college?.branch      || '',
  });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const isBoth = user?.roles?.includes('carrier') && user?.roles?.includes('receiver');

  const saveProfile = async () => {
    setLoading(true);
    try {
      await usersAPI.updateProfile({
        fullName: form.fullName,
        email:    form.email,
        upiId:    form.upiId,
        college:  { ...user?.college, hostelBlock: form.hostelBlock, roomNumber: form.roomNumber, branch: form.branch },
      });
      await refreshUser();
      toast.success('Profile updated!');
      setEditing(false);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Signed out. See you soon!');
  };

  const handleSwitchRole = async () => {
    const next = user.activeRole === 'receiver' ? 'carrier' : 'receiver';
    await switchRole(next);
    toast.success(`Switched to ${next} mode`);
    navigate(next === 'carrier' ? '/carrier' : '/dashboard');
  };

  const kycItems = [
    { label: 'College ID',     done: !!user?.kyc?.collegeIdUrl    },
    { label: 'Aadhaar Card',   done: !!user?.kyc?.aadhaarUrl      },
    { label: 'Selfie Photo',   done: !!user?.kyc?.selfieUrl       },
    { label: 'AI Face Match',  done:  user?.kyc?.faceMatchPassed  },
    { label: 'Admin Approved', done:  user?.isActive              },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        {!editing
          ? <Button variant="muted" size="sm" onClick={() => setEditing(true)}>✏️ Edit</Button>
          : <div className="flex gap-2">
              <Button variant="muted" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" loading={loading} onClick={saveProfile}>Save Changes</Button>
            </div>}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left — identity */}
        <div className="space-y-4">
          {/* Avatar card */}
          <Card className="text-center py-6">
            <Avatar name={user?.fullName} size="xl" className="mx-auto mb-3" />
            <h2 className="text-lg font-black text-campus-dark">{user?.fullName}</h2>
            <p className="text-sm text-muted mt-1">{user?.college?.branch} · Year {user?.college?.year}</p>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {user?.isActive
                ? <Badge color="green">✅ Verified</Badge>
                : <Badge color="yellow">⏳ Pending Approval</Badge>}
              {user?.roles?.map(r => (
                <Badge key={r} color="gray">{r.charAt(0).toUpperCase() + r.slice(1)}</Badge>
              ))}
            </div>
            {user?.rating?.count > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <StarRating value={user.rating.average} />
                <p className="text-xs text-muted mt-1">{user.rating.average.toFixed(1)} avg · {user.rating.count} reviews</p>
              </div>
            )}
          </Card>

          {/* Stats */}
          <Card>
            <SectionLabel>Activity</SectionLabel>
            <div className="space-y-3">
              {[
                { icon:'📦', label:'Orders as Receiver',  val: user?.stats?.deliveriesAsReceiver || 0 },
                { icon:'🛵', label:'Deliveries as Carrier',val: user?.stats?.deliveriesAsCarrier  || 0 },
                { icon:'🔥', label:'Current Streak',       val: `${user?.stats?.streak || 0} days` },
                { icon:'💰', label:'Total Earned',         val: `₹${user?.wallet?.totalEarned?.toFixed(0) || 0}` },
                { icon:'💸', label:'Total Spent',          val: `₹${user?.wallet?.totalSpent?.toFixed(0)  || 0}` },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{s.icon}</span>
                    <span className="text-sm text-muted">{s.label}</span>
                  </div>
                  <span className="text-sm font-bold text-campus-dark">{s.val}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Role switch */}
          {isBoth && (
            <Card>
              <SectionLabel>Switch Role</SectionLabel>
              <p className="text-sm text-muted mb-3">
                Currently active as: <span className="font-bold text-brand capitalize">{user?.activeRole}</span>
              </p>
              <Button variant="ghost" className="w-full" size="sm" onClick={handleSwitchRole}>
                Switch to {user.activeRole === 'receiver' ? '🛵 Carrier' : '🏠 Receiver'} Mode
              </Button>
            </Card>
          )}
        </div>

        {/* Right — details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal info */}
          <Card>
            <SectionLabel>Personal Information</SectionLabel>
            {editing ? (
              <div className="grid grid-cols-2 gap-x-4">
                <Input label="Full Name"   value={form.fullName}    onChange={e => f('fullName', e.target.value)}    className="col-span-2" />
                <Input label="Email"       value={form.email}       onChange={e => f('email', e.target.value)}       type="email" />
                <Input label="UPI ID"      value={form.upiId}       onChange={e => f('upiId', e.target.value)}       placeholder="yourname@upi" />
                <Input label="Branch"      value={form.branch}      onChange={e => f('branch', e.target.value)}      />
                <Input label="Hostel Block" value={form.hostelBlock} onChange={e => f('hostelBlock', e.target.value)} />
                <Input label="Room Number" value={form.roomNumber}   onChange={e => f('roomNumber', e.target.value)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Full Name',    user?.fullName         ],
                  ['Phone',        user?.phone            ],
                  ['Email',        user?.email || '—'     ],
                  ['UPI ID',       user?.upiId || 'Not set'],
                  ['Branch',       user?.college?.branch  ],
                  ['Year',         `Year ${user?.college?.year || '—'}`],
                  ['Hostel Block', user?.college?.hostelBlock || '—'],
                  ['Room Number',  user?.college?.roomNumber  || '—'],
                ].map(([k,v]) => (
                  <div key={k}>
                    <p className="text-xs text-muted font-semibold uppercase tracking-wide">{k}</p>
                    <p className="text-sm font-bold text-campus-dark mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* KYC status */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand" />
                <SectionLabel className="mb-0">Verification Status</SectionLabel>
              </div>
              <button onClick={() => navigate('/kyc')}
                className="text-xs text-brand font-bold hover:underline">Update docs →</button>
            </div>
            <div className="space-y-2">
              {kycItems.map(item => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <span className="text-sm text-campus-dark font-medium">{item.label}</span>
                  <span className={`text-sm font-bold ${item.done ? 'text-success' : 'text-muted'}`}>
                    {item.done ? '✅ Done' : '⏳ Pending'}
                  </span>
                </div>
              ))}
            </div>
            {user?.kyc?.faceMatchScore && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">AI Face Match Confidence</span>
                  <span className="text-xs font-bold text-success">{user.kyc.faceMatchScore}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: `${user.kyc.faceMatchScore}%` }} />
                </div>
              </div>
            )}
          </Card>

          {/* Danger zone */}
          <Card className="border-red-100">
            <SectionLabel className="text-danger">Account Actions</SectionLabel>
            <div className="flex gap-3">
              <Button variant="danger" size="sm" onClick={handleLogout}>🚪 Sign Out</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
