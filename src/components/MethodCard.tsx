"use client";

import { useState } from "react";
import MeasureMetric from "./MeasureMetric";

type MeasureItem =
  | string
  | { text: string; dataSource: "jira_gsrr" | "jira_agentic" | "jira_smart_action_items" | "jira_support_tickets" | "static" | "jellyfish_ktlo" | "jellyfish_lead_time" | "jellyfish_ai_power_users" | "incident_io_retrospective" | "incident_io_es_ingestion" | "incident_io_es_negative_margin" | "sigma_es_negative_margin" | "attrition"; percent?: number; tbd?: boolean; periodLabel?: string; departures?: number; headcount?: number; powerUserCount?: number; powerUserTotal?: number }
  | { text: string; dataSource: "static_progress"; current: number; target: number; unit?: string }
  | { text: string; dataSource: "static_target"; value: number; target: number; unit: string; lowerIsBetter?: boolean }
  | { text: string; dataSource: "static_binary"; done: boolean }
  | { text: string; dataSource: "devex_survey"; surveyUrl?: string; devexIndex?: { score: number; trend: number }; topics?: { name: string; priority: number; score: number; trend: number; priorityTopic?: boolean }[] }
  | { text: string; dataSource: "cogs_savings"; monthlySavings: number; targetAnnual: number; landedDate: string };

interface MethodCardProps {
  id: number;
  name: string;
  owner: string;
  description: string;
  measures: MeasureItem[];
}

export default function MethodCard({ id, name, owner, description, measures }: MethodCardProps) {
  const [expanded, setExpanded] = useState(id === 1);

  return (
    <div className="bg-[var(--card)] rounded-xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-slate-800/40 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset focus-visible:rounded-xl"
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-[var(--accent)]/60 font-mono text-xs tabular-nums flex-shrink-0">
            {String(id).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate">{name}</h3>
            <p className="text-slate-500 text-xs mt-0.5">{owner}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <span className="text-slate-600 text-xs font-mono hidden sm:block">
            {measures.length} measure{measures.length !== 1 ? "s" : ""}
          </span>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-700/50">
          <div className="px-6 py-5">
            <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
          </div>
          <div className="border-t border-slate-700/30">
            <ul className="divide-y divide-slate-700/30">
              {measures.map((measure, i) => (
                <li key={i} className="px-6 py-4">
                  {typeof measure === "string" ? (
                    <div className="flex items-start gap-3">
                      <span className="text-[var(--accent)]/40 font-mono text-xs mt-0.5 flex-shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-slate-400 text-sm">{measure}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="text-[var(--accent)]/40 font-mono text-xs mt-0.5 flex-shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <MeasureMetric
                          measureText={measure.text}
                          dataSource={measure.dataSource}
                          percent={"percent" in measure ? measure.percent : undefined}
                          monthlySavings={"monthlySavings" in measure ? measure.monthlySavings : undefined}
                          targetAnnual={"targetAnnual" in measure ? measure.targetAnnual : undefined}
                          landedDate={"landedDate" in measure ? measure.landedDate : undefined}
                          surveyUrl={"surveyUrl" in measure ? measure.surveyUrl : undefined}
                          topics={"topics" in measure ? measure.topics : undefined}
                          devexIndex={"devexIndex" in measure ? measure.devexIndex : undefined}
                          tbd={"tbd" in measure ? measure.tbd : undefined}
                          current={"current" in measure ? measure.current : undefined}
                          target={"target" in measure ? measure.target : undefined}
                          unit={"unit" in measure ? measure.unit : undefined}
                          value={"value" in measure ? measure.value : undefined}
                          lowerIsBetter={"lowerIsBetter" in measure ? measure.lowerIsBetter : undefined}
                          done={"done" in measure ? measure.done : undefined}
                          departures={"departures" in measure ? measure.departures : undefined}
                          headcount={"headcount" in measure ? measure.headcount : undefined}
                          powerUserCount={"powerUserCount" in measure ? measure.powerUserCount : undefined}
                          powerUserTotal={"powerUserTotal" in measure ? measure.powerUserTotal : undefined}
                          periodLabel={"periodLabel" in measure ? measure.periodLabel : undefined}
                        />
                      </div>
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
