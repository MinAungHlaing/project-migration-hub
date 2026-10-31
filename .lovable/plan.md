# Integrate the full concepts ERP into GTM

## Scope
Bring **every active feature** from the concepts folder into the existing main app. Preserve the current catalog, historical records, photos, ordering, and Android interfaces. Nothing remains as a separate prototype.

English is the default; Burmese and Chinese remain available. Preserve the prototype’s existing business rules rather than introducing new accounting behavior. Features explicitly removed or held in the source remain removed or held; document them instead of silently activating them.

## 1. Owner and staff access
- Create the requested Owner account, then verify its sign-in. The supplied password was rejected by password protection; provide a secure password-setup path rather than weakening protection.
- Replace automatic first-signup admin access with explicit Owner provisioning. The unsafe automatic grant has already been disabled and checked.
- Add Owner, Finance, Warehouse, Sales, and Delivery access, editable permission bundles, staff activation, departments, areas, teams, and leader designation.
- Preserve private Actual-cost visibility, Warehouse settlement-only access, own/assigned/team record scopes, and active-account checks. Empty custom permission bundles deny access.
- Link staff identities to existing reps without copying old passwords or merging unrelated users.

## 2. Product master, prices, and inventory
- Add separate Actual cost, B2C pricing, margins, risk percentages, active/sellable switches, supplier normalization/closure, and complete price-change history.
- Add shared base-unit pack families, pack suggestions/link/unlink/dismissal, safeguards, family-aware stock and shortage calculations.
- Extend adjustments, movement history, physical counts and approvals, stock-and-price spreadsheets, and expiry warnings.
- Keep expiry advisory as in the source, not an invented FIFO inventory system.

## 3. Orders, outlets, and delivery
- Add authenticated staff order creation, selected price tier, line/invoice discounts, cost snapshots, dates, team attribution, credit warnings/limits/Owner override, and finance price flags.
- Preserve edit caps, print/payment/state locks, cancellation rules, partial delivery, and idempotent submissions.
- Add printable invoices, payment records and verification, good/damaged returns, finance checks, and once-per-outlet exchange enforcement. Returns do not silently change invoice totals.
- Extend outlet aliases, ambiguous matching, duplicate suggestions/dismissals, safe merges, pin reset, shop types, debt history, GPS evidence and discrepancy review.
- Add Sales and Delivery dashboards, visits, assignment boards, failed attempts, shortfalls, cash/digital/bank collections, and verified handovers.
- Consolidate fulfillment into one transactional operation so status changes cannot bypass inventory movements.

## 4. Buying and supplier settlement
- Add demand/all-days buy lists, older-demand priority, pooled-stock/on-order coverage, supplier grouping and explanations.
- Add demand/direct purchase requests, compatible-request merge choices, line changes, printing, cancellation/closing, and partial receipts.
- Add warehouse receipt followed by Finance verification, purchase extras, expiry dates, foreign-currency evidence, and cancellation reversals.
- Add supplier returns and draft → sent → confirmed → paid settlements, frozen amounts, adjustments, printouts, methods and denomination evidence.
- Preserve the source’s current-Actual settlement valuation and display missing costs/pending checks; do not substitute new costing rules.

## 5. Finance, reporting, and decision support
- Add expenses, money book, group opening balances, counted cash, and money/stock/receivable/payable position.
- Add daily cashbox, denomination counters, counted-opening chain, variance reasons, verification, frozen closes, and correction/drift handling.
- Add profit, ranked sales analysis, rep/team/area/shop-type reports, price-risk/review queues and handled marks, notifications and audit.
- Add tax estimates, daily spreadsheet snapshot downloads, market-price observations, and the source’s deterministic Ask assistant—not a replacement chatbot.
- Preserve order-date revenue, cost snapshots, payment-date collections, and report-only tax semantics.

## 6. Languages, offline field work, and recovery
- Bring across Burmese/English/Chinese translations, language persistence, workflow tabs and back navigation.
- Add installability, cached field catalog, durable account-isolated order/edit/delivery queues, retry/conflict feedback and duplicate protection.
- Keep offline caching disabled in editor previews; verify offline use on the published app when publishing is requested.
- Add business profile, office GPS, discrepancy threshold and leader-price settings.
- Recreate downloadable backups, retention, validated restore with confirmation and safety copy, and daily snapshot behavior in Lovable Cloud rather than copying SQLite files.
- Track existing push notifications separately; implement their delivery path and securely request required keys when live verification is ready.

## Technical approach
- Additive PostgreSQL changes through the migration tool, with grants and access policies for every new table; extend existing entities instead of creating a competing ERP database.
- Preserve original IDs/generations and historical snapshots. Inspect and sanitize any prototype records before import; do not replace existing stock with prototype zero balances.
- Protected server functions enforce permissions and row scopes before privileged operations; confidential fields never enter unauthorized responses.
- Preserve external API contracts or implement compatibility adapters, including published-path authentication requirements.
- Record a separate migration-ledger entry for each domain, provider, identity, media, offline and verification outcome.

## Verification and completion
- Add focused tests for credit, discounts, permission boundaries, stock pooling, receiving/reversals, settlement freezing, cash reconciliation and duplicate sync.
- Exercise real Owner and staff flows: create/read/update, receipt/check, order/invoice/delivery/payment/return, cashbox close, and permission-denied checks.
- Verify all content pages, images, metadata, desktop/phone layouts, exports and recovery safeguards.
- Mark complete only when every detected capability works and is verified; explicitly identify any remaining email, record, push-key, external-caller or publishing dependency.