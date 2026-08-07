# Skeletal Silk — working notes

Things that were wrong and how they were caught. Kept because the correction
is more reusable than the fix.

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
the layer still exist, does the layer still own this request id. The first two
fire under real conditions. The third **cannot fire today** — the per-layer
guard means a layer never holds two live requests at once.

It was kept, because Step 5's batch edit reopens exactly that door. But it was
reported as unreachable rather than allowed to pass as a working defence. A
guard that has never run is an untested guard, and describing it as if it were
load-bearing is how a codebase acquires protections nobody has ever seen work.

**Follow-up, do at Step 5:** once batch edit exists, check whether one layer can
carry two live requests. If it can, the third check becomes reachable, and it
must be proven to fire by injection. Being written down is not evidence that it
works.

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

The five:

| what reported success | what was true |
|---|---|
| `gl.finish()` timing: 0.17 ms/frame for a 253k-vertex sphere | it does not block in Chrome; that was command submission, not rendering. Real figure 1.20 ms |
| `git fsck \| tail` exit code 0 | `$?` after a pipeline is the last command's. That was `tail` succeeding |
| `git fsck` printing `dangling blob/tree/commit` | not corruption. Reading those as damage produced a false "10 repos corrupted"; the real count was 1 |
| `git status -sb \| head -3` showing two deleted files | there were sixteen |
| `git bundle verify`: "is okay, records a complete history" | cloning it restored **0 of 21** files. The ref was under `refs/backup/`, which `clone` does not check out |

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

## Open

Multi-layer refactor: Steps 1-3 done and pushed on `feat/multi-layer`.
Steps 4-7 blocked on hand verification of races A-D by the author.
Run `vercel dev`, follow the four steps in the Step 3 report.
Do not start Step 4 until that verification is confirmed.

Step 5 follow-up: batch edit may make the third landing check
reachable. When it does, verify with fault injection that it
actually fires. Do not assume a written check works.

STYLE.md reconciliation with the portfolio STYLE: not started.
First decision is which file is canonical.

cac-internal-docs still has no remote. Local mirror only, at
`~/Vault/git-mirrors/`. A private remote is the actual answer.
