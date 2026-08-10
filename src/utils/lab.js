// Lab mode: an event stream over the request lifecycle, for showing what the
// protections around it actually do.
//
// This file imports nothing, on purpose. requests.js imports it, and the store
// imports requests.js, so the dependency arrow stays one-way and no cycle is
// possible. Nothing here may ever import a component or the store.
//
// The buffer is module-level, not zustand state. An event stream is not part
// of the document being edited, it must not be captured by an undo snapshot,
// and undoing a slider drag should not rewind a log of things that happened.

// Read once at module load. Not reactive: lab mode is a way of opening the
// page, not a setting to flip mid-session, and a reactive read would mean
// every emit call site had to care about when it ran.
export const LAB =
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).get('lab') === '1'

// performance.now() throughout, matching the clock already embedded in request
// ids. Date.now() is left alone: it drives the cooldown, and the two are not
// interchangeable. Nothing here changes an existing clock or the id format.
const now = () => performance.now()

// Bounded. A long session with lab open should not grow a buffer forever, and
// a stream nobody has scrolled back to in 300 events is not being read.
const MAX_EVENTS = 300

// Replaced rather than mutated on every emit, so a snapshot reference is
// stable between emits and useSyncExternalStore does not loop.
let events = []
const listeners = new Set()

// requestId -> the performance.now() at which it was submitted, so later
// events on the same request can show elapsed time rather than an absolute
// clock reading nobody can subtract in their head.
const submittedAt = new Map()

let seq = 0

export function emit(type, detail = {}) {
  if (!LAB) return
  const at = now()
  const { requestId } = detail

  if (type === 'submit' && requestId) submittedAt.set(requestId, at)
  const t0 = requestId ? submittedAt.get(requestId) : undefined
  // Cleared on every event that ends a request, so the map cannot outlive the
  // buffer. All four terminal outcomes are listed: a request leaves this map
  // exactly once, whichever way it finished.
  const TERMINAL = ['abort', 'land', 'discarded', 'dropped']
  if (TERMINAL.includes(type) && requestId) submittedAt.delete(requestId)

  const event = {
    seq: seq++,
    type,
    at,
    sinceSubmit: t0 === undefined ? null : at - t0,
    ...detail,
  }

  events = events.length >= MAX_EVENTS
    ? [...events.slice(events.length - MAX_EVENTS + 1), event]
    : [...events, event]

  for (const fn of listeners) fn()
}

// Returns an unsubscribe. Adding the same function twice is a no-op because
// listeners is a Set, so a double-invoked effect cannot double-notify.
export function subscribe(fn) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function getEvents() {
  return events
}

export function clearEvents() {
  events = []
  submittedAt.clear()
  for (const fn of listeners) fn()
}
