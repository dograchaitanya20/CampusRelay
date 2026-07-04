import React, { useState, useRef } from 'react';
import { Loader2, Star, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

export const Button = ({ children, variant = 'primary', size = 'md', loading, className, icon: Icon, ...props }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]';
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-dark focus:ring-brand',
    ghost:   'border border-brand text-brand hover:bg-orange-50 focus:ring-brand',
    danger:  'bg-danger text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-success text-white hover:bg-emerald-600 focus:ring-emerald-500',
    muted:   'bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-400',
  };
  const sizes = { sm:'px-3 py-2 text-sm', md:'px-5 py-3 text-sm', lg:'px-6 py-3.5 text-base' };
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} {...props}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon ? <Icon className="w-4 h-4" /> : null}
      {children}
    </button>
  );
};

export const Input = ({ label, error, icon: Icon, type = 'text', className, ...props }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className={clsx('mb-4', className)}>
      {label && <label className="input-label">{label}</label>}
      <div className="relative">
        {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon className="w-4 h-4" /></div>}
        <input type={isPassword && show ? 'text' : type}
          className={clsx('input-field', Icon && 'pl-10', isPassword && 'pr-10', error && 'border-red-400 focus:ring-red-400')}
          {...props} />
        {isPassword && (
          <button type="button" onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
};

export const Select = ({ label, error, children, className, ...props }) => (
  <div className={clsx('mb-4', className)}>
    {label && <label className="input-label">{label}</label>}
    <select className={clsx('input-field bg-white', error && 'border-red-400')} {...props}>{children}</select>
    {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
  </div>
);

export const Textarea = ({ label, error, className, ...props }) => (
  <div className={clsx('mb-4', className)}>
    {label && <label className="input-label">{label}</label>}
    <textarea className={clsx('input-field resize-none', error && 'border-red-400')} {...props} />
    {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
  </div>
);

export const Avatar = ({ name = '?', size = 'md', color = 'brand', className }) => {
  const letters = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const sizes   = { xs:'w-7 h-7 text-xs rounded-lg', sm:'w-9 h-9 text-sm rounded-xl', md:'w-11 h-11 text-sm rounded-xl', lg:'w-14 h-14 text-base rounded-2xl', xl:'w-20 h-20 text-xl rounded-3xl' };
  const colors  = { brand:'bg-orange-100 text-brand', green:'bg-emerald-100 text-emerald-600', blue:'bg-blue-100 text-blue-600', gray:'bg-gray-100 text-gray-600' };
  return <div className={clsx('flex items-center justify-center font-bold flex-shrink-0', sizes[size], colors[color], className)}>{letters}</div>;
};

export const Badge = ({ children, color = 'orange', className }) => {
  const colors = { orange:'chip-orange', green:'chip-green', blue:'chip-blue', gray:'chip-gray', red:'chip-red', yellow:'chip-yellow' };
  return <span className={clsx('chip', colors[color], className)}>{children}</span>;
};

export const Card = ({ children, urgent, className, onClick }) => (
  <div onClick={onClick} className={clsx(urgent ? 'card-urgent' : 'card', onClick && 'cursor-pointer hover:shadow-md transition-shadow', className)}>
    {children}
  </div>
);

export const Divider = ({ className }) => <hr className={clsx('border-gray-100 my-4', className)} />;

export const Spinner = ({ className }) => <Loader2 className={clsx('w-5 h-5 animate-spin text-brand', className)} />;

export const LoadingScreen = ({ message = 'Loading...' }) => (
  <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center">
    <div className="text-center">
      <div className="text-5xl mb-4">📦</div>
      <Spinner className="w-8 h-8 mx-auto mb-3" />
      <p className="text-muted font-medium">{message}</p>
    </div>
  </div>
);

export const EmptyState = ({ emoji = '📭', title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4">{emoji}</div>
    <h3 className="text-lg font-bold text-campus-dark mb-2">{title}</h3>
    {subtitle && <p className="text-sm text-muted max-w-xs mb-6">{subtitle}</p>}
    {action}
  </div>
);

export const StarRating = ({ value = 0, interactive = false, onRate, size = 'md' }) => {
  const [hover, setHover] = useState(0);
  const sz = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i}
          className={clsx(sz, 'transition-colors', (hover || value) >= i ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200',
            interactive && 'cursor-pointer hover:scale-110 transition-transform')}
          onClick={() => interactive && onRate?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)} />
      ))}
    </div>
  );
};

