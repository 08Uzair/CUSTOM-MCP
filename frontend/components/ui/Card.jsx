export function Card({ title, description, footer, children, className = '', actions }) {
  return (
    <div className={`card-surface ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="border-t border-slate-800 px-5 py-3">{footer}</div>}
    </div>
  );
}