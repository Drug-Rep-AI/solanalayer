"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLUSTER } from "@/lib/config";
import { WalletButton } from "./WalletButton";

const STAGES = [
  { href: "/", label: "Overview", n: null },
  { href: "/run/", label: "Run", n: "1" },
  { href: "/lab/", label: "Lab", n: "2" },
  { href: "/prove/", label: "Prove", n: "3" },
  { href: "/timeline/", label: "Timeline", n: "4" },
];

function Stages() {
  const path = usePathname();
  const norm = (p: string) => (p.endsWith("/") ? p : `${p}/`);
  return (
    <ul className="stages">
      {STAGES.map((s) => (
        <li key={s.href}>
          <Link href={s.href} aria-current={norm(path) === s.href ? "page" : undefined}>
            {s.n && <span className="stages__n">{s.n}</span>}
            {s.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Nav() {
  return (
    <header className="nav">
      <div className="shell nav__inner">
        <Link href="/" className="wordmark" aria-label="DrugRep Proof Layer, home">
          <span className="wordmark__name">DrugRep</span>
          <span className="wordmark__tag">proof layer</span>
        </Link>
        <Stages />
        <div className="nav__right">
          <span className="net-chip">{CLUSTER}</span>
          <WalletButton />
        </div>
      </div>
      <nav className="nav__stages-row" aria-label="Stages">
        <div className="shell">
          <Stages />
        </div>
      </nav>
    </header>
  );
}
