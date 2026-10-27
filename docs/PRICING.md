# Nib — plan and pricing rules

Internal reference for what we sell, what it costs, and what we will not do. The public expression of this lives on `sknib.com/pricing` and `sknib.com/models`.

## The unit

**10 credits = $1.00 of usage at published model rates.**

One credit is therefore $0.10 of published-rate usage. This is the only unit users need to reason about. Every surface that shows credits also shows the dollar equivalent at least once.

Public rate card: `sknib.com/models`. It lists one rate per model family, in dollars per million tokens and in credits per million tokens. We do not publish separate discount tables per plan.

## Why 3x works

The old business discounted against list price. This one sells a bundle, so the comparison is against **our published rate**, not the provider's list price.

Let:

- `P` = plan price in USD
- `c` = actual cost as a fraction of our published rate (currently 6–10% by model family; use 12% as the stress case)
- `m` = credits granted per dollar of plan price, expressed as a multiple of the published rate

Then gross margin at full utilisation is:

```
margin = 1 − processor_fee − fixed_fee/P − c × m
```

With a 4% + $0.40 processor and `P = $29`:

| `m` | c = 6% | c = 8% | c = 10% | c = 12% |
|---:|---:|---:|---:|---:|
| 1.0× | 88.6% | 86.6% | 84.6% | 82.6% |
| 2.0× | 82.6% | 78.6% | 74.6% | 70.6% |
| 2.5× | 79.6% | 74.6% | 69.6% | 64.6% |
| 3.0× | 76.6% | 70.6% | 64.6% | 58.6% |
| 3.5× | 73.6% | 66.6% | 59.6% | 52.6% |
| 4.0× | 70.6% | 62.6% | 54.6% | 46.6% |

**Decision: 3.0× is the ceiling for standard plans, 3.8× for top-ups.** At the stress case of c = 12%, a 3× plan still leaves 58.6%, which is enough to absorb refunds, chargebacks, and a model-price increase. Anything above 4× has no room for error.

## Plans

| Plan | Price | Credits | Multiple | Effective usage | Weekly cap | Daily cap | Concurrency | RPM |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Free | $0 | 50 | — | $5 | — | 10 credits | 1 | 20 |
| Starter | $10 (list $15) | 300 | 3.0× | $30 | 120 | 45 | 3 | 120 |
| Pro | $29 (list $39) | 900 | 3.1× | $90 | 360 | 135 | 10 | 400 |
| Max | $79 (list $99) | 2,500 | 3.16× | $250 | 1,000 | 375 | 30 | 900 |
| Team | $25/seat | 750/seat | 3.0× | $75/seat | 300/seat | 110/seat | 10/seat | 400/seat |
| BYOK | $0 | none | — | — | — | — | 3 | 120 |

Rules:

- Free is one per account, requires email verification, and expires after 14 days. It is a trial, not a tier.
- Promotional prices are locked for as long as the subscription stays active. New subscriptions after 31 January 2027 pay list.
- Weekly cap is 40% of monthly credits. Daily cap is 15%. Both exist to stop a runaway session, not to shape usage.
- Team requires at least two seats and pools credits. Billing is centralised; seats are named.
- Annual billing: 12 months for the price of 10. No other discount stacking.

## Top-ups

| Paid | Credits | Multiple | Effective usage |
|---:|---:|---:|---:|
| $5 | 100 | 2.0× | $10 |
| $10 | 220 | 2.2× | $22 |
| $25 | 580 | 2.32× | $58 |
| $50 | 1,240 | 2.48× | $124 |
| $100 | 2,600 | 2.6× | $260 |

Top-ups are deliberately **lower** than plan multiples. They exist to rescue a month, not to replace a subscription. Top-ups are valid for 12 months, never auto-renew, and are consumed only after plan credits are gone.

## Cost controls that must exist in the product

1. **Weekly and daily caps** on every plan, enforced server-side before the request is dispatched.
2. **Pre-flight balance check.** Reject a request whose estimated maximum cost exceeds remaining credits, with a 402 that names the shortfall.
3. **Cheap-first routing.** Auto mode starts on an efficient model and escalates only after two failures.
4. **Cache discipline.** Coding agents resend large contexts; cached input must be billed at the cache-read rate, not the full input rate.
5. **Per-user anomaly alerts.** One account consuming more than 3× the median for its plan triggers a review, not an automatic ban.
6. **Model mix monitoring.** Track the share of frontier tokens per plan. If a plan's frontier share crosses 40%, either the routing is wrong or the plan is mispriced.

## What we do not do

- **No per-model discount tables.** The rate card is the single source of truth.
- **No "unlimited".** Not on any plan, not in any marketing copy.
- **No discount-vs-list-price claims.** Not "80% off", not "a fraction of official pricing". The bundle is the value; the comparison is our own rate card.
- **No profit, resale, or arbitrage language.** It is a tool subscription.
- **No credits that never expire.** Plan credits reset; top-ups last 12 months.
- **No silent model substitution.** If a model is unavailable, the request fails with a clear error rather than being served by a different model without telling the user.

## Review cadence

- **Weekly:** actual cost ratio `c` by model family; frontier share per plan; refund and chargeback rate.
- **Monthly:** recalculate margins at current utilisation; decide whether to adjust caps or multiples.
- **On any provider price change:** recompute the rate card and notify users at least 30 days before the new rates apply.

If `c` rises above 12% for two consecutive weeks, cut the plan multiple to 2× before touching price. If utilisation exceeds 85% for a plan across a full month, that plan is underpriced; raise the price for new subscribers rather than cutting existing allowances.
