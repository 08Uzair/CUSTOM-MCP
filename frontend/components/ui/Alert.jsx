import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const styles = {
  error: { icon: XCircle, classes: 'border-rose-500/30 bg-rose-500/10 text-rose-200', iconColor: 'text-rose-400' },
  warning: { icon: AlertTriangle, classes: 'border-amber-500/30 bg-amber-500/10 text-amber-200', iconColor: 'text-amber-400' },
  success: { icon: CheckCircle2, classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200', iconColor: 'text-emerald-400' },
  info: { icon: Info, classes: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200', iconColor: 'text-indigo-400' },
};

export function Alert({ tone = 'info', children, className = '' }) {
  const { icon: Icon, classes, iconColor } = styles[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${classes} ${className}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${iconColor}`} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}