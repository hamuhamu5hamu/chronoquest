type TaskSectionCardProps = {
  title: string;
  hint?: string;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
};

export function TaskSectionCard({
  title,
  hint,
  collapsible = false,
  open = true,
  onToggle,
  children,
}: TaskSectionCardProps) {
  return (
    <div className="card">
      <div
        className="row"
        style={collapsible ? { cursor: "pointer" } : undefined}
        onClick={collapsible ? onToggle : undefined}
      >
        <h3>{title}</h3>
        {collapsible ? (
          <small>{open ? "▲ 閉じる" : "▼ 開く"}</small>
        ) : hint ? (
          <small>{hint}</small>
        ) : null}
      </div>
      {(!collapsible || open) && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  );
}
