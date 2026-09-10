---
id: TASK-22
title: 'T17: Delivery-adapter seam (interface + registry + Noop)'
status: Done
assignee: []
created_date: '2026-09-10 05:13'
updated_date: '2026-09-10 06:03'
labels:
  - pdf-brief
  - P4
milestone: m-1
dependencies: []
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create src/lib/everlin/brief/delivery.ts defining DeliveryAdapter { deliver(ctx: { brief; pdf: Buffer; byteHash: string; asOf: string }): Promise<{ ok: boolean; deliveryId?: string; error?: string }> }, a registry that resolves the active adapter by env, and a NoopDeliveryAdapter (logs + returns ok, idempotent by docId/date). Add empty stub skeletons for email/SMS/Teams/SharePoint that throw 'not implemented' so the contract is documented and channels bolt on later WITHOUT touching cron or template. Delivery itself is OUT of scope — this ticket only builds the seam.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 delivery.ts exports the DeliveryAdapter interface, a registry, and a working NoopDeliveryAdapter
- [x] #2 NoopDeliveryAdapter.deliver returns { ok: true } and is idempotent by docId/date
- [x] #3 Email/SMS/Teams/SharePoint stubs exist and throw 'not implemented' (no real send)
- [x] #4 The registry selects Noop by default
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivery seam + Noop (idempotent) + channel stubs throw. Verified live.
<!-- SECTION:FINAL_SUMMARY:END -->
