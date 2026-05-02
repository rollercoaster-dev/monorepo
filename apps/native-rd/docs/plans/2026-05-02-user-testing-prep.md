# User Testing Prep — iOS First, Android Soon

**Created:** 2026-05-02
**Owner:** Joe
**Goal:** Get native-rd into the hands of real testers (iOS TestFlight first, Google Play closed test soon after) with a working bug-report pipeline and a verified-solid codebase.

---

## The Single Next Thing

> **Phase 1 — Wire Sentry into native-rd.**
> Don't pre-stage anything else. When this is done, come back to this doc and pick up Phase 2.

---

## Status Snapshot

| Area                      | State                | Notes                                                                                   |
| ------------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| Apple Developer Program   | ✅ Enrolled          | Confirmed 2026-05-02                                                                    |
| Crash / bug reporting     | ❌ Not started       | No Sentry, no in-app feedback, no crash logger                                          |
| TestFlight build pipeline | ❌ Not started       | EAS not initialised; no `eas.json`                                                      |
| App Store Connect record  | ❌ Not started       | Bundle ID, slug, display name still TBD                                                 |
| Privacy policy            | 🟡 Drafted, unhosted | `docs/launch/privacy-policy.md` — contact email + public URL TBD                        |
| Quality dashboard         | 🟡 Stale             | `docs/quality/grades.md` last updated 2026-02-28 — 2 months old, much has shipped since |
| Foundations review        | 🟡 Stale             | Same — see `docs/quality/foundations-review-phase1.md`                                  |
| Tech debt log             | 🟡 Stale             | 5 HIGH-severity items still listed OPEN; need re-verification                           |
| Google Play account       | ❌ Not started       | Personal account €25 + 14-day / 12-tester closed test required                          |

---

## Phases

Each phase has **one clear deliverable**. Don't start the next phase until the current one is done. If a phase feels too big, it's probably two phases — split it.

### Phase 0 — Apple Developer Program ✅ DONE

- [x] Enrolment approved

### Phase 1 — Sentry crash reporting (in progress)

**Deliverable:** crashes from a dev/preview build of native-rd appear in a Sentry project dashboard, with readable stack traces.

- [ ] Create Sentry project (React Native platform)
- [ ] Install `@sentry/react-native` (Expo SDK 54 compatible)
- [ ] Add Sentry config plugin to `app.json`
- [ ] Initialise in `App.tsx` (production-only via `!__DEV__` guard)
- [ ] Wire pseudonymous `Sentry.setUser({ id: hashedId })` to existing user identity
- [ ] Add `beforeSend` filter (initial noise classes: offline `NetworkError`, `AbortError`, dev-only events)
- [ ] Configure source map upload via EAS Build hook (**non-negotiable** — without this, stack traces are unreadable)
- [ ] Verify end-to-end: trigger a forced crash in a preview build, confirm symbolicated trace lands in Sentry

**Why this is Phase 1:** silent native crashes are invisible without it; the integration is the same for iOS and Android, so this work carries forward to Phase 6.

### Phase 2 — In-app "Report a Bug" entry point

**Deliverable:** a single button in Settings that opens a feedback form; submission attaches to the current Sentry session.

- [ ] Add Settings row "Report a Bug"
- [ ] Form screen: name (optional), email (optional), description (required)
- [ ] Submit via `Sentry.captureFeedback({ name, email, message })`
- [ ] Confirmation toast on success; error path on failure
- [ ] a11y: `accessibilityLabel`, 44pt touch target (per native-rd a11y contract)
- [ ] Component test for the form (matches existing `__tests__/` convention)

**Note:** TestFlight users can also submit feedback via Apple's native screenshot-share — this is _additional_, not redundant. The in-app button covers Android later and gives non-TestFlight builds a path too.

### Phase 3 — TestFlight build pipeline

Reorganised from the 25-item TestFlight readiness doc into three focused sittings. See `docs/plans/2026-04-28-ios-testflight-readiness.md` for the granular Apple admin steps.

#### Sitting A — Decisions only (no tooling)

- [ ] Confirm iOS bundle ID: `com.joe.rd.native-rd` (yes/no)
- [ ] Confirm Expo slug: `native-rd` (yes/no)
- [ ] Confirm App Store display name spelling/capitalisation
- [ ] Choose feedback contact email (used in TestFlight metadata + privacy policy)
- [ ] Decide build/version strategy (semver? buildNumber autoincrement?)

#### Sitting B — EAS Build

- [ ] `eas login`
- [ ] `eas init`
- [ ] Add `eas.json` with development + production profiles
- [ ] Let EAS manage iOS signing credentials
- [ ] Produce first iOS production-profile build

#### Sitting C — App Store Connect + first submission

- [ ] Create App Store Connect app record
- [ ] Beta app description drafted
- [ ] What-to-test instructions drafted
- [ ] Export compliance answered
- [ ] Privacy nutrition labels filled
- [ ] Internal testing group created
- [ ] First TestFlight submission via `eas submit --platform ios`

