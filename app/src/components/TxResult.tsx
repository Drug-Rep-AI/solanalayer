import { explorer } from "@drugrep/sdk";
import { CLUSTER, RPC_URL } from "@/lib/config";

export function txUrl(sig: string) {
  return explorer.tx(sig, CLUSTER, RPC_URL);
}
export function addrUrl(a: string) {
  return explorer.address(a, CLUSTER, RPC_URL);
}

export function formatTime(unix: number) {
  if (!unix) return "–";
  return new Date(unix * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

export function TxResult({
  title,
  signature,
  slot,
  timestamp,
  account,
  accountLabel = "Account",
}: {
  title: string;
  signature: string;
  slot: number;
  timestamp: number;
  account?: string;
  accountLabel?: string;
}) {
  return (
    <div className="tx-result stack--sm" data-testid="tx-result">
      <strong>{title}</strong>
      <dl className="kv">
        <dt>slot</dt>
        <dd className="num mono">{slot.toLocaleString("en-US")}</dd>
        <dt>block time</dt>
        <dd className="num mono">{formatTime(timestamp)}</dd>
        <dt>transaction</dt>
        <dd>
          <a href={txUrl(signature)} target="_blank" rel="noreferrer" className="mono">
            {signature.slice(0, 16)}… on Solana Explorer
          </a>
        </dd>
        {account && (
          <>
            <dt>{accountLabel}</dt>
            <dd>
              <a href={addrUrl(account)} target="_blank" rel="noreferrer" className="mono">
                {account}
              </a>
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
