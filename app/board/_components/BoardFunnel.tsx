"use client";

interface Props {
  applications: { status: string }[];
  archivedCount: number;
}

export default function BoardFunnel({ applications, archivedCount }: Props) {
  const applied      = applications.filter(a => ["applied","interviewing","offer","rejected"].includes(a.status)).length;
  const interviewing = applications.filter(a => ["interviewing","offer","rejected"].includes(a.status)).length;
  const offers       = applications.filter(a => a.status === "offer").length;

  const toInterview = applied > 0 ? Math.round((interviewing / applied) * 100) : null;
  const toOffer     = interviewing > 0 ? Math.round((offers / interviewing) * 100) : null;

  return (
    <div className="flex items-center bg-white border border-zinc-100 rounded-2xl px-6 py-4 shadow-sm mb-5">
      <FItem num={applied}      label="投遞中" />
      <Arrow />
      <FItem num={interviewing} label="面試中" rate={toInterview} color="text-amber-500" />
      <Arrow />
      <FItem num={offers}       label="Offer"  rate={toOffer}     color="text-green-500" />
      {archivedCount > 0 && (
        <div className="flex items-center gap-2 pl-5 ml-3 border-l border-zinc-100">
          <span className="text-lg font-semibold text-zinc-400">{archivedCount}</span>
          <span className="text-xs text-zinc-400">已封存</span>
        </div>
      )}
    </div>
  );
}

function FItem({ num, label, rate, color = "text-zinc-900" }: { num: number; label: string; rate?: number | null; color?: string }) {
  return (
    <div className="text-center flex-1">
      <div className={`text-2xl font-bold leading-none ${color}`}>{num}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
      {rate != null && <div className="text-xs text-zinc-400 mt-0.5">轉換率 {rate}%</div>}
    </div>
  );
}

function Arrow() {
  return <span className="text-zinc-200 text-xl mx-2 flex-shrink-0">→</span>;
}
