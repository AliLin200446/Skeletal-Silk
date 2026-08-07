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
- **9px is the floor** for any text a user is expected to read. Established
  by a typography audit; several labels sat at 7.5px and were unreadable.
- **No CJK** in shipped UI copy.
- **No em dashes** in shipped UI copy.

## Open

- Reconcile with the portfolio STYLE file. Two design systems by the same
  person that disagree on palette tokens or the shadow rule is worse than
  either one alone. Not started; decide which is canonical first.
