# Post-consultation prescription changes

Branch: `feature/post-consultation-prescription-additions`, based on main `717573c`.

## Behavior

- Only the appointment's primary doctor can add or remove medicines for that specific completed online/video appointment. Removal includes medicines contributed by a specialist.
- Eligibility lasts strictly less than 24 hours after `completedAt`; at exactly 24 hours the endpoint returns 409. All calculations use UTC instants, not calendar dates or appointment scheduling time.
- Both explicit completion and the existing both-participants-left call flow record `completedAt`. Repeat completion does not reset it. Legacy completed appointments without a reliable timestamp are intentionally ineligible; `updatedAt` is never used as a guess.
- An absent legacy visitType is treated as online, consistent with the application's existing visit-type behavior. An explicitly offline appointment is ineligible.
- Existing medicines can be removed through explicit removal IDs; removed entries and the acting doctor/time are retained in the audit. The general EMR endpoint rejects direct medicine-list submissions for completed video appointments, while notes-only saves preserve existing medicines and labs.
- Completed appointments cannot be reopened, cancelled or rescheduled through the normal action routes to bypass the prescription rules.
- Changes preserve notes, labs, recording metadata, appointment status, existing orders and all medicines not explicitly removed. No new pharmacy order or charge is automatically created.
- Medicines are appended to `appointment.emr.medicines`, so existing prescription reads, medicine ordering selection and newly generated PDFs see the latest list. Previously downloaded PDFs remain unchanged.
- Each addition carries a server-generated ID, contributor identity, timestamp and update ID. `appointment.prescriptionUpdates` retains the append audit and notification delivery state.

## Doctor UI

Open patient profile -> Consultations -> select the completed appointment -> Medicines. Add Medicine appears beside the Medicines heading, and Remove/Undo appears on each existing medicine card. The Medications tab is read-only. The same editor is available on the completed video appointment's Complete EMR screen.

Use Add Medicine to prepare new medicines and Remove/Undo to stage removals, then select **Save changes & notify patient**. No change is applied before saving. Failed saves preserve the draft. An ambiguous network/5xx result locks the draft for a retry with the exact same request ID and payload. Removing medicines never changes, cancels, refunds or recreates existing pharmacy orders.

## API

`GET /api/appointments/:id/prescription-additions` (primary doctor only) returns eligibility, reason, deadline, existing medicines and clinic ID.

`POST /api/appointments/:id/prescription-additions`:

```json
{
  "requestId": "unique-client-request-id",
  "medicines": [{
    "name": "Example medicine",
    "dosage": "As prescribed",
    "timing": "After food",
    "frequency": "Once Daily",
    "instructions": "Follow the prescription"
  }]
}
```

The requestId is 8-100 ASCII letters/digits/underscores/hyphens. Use a new UUID for a new batch and reuse the same ID and payload for retries. A replay returns success without another addition; reusing the ID with different normalized medicine content returns 409. An already-saved request can be replayed after the window closes.

Required medicine text: name, dosage, timing and frequency. Instructions may be empty. Optional productId/manufacturer and positive integer durationDays/quantity are supported. Client contributor identity, timestamps and medicine IDs are not trusted. A batch is limited to 20 medicines; an appointment to 100 addition events and 500 medicines.

The same POST endpoint also accepts `removeMedicineIds: ["existing-medicine-id"]`. For removal-only saves, `medicines` may be omitted or an empty array. At least one addition or removal is required. GET returns removal IDs for legacy medicines too; clients must use these IDs rather than names or array indexes. Unknown/stale IDs reject the whole batch with 409. Additions, removals, audit and notification intent commit atomically. Addition-only idempotency hashes remain compatible with the original client.

## Notification delivery and rollout

The prescription update and notification intent are committed in one ETag-protected appointment write. In-app notifications use deterministic IDs, target the account owner and include the correct self/family profile. Push text is generic and does not contain medicine names or dosage.

Successful saves return `notificationPending`. A failed notification never rolls back medicines. Push success means Expo accepted the request (or no usable registered device exists), not proof of device delivery.

**Deployment action required:** configure an existing scheduler or a new once-per-minute job to call:

```text
POST /api/internal/prescription-notifications/sweep
X-Internal-Secret: <configured INTERNAL_CRON_SECRET>
```

The new scheduler was not configured as part of this repository change. The initial save and exact-request replay also attempt pending delivery.

The retry sweep uses an ETag-protected two-minute lease to avoid concurrent sends. Delivery is at-least-once: a process crash after Expo accepts a push but before the acknowledgement is saved may repeat that push. In-app entries remain deduplicated. The stable push `notificationId` lets the patient app deduplicate repeats.

Patient notification payload:

```json
{
  "type": "prescription_updated",
  "referenceId": "appointment-id",
  "profileId": "account-or-family-profile-id",
  "notificationId": "stable-update-id"
}
```

The notification-list API exposes `reference_id` and `profile_id`. Patient notification routing was implemented in the separate `D:\Wellness` repository on `feature/post-consultation-prescription-notifications`. It opens the latest prescription for the correct profile; removal of all medicines displays an empty updated prescription. Real-device delivery remains to be verified.

## Test-first record and results

The initial backend contract tests and UI tests were written before implementation and failed because the feature modules did not exist. The push-delivery tests were run against the original helper: all five original assertions failed because the helper returned no delivery outcome. Additional route/concurrency/regression tests were added while implementing.

| File | Tests | Result |
|---|---:|---|
| `backend/test/unit/prescriptionAdditions.test.ts` | 52 | Passed |
| `backend/test/unit/pushDelivery.test.ts` | 7 | Passed |
| `backend/test/integration/prescriptionFlow.test.ts` | 8 | Passed |
| `doctor-portal/test/integration/post-consultation-prescription.test.tsx` | 9 | Passed |
| Total | 76 | Passed |

Coverage includes the exact deadline and just-before boundary, missing/future/invalid completion timestamps, non-completed/offline appointments, authorization, malformed medicines, audit fields, sequential/concurrent duplicate requests, competing additions, ETag retries, account/family notification routing, notification failures/retries, push ticket rejection, dead devices, legacy EMR replacement protection, completion paths, patient PDF data and UI errors/double-click prevention.

API integration tests run real Express routes and update helpers against mocked persistence/authentication/providers. The PDF test checks the current medicine data passed to the renderer, not PDF visual layout. UI tests use jsdom and a mocked medicine-entry component. This is not deployed browser/mobile/Cosmos/Expo end-to-end verification and does not reproduce the older test branch's entire regression suite.

Commands from repository root:

```powershell
npm --prefix backend test
npm --prefix doctor-portal test
npm --prefix backend run build
npm --prefix doctor-portal run build
```

Backend and doctor production builds passed during implementation. npm installation also reported dependency advisories (backend 18, doctor portal 26 at installation time); no broad `npm audit fix` or unrelated dependency remediation was performed. A non-fatal stale Browserslist-data warning appears during the portal build.

No production data was modified, no cloud scheduler/deployment was changed, and no commit was created.
