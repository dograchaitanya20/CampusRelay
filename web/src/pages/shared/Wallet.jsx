import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Card, Button, Input, Modal, StatCard, Divider } from '../../components/common/UI';
import useAuthStore from '../../store/authStore';
import { walletAPI } from '../../services/api';

const TX_META = {
  topup:          { icon:'💳', label:'Wallet Top-up',    dir:'credit' },
  escrow_lock:    { icon:'🔒', label:'Escrow Locked',     dir:'debit'  },
  escrow_release: { icon:'✅', label:'Escrow Released',   dir:'debit'  },
  escrow_refund:  { icon:'↩️', label:'Refund Issued',     dir:'credit' },
  commission_earn:{ icon:'💰', label:'Commission Earned', dir:'credit' },
  platform_cut:   { icon:'⚙️', label:'Platform Fee',      dir:'debit'  },
  withdrawal:     { icon:'🏦', label:'Withdrawal',        dir:'debit'  },
};

export default function Wallet() {
  const { user, refreshUser } = useAuthStore();
  const [balance,     setBalance]     = useState(user?.wallet?.balance || 0);
  const [escrow,      setEscrow]      = useState(user?.wallet?.escrow  || 0);
  const [txns,        setTxns]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [topupOpen,   setTopupOpen]   = useState(false);
  const [withdrawOpen,setWithdrawOpen]= useState(false);
  const [amount,      setAmount]      = useState('');
  const [submitting,  setSubmitting]  = useState(false);

  // ── FIX: refreshUser so dashboard balance stays in sync ─────────
  useEffect(() => {
    load();
    refreshUser();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [b, t] = await Promise.all([walletAPI.getBalance(), walletAPI.getTransactions()]);
      setBalance(b.wallet.balance);
      setEscrow(b.wallet.escrow);
      setTxns(t.transactions || []);
    } finally { setLoading(false); }
  };

  const handleTopup = async () => {
    const amt = parseInt(amount);
    if (!amt || amt < 30) return toast.error('Minimum top-up ₹30');
    setSubmitting(true);
    try {
      if (import.meta.env.DEV) {
        await walletAPI.devCredit(amt);
        toast.success(`₹${amt} added to wallet! (dev mode)`);
        await load(); await refreshUser(); setTopupOpen(false); setAmount('');
        return;
      }
      const { order } = await walletAPI.createOrder(amt);
      const rzp = new window.Razorpay({
        key:         import.meta.env.VITE_RAZORPAY_KEY,
        amount:      order.amount,
        currency:    'INR',
        name:        'CampusRelay',
        description: 'Wallet Top-up',
        order_id:    order.id,
        handler: async (response) => {
          await walletAPI.verifyPayment({ ...response, amount: amt });
          toast.success(`₹${amt} added!`);
          await load(); await refreshUser(); setTopupOpen(false); setAmount('');
        },
        prefill: { contact: user.phone, name: user.fullName },
        theme:   { color: '#FF5A1F' },
      });
      rzp.open();
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  const handleWithdraw = async () => {
    const amt = parseInt(amount);
    if (!amt || amt < 50)  return toast.error('Minimum withdrawal ₹50');
    if (amt > balance)     return toast.error('Insufficient balance');
    if (!user?.upiId)      return toast.error('Add UPI ID in Profile first');
    setSubmitting(true);
    try {
      await walletAPI.withdraw(amt);
      toast.success(`₹${amt} withdrawal initiated to ${user.upiId}`);
      await load(); await refreshUser(); setWithdrawOpen(false); setAmount('');
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Wallet</h1>
          <p className="text-muted text-sm mt-1">Balance, transactions &amp; payments</p>
        </div>
        <button onClick={() => { load(); refreshUser(); }}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors" disabled={loading}>
          <RefreshCw className={`w-5 h-5 text-muted ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Balance card */}
      <div className="bg-campus-dark rounded-3xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand/20" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative z-10">
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Available Balance</p>
          <p className="text-white text-5xl font-black mb-1">₹{balance.toFixed(2)}</p>
          {escrow > 0 && <p className="text-white/40 text-sm">₹{escrow} locked in escrow</p>}
          <div className="flex gap-3 mt-5">
            <button onClick={() => { setTopupOpen(true); setAmount(''); }}
              className="flex items-center gap-2 bg-brand text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-brand-dark transition-colors">
              <ArrowDownLeft className="w-4 h-4" /> Add Money
            </button>
            {user?.roles?.includes('carrier') && (
              <button onClick={() => { setWithdrawOpen(true); setAmount(''); }}
                className="flex items-center gap-2 bg-white/10 text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-white/20 transition-colors">
                <ArrowUpRight className="w-4 h-4" /> Withdraw
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Spent"  value={`₹${user?.wallet?.totalSpent?.toFixed(0)  || 0}`} icon="💸" />
        <StatCard label="Total Earned" value={`₹${user?.wallet?.totalEarned?.toFixed(0) || 0}`} icon="💰" color="text-success" />
        <StatCard label="In Escrow"    value={`₹${escrow.toFixed(0)}`}                           icon="🔒" color="text-warning" />
        <StatCard label="Transactions" value={txns.length}                                        icon="📊" />
      </div>

      {/* Transactions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-campus-dark">Transaction History</h3>
          <span className="text-xs text-muted font-medium">{txns.length} transactions</span>
        </div>
        {txns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💳</div>
            <p className="font-bold text-campus-dark">No transactions yet</p>
            <p className="text-sm text-muted mt-1">Add money to get started</p>
          </div>
        ) : (
          <div className="space-y-0">
            {txns.map((tx, i) => {
              const meta     = TX_META[tx.type] || { icon:'💳', label:tx.type, dir:'debit' };
              const isCredit = tx.direction === 'credit';
              return (
                <div key={tx._id || i}>
                  <div className="flex items-center gap-3 py-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-campus-dark">{tx.note || meta.label}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {format(new Date(tx.createdAt || Date.now()), 'dd MMM yyyy · hh:mm a')}
                      </p>
                      {tx.delivery?.deliveryCode && (
                        <p className="text-xs text-muted">{tx.delivery.deliveryCode}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-black ${isCredit ? 'text-success' : 'text-campus-dark'}`}>
                        {isCredit ? '+' : '−'}₹{tx.amount}
                      </p>
                      {tx.balanceAfter !== undefined && (
                        <p className="text-xs text-muted">Bal: ₹{tx.balanceAfter?.toFixed(0)}</p>
                      )}
                    </div>
                  </div>
                  {i < txns.length - 1 && <Divider className="my-0" />}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add Money Modal */}
      <Modal open={topupOpen} onClose={() => setTopupOpen(false)} title="Add Money 💳">
        <p className="text-sm text-muted mb-4">
          Funds added instantly via Razorpay{import.meta.env.DEV ? ' (dev: instant credit)' : ''}
        </p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[50,100,200,500].map(a => (
            <button key={a} onClick={() => setAmount(String(a))}
              className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                ${amount === String(a) ? 'border-brand bg-orange-50 text-brand' : 'border-gray-200 text-campus-dark hover:border-gray-300'}`}>
              ₹{a}
            </button>
          ))}
        </div>
        <Input label="Custom Amount" placeholder="Enter amount (min ₹30)" value={amount}
          onChange={e => setAmount(e.target.value)} inputMode="numeric" />
        <Button className="w-full mt-2" loading={submitting} onClick={handleTopup}>
          {import.meta.env.DEV ? `Add ₹${amount || '—'} (Dev)` : `Pay ₹${amount || '—'} via Razorpay`}
        </Button>
      </Modal>

      {/* Withdraw Modal */}
      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="Withdraw to UPI 🏦">
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-muted font-medium">UPI ID</p>
          <p className="font-bold text-campus-dark">{user?.upiId || 'Not set — update in Profile'}</p>
          <p className="text-xs text-muted mt-1">Available: ₹{balance.toFixed(2)}</p>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[50,100,200,500].map(a => (
            <button key={a} onClick={() => setAmount(String(a))}
              className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                ${amount === String(a) ? 'border-brand bg-orange-50 text-brand' : 'border-gray-200 hover:border-gray-300'}`}>
              ₹{a}
            </button>
          ))}
        </div>
        <Input label="Amount to Withdraw" placeholder="Min ₹50" value={amount}
          onChange={e => setAmount(e.target.value)} inputMode="numeric" />
        <Button className="w-full mt-2" loading={submitting} onClick={handleWithdraw}>
          Withdraw ₹{amount || '—'} to UPI
        </Button>
        <p className="text-xs text-muted text-center mt-2">Processed within 24 hours</p>
      </Modal>
    </div>
  );
}
