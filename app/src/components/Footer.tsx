import { MOTTO, REPO_URL } from "@/lib/config";

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer__inner">
        <span className="footer__motto">DrugRep</span>
        <span>{MOTTO}</span>
        <div className="footer__right">
          <a href={REPO_URL}>Source on GitHub</a>
          <a className="built-on" href="https://solana.com" aria-label="Built on Solana">
            Built on
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/solana-logomark.svg" alt="" width="16" height="14" />
            <strong>Solana</strong>
          </a>
        </div>
      </div>
    </footer>
  );
}
