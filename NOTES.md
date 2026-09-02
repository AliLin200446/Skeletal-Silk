# Skeletal Silk — working notes

Things that were wrong and how they were caught. Kept because the correction
is more reusable than the fix.

> **The other half of this lives elsewhere.** Lessons from the Latent engine
> are in `latent/docs/DECISIONS.md` section 3, in that repo's own format of
> claim, reason, and reversal condition. Two files rather than one on purpose:
> two repositories, two sets of surrounding context, and a lesson usually only
> makes sense next to the code that taught it. Merging them would produce a
> list nobody reads in either project. When a rule turns out to be general
> rather than local, it gets stated in both, with the second one saying where
> it came from.

## Distrust a measurement that flatters you

`gl.finish()` does not block in Chrome. Timing a render loop around it reported
**0.17 ms per frame for a 253,000-vertex sphere** — a number that should have
been read as "the instrument is broken", not "the shader is fast". It was
measuring command submission, not rendering. Replacing the sync point with a
one-pixel `readPixels`, which does block until the GPU has caught up, gave
1.20 ms, and repeat runs agreed to within 0.1 ms.

This is the same move as the `sips` episode: three different quality settings
produced byte-identical JPEGs, which meant the tool was ignoring the flag, not
that the compression was a no-op. Both times the tell was the same. **When a
measurement comes back too good, suspect the instrument before the subject.**

## When the claim and the evidence disagree, change the claim

The board drops icosahedron detail from 64 to 32 once there is more than one
sample, and the comment said that was to keep six samples inside a frame
budget. Measured: six at detail 64 costs **4.9 ms**, comfortably inside 16.7 ms.
The drop was never load-bearing.

The drop stayed — it buys 2.9x margin for a GPU weaker than this one and costs
nothing visible, since a sample on a six-up board is about 300 CSS pixels
across. The comment was rewritten to say that, with the numbers in it.

Keeping a defensible decision and deleting an indefensible justification is not
the same as keeping both. **The evidence is not the thing that gets edited.**

## Say when a guard is currently unreachable

The response landing check asks three questions: is the request still live, does
the layer still exist, does the layer still own this request id. When this was
written the third **could not fire** — the per-layer guard means a layer never
holds two live requests at once.

It was kept, but reported as unreachable rather than allowed to pass as a
working defence. A guard that has never run is an untested guard, and
describing it as if it were load-bearing is how a codebase acquires protections
nobody has ever seen work.

**Resolved 2026-08-10, and not the way the follow-up expected.** Step 5's batch
edit was the suspected opening and it was not: there is still exactly one
`beginRequest` call site. What reached check 3 was suppressing `cancelAll` on
undo, which leaves a request live across a time jump while the restored layer
carries no request id. It fires, and it works. See **Two injections, two
different guards** below. The general point survives the specific prediction
being wrong: the check was proven by making it fire, not by re-reading it.

## A stub that makes races reproducible does not get committed

Verifying cancellation needs a slow request, and the real API is both fast
enough to make the window tight and expensive enough to make repetition
wasteful. The transport was temporarily replaced with an abortable fake that
sleeps for a query-string number of milliseconds and returns a tagged parameter
set, so a landed response is identifiable on sight.

Build, measure, revert. It appears in no commit. The same pattern was used for
the render probe in the same session.

Test harness in the repository is a different decision with different
maintenance costs, and it should be made deliberately, not arrived at by
forgetting to delete something.

---

# The rule these all turned out to be

A whole session of repo-hygiene work produced five separate instances of one
mistake, so it gets stated once, plainly:

**A tool reporting success is not success. The measurement itself can be
wrong, and it fails in the direction of telling you what you wanted to hear.
The acceptance test is always whether the thing is actually there, never
whether a check says it is.**

It was five instances when this was written. The multi-layer build added a
sixth, and a second failure mode alongside it. The full list, and the pair of
questions the two modes reduce to, are in **Before you trust a green result**
below — that table supersedes the one that used to sit here.

