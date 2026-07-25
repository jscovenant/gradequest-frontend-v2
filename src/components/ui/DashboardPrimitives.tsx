import type { ReactNode } from "react";

type PanelProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DashboardPanel({ title, subtitle, action, children, className = "" }: PanelProps) {
  return (
    <section className={`gq-panel ${className}`.trim()}>
      {(title || subtitle || action) && (
        <div className="gq-panel__head">
          <div>
            {title && <h2 className="gq-panel__title">{title}</h2>}
            {subtitle && <p className="gq-panel__sub">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-3 p-md-4">{children}</div>
    </section>
  );
}

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon?: string;
  hint?: ReactNode;
  tone?: "primary" | "gold" | "success" | "warning" | "danger" | "info";
};

const toneMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "var(--gq-primary)",
  gold: "var(--gq-secondary)",
  success: "var(--gq-success)",
  warning: "var(--gq-warning)",
  danger: "var(--gq-danger)",
  info: "var(--gq-info)",
};

export function StatCard({ label, value, icon = "bar-chart", hint, tone = "primary" }: StatCardProps) {
  return (
    <div className="gq-panel h-100 p-3">
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div>
          <div className="text-muted" style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 850, color: "var(--gq-text)" }}>{value}</div>
        </div>
        <span className="gq-nav-icon" style={{ color: toneMap[tone], background: `${toneMap[tone]}18` }}>
          <i className={`bi bi-${icon}`} />
        </span>
      </div>
      {hint && <div className="mt-2 text-muted" style={{ fontSize: 12 }}>{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="text-center py-5 px-3">
      <div className="gq-avatar mx-auto mb-3" style={{ width: 46, height: 46 }}>
        <i className={`bi bi-${icon}`} />
      </div>
      <div style={{ fontWeight: 850, color: "var(--gq-text)" }}>{title}</div>
      {children && <div className="text-muted mt-1" style={{ fontSize: 13 }}>{children}</div>}
    </div>
  );
}
