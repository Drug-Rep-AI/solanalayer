export function DemoTag({ children = "DEMO DATA" }: { children?: string }) {
  return <span className="demo-tag">{children}</span>;
}
