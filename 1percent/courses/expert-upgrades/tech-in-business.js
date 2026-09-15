/* ============================================================
   Expert Layer data — Tech in Business
   Grounded in: East African mobile-money fraud patterns (MoMo
   verification, PIN discipline), daily-reconciliation practice,
   single-source-of-truth data habits, Google Business Profile
   power features (booking links, product catalogs, Q&A).
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners collect apps — one for sales, one for receipts, one for stock, one "just to try". Experts run on **one source of truth**: a single place (a Google Sheet, a POS, or a simple system) where every sale, expense, and stock movement lands *the same day*, because a business that cannot answer "how much profit did I make last month?" by the 5th is guessing, not managing. The second difference: experts treat money messages with a **verification reflex** — no transaction logic ever happens because of a text message. "You have received 50,000 RWF" followed by "please refund to this new number" is the classic MoMo scam pattern across East Africa; professionals confirm on the *official* app (not the SMS) before shipping goods, always.`,

  howExpertsWork: `Their digital routine is a habit stack, not a tool collection: morning (10 minutes) — check Google Business Profile messages and reviews, reply to every WhatsApp message from yesterday, post one Status; evening (10 minutes) — every sale of the day entered in the record, cash counted against the record, tomorrow's stock gaps noted. Weekly (30 minutes) — reconcile MoMo/Airtel statements against sales records, review which products made actual profit (not just revenue), and one marketing action. Monthly — download and file mobile money statements (they are also your accounting and loan-qualification documents), review the Insights dashboard, and prune: delete or stop using any tool that did not earn its keep. Businesses die from tool sprawl and unreconciled cash; the routine is the moat.`,

  toolsOfTheTrade: [
    ['One source of truth (Sheet or POS)', 'Every sale, expense, and stock movement in one place, updated daily', 'You cannot manage what you record twice, differently, in three apps'],
    ['Official-app verification', 'Confirming every payment in the MoMo/Airtel app — never by SMS alone', 'SMS can be faked; balances and transaction IDs in the app cannot'],
    ['Daily reconciliation habit', 'Count cash + check mobile money balance vs your records, every evening', 'Shrinkage and errors are caught at day 1, not month-end — when they are still findable'],
    ['WhatsApp Business catalogs + labels', 'Product catalog, price list, and labelled customer chats (New, Paid, Delivered)', 'Free CRM in the app every customer already has'],
    ['Monthly statement downloads', 'PDF exports of MoMo/Airtel/bank statements, filed by month', 'Loan applications, tax time, and fraud disputes become 5-minute jobs']
  ],

  insiderMoves: [
    'The 3-question payment protocol for any phone instruction: (1) Did the money actually arrive — checked in the *app*, not the SMS? (2) Did I initiate or expect this? (3) When in doubt, call the customer on their *known* number — never one supplied in the message. This kills 100% of refund/overpayment scams.',
    'Photograph every delivery handoff (item + customer + date visible). Disputes — "I never received it" — are ended by a photo in seconds; this habit saves its weight in gold monthly.',
    'Set your WhatsApp Business "away" message with prices and hours — 80% of messages are "how much?" and can be answered while you sleep.',
    'Price from your data, not your fear: your records show which products carry 40% margin and which drag at 8%. Raise or kill the 8% ones — most small businesses have 2-3 products quietly subsidising the rest.',
    'Ask every new customer "how did you find us?" and write the answer in one column. After 30 entries you will know exactly which marketing effort earns money — stop guessing, start doubling down.',
    'Back up the business brain: photos of receipts to one Drive folder weekly, contacts synced, and a one-page note of your logins stored safely. The phone is replaceable in 24 hours; the records are not.'
  ],

  fieldScenarios: [
    {
      situation: 'An SMS says you received 100,000 RWF, then a call: "sorry, wrong amount — please send back 90,000 and keep 10,000 for your trouble."',
      beginner: 'Checks the SMS (looks official), sends the "refund".',
      expert: 'Opens the official app: no transaction exists. Blocks the number, reports via the operator\'s fraud line. Rule internalised: money that is not in your app balance does not exist, no matter what any message says.',
      why: 'The fake-deposit-refund scam is the most common mobile money fraud against small businesses in East Africa; the app check defeats every variant.'
    },
    {
      situation: 'Sales are steady but money is always short at month-end.',
      beginner: 'Concludes "the business isn\'t working" or cuts random costs.',
      expert: 'Pulls three numbers from the records: who owes you (receivables), what you owe (suppliers, MoMo loans), and which products actually make margin. Finds 400,000 RWF in uncollected customer debts and two zero-margin products — cash was there all along, trapped.',
      why: 'Most "cash flow problems" in small business are *data* problems: debts, margins, and timing invisible because nothing is reconciled.'
    },
    {
      situation: 'A competitor runs Instagram ads and seems to be winning.',
      beginner: 'Panics, spends the week trying TikTok.',
      expert: 'Checks their own 30-day "how did you find us?" column first. If customers come from WhatsApp referrals and Google Maps, they double down *there* (ask 5 more happy customers for reviews this week) instead of renting attention on a platform where their customers are not.',
      why: 'Experts compete on their own data; following another business\'s channel is marketing by rumour.'
    }
  ],

  expertMistakes: [
    'Mixing business and personal money in one account/wallet. Every expert separates them — even just a second MoMo number — because mixed money makes profit invisible and tax time a nightmare.',
    'Recording sales "later". Later never comes; the sale that is not written down the same day is statistically already lost.',
    'Confusing revenue with profit: 500,000 RWF of sales with 480,000 of stock cost and transport is a 20,000 month. Experts track cost of goods *per product*, weekly.',
    'Trusting one channel entirely (only WhatsApp, only foot traffic). Experts build at least two discoverable channels — typically Google Maps + WhatsApp — so one outage or policy change cannot erase the customer pipe.'
  ],

  dayInTheLife: `A shop owner in Kicukiro opens at 7:30 and spends the first 10 minutes with the routine: three Google reviews to reply to (one negative — a delivery delay — answered with an apology and a phone number, moved offline), two WhatsApp catalog orders accepted with payment confirmed *in the app* before packing, and one Status posted (this morning's fresh stock). Mid-morning a customer pays 45,000 via MoMo for a bulk order; the amount lands in the app but the caller asks to "send 5,000 back for the courier" — the 3-question protocol fires, no refund, the number is blocked and reported. Evening: 12 minutes — 23 sales entered, cash counted (matches), one stock gap noted (cooking oil, reorder Thursday), tomorrow's two deliveries photographed and scheduled. Weekly tomorrow: reconcile MoMo statement, review margins (matches are losing money — price up or drop), ask three regulars for reviews.`,

  hiringLens: `Hiring tech help as a small business is its own skill — and experts screen for it: pay for small proven work first (a one-page site, a working order form) before any big build; ask for *maintenance* terms and a monthly cost in writing; check one past client by calling them. The other direction matters too: freelancers and agencies screen *you* — businesses with their records in one place, decisions in writing, and prompt payment get better developers at better prices, because they are low-drama clients.`,

  firstJobReality: `The first month of running your business "on data" feels slower — entering sales nightly, photographing deliveries, reconciling weekly — and then the compounding starts: you reorder stock *before* it runs out (because the sheet said so Tuesday), you price the loss-makers up, you catch a fake payment in seconds. By month three you make decisions in minutes that used to take anxious evenings. That is the actual product of this course: not apps, but a business that answers its own questions.`,

  exercises: [
    'Run the 3-question payment protocol on your *last five* mobile money transactions — check each in the official app. Then save your operator\'s fraud-report number in your phone, labelled, today.',
    'Create (or audit) your one source of truth: sales sheet with date, product, amount, cost, payment method, customer source. Enter everything for 7 days. On day 7, answer: best product by *profit*, busiest day, where new customers came from.',
    'Do the first-weekend digital presence checklist from Module 1 if incomplete — then go one step further: reply to every review and message you have, including old ones.',
    'Time-trial your month-end: with your records, produce last month\'s total sales, total profit, top 3 products, and any customer owing you money — in under 30 minutes. If it takes longer, the system needs fixing, not you.'
  ],

  goDeeper: [
    'Your mobile money operator\'s official fraud-awareness pages (MTN/Airtel) — know the current scam patterns and the official reporting lines.',
    'Google\'s "Get Your Business Online" lessons — free, practical, and deeper than any social media course on Maps/Business Profile.',
    'WhatsApp Business app Help Center — catalogs, labels, broadcast lists: the free CRM most businesses already own but never configure.',
    '"Profit First" by Mike Michalowicz — the envelope method for business cash; the ideas work at any currency and any size.'
  ],

  onePercent: `experts run technology like a routine, not a toy collection: one source of truth updated daily, every payment verified in the official app, every dispute ended by a photo — and monthly statements filed, because the data *is* the business.`
};
