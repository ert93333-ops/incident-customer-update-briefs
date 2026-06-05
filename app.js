const PRODUCT = "Incident Customer Update Briefs";
const STORAGE_PREFIX = "incidentcustomerupdatebriefs";
const ISSUE_URL = "https://github.com/ert93333-ops/incident-customer-update-briefs/issues/new?template=demo_request.md&labels=early-access%2Cpurchase-intent%2Cdemo-request&title=Early%20access%20request%3A%20Incident%20Customer%20Update%20Briefs";

const fields = {
  incident: document.querySelector("#incident-notes"),
  impact: document.querySelector("#impact-notes"),
  symptom: document.querySelector("#symptom-notes"),
  state: document.querySelector("#state-notes"),
  mitigation: document.querySelector("#mitigation-notes"),
  owner: document.querySelector("#owner-notes"),
  channel: document.querySelector("#channel-notes"),
  caveat: document.querySelector("#caveat-notes"),
  followup: document.querySelector("#followup-notes"),
  tone: document.querySelector("#tone-notes"),
};

const output = document.querySelector("#brief-output");
const outputStatus = document.querySelector("#output-status");
const workflowError = document.querySelector("#workflow-error");
const copyButton = document.querySelector("#copy-brief");
const copyStatus = document.querySelector("#copy-status");
const intentForm = document.querySelector("#intent-form");
const intentStatus = document.querySelector("#intent-status");
const remoteIntent = document.querySelector("#remote-intent");
const remoteIntentLink = document.querySelector("#remote-intent-link");
const remoteCopyButton = document.querySelector("#copy-remote-intent");
const remoteCopyStatus = document.querySelector("#remote-copy-status");

let lastBriefText = "";
let selectedPlan = "Starter";
let lastRemoteBody = "";