export const OtpInput = ({ value = '', onChange, length = 4 }) => {
  const refs = useRef([]);
  const digits = value.split('');
  const handle = (v, i) => {
    const next = [...digits]; next[i] = v.replace(/\D/g, '').slice(-1); onChange(next.join(''));
    if (v && i < length - 1) refs.current[i + 1]?.focus();
  };
  const onKey = (e, i) => { if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus(); };
  return (
    <div className="flex gap-3 justify-center my-5">
      {Array.from({ length }).map((_, i) => (
        <input key={i} ref={r => refs.current[i] = r}
          value={digits[i] || ''} onChange={e => handle(e.target.value, i)} onKeyDown={e => onKey(e, i)}
          maxLength={1} inputMode="numeric"
          className={clsx('otp-digit', digits[i] && 'border-brand bg-orange-50')} />
      ))}
    </div>
  );
};

export const Modal = ({ open, onClose, title, children, maxWidth = 'max-w-md' }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={clsx('modal-box', maxWidth)}>
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-campus-dark">{title}</h2>
            {onClose && <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">×</button>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export const Timeline = ({ steps }) => (
  <div className="space-y-0">
    {steps.map((step, i) => (
      <div key={i} className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className={clsx('w-3 h-3 rounded-full mt-1 flex-shrink-0 ring-2 ring-white',
            step.done  ? 'bg-success' :
            step.active? 'bg-brand animate-pulse' : 'bg-gray-200')} />
          {i < steps.length - 1 && <div className={clsx('w-0.5 flex-1 min-h-[24px]', step.done ? 'bg-success' : 'bg-gray-200')} />}
        </div>
        <div className="pb-5">
          <p className={clsx('text-sm font-semibold', step.done || step.active ? 'text-campus-dark' : 'text-muted')}>{step.label}</p>
          {step.sub && <p className="text-xs text-muted mt-0.5">{step.sub}</p>}
        </div>
      </div>
    ))}
  </div>
);

export const LiveDot = ({ label, color = 'bg-success' }) => (
  <div className="flex items-center gap-1.5">
    <span className={clsx('w-2 h-2 rounded-full animate-pulse', color)} />
    {label && <span className="text-xs font-semibold text-muted">{label}</span>}
  </div>
);

export const SectionLabel = ({ children, className }) => (
  <p className={clsx('section-label', className)}>{children}</p>
);

export const Toggle = ({ checked, onChange, label, sublabel }) => (
  <div className="flex items-center justify-between">
    <div>
      {label    && <p className="text-sm font-semibold text-campus-dark">{label}</p>}
      {sublabel && <p className="text-xs text-muted mt-0.5">{sublabel}</p>}
    </div>
    <button type="button" onClick={() => onChange(!checked)}
      className={clsx('relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
        checked ? 'bg-success' : 'bg-gray-200')}>
      <span className={clsx('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
        checked && 'translate-x-6')} />
    </button>
  </div>
);

export const ProgressBar = ({ value, max, color = 'bg-brand', className }) => (
  <div className={clsx('h-2 bg-gray-100 rounded-full overflow-hidden', className)}>
    <div className={clsx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.min(100, (value/max)*100)}%` }} />
  </div>
);

export const Tabs = ({ tabs, active, onChange }) => (
  <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
    {tabs.map(tab => (
      <button key={tab.key} onClick={() => onChange(tab.key)}
        className={clsx('flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
          active === tab.key ? 'bg-white text-campus-dark shadow-sm' : 'text-muted hover:text-campus-dark')}>
        {tab.label}
      </button>
    ))}
  </div>
);

export const StatCard = ({ label, value, icon, color = 'text-brand', sub, trend }) => (
  <Card className="flex flex-col gap-1">
    <div className="flex items-center justify-between mb-1">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      {icon && <span className="text-xl">{icon}</span>}
    </div>
    <p className={clsx('text-3xl font-black', color)}>{value}</p>
    {sub   && <p className="text-xs text-muted">{sub}</p>}
    {trend && <p className={clsx('text-xs font-semibold', trend > 0 ? 'text-success' : 'text-danger')}>{trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week</p>}
  </Card>
);