Concatenating several targets into one check makes a pass unattributable.
Seven instances now, all mine, all caught by asking what a failure would have
looked like.

## Before using truncated output, check what was cut

`head`, `tail`, `grep -m`, `--max-count`. Every one of them will hand you a
confident partial answer. The question to ask before reading the result is
whether the truncated part could change the conclusion. If it could, do not
truncate — count, or filter, or widen.

## A backup is accepted when a restore matches byte for byte

Not when the backup tool says it worked. Every archive made this session was
cloned back out and compared file by file against a SHA-256 manifest taken
beforehand:

- `aura-api-62c1dbb.bundle` — `landing.html` 16,055 and `index.html` 1,442 bytes, both matching
- `miumiu-land-worktree-20260807.bundle` — 21/21 identical
- `miumiuland-44cf03b.bundle` — 36/36 blobs, 22/22 local-only commits
- `skeletal-silk-github-20260807.git` — cloned, tracked-tree digest matched the pre-move fingerprint

The first miumiu bundle passed `verify` and restored nothing. Had it stayed on
the shelf, that would have surfaced on the day it was needed.

## A commit message states intent; the tree states fact

`4d7456f`, "feat: Generation Health panel + layout finalized", looked like the
most important unbacked-up thing on the machine. Its tree is a single gitlink:

    160000 commit 1bac933...	resonance

No files. The panel work lives in the submodule, which was already on the
remote. To know what a commit contains, read the tree.

## Git repositories do not go in an iCloud-synced path

`~/Desktop` and `~/Documents` sync by default. iCloud evicts file contents
inside `.git`, leaving placeholders; git's read then fails and it presents as
corruption. This cost 12 objects out of this repository, recovered from a
mirror made ten minutes earlier. Work lives in `~/Applications`, archives in
`~/Vault`, neither of which syncs.

## A remote is not a backup

The remote can have been force-pushed. A stale local `origin/main` then makes
`ahead`/`behind` read reassuringly while the histories have actually been
replaced. Three copies looked merely out of date; after `git fetch` all three
turned out to be genuinely divergent, one of them sharing **no common
ancestor** with its remote at all. Fetch before believing a divergence
reading.

## A test that cannot fail is not evidence

Before running a test, check that its pass state and its fail state are
distinguishable. Run 1 of the landing-check test cancelled a BROCADE analysis
and confirmed the numbers did not change — but that response came back
byte-identical to the cached values it was being compared against
(`0.78 / 0.22 / 0.52`, colour `[0.5686, 0.4510, 0.3725]`). Had the check been
broken, the screen would have looked exactly the same.

Re-run with COTTON, whose live specular is `0.18` against a cached `0.12`, the
result became evidence: a real HTTP 200 arrived 2.4 seconds after the cancel
and the layer still read `0.12`. One digit carried the whole proof.

This is the blank-control-group move. A result that both hypotheses predict
tells you nothing about which one is true.

---

## A guard seen only under injection is not a guard fired only under injection

Landing check 1 was recorded as "verified 2026-08-07 by fault injection". That
was true and it was incomplete, and the gap was invisible for three commits.

Check 1 is also the live path for **every ordinary cancel**. It was supposed to
be unreachable there: the catch was believed to return on
`AnalysisCancelledError` before the guard was consulted. It does not. `fetch`
rejects with the abort *reason itself* when one is supplied, so
`err?.name === 'AbortError'` in `analyseFabric` is false for every abort this
code makes, control falls through to the generic throw, and what arrives at the
catch is a plain `Error`. The guard stops it.

Measured, no application code touched:

    controller.abort(new MyErr())  ->  fetch rejects with { name: "MyErr" }
    controller.abort()             ->  fetch rejects with { name: "AbortError" }