function track(event, detail = {}) {
  const payload = {
    event,
    detail,
    page: window.location.pathname,
    utm: Object.fromEntries(new URLSearchParams(window.location.search)),
    at: new Date().toISOString(),
  };
  const key = `${STORAGE_PREFIX}_analytics_events`;
  const events = JSON.parse(localStorage.getItem(key) || "[]");
  events.push(payload);
  localStorage.setItem(key, JSON.stringify(events.slice(-200)));
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function fieldText() {
  return Object.fromEntries(Object.entries(fields).map(([key, element]) => [key, element.value.trim()]));
}

function combinedText(values) {
  return Object.values(values).join("\n").toLowerCase();
}

function missingChecks(values) {
  const all = combinedText(values);
  const checks = [
    {
      label: "missing affected service, component, feature, region, or customer group:",
      ok: hasAny(`${values.incident} ${values.impact}`.toLowerCase(), [/\b(api\b(?!\s*(key|token|secret))|checkout|login|dashboard|database|webhook|search|payments?|region|eu|us|tenant|workspace|component|service|feature)\b/, /\b(affected customers|paid customers|eu customers|customer group|users in|customers using|users using)\b/]),
    },
    {
      label: "missing customer-visible impact, severity, symptoms, or degraded behavior:",
      ok: hasAny(`${values.incident} ${values.symptom}`.toLowerCase(), [/\b(impact|affected|unavailable|down|degraded|error|failed|failing|latency|slow|timeout|cannot|can't|delayed|partial|severity|symptom|500|503)\b/]),
    },
    {
      label: "missing incident state such as investigating, identified, monitoring, resolved, scheduled maintenance, or post-incident:",
      ok: hasAny(`${values.incident} ${values.state}`.toLowerCase(), [/\b(investigating|identified|monitoring|resolved|scheduled maintenance|maintenance|post-incident|degraded|partial outage|outage|rollback|mitigated)\b/]),
    },
    {
      label: "missing current mitigation, workaround, customer action, or no-action-needed statement:",
      ok: hasAny(`${values.incident} ${values.mitigation}`.toLowerCase(), [/\b(mitigat|workaround|retry|refresh|no action|no customer action|rollback|rolled back|reroute|fix|patched|pause|use .* instead|temporary path)\b/]),
    },
    {
      label: "missing next-update timestamp, update cadence, owner, communication lead, or escalation path:",
      ok: hasAny(`${values.incident} ${values.owner}`.toLowerCase(), [/\b(next update|update at|every \d+|cadence|owner|owns|lead|incident commander|support lead|comms lead|escalat|by \d{1,2}:\d{2}|utc|pt|et)\b/]),
    },
    {
      label: "missing status page, email, in-app banner, support macro, or channel consistency note:",
      ok: hasAny(`${values.incident} ${values.channel}`.toLowerCase(), [/\b(status page|statuspage|email update|customer email|in-app|banner|support macro|help center|slack|discord|social|same message|consistent|channel)\b/]),
    },
    {
      label: "missing security, data-loss, privacy, or billing-impact caveat when the draft implies one:",
      ok: !hasAny(all, [/\b(security|breach|privacy|data loss|data-loss|billing impact|customer data|exposed|leak|unauthorized)\b/]) || hasAny(values.caveat.toLowerCase(), [/\b(no evidence|not affected|under review|being reviewed|caveat|do not overstate|privacy|security|data loss|billing impact)\b/]),
    },
    {
      label: "missing resolution, follow-up, or postmortem commitment for significant incidents:",
      ok: hasAny(`${values.incident} ${values.followup}`.toLowerCase(), [/\b(resolved|resolution|follow-up|follow up|postmortem|post-mortem|incident summary|root cause summary|action items|within 48 hours|timeline)\b/]),
    },
  ];

  const toneRisk = hasAny(all, [/\b(vendor's fault|aws fault|not our fault|guaranteed|definitely fixed|back soon|eta is guaranteed|root cause is obvious|no issue|nothing to worry|catastrophic|disaster|panic|all data is safe)\b/]);
  const privateRisk = hasAny(all, [/\b(stack trace|api key|token|password|secret|credential|customer list|crm export|support export|incident channel|slack export|ip address|internal log|database dump|personal email|ssn|credit card|private customer)\b/]);

  const warnings = checks.filter((check) => !check.ok).map((check) => check.label);
  if (toneRisk) warnings.push("vague, blame-heavy, panic-inducing, overconfident ETA, unsupported root-cause, or false reassurance language:");
  if (privateRisk) warnings.push("private incident logs, customer data, IP addresses, stack traces, credentials, internal channel exports, customer lists, or personal data risk:");
  return warnings;
}

function line(label, value, fallback) {
  return `<li><strong>${label}:</strong> ${escapeHtml(value || fallback)}</li>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function buildBrief(values) {
  const warnings = missingChecks(values);
  const statusOutline = [
    "Acknowledge the issue and customer-visible impact in plain language.",
    "Name affected component/customer group only when public-safe.",
    "State current incident phase and what the team is doing now.",
    "Give the next-update time even if there is no new information.",
    "Keep status page, email, in-app banner, and support macro wording consistent.",
  ];

  output.innerHTML = `
    <h3>Incident customer update brief ready</h3>
    <h4>Parse summary</h4>
    <ul>
      ${line("Affected scope", values.impact, "Needs service/component/customer group.")}
      ${line("Customer-visible impact", values.symptom, "Needs symptoms or degraded behavior.")}
      ${line("Incident state", values.state, "Needs investigating/identified/monitoring/resolved state.")}
      ${line("Mitigation or workaround", values.mitigation, "Needs mitigation, workaround, or no-action-needed statement.")}
      ${line("Owner and cadence", values.owner, "Needs next-update time and communication owner.")}
    </ul>
    <h4>Missing context and risk warnings</h4>
    ${warnings.length ? `<ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : "<p>No major missing context detected in the public-safe fields.</p>"}
    <h4>Customer-safe status update outline</h4>
    <ol>${statusOutline.map((item) => `<li>${item}</li>`).join("")}</ol>
    <h4>Next-update cadence and channel handoff</h4>
    <p>${escapeHtml(values.owner || "Set a named communication owner and a concrete next-update timestamp.")}</p>
    <p>${escapeHtml(values.channel || "Mirror the same impact, state, and next-update time across status page, email, in-app banner, and support macros.")}</p>
    <h4>Owner and support handoff</h4>
    <p>${escapeHtml(values.followup || "For significant incidents, plan a post-incident summary with timeline, root-cause summary when approved, and action items.")}</p>
    <p>${escapeHtml(values.caveat || "If security, data-loss, privacy, or billing impact is implied, add only an approved caveat and avoid speculation.")}</p>
  `;

  lastBriefText = output.innerText;
  outputStatus.textContent = warnings.length ? `${warnings.length} issue(s) to review` : "Brief ready";
  copyButton.disabled = false;
  track("brief_generated", { warningCount: warnings.length });
  track("core_action_completed", { warningCount: warnings.length });
}

function generateBrief() {
  workflowError.textContent = "";
  const values = fieldText();
  if (!values.incident) {
    workflowError.textContent = "Paste incident notes or a draft customer update first.";
    track("brief_generation_failed", { reason: "empty_incident_notes" });
    return;
  }
  track("core_action_started", { triggerSource: "generate_button" });
  buildBrief(values);
}

async function copyText(text, statusElement, success) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  statusElement.textContent = success;
}

function loadSample() {
  fields.incident.value = "Payments API incident started at 09:20 UTC. EU customers using the card update flow see 500 errors. Existing account access is unaffected.";
  fields.impact.value = "Payments API, EU region, card update flow for paid customers.";
  fields.symptom.value = "Card update attempts fail with 500 errors; existing access and invoices are unaffected.";
  fields.state.value = "Identified; rollback is in progress and the team is monitoring error rate.";
  fields.mitigation.value = "Customers can retry after the next update; no customer action is needed for existing access.";
  fields.owner.value = "Support lead owns customer updates; next update at 10:00 UTC and then every 30 minutes until resolved.";
  fields.channel.value = "Status page, support macro, and in-app banner use the same impact, state, and next-update time.";
  fields.caveat.value = "No evidence of data loss or unauthorized access; billing impact is under review and should not be overstated.";
  fields.followup.value = "If customer-visible impact exceeds 30 minutes, publish a post-incident summary within 48 hours.";
  fields.tone.value = "No vendor blame, no guaranteed ETA, no stack traces, no internal incident channel excerpts.";
  track("sample_loaded", { sample: "payments_api_incident" });
}

const pathName = window.location.pathname;
track("page_view");
if (pathName === "/" || pathName.endsWith("/") || pathName.endsWith("/index.html")) track("landing_viewed");
if (pathName.endsWith("saas-incident-communication-template.html")) {
  track("template_opened");
  track("seo_page_viewed");
}

if (document.querySelector("#generate-button")) {
  document.querySelector("#generate-button").addEventListener("click", generateBrief);
  document.querySelector("#sample-button").addEventListener("click", loadSample);
  copyButton.addEventListener("click", () => {
    copyText(lastBriefText, copyStatus, "Copied incident update brief.");
    track("copy_brief_clicked");
  });

  document.querySelectorAll(".plan-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPlan = button.dataset.plan;
      document.querySelector("#plan-interest").value = selectedPlan;
      track("plan_selected", { plan: selectedPlan });
      track("pricing_viewed", { plan: selectedPlan });
      intentForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  intentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    track("signup_started", { plan: selectedPlan });
    const intent = {
      email: document.querySelector("#intent-email").value.trim(),
      role: document.querySelector("#intent-role").value.trim(),
      volume: document.querySelector("#incident-volume").value.trim(),
      process: document.querySelector("#current-process").value.trim(),
      plan: document.querySelector("#plan-interest").value,
      willingness: document.querySelector("#willingness").value.trim(),
      at: new Date().toISOString(),
    };
    const key = `${STORAGE_PREFIX}_purchase_intents`;
    const intents = JSON.parse(localStorage.getItem(key) || "[]");
    intents.push(intent);
    localStorage.setItem(key, JSON.stringify(intents.slice(-50)));
    lastRemoteBody = [
      "Public early access request for Incident Customer Update Briefs.",
      "",
      `Role/team: ${intent.role || "[not provided]"}`,
      `Incident volume: ${intent.volume || "[not provided]"}`,
      `Current update process: ${intent.process || "[not provided]"}`,
      `Plan interest: ${intent.plan}`,
      `Willingness to pay: ${intent.willingness || "[not provided]"}`,
      "",
      "Do not include private customer data, incident logs, or email addresses in this public issue.",
    ].join("\n");
    remoteIntentLink.href = `${ISSUE_URL}&body=${encodeURIComponent(lastRemoteBody)}`;
    remoteIntent.hidden = false;
    intentStatus.textContent = "You are on the early access list. Open or copy the public request if you want remote follow-up.";
    track("purchase_intent_submitted", { plan: intent.plan, hasEmail: Boolean(intent.email) });
    track("waitlist_submitted", { plan: intent.plan });
    track("signup_completed", { plan: intent.plan });
    track("remote_intent_ready", { includesEmail: false });
  });

  remoteCopyButton.addEventListener("click", () => {
    copyText(lastRemoteBody, remoteCopyStatus, "Copied request details.");
    track("remote_intent_copied");
  });

  document.querySelectorAll('a[href="#workflow"]').forEach((link) => {
    link.addEventListener("click", () => track("cta_clicked", { triggerSource: "workflow_link" }));
  });
}
