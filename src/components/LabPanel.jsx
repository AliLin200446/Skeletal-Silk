import { useSyncExternalStore } from 'react'
import { subscribe, getEvents, clearEvents, getInjections, setInjection, anyInjected } from '../utils/lab'

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
  injection: 'INJECTION',
}

// A request id is req_<seq>_<clock>. Only the sequence part is worth reading
// at a glance; the clock suffix is there to make ids unique, not legible.
const shortId = (id) => (id ? id.split('_').slice(0, 2).join('_') : '')

const secs = (ms) => (ms / 1000).toFixed(3)

export default function LabPanel() {
  const events = useSyncExternalStore(subscribe, getEvents)
  const injections = useSyncExternalStore(subscribe, getInjections)
  const injecting = anyInjected()

  return (
    <section className={`lab${injecting ? ' is-injecting' : ''}`}>
      <div className="lab-head">
        <span>REQUEST EVENTS</span>
        <span className="lab-count">{events.length}</span>
        <button className="link-btn" onClick={clearEvents}>CLEAR</button>
      </div>

      {/* Two groups, kept apart on screen because they are opposite things. A
          guard is behaviour being shown; an injection is that behaviour being
          deliberately broken so a guard has something to catch. */}
      <div className="lab-switches">
        <div className="lab-group lab-group-injection">
          <div className="lab-group-head">INJECTION, NOT PRODUCT BEHAVIOUR</div>
          <label className="lab-switch">
            <input
              type="checkbox"
              checked={injections.suppressAbort}
              onChange={(e) => setInjection('suppressAbort', e.target.checked)}
            />
            <span>Suppress abort</span>
          </label>
          <div className="lab-group-note">
            Off by default. On, a cancel still removes the request and still
            reports ABORT, but the fetch is left running, so the server's answer
            really arrives a few seconds later and landing check 1 has a real
            value to refuse.
          </div>
        </div>

        <div className="lab-group">
          <div className="lab-group-head">GUARDS</div>
          <div className="lab-group-note">
            No guard switches yet. The guards are on, as they are in the
            shipped build.
          </div>
        </div>
      </div>

      {injecting && (
        <div className="lab-banner">
          INJECTION LIVE. What follows is not how the product behaves.
        </div>
      )}

      <div className="lab-stream">
        {events.length === 0 && (
          <div className="lab-empty">
            nothing yet. Pick a swatch to see a request submitted, cancel it to
            see the abort, or fire the same layer twice to see one refused.
          </div>
        )}
        {events.map((e) => (
          <div key={e.seq} className={`lab-row lab-row-${e.type}${e.injected ? ' is-injected' : ''}`}>
            <span className="lab-t">{secs(e.at)}</span>
            <span className="lab-type">{TYPE_LABEL[e.type] ?? e.type.toUpperCase()}</span>
            <span className="lab-layer">{shortId(e.layerId)}</span>
            <span className="lab-req">{shortId(e.requestId)}</span>
            <span className="lab-since">
              {e.sinceSubmit === null ? '' : `+${secs(e.sinceSubmit)}s`}
            </span>
            {e.type === 'injection' && (
              <span className="lab-reason">
                suppress abort {e.on ? 'ON, events below are injected' : 'OFF, back to product behaviour'}
              </span>
            )}
            {e.suppressed && <span className="lab-reason">abort suppressed by injection, request left in flight</span>}
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