### Phase 4 — Device validation (real iPhone)

- [ ] Production-like build installed on physical iPhone
- [ ] Camera evidence flow
- [ ] Photo library evidence flow
- [ ] Voice memo evidence flow
- [ ] Local DB persistence across app restart
- [ ] Badge creation/export flow
- [ ] App icon + splash verified
- [ ] Sentry receives a deliberate test crash from this build

### Phase 5 — Privacy + legal (parallel with Phase 3, before submission)

- [ ] Add contact email to `docs/launch/privacy-policy.md`
- [ ] Host privacy policy publicly (`https://rollercoaster.dev/privacy` or similar)
- [ ] Permission copy reviewed (camera, photos, microphone)
- [ ] Encryption / export compliance reviewed (local crypto, secure storage, badge signing)

### Phase 6 — Quality dashboard refresh (parallel, before inviting testers)

**Deliverable:** know what you're actually shipping. Current grades are 2 months old.

- [ ] Run `/quality-score` to refresh `docs/quality/grades.md`
- [ ] Re-verify open items in `docs/quality/tech-debt.md` (5 HIGH-severity tests still listed; some may be resolved by recent PRs)
- [ ] Decide which HIGH-severity items block first invite vs. which are acceptable in beta

### Phase 7 — Android (after first iOS testers are running)

- [ ] Google Play Console personal account (~€25)
- [ ] Closed testing track created
- [ ] Recruit 12 testers (Google Group / email list, opt-in)
- [ ] **Start the 14-day clock immediately** (longest lead-time item)
- [ ] Android EAS profile + first build
- [ ] Apply for production access after 14 days

See `docs/launch/app-store-launch-plan.md` for the full Google Play context.

---

## Tracked Issues

All 8 phases are tracked as GitHub issues under milestone [**`native-rd: User Testing Prep`**](https://github.com/rollercoaster-dev/monorepo/milestone/29) on project board #11 (Monorepo Development). One issue per atomic deliverable, scoped to fit a single PR.

| Phase | Issue                                                            | Title                                                                    |
| ----- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1     | [#971](https://github.com/rollercoaster-dev/monorepo/issues/971) | feat(native-rd): integrate Sentry for crash reporting                    |
| 2     | [#972](https://github.com/rollercoaster-dev/monorepo/issues/972) | feat(native-rd): in-app Report a Bug button via Sentry feedback API      |
| 3B    | [#973](https://github.com/rollercoaster-dev/monorepo/issues/973) | chore(native-rd): EAS Build setup + first iOS production build           |
| 3C    | [#974](https://github.com/rollercoaster-dev/monorepo/issues/974) | chore(native-rd): App Store Connect record + first TestFlight submission |
| 4     | [#975](https://github.com/rollercoaster-dev/monorepo/issues/975) | chore(native-rd): physical iPhone validation pass                        |
| 5     | [#976](https://github.com/rollercoaster-dev/monorepo/issues/976) | docs(native-rd): host privacy policy publicly + finalise contact email   |
| 6     | [#977](https://github.com/rollercoaster-dev/monorepo/issues/977) | chore(native-rd): refresh quality dashboard + tech-debt re-verification  |
| 7     | [#978](https://github.com/rollercoaster-dev/monorepo/issues/978) | chore(native-rd): Google Play closed-test setup + 14-day clock start     |

---

## Open Decisions (block specific phases)

| Decision                                     | Blocks           | Default if undecided                |
| -------------------------------------------- | ---------------- | ----------------------------------- |
| Bundle ID `com.joe.rd.native-rd` final?      | Phase 3B         | Keep as-is                          |
| Expo slug `native-rd` final?                 | Phase 3B         | Keep as-is                          |
| Display name capitalisation                  | Phase 3C         | `Rollercoaster.dev`                 |
| Feedback contact email                       | Phase 2 + 3C + 5 | TBD                                 |
| Privacy policy host URL                      | Phase 5          | TBD                                 |
| Hashed user ID strategy for Sentry `setUser` | Phase 1          | ULID hash from existing user record |

---

## Related Docs

- `docs/plans/2026-04-28-ios-testflight-readiness.md` — granular TestFlight admin checklist (referenced by Phase 3)
- `docs/launch/app-store-launch-plan.md` — full iOS + Google Play launch strategy
- `docs/launch/privacy-policy.md` — privacy policy draft
- `docs/quality/grades.md` — quality dashboard (stale, refreshed in Phase 6)
- `docs/quality/tech-debt.md` — known debt log (stale, refreshed in Phase 6)
- `docs/quality/foundations-review-phase1.md` — Feb 2026 codebase health review (stale)

---

## Update Log

| Date       | Change                                                                  | By           |
| ---------- | ----------------------------------------------------------------------- | ------------ |
| 2026-05-02 | Doc created. Phase 0 confirmed done. Phase 1 selected as next focus.    | Joe + Claude |
| 2026-05-02 | Milestone #29 + 8 issues (#971–#978) created and linked to project #11. | Joe + Claude |
