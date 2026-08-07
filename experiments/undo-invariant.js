// Undo-stack invariant harness.
//
// THE INVARIANT
//   Every state reachable by undo must be a state the user passed through.
//   Not "close to one", not "the numbers match" - the same state.
//
// This exists because that invariant was broken once and the break was
// invisible to a spot check. pushHistory used to run inside runOnPrimary,
// after a swatch click had already written the layer's name and thumbnail, so
// undo produced COTTON's name and image next to the previous numbers: a state
// no sequence of user actions can produce. Entry counts were correct, pairing
// was correct, four of five undo steps matched. The one that did not was the
// whole defect.
//
// HOW TO RUN
//   Needs a real backend, so `vercel dev` rather than `vite preview`, because
//   the analysis paths must actually land.
//     1. vercel dev
//     2. open the app, viewport at least 820px wide (narrower shows the gate)
//     3. paste this file into the console
//     4. await window.__undoInvariant()
//
// It costs a handful of real analyses per run.
//
// WHAT IT COVERS
//   All three paths that write layer state before an analysis: swatch click,
//   file drop, and text submit. Plus add, uniform change, delete, and a
//   multi-select batch edit.
//
//   The batch case is the one most likely to regress: a uniform change across
//   three selected layers must be ONE history entry, not three. If it ever
//   becomes one entry per layer, undo will appear to work while walking back
//   through layers one at a time, and only this harness will say so.
//
// TODO (Step 6): reorder is not covered, because the drag control does not
//   exist yet. Add a reorder step to the sequence below when it does. A
//   reorder that is undone must restore the order AND leave every layer's
//   content untouched, which is a case the current steps cannot reach.
//
// WHAT IT HAS ALREADY CAUGHT
//   Both defects this harness first caught were invisible to hand testing:
//   the text path was not in the manual sequence, and the manual comparison
//   key omitted identity and selection.
//
// WHY IT IS NOT A UNIT TEST
//   There is no test runner in this project, and the defect lived in the
//   ordering between a React component and a zustand store, which a store-only
//   test would not have caught. Driving the real UI is the point. If a runner
//   is added later, this is the case to port first.

window.__undoInvariant = async function undoInvariant() {
  // MessageChannel yields, not setTimeout: a hidden tab clamps timers to about
  // 1s and the driver then fires actions too slowly to reproduce anything.
  const tick = () => new Promise((r) => {
    const c = new MessageChannel()
    c.port1.onmessage = () => r()
    c.port2.postMessage(0)
  })
  const ticks = async (n) => { for (let i = 0; i < n; i++) await tick() }
  const waitMs = async (ms) => {
    const t = performance.now()
    while (performance.now() - t < ms) await tick()
  }

  const rows = () => [...document.querySelectorAll('.layer-row')]
  const undoBtn = () => document.querySelectorAll('.history-row .btn')[0]
  const redoBtn = () => document.querySelectorAll('.history-row .btn')[1]

  // The comparison key has to include identity, not just the numbers: the
  // first defect this caught was a name and thumbnail surviving an undo that
  // reverted the numbers, which a numbers-only key reads as a pass.
  //
  // Selection is deliberately NOT in the key. It is view state, not document,
  // and it is not in the snapshot either. Undo moves the selection to the
  // layer it changed so the change is visible, which is a different property
  // and not what this harness asserts.
  const state = () => rows().map((r) => [
    r.querySelector('.layer-name').textContent.trim(),
    r.querySelector('.layer-nums').textContent.trim(),
    r.querySelector('img.layer-thumb') ? 'thumb' : 'nothumb',
  ].join('/')).join(' | ')

  const settle = async (limit = 45000) => {
    const t = performance.now()
    while (performance.now() - t < limit &&
           rows().some((r) => r.querySelector('.layer-status').textContent.trim() === '◌')) {
      await tick()
    }
  }

  const setRange = (el, v) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    set.call(el, String(v))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const click = (el, opts = {}) =>
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...opts }))

  const setText = (el, v) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    set.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const forward = []
  // Record BEFORE the action. Each entry is what undo must return to.
  const step = async (label, fn) => {
    forward.push({ label, before: state() })
    await fn()
    await ticks(8)
  }

  await waitMs(1200)

  await step('add layer 2', async () => { document.querySelector('.layer-add').click() })
  await step('add layer 3', async () => { document.querySelector('.layer-add').click() })

  await step('swatch: COTTON on layer 1', async () => {
    rows()[0].click(); await ticks(8)
    document.querySelectorAll('.preset')[2].click()
    await settle()
  })

  await step('uniform: rigidity 0.90 on layer 2', async () => {
    rows()[1].click(); await ticks(8)
    setRange(document.querySelectorAll('input[type=range]')[0], 0.9)
  })
  await waitMs(600)   // let the 250ms merge window close

  await step('text: submit a description on layer 3', async () => {
    rows()[2].click(); await ticks(8)
    setText(document.querySelector('.text-input'), 'coarse dark wool')
    await ticks(8)
    document.querySelector('.text-input-row .btn').click()
    await settle()
  })

  // Batch edit across a multi-selection. One action, one entry, all layers.
  await step('multi-select 1-3 and set flow 0.66 on all', async () => {
    click(rows()[0]); await ticks(8)
    click(rows()[2], { shiftKey: true }); await ticks(8)
    setRange(document.querySelectorAll('input[type=range]')[1], 0.66)
  })
  await waitMs(600)   // let the merge window close

  await step('delete layer 3', async () => {
    click(rows()[2]); await ticks(8)
    rows()[2].querySelector('.layer-remove').click()
  })

  const failures = []
  const undoStates = []
  let guard = 0
  while (!undoBtn().disabled && guard++ < 60) {
    undoBtn().click()
    await ticks(8)
    undoStates.push(state())
  }

  // undo i must land on the state recorded before action (n - i).
  undoStates.forEach((got, i) => {
    const want = forward[forward.length - 1 - i]
    if (!want) { failures.push({ undo: i + 1, got, want: '(no matching forward state)' }); return }
    if (got !== want.before) failures.push({ undo: i + 1, action: want.label, got, want: want.before })
  })

  const redoStates = []
  guard = 0
  while (!redoBtn().disabled && guard++ < 60) {
    redoBtn().click()
    await ticks(8)
    redoStates.push(state())
  }

  // redo i must land on the state recorded before action (i + 1), which is the
  // result of action i.
  redoStates.forEach((got, i) => {
    const want = forward[i + 1]
    if (!want) return   // the last redo lands on the final state, not recorded as a "before"
    if (got !== want.before) failures.push({ redo: i + 1, got, want: want.before })
  })

  const result = {
    actions: forward.length,
    undoSteps: undoStates.length,
    redoSteps: redoStates.length,
    pass: failures.length === 0 && undoStates.length === forward.length,
    failures,
  }
  document.body.dataset.undoInvariant = JSON.stringify(result)
  return result
}
