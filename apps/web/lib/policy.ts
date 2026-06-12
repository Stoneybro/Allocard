/** Default expense policy seeded for new companies */
export const DEFAULT_COMPANY_POLICY = `Standard Corporate Expense Card Policy:

Receipts: All purchases over $25 USD must be accompanied by a receipt.
Alcohol: Alcohol purchases are not permitted under any circumstances.
Meals: Individual meals capped at $50 per person. Group/client meals capped at $150 per meal.
Travel: Flights must be economy class. Hotels capped at $200/night. No first-class travel.
Personal Expenses: Personal expenses (groceries, clothing, entertainment) are not reimbursable.
Gifts: Client gifts capped at $100 per recipient per year.
Subscriptions: Software subscriptions require pre-approval from management.
Miscellaneous: Any expense exceeding $500 requires a written justification.

Venice AI: Use these policies to evaluate all claims, direct spends, and reimbursements. Flag any transaction that violates these rules for employer review.`.trim();
