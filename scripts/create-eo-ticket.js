#!/usr/bin/env node
/**
 * Create a Jira ticket in the EO project.
 * Run from project root: node scripts/create-eo-ticket.js [summary]
 * Example: node scripts/create-eo-ticket.js "Test deployment workflow"
 * Requires: JIRA_EMAIL, JIRA_API_TOKEN, JIRA_BASE_URL in .env.local or environment
 */

const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv();

const email = process.env.JIRA_EMAIL;
const token = process.env.JIRA_API_TOKEN;
const baseUrl = (process.env.JIRA_BASE_URL || "https://iterable.atlassian.net").replace(/\/$/, "");

if (!email || !token) {
  console.error("Missing JIRA_EMAIL or JIRA_API_TOKEN. Add them to .env.local");
  process.exit(1);
}

const auth = Buffer.from(`${email}:${token}`).toString("base64");

const summary = process.argv[2] || "Engineering V2MOM Dashboard – Internal hosting setup";

const body = {
  fields: {
    project: { key: "EO" },
    summary,
    issuetype: { name: "Task" },
    description: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Engineering V2MOM Dashboard for FY27 Engineering V2MOM (Vision, Values, Methods, Obstacles, Measures).",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Repository: ",
              marks: [{ type: "strong" }],
            },
            {
              type: "text",
              text: "https://github.com/Iterable/InternalEngOpsTooling",
              marks: [{ type: "link", attrs: { href: "https://github.com/Iterable/InternalEngOpsTooling" } }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Tech stack: Next.js 14, React, Tailwind CSS. Data sources: JIRA (GSRR, agentic launches), Jellyfish (KTLO). Designed for internal hosting.",
            },
          ],
        },
      ],
    },
  },
};

async function create() {
  const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Jira API error ${res.status}:`, err);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`Created: ${baseUrl}/browse/${data.key}`);
  console.log(`KEY: ${data.key}`);
}

create().catch((e) => {
  console.error(e);
  process.exit(1);
});
