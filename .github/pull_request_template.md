## Requirement

<!-- FR-xxx / BR-xxx / NFR-xxx atau Phase 0 engineering foundation -->

## Perubahan

-

## Skema DB / Migration

- Tidak ada / jelaskan migration dan rollback path.

## Dampak ke Modul Lain

- Tidak ada / jelaskan dependency dan cross-domain effect.

## Test

- [ ] Typecheck
- [ ] Lint
- [ ] Unit/integration test relevan
- [ ] Build
- [ ] Migration test bila relevan
- [ ] Smoke/E2E test bila relevan

## Risiko dan Rollback

- Risiko: Tidak ada / jelaskan.
- Rollback: `git revert` / migration reversal / jelaskan.

## UI Evidence

<!-- Screenshot/video bila perubahan UI. Tulis n/a untuk perubahan non-UI. -->

## Review Checklist

- [ ] PR satu concern dan ukuran sesuai policy
- [ ] Requirement ID tercantum
- [ ] Domain boundary tidak dilanggar
- [ ] Authorization dan scope diperiksa
- [ ] Audit ditambahkan untuk action kritis
- [ ] Tidak ada secret atau `.env` ter-commit
- [ ] Dokumentasi/seed/migration diperbarui bila relevan
