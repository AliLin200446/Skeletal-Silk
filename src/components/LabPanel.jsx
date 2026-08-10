import { useSyncExternalStore } from 'react'
import { subscribe, getEvents, clearEvents } from '../utils/lab'

// useSyncExternalStore rather than useEffect + useState. The subscribe it
// performs is idempotent by construction, which matters because main.jsx wraps
// the tree in StrictMode and dev double-invokes effects. The buffer also lives
// in the module, not per subscriber, so even a double subscription could not
// duplicate an event; this just removes the question.

const TYPE_LABEL = {
  submit: 'SUBMIT',
  abort: 'ABORT',
  refused: 'REFUSED',
  land: 'LAND',
}

// A request id is req_<seq>_<clock>. Only the sequence part is worth reading
// at a glance; the clock suffix is there to make ids unique, not legible.
const shortId = (id) => (id ? id.split('_').slice(0, 2).join('_') : '')

const secs = (ms) => (ms / 1000).toFixed(3)

export default function LabPanel() {
  const events = useSyncExternalStore(subscribe, getEvents)

  return (
    <section className="lab">
      <div className="lab-head">
        <span>REQUEST EVENTS</span>
        <span className="lab-count">{events.length}</span>
        <button className="link-btn" onClick={clearEvents}>CLEAR</button>
      </div>

      <div className="lab-stream">
        {events.length === 0 && (
          <div className="lab-empty">
            nothing yet. Pick a swatch to see a request submitted, cancel it to
            see the abort, or fire the same layer twice to see one refused.
          </div>
        )}
        {events.map((e) => (
          <div key={e.seq} className={`lab-row lab-row-${e.type}`}>
            <span className="lab-t">{secs(e.at)}</span>
            <span className="lab-type">{TYPE_LABEL[e.type] ?? e.type.toUpperCase()}</span>
            <span className="lab-layer">{shortId(e.layerId)}</span>
            <span className="lab-req">{shortId(e.requestId)}</span>
            <span className="lab-since">
              {e.sinceSubmit === null ? '' : `+${secs(e.sinceSubmit)}s`}
            </span>
            {e.reason && <span className="lab-reason">{e.reason}</span>}
          </div>
        ))}
      </div>

      {/* LAND is missing on purpose rather than by omission: it has no single
          existing choke point to hang off, so it needs instrumentation that
          this pass deliberately does not add. */}
      <div className="lab-note">
        Clock is performance.now(), seconds since page load. The elapsed column
        is measured from that request's own submit. LAND is not in this stream
        yet: unlike the other three it has no single place in the code to read
        it from, so it needs new instrumentation.
      </div>
    </section>
  )
}
