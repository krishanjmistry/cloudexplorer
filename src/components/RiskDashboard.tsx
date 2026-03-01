import { useState } from "react";
import { Stat } from "../types";

declare global {
  interface WindowEventMap {
    [CardScenarioClickEvent.eventName]: CardScenarioClickEvent;
  }
}
interface RiskCardProps {
  id: string;
  title: string;
  count: number;
  severity: "Critical" | "High" | "Medium" | "Low" | "Safe";
}

export class CardScenarioClickEvent extends Event {
  static readonly eventName = "risk-dashboard:card-click";

  #scenarioId: string;

  constructor(scenarioId: string) {
    super(CardScenarioClickEvent.eventName);
    this.#scenarioId = scenarioId;
  }
  get scenarioId() {
    return this.#scenarioId;
  }
}

const severityStyles: Record<
  string,
  { border: string; bg: string; text: string }
> = {
  Critical: {
    border: "border-red-600",
    bg: "bg-red-100",
    text: "text-red-800",
  },
  High: {
    border: "border-orange-500",
    bg: "bg-orange-100",
    text: "text-orange-800",
  },
  Medium: {
    border: "border-yellow-400",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
  },
  Low: { border: "border-blue-400", bg: "bg-blue-100", text: "text-blue-800" },
  Safe: {
    border: "border-green-400",
    bg: "bg-green-50",
    text: "text-green-800",
  },
};

const RiskCard: React.FC<RiskCardProps> = ({ id, title, count, severity }) => {
  const styles = severityStyles[severity] || severityStyles.Safe;

  const handleClick = () => {
    if (!id && typeof window === "undefined") {
      return;
    }
    window.dispatchEvent(new CardScenarioClickEvent(id));
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-white p-3 rounded-lg shadow-md border-l-4 ${styles.border} cursor-pointer hover:shadow-lg transition-all`}
    >
      <div className={`flex justify-between items-start gap-3 mb-2`}>
        <div>
          <h3 className={`font-bold text-gray-800`}>{title}</h3>
        </div>
        <div className={`flex flex-col items-end ml-4`}>
          <span
            className={`${styles.bg} ${styles.text} text-lg px-2 py-0.5 font-bold rounded-full`}
          >
            {count}
          </span>
          <span
            className={`mt-2 inline-block text-[10px] px-2 py-0.5 font-semibold rounded ${styles.bg} ${styles.text}`}
          >
            {count === 0 ? "Safe" : severity}
          </span>
        </div>
      </div>
    </div>
  );
};

const SEVERITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Safe: 4,
};

const RiskDashboard = ({ stats }: { stats: Stat[] }) => {
  const [showSafe, setShowSafe] = useState(false);

  const sorted = [...stats].sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 99;
    const sb = SEVERITY_ORDER[b.severity] ?? 99;
    if (sa !== sb) {
      return sa - sb;
    }
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.title.localeCompare(b.title);
  });

  const safeGroup = sorted.filter((s) => s.severity === "Safe");
  const nonSafe = sorted.filter((s) => s.severity !== "Safe");
  const visible = nonSafe.concat(showSafe ? safeGroup : []);

  return (
    <>
      <div className={`flex items-center justify-end mb-3 w-full`}>
        <div className="flex items-center gap-3">
          {/* Scan / Refresh moved to the top navbar — keep only the show/hide-safe toggle here */}
          <button
            type="button"
            className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
            onClick={() => setShowSafe((v) => !v)}
            aria-pressed={showSafe}
            aria-label={
              showSafe
                ? `Hide safe (${safeGroup.length})`
                : `Show safe (${safeGroup.length})`
            }
          >
            {showSafe
              ? `Hide safe (${safeGroup.length})`
              : `Show safe (${safeGroup.length})`}
          </button>
        </div>
      </div>

      <div>
        {visible.length === 0 && safeGroup.length === 0 && (
          <div className="w-full text-sm text-gray-700 p-4 bg-yellow-50 border border-yellow-200 rounded">
            No risk statistics available.
          </div>
        )}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4 w-full`}
        >
          {visible.map((stat) => (
            <RiskCard
              key={stat.id}
              id={stat.id}
              title={stat.title}
              count={stat.count}
              severity={stat.severity}
            />
          ))}
        </div>

        {!showSafe && safeGroup.length > 0 && (
          <div className="w-full text-xs text-gray-500 mb-4">
            Safe items hidden — click “Show safe” to view.
          </div>
        )}
      </div>
    </>
  );
};

export default RiskDashboard;
