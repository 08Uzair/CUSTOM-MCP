export function Button({ children, variant = 'primary', size = 'md', className = '', type = 'button', ...props }) {
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:brightness-110 focus-visible:ring-indigo-400',
    secondary: 'bg-slate-800/80 text-slate-200 border border-slate-700 hover:bg-slate-700/80 hover:text-white focus-visible:ring-slate-400',
    ghost: 'bg-transparent text-slate-400 hover:bg-slate-800/70 hover:text-white focus-visible:ring-slate-400',
    danger: 'bg-rose-600 text-white shadow-lg shadow-rose-600/25 hover:bg-rose-500 focus-visible:ring-rose-400',
    success: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 focus-visible:ring-emerald-400',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}