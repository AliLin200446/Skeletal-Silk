# Skeletal Silk — style rules

Two grounds. A dark sample stage, and a paper instrument panel beside it.
Black is the measurement condition, not decoration: a dark field is what
makes a sample's response to light readable.

## Palette

| token | value | use |
|---|---|---|
| `--paper` | `#EDE9E1` | instrument panel ground |
| `--ink` | `rgba(24,22,20,0.92)` | primary readings, labels |
| `--ink-mid` | `rgba(24,22,20,0.62)` | secondary text, notes |
| `--ink-dim` | `rgba(24,22,20,0.44)` | captions, inactive states |
| `--rule` / `--rule-strong` | ink at 0.16 / 0.30 | hairlines and borders |
| `--ink-err` | `#8c1d13` | oxblood, see below |

## Oxblood: one thing shouts per screen

The rule is that **only one element is allowed to raise its voice at a time**.
It is not a rule about how many times the colour may appear in a file.

With a single sample this was the same thing. With up to six layers it is
not: six layers can each be in an error state, and six oxblood marks means
nothing is emphasised.

**Clarified rule.** Oxblood is reserved for the error of the *currently
selected* layer. An unselected layer in error shows the same glyph in
`--ink-dim`, so the board still tells you something went wrong over there
without competing for attention.

This is a clarification of the original rule, not an exception to it.

**Oxblood is for `status: 'error'` on the selected layer, and nothing else.**
A refusal is not a failure. Being told to wait two seconds before re-analysing
a layer, or that three analyses are already running, leaves the layer idle with
nothing broken and no action required beyond patience. Those render in
`--ink-dim` with a `·` marker. `✕` and oxblood are reserved for the case where
something actually went wrong.

## Other constraints

- **No shadows, and separation is a border.** Not a softened one — no
  `box-shadow` anywhere, including the hairline-shadow trick for edges. If
  two surfaces need telling apart, they get a 1px `--rule` border. The
  panel's left edge was a `box-shadow` doing a border's job; it is a
  border now.
- **No border radius.** Anywhere.
- **Geist Mono for numbers**, with `font-variant-numeric: tabular-nums`
  wherever figures sit in a column and would otherwise jitter.
- **Four type tiers, and 11px is the floor.** Tokens live in `:root`.

  | tier | size / weight | for |
  |---|---|---|
  | title | 24px / 500 | the page title. Defined, not yet applied. |
  | head | 13px / 500 | section headings |
  | body | 13px / 400 | prose, layer names, parameter values |
  | label | 11px / 500 | units, indices, status markers, data readouts |

  The floor used to be 9px, set by an earlier typography audit that was
  rescuing labels from 7.5px. It stopped being a floor and became the
  whole scale: 89% of the text on the page sat exactly on it, six nodes
  were under it, and the largest type anywhere was 11px. A floor that
  everything rests on is not a floor.

  **Tracking falls as size rises.** 0.28em was carrying legibility at 9px;
  at 13px the same figure is just gaps, and it was what pushed USAGE THIS
  SESSION onto two lines. Per class, not a token: the right amount depends
  on how much of the string is caps.

  The title tier has no user. SKELETAL SILK at 24px needs 263px of line
  and the left column gives 164px, so it holds at the label size. Setting
  it to 14px, the largest that happens to fit there, would answer a layout
  question with a number.

  **9px is gone from the shipped surface. The `?lab=1` panel still has
  eight rules at 9px, and its grid columns were cut for that size, so
  raising it is a layout change. Not a straggler, a separate job.**

- **Contrast: anything explaining something is `--ink-mid` or better.**
  `--ink-dim` is 2.8:1 on the paper and was carrying every line that told
  the user what had just happened. It is for ordinals, counters and
  arrows: `03` says nothing the order has not already said.
- **No CJK** in shipped UI copy.
- **No em dashes** in shipped UI copy.

## Open

- Reconcile with the portfolio's design system file. Two design systems by
  the same person that disagree on palette tokens or the shadow rule is
  worse than either one alone. Not started; decide which is canonical
  first. Nothing else can be reconciled before that answer.

  The file is `/Users/alilin/Applications/portfolio/content/notes/design-system.md`.
  This entry used to say "the portfolio STYLE file" and no file by that
  name exists there, so the pointer did not resolve. That repo now
  carries the matching half of this note; for weeks it was written here
  only, which meant it was invisible from the side that needed it.

  What that file holds: a five level type scale, a three weight rule
  measured off the actual font faces, a deliberate SVG exemption, and
  the hero Solution slot definition.
