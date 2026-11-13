# GreenQuote

Pre-qualification of residential solar systems for financing: what the system
costs, how risky the applicant is, and what instalments they would pay.

## Language

### Quote

**Quote**:
One pre-qualification request with its inputs and the result computed from them,
owned by the user who requested it.
_Avoid_: Application, request, estimate

**System size**:
The rated power of the solar system, in kW.
_Avoid_: Capacity, kWp

**Monthly consumption**:
The household's average electricity use per month, in kWh.
_Avoid_: Usage, demand

**Down payment**:
The amount the user pays upfront, which is not financed. Optional.
_Avoid_: Deposit

**System price**:
The price of the solar system before any down payment.
_Avoid_: Cost, total

**Principal**:
The amount financed: system price minus down payment.
_Avoid_: Loan amount, financed amount

### Result

**Risk band**:
A coarse rating of the applicant, A, B or C, that sets the APR.
_Avoid_: Score, grade, tier

**APR**:
The annual percentage rate attached to a risk band.
_Avoid_: Interest rate

**Offer**:
One instalment option for a quote: a term, the APR, the principal used and the
monthly payment.
_Avoid_: Plan, option

**Term**:
The length of an offer in years (5, 10 or 15).
_Avoid_: Duration, tenor

**Monthly payment**:
The fixed amount paid each month over an offer's term.
_Avoid_: Instalment, rate

### People

**User**:
Someone who registered with an email and password.
_Avoid_: Customer, account, applicant

**Admin**:
A user who may see every quote.
_Avoid_: Superuser, staff
