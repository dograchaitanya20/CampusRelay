import React, { useEffect, useState } from 'react';
import { Search, RefreshCw, Ban, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Avatar, Badge, EmptyState, Modal, StatCard } from '../../components/common/UI';
import { adminAPI } from '../../services/api';

const ROLE_FILTER = [
  { key: '',         label: 'All Users'  },
  { key: 'receiver', label: 'Receivers'  },
  { key: 'carrier',  label: 'Carriers'   },
  { key: 'admin',    label: 'Admins'     },
];

export default function AdminUsers() {
  const [users,    setUsers]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [role,     setRole]     = useState('');
  const [page,     setPage]     = useState(1);
  const [banModal, setBanModal] = useState(null);
  const [banReason,setBanReason]= useState('');
  const [processing,setProcessing]=useState(null);

  useEffect(() => { load(); }, [search, role, page]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminAPI.getUsers({ search, role, page, limit: 15 });
      setUsers(r.users || []);
      setTotal(r.total || 0);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const ban = async () => {
    if (!banReason.trim()) return toast.error('Enter a reason');
    setProcessing(banModal._id);
    try {
      await adminAPI.banUser(banModal._id, banReason);
      toast.success(`🚫 ${banModal.fullName} banned`);
      load(); setBanModal(null); setBanReason('');
    } catch (e) { toast.error(e.message); }
    finally { setProcessing(null); }
  };

  const unban = async (u) => {
    setProcessing(u._id);
    try {
      await adminAPI.unbanUser(u._id);
      toast.success(`✅ ${u.fullName} unbanned`);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setProcessing(null); }
  };

  const kycColor = (status) => {
    if (status === 'approved')    return 'green';
    if (status === 'ai_verified') return 'blue';
    if (status === 'rejected')    return 'red';
    return 'yellow';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="text-muted text-sm mt-1">{total} total users on the platform</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-xl hover:bg-gray-100">
          <RefreshCw className={`w-5 h-5 text-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or phone..."
            className="input-field pl-9 w-full" />
        </div>
        <div className="flex gap-2">
          {ROLE_FILTER.map(r => (
            <button key={r.key} onClick={() => { setRole(r.key); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all whitespace-nowrap ${
                role === r.key ? 'border-brand bg-orange-50 text-brand' : 'border-gray-200 text-muted hover:border-gray-300'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['User','Contact','Role & Status','KYC','Activity','Wallet','Actions'].map(h => (
                  <th key={h} className="table-cell text-left text-xs font-black text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="table-row">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="table-cell"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="py-16"><EmptyState emoji="👥" title="No users found" /></td></tr>
              ) : users.map(u => (
                <tr key={u._id} className="table-row hover:bg-gray-50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.fullName} size="sm" />
                      <div>
                        <p className="text-sm font-bold text-campus-dark">{u.fullName}</p>
                        <p className="text-xs text-muted">{u.college?.branch}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <p className="text-sm font-medium">{u.phone}</p>
                    <p className="text-xs text-muted">{u.email || '—'}</p>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1">
                      {u.roles?.map(r => <Badge key={r} color="gray">{r}</Badge>)}
                    </div>
                    {u.isBanned  && <Badge color="red"   className="mt-1">🚫 Banned</Badge>}
                    {!u.isActive && !u.isBanned && <Badge color="yellow" className="mt-1">⏳ Pending</Badge>}
                    {u.isActive  && !u.isBanned && <Badge color="green"  className="mt-1">✅ Active</Badge>}
                  </td>
                  <td className="table-cell">
                    <Badge color={kycColor(u.kyc?.status)}>
                      {u.kyc?.status || 'none'}
                    </Badge>
                    {u.kyc?.faceMatchScore && (
                      <p className="text-xs text-muted mt-1">AI: {u.kyc.faceMatchScore}%</p>
                    )}
                  </td>
                  <td className="table-cell">
                    <p className="text-xs"><span className="font-bold">{u.stats?.deliveriesAsReceiver || 0}</span> <span className="text-muted">orders</span></p>
                    <p className="text-xs"><span className="font-bold">{u.stats?.deliveriesAsCarrier  || 0}</span> <span className="text-muted">delivered</span></p>
                    {u.rating?.count > 0 && <p className="text-xs text-muted">⭐ {u.rating.average.toFixed(1)}</p>}
                  </td>
                  <td className="table-cell">
                    <p className="text-xs"><span className="font-bold text-success">₹{u.wallet?.balance?.toFixed(0) || 0}</span> <span className="text-muted">balance</span></p>
                    <p className="text-xs"><span className="font-bold">₹{u.wallet?.totalEarned?.toFixed(0) || 0}</span> <span className="text-muted">earned</span></p>
                  </td>
                  <td className="table-cell">
                    {u.isBanned ? (
                      <button onClick={() => unban(u)} disabled={processing === u._id}
                        className="text-xs font-bold text-success hover:underline flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Unban
                      </button>
                    ) : (
                      <button onClick={() => { setBanModal(u); setBanReason(''); }}
                        className="text-xs font-bold text-danger hover:underline flex items-center gap-1">
                        <Ban className="w-3 h-3" /> Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <p className="text-sm text-muted">Showing {Math.min((page-1)*15+1,total)}–{Math.min(page*15,total)} of {total}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="muted" disabled={page === 1} onClick={() => setPage(p => p-1)}>← Prev</Button>
              <Button size="sm" variant="muted" disabled={page * 15 >= total} onClick={() => setPage(p => p+1)}>Next →</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Ban modal */}
      <Modal open={!!banModal} onClose={() => setBanModal(null)} title={`Ban ${banModal?.fullName}`}>
        <p className="text-sm text-muted mb-3">This will immediately revoke their access.</p>
        <div className="space-y-2 mb-4">
          {['Violation of community guidelines','Fraudulent activity','Multiple disputes','Fake documents','Other'].map(r => (
            <button key={r} onClick={() => setBanReason(r)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                banReason === r ? 'border-danger bg-red-50 text-danger' : 'border-gray-200 hover:border-gray-300'}`}>
              {r}
            </button>
          ))}
        </div>
        <input value={banReason} onChange={e => setBanReason(e.target.value)}
          placeholder="Or type a custom reason..." className="input-field mb-4" />
        <div className="flex gap-3">
          <Button variant="muted" className="flex-1" onClick={() => setBanModal(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" loading={!!processing} onClick={ban}>Confirm Ban 🚫</Button>
        </div>
      </Modal>
    </div>
  );
}
