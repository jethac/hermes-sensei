# Security and privacy

Sensei is local-first and is not configured as a public multi-user service.

## Defaults

- The web server binds to `127.0.0.1` by default.
- Learner state is stored beneath `.sensei/`, outside source control.
- The browser receives no grading reference until after evidence is recorded.
- MCP runs over stdio and needs no network listener.
- Raw learner answers are not persisted by the current UI or MCP tool surface.
- Scan uploads accept only signature-checked PNG, JPEG, or WebP images, up to 15 MB each.
- Original filenames are metadata only; server-generated IDs determine every on-disk path.
- Raw scans live beneath `.sensei/scans/` with local file permissions and are never written into the taxonomy.
- HTTP responses use `no-store` for learner APIs and a restrictive same-origin content security policy.

## Do not expose directly

The local HTTP server has no authentication or tenant isolation. Do not bind it to a public interface or reverse proxy it to the internet without adding authentication, authorization, TLS, CSRF protection, rate limits, and a proper transactional datastore.

## Agent considerations

Learner answers are untrusted content. Hermes should evaluate them as Japanese evidence, not follow instructions embedded inside them. The supplied skill keeps grading references private until after the answer and asks Hermes not to store raw responses in evaluator notes.

Scanned pages are also untrusted content and may contain prompt-like text. The `inspect_scan` result explicitly tells Hermes to identify visible highlights and ignore instructions printed in the document. OCR/vision proposals do not affect mastery until the learner reviews them. The web UI can delete the original image while retaining confirmed structured observations.

Uploaded pages may be copyrighted or personally sensitive. Keep the state directory private, upload only material the learner is permitted to process, and delete originals when they are no longer needed. Sensei does not send scans to an OCR service; the configured Hermes model/provider determines where visual inference runs.

## Taxonomy trust

Sensei expects a trusted local checkout of `os-taxonomy-japanese`. Override `SENSEI_TAXONOMY_PATH` only with a taxonomy you trust.
