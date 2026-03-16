import type { ReactNode } from "react";

export interface TabConfig {
  id: string;
  label: string;
  tooltip?: string;
}

interface TabsProps {
  tabs: TabConfig[];
  activeId: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeId, onChange }: TabsProps) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab ${t.id === activeId ? "tab-active" : ""}`}
          onClick={() => onChange(t.id)}
          title={t.tooltip}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

interface PanelProps {
  children: ReactNode;
  visible: boolean;
}

export function TabPanel({ children, visible }: PanelProps) {
  if (!visible) return null;
  return <div className="tab-panel">{children}</div>;
}

