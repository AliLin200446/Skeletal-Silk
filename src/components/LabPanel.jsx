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
  discarded: 'DISCARDED',
  dropped: 'DROPPED',
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
            {e.check && <span className="lab-reason">{e.check}</span>}
            {e.reason && <span className="lab-reason">{e.reason}</span>}
            {e.wrote && <span className="lab-reason">wrote {e.wrote}{e.kept?.length ? `, kept ${e.kept.join(' and ')} by hand` : ''}</span>}
            {e.type === 'discarded' && (
              <span className="lab-detail">
                {e.arrived
                  ? `arrived ${e.arrived}, discarded. State holds ${e.held}.`
                  : `response errored and was discarded. State holds ${e.held}.`}
                {e.tokensCounted
                  ? ' Tokens were already counted: this was paid for, then thrown away.'
                  : ' No tokens counted: nothing came back to count.'}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="lab-note">
        Clock is performance.now(), seconds since page load. Elapsed is measured
        from that request's own submit. REFUSED means nothing was sent and
        nothing was spent. DISCARDED means a response came back and a guard
        refused it, which is a different kind of event and, on the success
        path, one that was paid for first.
      </div>
    </section>
  )
}
