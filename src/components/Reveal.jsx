// A panel section that is not there until it has something to say.
//
// WHY THIS EXISTS
//   Five of the panel's ten sections carry no control at all, and they were
//   2231px of a 3084px panel: 72% of a surface whose job is input was read-only
//   reference, most of it answering questions a first-time user has not asked
//   yet. USAGE THIS SESSION opened at all zeros. UNDO and REDO opened disabled,
//   the two largest button shapes on the first screen both unusable. The layer
//   list opened listing one layer.
//
//   Hiding them is not decluttering. It is the only way this panel can express
//   an order: three columns are read at once, not in sequence, so the sequence
//   has to come from time instead of space.
//
// THE JUMP
//   A block appearing from nothing moves everything below it, and a panel that
//   jumps reads as a glitch rather than as a consequence.
//
//   The thing doing most of the work is not the animation: it is that every
//   condition is something the user just did. The list arrives because they
//   added a layer, undo arrives because they changed something, the raw
//   response arrives because they asked for it. Only usage arrives on its own,
//   a second or two after the click that caused it.
//
//   The animation is the rest, and it is four lines of CSS: grid-template-rows
//   0fr -> 1fr is the one way to transition to a height nobody had to measure.
//   A measured height via ResizeObserver was built first and thrown away; it
//   was thirty lines, and it reported a stale cap whenever the content changed
//   in the same tick as the toggle.
//
//   Closed means inert, not merely invisible. The buttons inside a collapsed
//   section must not be reachable by tab.
export default function Reveal({ when, children }) {
  return (
    <div className={`reveal${when ? ' is-open' : ''}`}>
      <div className="reveal-inner" inert={when ? undefined : true}>
        {children}
      </div>
    </div>
  )
}
