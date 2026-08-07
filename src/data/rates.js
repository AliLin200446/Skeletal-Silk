// Per-token rates for the model api/analyse.js calls.
//
// Verified 2026-08-07 against the Anthropic models overview, Legacy models
// table: Claude Sonnet 4.5, $3 per million input tokens, $15 per million
// output. Not written from memory, and not inferred from Sonnet 4.6's rate.
//
// These are shown in the interface, not buried here, so a reader can check
// the arithmetic against a published number instead of trusting a total.
export const RATES = {
  model: 'claude-sonnet-4-5',
  inputPerMTok: 3.00,
  outputPerMTok: 15.00,
  source: 'platform.claude.com models overview',
  verified: '2026-08-07',
}

export const estimateUsd = (inputTokens, outputTokens) =>
  (inputTokens / 1e6) * RATES.inputPerMTok + (outputTokens / 1e6) * RATES.outputPerMTok
