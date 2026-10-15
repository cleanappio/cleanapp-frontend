# Browser reporting handoff

This describes the implementation in this change. Keep public claims aligned with the actual receipt and backend behavior. See `docs/seo-search-intent.md` for content strategy.

## Experience and ownership

- `HomeSeoSection` and `/report-a-problem` render the same `ReportComposer`: text, an optional image via **+**, and **Send**. Text-only, image-only and combined submissions work. No account, location prompt or category form is required.
- `_app.tsx` mounts `ReportWidget` across the site. Its accessible dialog traps focus, supports Escape and keeps its in-memory draft when closed. Embedded mode suppresses the global widget.
- `ReportComposer` owns validation, preparation, sending, retry and receipt presentation. `src/lib/web-reporting.ts` owns payloads, limits, image preparation, receipt parsing and optional analytics. Do not build a second intake flow for a new landing page.
- `?kind=physical` and `?kind=digital` links reach the same natural-language composer; classification happens downstream. They do not require the reporter to select a category.

## Actual HTTP contract

Requests go directly to `${NEXT_PUBLIC_LIVE_API_URL || "https://live.cleanapp.io"}/api/v1/human-reports`, with `credentials: "omit"`. There is no new frontend proxy or secret.

`POST /submit`, `Content-Type: application/json`:

```json
{
  "version": "1.0",
  "channel": "web",
  "source_id": "web_<random UUID>",
  "session_id": "<random session UUID>",
  "annotation": "The report text",
  "image": "<optional raw JPEG base64, without a data: prefix>"
}
```

The browser omits `observed_at`: the time of the actual observation is unknown unless the reporter describes it. The API records receipt time separately. Session IDs are provenance, not authentication or rate-limit exemptions. The browser does not send a wallet identity, coordinates or filename.

A usable response requires a safe `receipt_id` plus a recognized `status`: `received`, `accepted`, `published`, `shadowed`, `quarantined` or `duplicate`. Optional `processing_status`, `publication_status`, `public_id` and `canonical_path` are parsed and bounded. Failed/rejected states and arbitrary redirect URLs are rejected. Only `/physical/report/<safe ID>` or `/digital/report/<safe ID>` are accepted as public report links. HTTP 200 alone is not success.

`GET /receipts/:receipt_id` refreshes the same receipt. The receipt page is `/report-a-problem?receipt=<ID>`. The UI polls up to eight times with bounded delays while awaiting publication; a temporary polling outage retains the accepted receipt. It shows **View report** only when the backend supplies a safe canonical link. Receiving a report, publishing it, sending a notification and resolving the problem are separate events.

While a receipt is processing, the shared receipt view shows **Generating receipt & escalation log.** with a spinner that respects reduced motion. Published and review states stop polling and restore **We’re on it.** with a checkmark. When the bounded polling window ends, the spinner also stops; the accepted receipt and its current status remain available through **Keep your receipt**. This progress copy does not assert that a notification was sent.

## Lifecycle and reliability

1. The listener applies browser validation and stores canonical web provenance as `human-web`, actor `human`, channel `web`, initially shadowed with unknown domain.
2. The retained Wire payload preserves the full original description; the legacy reports table has a short display projection. The analyzer reloads the original rather than treating the projection or generated summary as evidence.
3. The existing human analysis queue processes the report. Valid firsthand evidence can be promoted; invalid, coverage or unknown evidence stays for review. Importer-supplied model/operator fields cannot activate this adapter policy.
4. An analyzed public physical/digital report can gain a canonical link. Processing/review states stay distinct in the receipt. Analyzer publication failures are retryable for web intake.

Create a payload once and reuse it unchanged on retry, including `source_id`, text and image. The listener uses source identity and a material hash for idempotency. Editing the draft creates a new payload; double submissions are locked while sending. Network, server, validation and rate-limit errors preserve the draft. Do not clear it or show success on the submit click. Queue replay uses the existing per-report analysis lock. This is not an exactly-once guarantee across the broker/database crash window.

## Limits, spam and privacy

- Text: at most 8192 UTF-8 bytes after trimming; text or an image is required.
- Browser source image: nonempty, at most 20 MiB and 50 megapixels, decodable by the browser. SVG is excluded. Pixels are re-encoded as JPEG, with a maximum dimension of 2048 and maximum output of 1 MiB. This discards source file metadata; it does not remove sensitive information visible in the image.
- Backend web validation independently accepts only complete JPEG/PNG images up to 1 MiB, 4096 per dimension and 16 megapixels. Do not trust client MIME labels or checks alone.
- The listener has a request-body limit, configured shared endpoint limits and an additional IP-based web submission bucket shared across aliases. Changing the client session does not create a fresh bucket. Trusted proxy configuration must reflect the actual deployment. A client-supplied channel or Origin is not proof of a human identity.
- Copy states reports may be public and links to Privacy. There is no confidentiality or anonymity guarantee. Do not add report text, images, coordinates, receipt/source/session IDs or personal information to analytics. Current optional analytics contain event name, surface and bounded status only; they install no new analytics provider.
- Drafts and attachment previews are in memory; the random session UUID is the only item this flow adds to session storage. Object URLs are released. The original file and its filename are not uploaded.

## Unknown location

No location is requested by this composer. Missing location remains unknown in retained input and queue payload; AI must not invent it. The legacy database uses `(0, 0)` as a sentinel. `reportMapCoordinates` rejects that pair, null/missing values, nonfinite numbers and out-of-range coordinates. A single zero axis is valid. Globe pins, live animations and report navigation use this guard; the Recent Reports feed retains the report without printing invented coordinates or running a nearby query at the sentinel. Backend map points and spatial enrichment also respect missing location.

## Required verification for later changes

Run TypeScript, the web-reporting and report-location tests, and a production build. Check desktop/mobile keyboard behavior, text-only and image-only reporting, invalid/oversized input, failed requests with retry, actual server receipt and safe public link, widget draft retention and embedded mode. `scripts/check-rendered-seo.py` checks rendered HTML/navigation separately. Use mocks or an isolated backend for synthetic submissions; a rendering check must never POST reports. Production monitoring should distinguish receipt failures, analysis/review delay, publication and notification outcomes.
