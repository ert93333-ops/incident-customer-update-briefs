# Incident Customer Update Briefs

Static browser-local MVP for turning public-safe SaaS incident notes or draft outage updates into a customer-ready incident update brief, missing-context checklist, next-update cadence, channel consistency handoff, and tone/privacy risk flags.

## Public pages

- Landing: `https://ert93333-ops.github.io/incident-customer-update-briefs/`
- Checklist: `https://ert93333-ops.github.io/incident-customer-update-briefs/saas-incident-communication-template.html`

## Scope

- No monitoring integration, status-page OAuth, incident-management integration, support-ticket export, private log upload, customer list upload, customer email sending, security/legal/SLA advice, breach notification advice, root-cause guarantee, or external database.
- Shared marketing and notification credentials stay in the private root `.env` of the Hermes playbook, not in this public site directory.

## Verification

From the Hermes playbook root:

```powershell
npm run workflow:incident-customer-update
```
