/**
 * FY27 Engineering V2MOM - The Year of Nova
 * Source of truth for dashboard content. Connect to Jira, Jellyfish, etc. for live metrics.
 */
export const v2momData = {
  vision: {
    title: "The Year of Nova",
    subtitle: "Powering Enterprise Innovation with AI and Trust",
    statement:
      "In FY27, we will establish Nova as the industry's most trusted AI platform, delivering agentic experiences that define the next era of marketing. We will prioritize enterprise-grade reliability, security, and quality as the primary driver for every release, leveraging this 'built-in' discipline to unlock our potential as a high-velocity, AI-augmented organization. We transform to be the most agile and innovative engineering team in the MarTech space by leveraging AI to remove every barrier between an idea and a solution for our 1200+ global customers.",
  },
  values: [
    {
      name: "Bias for Action & Urgency",
      description:
        "We move with a relentless rhythm of innovation, making crisp, timely decisions to stay ahead of the market. We dispel vagueness and ambiguity by rolling up our sleeves and getting the facts.",
    },
    {
      name: "Alignment: Run as one",
      description:
        "We operate as one company with clarity and unity, aligning Engineering goals with SALT's direction to ensure shared success. We embrace healthy, unfiltered conflict to reach the best decisions, prioritizing productive debate over artificial harmony.",
    },
    {
      name: "Accountability: Be an owner",
      description:
        "We deliver what we commit to with high predictability without compromising on enterprise-grade software. We hold ourselves and each other to a high bar.",
    },
    {
      name: "Enterprise-Grade Excellence",
      description:
        "We treat reliability, security, and quality as our competitive edge. We ship with paved paths and guardrails that keep us safe as we move fast.",
    },
  ],
  methods: [
    {
      id: 1,
      name: "Make Enterprise-Grade Foundation a differentiator",
      owner: "Pete Dapkus",
      description:
        "Build and maintain a best-in-class martech platform that guarantees industry-leading communication speed, reliability and security. We will achieve this by hardening our core services to meet strict performance and security SLOs, ensuring customers can reach their users when it counts. We will execute this with a focus on cost efficiency, leveraging automated scaling and architectural optimizations. We provide clear, actionable product limits and enforce them.",
      measures: [
        {
          text: "Meet 100% of SLO targets for the Core platform and 100% compliance with all customer SLAs every quarter.",
          dataSource: "static" as const,
          percent: 100,
          periodLabel: "February",
        },
        {
          text: "100% of high/medium security vulnerabilities on customer-facing tests remediated within the enterprise SLA every quarter.",
          dataSource: "jira_gsrr" as const,
        },
        {
          text: "Reduce ES‑driven negative‑margin organization by 50% vs FY26.",
          dataSource: "sigma_es_negative_margin" as const,
        },
        {
          text: "Reduce ES/ingestion‑related Sev1/Sev2 customer incidents by 50% vs FY26 baseline.",
          dataSource: "incident_io_es_ingestion" as const,
        },
        {
          text: "Reduce COGS by $500K annually by optimizing infrastructure and reducing third-party costs.",
          dataSource: "cogs_savings" as const,
          monthlySavings: 18000,
          targetAnnual: 500000,
          landedDate: "Feb 2026",
        },
      ],
    },
    {
      id: 2,
      name: "Make Nova the Center of Product Innovation",
      owner: "Rajesh Shetty",
      description:
        "Position Nova as the foundational intelligence layer of our platform, transitioning from manual tools to agentic experiences that redefine marketer-customer engagement. Ship Agentic Platform (Agent Workflow & Decision Engine, Context Engineering). Make AI innovation rapid through Standardized AI Frameworks and Velocity & Speed to Delivery.",
      measures: [
        {
          text: "Successfully launch one major Agentic Solution on the Nova platform per quarter throughout FY27.",
          dataSource: "jira_agentic" as const,
        },
        "Drive up share of iterable core functionalities enabled through agentic capabilities from X% to Y% through Nova conversations.",
        "Maintain a >80% Say/Do ratio on roadmap commitments per quarter for the Nova platform.",
        "Achieve [X]% Platform Decentralization, where [X]% of production-ready AI agents are autonomously built and maintained by distributed product teams outside of the Core Nova team.",
      ],
    },
    {
      id: 3,
      name: "Advance Platform Scalability and Intelligence through Engineering Big Rocks",
      owner: "Pete Dapkus",
      description:
        "Deepen Integration: Enhance the journey orchestration platform to facilitate seamless connectivity. Augment orchestration platform with iPaaS functionality. Modernize Data Architecture: Deploy analytics-optimized data store, complete ES8 Migration. Optimize Performance: Implement ScyllaDB and Flink for ultra-high write throughput and real-time stream processing.",
      measures: [
        "Add X net new engineering-supported partner integrations.",
        "Increase the share of active journeys consuming external integration signals from X% to Y%.",
        "Reduce P95 latency for high-cardinality analytical queries from A seconds to B seconds.",
        "Transition Y% of target high-cardinality workloads from Elasticsearch to the new analytics-optimized store by end of FY27.",
        "Power X% critical production use cases via Flink-based streaming architectures.",
      ],
    },
    {
      id: 4,
      name: "Increase AI-Augmented Velocity & Productivity",
      owner: "Patrick Hughes",
      description:
        "Build a best-in-class AI-powered Engineering organization focused on high-velocity delivery and minimal manual toil. Scale AI adoption and automation while decoupling Engineering from routine support through tooling and documentation. Provide engineers a complete AI tool chain to automate common engineering tasks.",
      measures: [
        {
          text: "Reduce Keep the Lights On (KTLO) work from 42% to 25%.",
          dataSource: "jellyfish_ktlo" as const,
        },
        {
          text: "30% reduction in Eng-dependent support tickets requiring engineering support.",
          dataSource: "jira_support_tickets" as const,
        },
        {
          text: "80% of engineers become AI Power Users, using AI-assisted coding 4-5 times a week.",
          dataSource: "jellyfish_ai_power_users" as const,
          powerUserCount: 33,
          powerUserTotal: 122,
        },
        {
          text: "Reduce retrospective mean completion time from 10 days to 3 days.",
          dataSource: "incident_io_retrospective" as const,
        },
      ],
    },
    {
      id: 5,
      name: "Grow Engineering",
      owner: "Paulo Dias / Rajesh Shetty",
      description:
        "Scale our global engineering footprint to drive innovation through strategic growth and distributed team investment. All teams have clear charters enabling autonomous operation. New teams are set up for success with sufficient knowledge transfer. All engineers are fully integrated into Engineering culture with first-class developer experience.",
      measures: [
        {
          text: "3 new teams will be completely built and operating in the Lisbon hub by the end of FY27.",
          dataSource: "static_progress" as const,
          current: 0,
          target: 3,
          unit: "teams",
        },
        {
          text: "Establish 80% of Lisbon-based teams as fully autonomous units with local leadership owning core product/technology components.",
          dataSource: "static" as const,
          percent: 0,
        },
        {
          text: "ASG gets at least one representative based from Lisbon.",
          dataSource: "static_progress" as const,
          current: 0,
          target: 1,
          unit: "",
        },
        {
          text: "Engineering Attrition below 12% annualized.",
          dataSource: "attrition" as const,
          departures: 6,
          headcount: 135,
        },
        {
          text: "Time to Hire is below X days.",
          dataSource: "static" as const,
          percent: 0,
          tbd: true,
        },
        {
          text: "Hire Principal Architect.",
          dataSource: "static_progress" as const,
          current: 0,
          target: 1,
          unit: "",
        },
        {
          text: "Achieving 5+ external technical contributions (blog posts, speaker sessions at AWS re:Invent, KubeCon, etc).",
          dataSource: "static_progress" as const,
          current: 0,
          target: 5,
          unit: "contributions",
        },
      ],
    },
    {
      id: 6,
      name: "Make Developer Experience a Force Multiplier",
      owner: "Pete Dapkus, Patrick Hughes",
      description:
        "Eliminate delivery friction by modernizing CI/CD infrastructure and streamlining quarterly planning lifecycle. Reduce Idea-to-Production lead time through faster build/test cycles and automated deployments. Proactively map dependencies and remove planning bottlenecks. Ensure the system protects itself against overload and limits blast radius of failures.",
      measures: [
        {
          text: "Decrease Change Lead Time to less than 7 days, as measured by Jira tickets with PRs in In Progress status.",
          dataSource: "jellyfish_lead_time" as const,
        },
        {
          text: "Improve our top 4 DevEx categories (Release Process, Codebase Health, Code Review, Context Switching) by X%.",
          dataSource: "devex_survey" as const,
          surveyUrl: "https://devex.jellyfish.co/study/9035cdcc-4ae1-4a98-98dd-520325a7b8f4/analyze/insights",
          devexIndex: { score: 56, trend: -3 },
          topics: [
            { name: "Release Process", priority: 1, score: 42, trend: -9 },
            { name: "Codebase Health", priority: 2, score: 45, trend: -3 },
            { name: "Code Review", priority: 3, score: 50, trend: -14 },
            { name: "Context Switching", priority: 4, score: 28, trend: -17 },
          ],
        },
        "Increase engagement score from x% to y%.",
      ],
    },
    {
      id: 7,
      name: "Engineering Operational Rigor",
      owner: "Patrick Hughes",
      description:
        "Transform Engineering into an innovative, well-oiled organization by replacing manual reporting with automated, objective and actionable telemetry. Build the connective tissue between business strategy and technical execution. Adopt and utilize V2MOM to prioritize and adjust efforts quickly. Ensure priorities stay clear, progress is visible without extra reporting overhead, reliability gaps are systematically hardened, and priority roadmap work translates into defensible innovation through an Engineering IP pipeline.",
      measures: [
        {
          text: "100% of Engineering V2MOMs are published by Mar 2, 2026.",
          dataSource: "static" as const,
          percent: 100,
        },
        {
          text: "100% of Engineering V2MOM measures are dashboarded and reviewed on a monthly basis in a centralized Execution Dashboard by the end of Q1.",
          dataSource: "static" as const,
          percent: 50,
        },
        {
          text: "Achieve a 90% Data Hygiene score across Jira and Jellyfish to ensure real-time reporting accuracy and resource allocation.",
          dataSource: "static" as const,
          percent: 75,
          tbd: true,
        },
        "90% of feature teams use a standardized Execution Dashboard to provide transparency into project health and predictability.",
        {
          text: "90% of SMART Action Items from SEV1/SEV2s are completed QoQ to ensure systemic reliability.",
          dataSource: "jira_smart_action_items" as const,
        },
        "Establish an Engineering IP pipeline that converts priority roadmap work into defensible IP by filing 5 patents in FY27.",
      ],
    },
  ],
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
