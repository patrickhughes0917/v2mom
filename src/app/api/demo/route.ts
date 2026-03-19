import { NextResponse } from "next/server";

/**
 * Demo API - Returns sample data structured by V2MOM pillars
 * Replace with real API calls to your connected data sources
 */
export async function GET() {
  const demoData = {
    vision: {
      title: "Vision",
      description: "Where we're headed",
      metrics: [
        { label: "Strategic Initiatives", value: 5, change: "On track", trend: "up" as const, changeSuffix: "" },
        { label: "OKR Progress", value: "78%", change: "+12%", trend: "up" as const },
      ],
      highlights: ["Q1 roadmap 85% complete", "Platform migration in progress"],
    },
    values: {
      title: "Values",
      description: "What we stand for",
      metrics: [
        { label: "Code Review Rate", value: "94%", change: "+2%", trend: "up" as const },
        { label: "Documentation Score", value: "B+", change: "Improved", trend: "up" as const, changeSuffix: "" },
      ],
      highlights: ["All PRs reviewed within 24h", "Architecture docs updated"],
    },
    methods: {
      title: "Methods",
      description: "How we work",
      metrics: [
        { label: "Sprint Velocity", value: 42, change: "+8", trend: "up" as const },
        { label: "Deploy Frequency", value: "12/wk", change: "+3", trend: "up" as const },
      ],
      highlights: ["CI/CD pipeline optimized", "Sprint ceremonies on track"],
    },
    obstacles: {
      title: "Obstacles",
      description: "What we're overcoming",
      metrics: [
        { label: "Open Blockers", value: 3, change: "-2", trend: "down" as const },
        { label: "Tech Debt Items", value: 18, change: "-5", trend: "down" as const },
      ],
      highlights: ["Legacy API migration 60% done", "2 critical bugs resolved"],
    },
    measures: {
      title: "Measures",
      description: "How we track success",
      metrics: [
        { label: "MTTR", value: "2.4h", change: "-0.8h", trend: "down" as const },
        { label: "Uptime", value: "99.92%", change: "+0.02%", trend: "up" as const },
      ],
      highlights: ["Incident response improved", "SLO targets met"],
    },
    chartData: [
      { name: "Mon", value: 12 },
      { name: "Tue", value: 19 },
      { name: "Wed", value: 15 },
      { name: "Thu", value: 22 },
      { name: "Fri", value: 18 },
      { name: "Sat", value: 8 },
      { name: "Sun", value: 5 },
    ],
    recentActivity: [
      { id: 1, title: "Sprint planning completed", source: "Jira", time: "2 min ago" },
      { id: 2, title: "New incident reported", source: "Incident.io", time: "15 min ago" },
      { id: 3, title: "Deployment to production", source: "Deploy", time: "1 hour ago" },
      { id: 4, title: "Slack channel created", source: "Slack", time: "2 hours ago" },
    ],
  };

  return NextResponse.json(demoData);
}
