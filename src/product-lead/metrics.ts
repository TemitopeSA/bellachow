/**
 * Evidence + metric definitions for the Product Lead view.
 * The review figures are SUPPLIED BY THE PORTFOLIO BRIEF and have not been independently
 * collected, audited or verified by this application. Targets are hypotheses, not results.
 */
export const EVIDENCE = {
  status: 'Brief-supplied review-analysis figures — validation pending',
  sample: '600 recent Google Play reviews',
  period: 'December 2025–October 2026',
  oneStarShareOfAll: 24,
  themesWithinLowStar: [
    { label: 'Delays', pct: 38 },
    { label: 'Crashes or lag', pct: 21 },
    { label: 'Fees', pct: 13 },
  ],
  caveat:
    'Sample selection, theme classification and percentages need validating (sample frame, coder agreement, de-duplication) before they inform a business decision. Themes overlap — one review can mention several.',
}

export const NORTH_STAR = 'Orders placed via Bella per week'

export const INPUT_METRICS: { name: string; target: string }[] = [
  { name: 'Bella open rate from Home', target: '≥ 15% of Home sessions' },
  { name: 'Prompt → recommendation engagement', target: '≥ 70% tap a card, pill or breakdown' },
  { name: 'Prompt → add-to-cart conversion', target: '≥ 35%' },
  { name: 'Add-to-cart → order conversion', target: '≥ 55%' },
  { name: 'Time to first add', target: '< 45 seconds median' },
  { name: 'Delivered within promised ETA', target: '≥ 85% of Bella orders' },
  { name: 'Seven-day repeat ordering', target: '+3 pts vs. control' },
]

export const GUARDRAILS = ['Average order value (no drop vs. control)', 'Refund and support-ticket rate (fee + delay tickets)', 'App speed and crash rate (p75 Bella response < 1s)']

export const ROLLOUT = [
  {
    phase: 'Phase 1 — Validate the foundation',
    duration: '2–3 weeks',
    points: [
      'All-in pricing on vendor and menu cards',
      'More honest ETA estimates',
      'Validate fee assumptions and delivery-estimate accuracy',
      'Instrument the checkout funnel',
      'Run an A/B test where feasible',
    ],
  },
  {
    phase: 'Phase 2 — Introduce Bella',
    duration: 'Proposed',
    points: [
      'Release to 10% of Lagos users (proposed rollout hypothesis)',
      'Deterministic rules engine with an optional LLM layer',
      'Log intent, recommendation, add-to-cart, order and delivery outcomes',
      'Monitor guardrails before increasing exposure',
    ],
  },
  {
    phase: 'Phase 3 — Expand the use cases',
    duration: 'Later',
    points: ['Group orders', 'Chowpass upsell', '"The usual?" reorder experience', 'Ghana expansion with cedi pricing after localisation and operational validation'],
  },
]