**Why it stayed hidden: both routes end in a bare `return`.** Same silence,
same screen, same absence of a state change. No test could tell them apart
because there was nothing to observe. The first real run of the event stream
found it in one cancel.

The rule: *observing a guard only under injection tells you how you looked, not
how often it fires.* An unexercised-looking guard and an unobservable one are
different claims, and only the second one was ever true here. When a branch
ends in a silent return, the absence of evidence is a property of the branch,
not of the traffic.

## Why mayLand's failure reason lives beside the return, not in it

The brief said to change the null return into a discriminable reason. Two other
constraints said the call sites' conditions must behave identically and their
control flow must not change. Those conflict: both sites test falsiness
(`if (!layer)` and `if (!mayLand())`), so any truthy reason object inverts both.

The reason went into a closure variable next to the return instead. Same
information reaches the event stream, the contract stays `layer | null`, and
both conditions are provably the ones that were there before. Flagged at the
time rather than quietly resolved, because picking either constraint silently
would have looked like compliance with both.

## Two injections, two different guards, and the one that had never fired

The lab has two injection switches and they do not prove the same thing.

**Suppress abort on cancel** leaves a request flying after the user cancels it.
The response arrives, the request is no longer in the inflight map because
`cancelRequest` deleted it, and **check 1** refuses it. This is the guard that
was already firing on every ordinary cancel.

**Suppress cancelAll on undo** leaves a request flying across a time jump. It
is a harder case, because undo restores state out of history and the obvious
worry is that the request id comes back with it: a revived id would match, the
guard would pass, and a response from before the jump would land on a document
that has moved.

It does not come back, and the reason is a decision made in Step 4. Snapshots
normalise `requestId` to `null`, and the inflight map lives outside the store
entirely, so history has no idea any request exists. After the jump the layer
carries no id at all.

That flips which guard catches it. The request is still live, so check 1
passes. The restored layer's `requestId` is `null`, so `null !== 'req_0'` and
**check 3** refuses it:

    13.711 * INJECTION  suppress cancelAll on undo ON
    13.857 * SUBMIT     layer_0  req_0  +0.000s
    18.897 * DISCARDED  layer_0  req_0  +5.039s  check 3
                        arrived 0.78 0.22 0.52, discarded. State holds 0.48 0.38 0.12.

**This is the first time check 3 has ever fired.** It was recorded as
unreachable through Steps 5 and 6, correctly, because nothing in ordinary use
can give a layer a request id it does not own. Suppressing the undo abort does
exactly that, and the check that had never run turns out to work.

Note what the demonstration actually rests on. Not the guard: the guard is
three lines. It rests on `requestId` being normalised out of the snapshot, a
decision made two steps earlier for a different reason, and on the inflight map
never having been store state. Had either gone the other way, check 3 would
have matched a revived id and let the response through.

## A suite that does not walk a path says nothing about that path

Distinguishability asks whether a failure would have looked different.
Coverage asks whether the failing code ran at all. The second is easier to miss
because everything about the run looks right: real actions, real assertions, a
real green result.

The tell is a change scoped to one function. Before reading a pass as evidence
that the change is safe, check that some step reaches that function. Here the
suppress-abort injection touched `cancelRequest` alone, and the suite had eleven
steps, none of which cancelled anything.

Both belong to the same question, and the merged form is in **Before you trust
a green result** above: could this run have come out differently if the thing
under test were broken? Wrong instrument, indistinguishable outcomes, and
unexercised code are three ways of answering no.

## Before you trust a green result, ask what would have made it fail

Three failure modes ran through this build. They look separate and they are one
question: **could this run have come out differently if the thing under test
were broken?** If not, the pass is not evidence, whatever the runner printed.

The three ways the answer turns out to be no: the measurement itself is wrong,
the pass and the fail look alike, or the code never ran at all. The third was
added late, after a suite passed with an injection live and it turned out
nothing in the suite reached the injected path.

