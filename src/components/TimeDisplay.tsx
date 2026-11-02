import { formatTimeMs } from "../lib/utils";

export function TimeDisplay({ seconds }: { seconds: number }) {
  const [whole, fraction] = formatTimeMs(seconds).split(".");

  return <span className="tabular-nums"><span className="font-semibold">{whole}</span><span className="font-light opacity-30">.{fraction}</span></span>;
}
