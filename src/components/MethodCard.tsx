"use client";

import { useState } from "react";
import MeasureMetric from "./MeasureMetric";

type MeasureItem =
  | string
  | { text: string; dataSource: "jira_gsrr" | "jira_agentic" | "static" | "jellyfish_ktlo"; percent?: number }
  | { text: string; dataSource: "cogs_savings"; monthlySavings: number; targetAnnual: number; landedDate: string };

interface MethodCardProps {
  id: number;
  name: string;
  owner: string;
  description: string;
  measures: MeasureItem[];
}

export default function MethodCard({ id, name, owner, description, measures }: MethodCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[var(--card)] rounded-xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex justify-between items-start text-left hover:bg-slate-800/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset focus-visible:rounded-xl"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[var(--accent)] font-mono text-sm">Method {id}</span>
            <span className="text-slate-500 text-sm">•</span>
            <span className="text-slate-400 text-sm">Owner: {owner}</span>
          </div>
          <h3 className="font-semibold text-white">{name}</h3>
        </div>
        <span className="text-slate-500 text-xl ml-4 flex-shrink-0">
          {expanded ? "−" : "+"}
        </span>
      </button>
      {expanded && (
        <div className="px-6 pb-6 pt-0 border-t border-slate-700/50">
          <p className="text-slate-400 text-sm mt-4 leading-relaxed">{description}</p>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Measures</h4>
            <ul className="space-y-3">
              {measures.map((measure, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 flex-shrink-0" />
                  {typeof measure === "string" ? (
                    <span className="text-slate-400 text-sm">{measure}</span>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <MeasureMetric
                        measureText={measure.text}
                        dataSource={measure.dataSource}
                        percent={"percent" in measure ? measure.percent : undefined}
                        monthlySavings={"monthlySavings" in measure ? measure.monthlySavings : undefined}
                        targetAnnual={"targetAnnual" in measure ? measure.targetAnnual : undefined}
                        landedDate={"landedDate" in measure ? measure.landedDate : undefined}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