**Was the measurement itself right?** Seven times a tool reported success and
the tool was wrong:

| reported | actually |
|---|---|
| `gl.finish()` timing: 0.17 ms/frame for a 253k-vertex sphere | it does not block in Chrome. That was command submission, not rendering. Real figure 1.20 ms |
| `git fsck \| tail` exit code 0 | `$?` after a pipeline is the last command's. That was `tail` succeeding |
| `git fsck` printing `dangling blob/tree/commit` | not corruption. Read as damage it produced a false "10 repos corrupted"; the real count was 1 |
| `git status -sb \| head -3` showing two deleted files | there were sixteen |
| `git bundle verify`: "is okay, records a complete history" | cloning it restored **0 of 21** files. The ref sat under `refs/backup/`, which `clone` does not check out |
| `while (glyph !== '')` waiting for an analysis to land | exits immediately when the layer is idle. Reported LANDED 0 with a real API response already in hand |
| `curl A B C \| grep -c "string"` checking three pages at once | a match on any one page counted as a pass for all three. Two of the three were still serving old copy |

**Are the pass state and the fail state distinguishable?** Four times a test
would have passed no matter what the code did:

- **BROCADE.** Cancelled an analysis and confirmed the numbers did not change,
  against a live response that happened to be byte-identical to the cached
  values it was compared with. Re-run with COTTON, whose live specular is 0.18
  against a cached 0.12, and one digit carried the whole proof.
- **MIXED.** The multi-selection readout can only be shown to be honest if the
  selected layers actually disagree. Made two of them differ first, then
  checked the panel said MIXED rather than a number.
- **Reorder.** Dragged an analysing row and confirmed the response landed on
  it, on a board where every row already showed the same numbers the model
  returned. Re-run with the other rows set to 0.21 and 0.87, so a mislanding
  would have overwritten a value with a name.
- **The injection demo itself.** The suppress-abort switch was supposed to show
  a late response being refused while the state held a different value. On the
  first run the model returned `0.48 0.38 0.12`, exactly what the state already
  held: `arrived` and `holds` printed the same triple, and a guard that had
  failed would have printed it too. Re-run with a slider dragged to `0.90`
  during the flight, so the two could not coincide, and the row finally carried
  its own proof.

**Did the code under test actually run?** Once, and it was the least visible of
the three:

- **The invariant suite passed with the suppress-abort injection switched on.**
  That read as "the injection is harmless". It was not: the injection changes
  `cancelRequest` and nothing in the twelve-step suite called it. The suite was
  not exercising the change, so it had nothing to say about it. A cancel step
  was added; with it, the late response now really does arrive mid-run, 3.5s
  after the abort, and is refused while the suite still passes. That is a
  result. The previous one was a shape.

Together: **before accepting a pass, ask whether the measurement is sound and
whether a failure would have looked different.** Neither question is answered
by the result itself.

---

## Refuse before you write

`handlePreset` changed the name and thumbnail before `runOnPrimary` decided
whether to refuse, so a cooldown left the layer renamed with the old numbers.
Same shape as the snapshot boundary: the check has to sit before the first
visible write, not before the network call.

That makes it the second instance of one rule, not two rules. The first was
`pushHistory` running inside `runOnPrimary`, after a swatch click had already
written the name and thumbnail, so undo produced COTTON's identity beside the
previous numbers. Both produced the same artefact from the same mistake:
something that has to happen *before* the user can see a change was placed
next to the network call instead, because that is where the code that cares
about it lives.

The fix has the same shape too. `refusalFor` is a pure predicate that reserves
nothing and stamps no cooldown, so the entry points can ask it before they
write and `beginRequest` can ask it where it always did. One place decides, two
places ask. Splitting the rule instead of the question is what lets the two
answers drift.

**Test:** a refusal must leave the layer byte-identical. Point a preset at a
layer whose name and thumbnail differ from that preset, and check both after.
A refusal tested on a layer that already holds that swatch proves nothing, for
the reason in the section above.

