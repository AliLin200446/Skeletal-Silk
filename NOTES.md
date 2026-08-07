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
