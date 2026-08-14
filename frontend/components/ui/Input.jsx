import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  { label, hint, error, className = '', id, ...props },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`w-full rounded-xl border bg-slate-800/60 px-3 py-2 text-sm text-slate-100 shadow-sm transition placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
          error
            ? 'border-rose-500/60 focus:border-rose-400 focus:ring-rose-500/20'
            : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'
        } ${className}`}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-400" role="alert">{error}</p>}
    </div>
  );
});