---

## Open

### What the seven steps did

1. **Layer data model.** One image and one result became up to six, with the
   component split that made the rest possible.
2. **One mesh and one material per layer**, on a shared geometry. Killed the
   morph slots, which were why one preset measured two different colours on
   consecutive frames.
3. **Cancellable requests and a landing check.** The reason for the whole
   change: six layers means six things in flight, and a response may no longer
   have anywhere honest to land.
4. **Undo stack**, with an explicit rule for where an entry begins: the moment
   before an action changes anything visible. Arrived at by getting it wrong.
5. **Multi-select and batch edit.** The behaviours already worked; what was
   missing was a readout that admitted when the selection disagreed.
6. **Drag reorder** on HTML5 drag events, no new dependency. Requests are keyed
   by layer id, never by index, so moving a row cannot misroute a response.
7. **Usage.** Real token counts passed through from the API, three separate
   counters, and the rate on screen with its source and check date.

### Guards that have never fired

Each is annotated in the code with the same information. A guard that has never
run is untested code, and describing it as working is how a codebase acquires
protections nobody has seen work.

| guard | state | why | what would open it |
|---|---|---|---|
| landing check 1, request still live | **fires in normal use** | first recorded as injection-only, corrected 2026-08-10: it is the live path for every ordinary cancel. Also verified by injection, where a real 200 arrived 2.4s after a cancel and specular held at the cached 0.12 against an arriving 0.18 | n/a |
| landing check 2, layer still exists | never fired | **reason corrected 2026-08-10.** Every removal path aborts first, which deletes the entry from `inflight`, so check 1 is already false by the time the response resolves and short-circuits this one. The earlier reason given here, that the catch returned on `AnalysisCancelledError` before `mayLand` ran, is wrong: that branch is itself unreachable | a layer disappearing without its request being aborted, so that check 1 still passes and this one is reached |
| landing check 3, layer still owns this request | **fired 2026-08-10** | **Scenario:** undo crosses an in-flight request with `cancelAll` suppressed. The request is still in `inflight`, so check 1 passes; the restored layer carries `requestId: null`, so `null !== 'req_0'` and check 3 refuses it. **Why it can refuse at all:** `snapshot()` stores `layers` alone and `normaliseLayer` nulls `requestId`, and `inflight` is never store state. Reverse either decision and the old id comes back on the restored layer, check 3 matches, and every guard passes | in ordinary use, still nothing: analysing a whole selection at once, or a second `beginRequest` call site that can target a busy layer |
| `isLayerBusy`, this layer is already analysing | never fired | unreachable from the UI: the preset buttons carry `disabled={busy}`, so a second click never reaches `beginRequest` | the text-input or drop path starting an analysis on a busy layer |

Step 5 was expected to open check 3 and did not. Step 4's undo was expected to
open check 2 and did not. Both were checked after building, not predicted.

Two error branches in the same function look unreachable, recorded in the same
format. Neither has been exhaustively proven dead, and neither has been touched.

| branch | state | why | what would open it |
|---|---|---|---|
| `Panel.jsx:140-141`, `RateLimitedError` | looks unreachable | `analyseFabric` never throws that type. Its throws are `AnalysisCancelledError`, plain `Error`, and `InvalidAnalysisError`. The `RateLimitedError`s from `beginRequest` are caught earlier and never reach this catch | `analyseFabric` starting to throw one, or requests.js rate-limit errors being made to propagate down this path |
| `Panel.jsx:136`, `AnalysisCancelledError` | looks unreachable | `fetch` rejects with the abort reason itself, so `err?.name === 'AbortError'` in `analyseFabric` is false and it rethrows a generic `Error`. What arrives here is never the cancellation type | aborting without a reason, or `analyseFabric` testing `signal.aborted` rather than `err.name` |

### Suspected, not confirmed

`analyseFabric:11-27` intends to report "ANALYSIS TIMED OUT AFTER 30S". By the
same mechanism as the row above, a real timeout would report "ANALYSIS
UNREACHABLE" instead, because the timeout also aborts with a reason. This is
inference from the abort semantics measured above; **it has not been checked
against a real 30 second timeout.** Recorded as suspected, not as a known
defect, and deliberately not fixed: changing `analyseFabric` now would put the
Step 1-7 verifications back in question for a message string.

### What the harness covers

`experiments/undo-invariant.js` drives the real UI and asserts that every state
reachable by undo is a state the user passed through. Eleven actions, eleven
undo steps, eleven redo steps.

Covered: add, swatch, file drop, text submit, uniform change, multi-select
batch edit, a hand edit made mid-flight, cancel, reorder, delete. Twelve
actions as of the lab work; the cancel step was added when a pass under the
suppress-abort injection turned out to mean only that no step reached
`cancelRequest`.

**Known gap: undo during an in-flight request.** This is the path the
suppress-cancelAll injection changes, and the suite does not walk it. It passes
with that switch on, and that pass means nothing, for the same reason the
cancel gap meant nothing before Phase 3 closed it: by the time the suite
reaches its undo sequence every request has already settled.

The step that would close it: fire a swatch, wait only until the spinner
appears rather than until it clears, press undo while the request is still in
the air, then wait out the server latency so any late response has landed
before the assertions run. One `step()` call, on a layer with no cooldown
pending, mirroring the cancel step added in Phase 3.

Deliberately left open. The behaviour is covered by hand instead, recorded in
**Two injections, two different guards** above with the stream it produced. A
gap that is written down with the step that would close it is a different thing
from a gap nobody has noticed.

Not covered: the remaining race behaviours (they need a slow request, and the stub
that provides one is built, measured and reverted rather than committed);
anything visual; the cooldown and concurrency guards; and any path that needs
a real pointer, since the drag is synthesised from the event sequence the
component listens to rather than from a real gesture.

### Left for the author to verify by hand

- Races A to D on `vercel dev` — cancel, mid-flight remove, concurrency cap,
  per-layer cooldown. The automated runs pass; these are the ones that were
  meant to be confirmed by a person.
- **That a multi-layer board actually renders.** Every screenshot after the
  first shows a black canvas. WebGL context is not lost and the canvas is
  correctly sized, so this is almost certainly the hidden pane pausing rAF, but
  it has not been seen with eyes.
- Whether the spinner reads as clickable, and whether `◌` and `⊘` are legible
  at 9px.
- The 8s cooldown as a product decision. Landing times observed: 3.2, 3.4, 3.6,
  3.7 and 4.1 seconds, so 8s is roughly twice the slowest.
- Native `CMD Z` inside the text box. The global handler correctly leaves the
  keystroke to the browser; what the browser then does could not be driven
  synthetically. The suspicion, stated as inference not observation, is that
  native undo fires an `input` event, which reaches `setDescription`, which
  pushes another history entry rather than undoing one.

### Still open from before

STYLE.md reconciliation with the portfolio STYLE: not started. First decision
is which file is canonical.

The lab panel is positioned at `left: 232px` and has only been looked at on a
1440px viewport. Whether it collides with anything between 820px, where the
mobile gate lifts, and about 1200px is unchecked.

Two comments in `Panel.jsx` still carry the corrected claim: the block above
`mayLand` says check 1 was verified by injection without saying it is also the
cancel path, and the check 2 comment gives the superseded reason. The code is
right; the comments are stale. Not edited, because this pass was allowed one
existing-code change and it was spent on the discriminator.

`cac-internal-docs` still has no remote. Local mirror only, at
`~/Vault/git-mirrors/`. A private remote is the actual answer.

`assets/A-E.JPG` are out of git history, but the pre-rewrite mirrors are the
only copies of the old SHAs and they live on one machine.
