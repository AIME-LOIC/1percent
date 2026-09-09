# Module 7: Data-Driven Decisions with Free Tools

**Status:** PREMIUM — Locked behind paid access
**Duration:** 2 weeks
**Lessons:** 4

---

## Lesson 7.1: Why Data Matters (Even for a Small Shop)

**Duration:** 20 minutes | **Type:** Reading

---

You make decisions every day: what to stock, what price to charge, when to open, who to hire. Most small business owners make these decisions based on gut feeling. Data-driven businesses make them based on facts.

### Gut Feeling vs. Data

**Gut feeling:** "I think rice is our best seller."
**Data:** Rice generates 35% of revenue but has only 18% profit margin. Cooking oil generates 20% of revenue with 40% margin. You should promote cooking oil more.

**Gut feeling:** "Business is slow on Mondays."
**Data:** Monday revenue averages RWF 85,000 while Saturday averages RWF 180,000. But Monday's profit margin is higher because you sell more high-margin items. Mondays are actually your most profitable day per hour of operation.

**Gut feeling:** "I need more customers."
**Data:** Your average customer spends RWF 8,000. If you increased average spend to RWF 10,000 (through upselling or premium products), you'd increase revenue 25% without finding a single new customer.

### The Free Data Tools You Already Have

**Google Sheets:** You've been recording sales data since Module 2. That data is gold.

**Google Business Profile Insights:** Shows who's finding you, what they search, and what they do next.

**Social media analytics:** Instagram, Facebook, and TikTok all show you who's engaging with your content.

**Your phone:** Calculator, notes, photos of receipts — it's all data.

### The 3 Questions Every Business Owner Should Answer Monthly

1. **What's my most profitable product/service?** (Not highest revenue — highest profit margin)
2. **Where do my customers come from?** (Google, social media, word of mouth, foot traffic)
3. **What's my busiest time, and am I staffed for it?**

If you can answer these three questions with data instead of guesses, you're ahead of 90% of small businesses.

---

### ✅ Worked Example: Kariso.DataSource Café — Data Revelation

Kariso.DataSource Café in Kimihurura thinks their specialty coffee is their best product. The owner, Alice, believes this because customers talk about it most.

**The data tells a different story:**

Alice downloads her sales data from Square POS and creates a simple Google Sheet:

| Product | Monthly Revenue | Monthly Cost | Profit | Margin |
|---|---|---|---|---|
| Specialty coffee | RWF 180,000 | RWF 108,000 | RWF 72,000 | 40% |
| Fresh juice | RWF 120,000 | RWF 48,000 | RWF 72,000 | 60% |
| Pastries | RWF 95,000 | RWF 47,500 | RWF 47,500 | 50% |
| Lunch plates | RWF 200,000 | RWF 140,000 | RWF 60,000 | 30% |

**Insights:**
- Lunch plates generate the most revenue but have the lowest margin
- Fresh juice has the same profit as specialty coffee (RWF 72,000) but at half the revenue — it's the most efficient product
- Pastries are a hidden gem — 50% margin, easy to make, and pairs with coffee

**Alice's data-driven decisions:**
1. Promote fresh juice more (higher margin than coffee)
2. Add a "coffee + pastry combo" (leverage pastry margins)
3. Consider raising lunch prices by 10% (currently underpriced relative to value)

**Result:** In the next month, Alice increased overall profit by 18% — not by selling more, but by selling smarter.

---

### 📝 Your Exercise

1. Answer the 3 monthly questions using your actual data:
   - What's your most profitable product? (Calculate: Revenue - Cost = Profit, then Profit ÷ Revenue = Margin)
   - Where do your customers come from? (Ask 10 customers: "How did you find us?")
   - What's your busiest time? (Check your POS data or count customers per hour for 1 week)
2. Create a simple product profitability table in Google Sheets
3. Set a monthly reminder: "Review business data — 30 minutes"

**Time needed:** 1 hour
**Cost:** Free

---

### 📄 PDF Summary: Why Data Matters

> **Key Takeaways:**
>
> - Data turns guesses into decisions — most businesses run on gut feeling and lose money
> - Your 3 monthly questions: most profitable product, customer sources, busiest time
> - You already have the tools: Google Sheets, POS data, social media analytics
> - Profit margin matters more than revenue — a product selling less but earning more per unit is better
>
> **Action Step:** Create a product profitability table today. Answer the 3 monthly questions with real numbers.

---

## Lesson 7.2: Google Sheets for Business Tracking

**Duration:** 25 minutes | **Type:** Reading

---

Google Sheets is the most powerful free tool for business data. If you can use a calculator, you can use Sheets.

### Essential Sheets Every Business Needs

**Sheet 1: Daily Sales Tracker**

| Date | Product | Qty | Unit Price | Total | Payment | Customer Type |
|---|---|---|---|---|---|---|
| Sep 1 | Rice (kg) | 5 | 2,500 | 12,500 | MoMo | Walk-in |
| Sep 1 | Oil (L) | 3 | 4,000 | 12,000 | Cash | Regular |

**Sheet 2: Monthly P&L (Profit & Loss)**

| Category | Month 1 | Month 2 | Month 3 | Trend |
|---|---|---|---|---|
| Revenue | 750,000 | 820,000 | 910,000 | ↑ 12% |
| Cost of goods | 450,000 | 492,000 | 546,000 | ↑ 11% |
| Gross profit | 300,000 | 328,000 | 364,000 | ↑ 11% |
| Expenses | 180,000 | 185,000 | 190,000 | ↑ 3% |
| Net profit | 120,000 | 143,000 | 174,000 | ↑ 22% |

**Sheet 3: Customer Tracker**

| Customer | Phone | Last Purchase | Total Spent | Status |
|---|---|---|---|---|
| Jean | 0788... | Sep 5 | 125,000 | Active |
| Marie | 0722... | Jul 15 | 45,000 | At risk (60+ days) |

### Key Formulas You Need

**SUM:** Add up a column
```
=SUM(D2:D100)
```
Adds all values in column D from row 2 to 100.

**AVERAGE:** Find the average
```
=AVERAGE(D2:D100)
```
Calculates the average of all values in column D.

**COUNTIF:** Count items that meet a condition
```
=COUNTIF(F2:F100, "MoMo")
```
Counts how many payments were made via MoMo.

**SUMIF:** Add up values that meet a condition
```
=SUMIF(F2:F100, "MoMo", E2:E100)
```
Adds up all MoMo payment amounts.

**IF:** Create conditional logic
```
=IF(D2>100000, "High value", "Regular")
```
If the sale is over RWF 100,000, label it "High value."

### Creating a Simple Dashboard

A dashboard is a single sheet that shows your key metrics at a glance:

**Step 1:** Create a new sheet called "Dashboard"
**Step 2:** Pull data from your other sheets using formulas:

```
Total Revenue: =SUM('Daily Sales'!E:E)
Total Transactions: =COUNTA('Daily Sales'!A:A)-1
Average Sale: =SUM('Daily Sales'!E:E)/(COUNTA('Daily Sales'!A:A)-1)
Top Product: =INDEX('Daily Sales'!B:B, MATCH(MAX('Daily Sales'!E:E), 'Daily Sales'!E:E, 0))
```

**Step 3:** Add a chart:
1. Select your data
2. Click Insert → Chart
3. Choose chart type (bar chart for products, line chart for trends)
4. Customize colors and labels

### Sharing Sheets with Your Team

Google Sheets lets you share with specific people:

1. Click "Share" (top right)
2. Enter the email addresses of your team
3. Choose permission:
   - **Viewer:** Can only look (good for employees who shouldn't edit)
   - **Commenter:** Can add comments but not edit
   - **Editor:** Can make changes (good for managers)

---

### ✅ Worked Example: Ujamaa Farm Supplies — Sheets Dashboard

Ujamaa sells farming supplies in Huye. They track everything in Google Sheets.

**Their setup:**

**Tab 1: "Daily Sales"** — Every sale recorded with date, product, quantity, price, payment method.

**Tab 2: "Inventory"** — Current stock, reorder points, supplier info.

**Tab 3: "Monthly P&L"** — Revenue, costs, expenses, profit by month.

**Tab 4: "Dashboard"** — Auto-updating summary:

```
This Month's Revenue: =SUMIF('Daily Sales'!A:A,">="&DATE(2026,9,1),'Daily Sales'!E:E)
This Month's Transactions: =COUNTIF('Daily Sales'!A:A,">="&DATE(2026,9,1))
Average Transaction: =Revenue/Transactions
Most Sold Product: [INDEX/MATCH formula]
Least Sold Product: [INDEX/MATCH formula]
Cash vs Mobile Money: =SUMIF('Daily Sales'!F:F,"Cash",...)/SUMIF('Daily Sales'!F:F,"MoMo",...)
```

**Tab 5: "Customers"** — Customer database with last purchase date and total spend.

**Charts on Dashboard:**
- Bar chart: Revenue by product (shows which products matter most)
- Line chart: Daily revenue trend (shows growth or decline)
- Pie chart: Payment method split (shows cash vs. mobile money vs. card)

**Monthly routine (30 minutes):**
1. Review the dashboard
2. Check: is revenue growing? Which products are up/down?
3. Identify one action to improve next month

---

### 📝 Your Exercise

1. Create a new Google Sheet with 3 tabs: "Daily Sales," "Inventory," "Dashboard"
2. In "Daily Sales," record your last 7 days of sales
3. In "Dashboard," create formulas that pull totals from "Daily Sales"
4. Add one chart (bar chart showing sales by product)
5. Practice using SUM, COUNTIF, and AVERAGE formulas
6. Share the sheet with your business partner or manager (view-only)

**Time needed:** 1 hour
**Cost:** Free

---

### 📄 PDF Summary: Google Sheets for Business Tracking

> **Key Takeaways:**
>
> - Every business needs 3 core sheets: Daily Sales, Monthly P&L, Customer Tracker
> - Key formulas: SUM, AVERAGE, COUNTIF, SUMIF, IF
> - Create a Dashboard sheet that auto-updates with your key metrics
> - Add charts to visualize trends (bar, line, pie)
> - Share sheets with your team using view-only permissions
>
> **Action Step:** Create a Google Sheet with Daily Sales and Dashboard tabs. Record your last 7 days of sales. Build a dashboard with 3 key metrics.

---

## Lesson 7.3: Building Your First Sales Dashboard

**Duration:** 25 minutes | **Type:** Reading

---

A dashboard is like the instrument panel of your car — it shows you the most important information at a glance so you can make quick decisions.

### The 5 Metrics That Matter Most

**1. Revenue (total sales)**
How much money came in. Track daily, weekly, monthly.

**2. Profit (revenue minus costs)**
How much you actually earned. Revenue means nothing without profit.

**3. Average transaction value**
Total revenue ÷ number of transactions. Higher is better — it means customers spend more per visit.

**4. Top products by profit**
Which products make you the most money (not just the most revenue).

**5. Customer sources**
Where do new customers come from? Google? Social media? Word of mouth?

### Building a Dashboard in Google Sheets

**Step 1: Set up your data sheets**

You need clean, structured data. Every row = one transaction. Every column = one piece of information.

**Step 2: Create a "Dashboard" sheet**

In a new tab, create summary cells:

**Cell A1:** "This Month's Revenue"
**Cell B1:** `=SUMIFS('Daily Sales'!E:E, 'Daily Sales'!A:A, ">="&DATE(2026,9,1), 'Daily Sales'!A:A, "<"&DATE(2026,10,1))`

**Cell A2:** "This Month's Transactions"
**Cell B2:** `=COUNTIFS('Daily Sales'!A:A, ">="&DATE(2026,9,1), 'Daily Sales'!A:A, "<"&DATE(2026,10,1))`

**Cell A3:** "Average Transaction"
**Cell B3:** `=B1/B2`

**Cell A4:** "Profit Margin"
**Cell B4:** `=(B1 - [cost cell]) / B1 * 100 & "%"`

**Step 3: Add charts**

1. Select your product revenue data
2. Insert → Chart → Bar chart
3. Title: "Revenue by Product"
4. Customize colors

5. Select your daily revenue data
6. Insert → Chart → Line chart
7. Title: "Daily Revenue Trend"

**Step 4: Format for readability**
- Use bold for headers
- Use colors: green for positive trends, red for negative
- Add borders around metric boxes
- Freeze the header row (View → Freeze → 1 row)

### Reading Your Dashboard

**Revenue is going up but profit is flat:**
→ Your costs are rising faster than revenue. Check: are suppliers raising prices? Are you discounting too much?

**One product dominates revenue:**
→ You're too dependent on one product. Diversify — add complementary products.

**Average transaction is dropping:**
→ Customers are buying less per visit. Try: bundles, minimum order for free delivery, upselling at checkout.

**Weekend revenue is 2x weekday:**
→ You're losing money on weekdays. Consider: weekday specials, extended hours, targeting office workers for lunch.

---

### ✅ Worked Example: Isoko Market — Dashboard Build

Isoko is a grocery market in Gikondo. They have 120 products and RWF 2.5M monthly revenue.

**Building the dashboard (45 minutes):**

**Sheet 1: "Sales"** — All transactions recorded with: Date, Product, Category, Qty, Price, Total, Payment Method, Staff

**Sheet 2: "Dashboard"** — Auto-calculated metrics:

| Metric | Value | Formula |
|---|---|---|
| Monthly Revenue | RWF 2,487,000 | SUMIFS formula |
| Monthly Transactions | 847 | COUNTIFS formula |
| Avg Transaction | RWF 2,936 | Revenue ÷ Transactions |
| Cash % | 42% | SUMIF formula |
| MoMo % | 38% | SUMIF formula |
| Airtel % | 15% | SUMIF formula |
| Card % | 5% | SUMIF formula |

**Charts:**
1. **Bar chart:** Top 10 products by revenue
2. **Line chart:** Daily revenue trend (30 days)
3. **Pie chart:** Payment method split
4. **Bar chart:** Revenue by category (Produce, Dairy, Household, etc.)

**Insights from the dashboard:**
- Top 3 products (rice, cooking oil, sugar) = 45% of revenue → ensure these never stock out
- Friday is the busiest day (RWF 120,000 average) → ensure full stock Thursday evening
- MoMo + Airtel = 53% of payments → mobile money is dominant, keep optimizing for it
- Dairy category has the lowest revenue but highest margin (35%) → promote dairy more

**Monthly routine:**
1. First Monday of each month: review dashboard
2. Compare to previous month: up or down?
3. Identify top insight and one action

---

### 📝 Your Exercise

1. Create a "Dashboard" sheet in your existing Google Sheets setup
2. Add 5 key metrics with formulas (revenue, transactions, average, profit, payment split)
3. Create 2 charts: bar chart (revenue by product) and line chart (daily trend)
4. Review the dashboard and identify one insight
5. Take one action based on that insight this week

**Time needed:** 1 hour
**Cost:** Free

---

### 📄 PDF Summary: Building Your First Sales Dashboard

> **Key Takeaways:**
>
> - A dashboard shows your 5 key metrics at a glance: revenue, profit, average transaction, top products, customer sources
> - Build it in Google Sheets using SUMIFS, COUNTIFS, and chart functions
> - Add bar charts (products), line charts (trends), and pie charts (categories)
> - Review monthly: compare to previous month, identify one insight, take one action
> - Don't just look at data — use it to make decisions
>
> **Action Step:** Build a dashboard with 5 metrics and 2 charts this week. Review it on the 1st of next month.

---

## Lesson 7.4: Using Data to Set Prices & Predict Demand

**Duration:** 20 minutes | **Type:** Reading

---

Pricing isn't about guessing what customers will pay. It's about understanding your costs, your margins, and your customers' willingness to pay.

### The Cost-Plus Pricing Method

The simplest pricing method:

**Price = Cost + Markup**

**Example:**
- You buy a product for RWF 1,000
- You want a 40% markup
- Price = RWF 1,000 + (RWF 1,000 × 0.40) = RWF 1,400

**How to calculate your markup:**

| Desired Margin | Markup | Formula |
|---|---|---|
| 25% | 33% | Cost ÷ 0.75 |
| 30% | 43% | Cost ÷ 0.70 |
| 40% | 67% | Cost ÷ 0.60 |
| 50% | 100% | Cost ÷ 0.50 |

**Example:** If your cost is RWF 1,000 and you want a 40% margin:
Price = RWF 1,000 ÷ 0.60 = RWF 1,667

### Finding Your Optimal Price

Your optimal price balances two things:
1. **High enough** to cover costs and make profit
2. **Low enough** that customers buy

**The price elasticity test:**
Raise one product's price by 10%. Track sales for 2 weeks.

- If sales drop less than 10%: you had room to raise prices (demand is inelastic)
- If sales drop more than 10%: the price increase was too much (demand is elastic)

### Predicting Demand with Historical Data

Your past sales predict your future sales. Here's how to use that:

**Step 1:** Calculate your weekly average for each product
**Step 2:** Note any patterns (busy days, seasonal trends)
**Step 3:** Order based on predicted demand + safety stock

**Example:**
- Average weekly rice sales: 70 bags
- busiest day: Friday (15 bags, vs. average 10 bags/day)
- Seasonal spike: December (30% more sales)
- Lead time: 3 days

**Order for a normal week:** 70 bags + 20 safety = 90 bags
**Order for December:** 90 × 1.3 = 117 bags
**Order before Friday:** Ensure 15 extra bags are in stock Thursday evening

### The Pricing Review (Monthly)

On the 15th of every month, review your pricing:

1. **Check your margins:** Are any products selling at a loss after all costs?
2. **Check competitor prices:** Are you significantly higher or lower?
3. **Check customer feedback:** Are people complaining about prices?
4. **Check demand trends:** Are any products selling less than last month?

**Adjustments to make:**
- **Raise prices** on products with high demand and low competition
- **Lower prices** on slow-moving products (or discontinue them)
- **Bundle products** to increase average transaction value
- **Create premium options** for customers willing to pay more

---

### ✅ Worked Example: Amahoro Cleaners — Pricing Optimization

Amahoro cleaning service charges flat rates: RWF 15,000 for standard home cleaning, RWF 50,000 for office cleaning.

**Data analysis:**

| Service | Revenue/month | Hours/month | Revenue/hour | Cost/hour | Profit/hour |
|---|---|---|---|---|---|
| Home cleaning | RWF 450,000 | 60 | RWF 7,500 | RWF 4,000 | RWF 3,500 |
| Office cleaning | RWF 500,000 | 25 | RWF 20,000 | RWF 6,000 | RWF 14,000 |

**Insight:** Office cleaning generates RWF 14,000 per hour. Home cleaning generates RWF 3,500 per hour. Office cleaning is 4x more profitable per hour.

**Decision 1:** Raise home cleaning prices by 20% (RWF 15,000 → RWF 18,000)
- Test: track if demand drops over 2 months
- If it doesn't drop significantly, the price increase is permanent

**Decision 2:** Promote office cleaning more aggressively
- Target: companies in Kimihurura and Kacyiru
- Offer: first clean at 20% discount to get in the door

**Decision 3:** Create a premium home cleaning package
- Standard: RWF 18,000 (current service)
- Deep clean: RWF 28,000 (includes oven, windows, fridge)
- Move-in/move-out: RWF 35,000

**After 3 months:**
- Home cleaning revenue up 15% (price increase + premium package)
- Office cleaning up 30% (aggressive marketing)
- Overall profit up 22%

---

### 📝 Your Exercise

1. Calculate profit margin for your top 5 products (Revenue - Cost) ÷ Revenue
2. Check: are any products selling at a loss? If so, raise the price or discontinue
3. Do a price elasticity test: raise one product's price by 10% for 2 weeks
4. Create a pricing review checklist (copy the one from this lesson)
5. Set a monthly reminder: "Pricing review — 15th of each month"

**Time needed:** 1 hour
**Cost:** Free

---

### 📄 PDF Summary: Using Data to Set Prices & Predict Demand

> **Key Takeaways:**
>
> - Price = Cost ÷ (1 - Desired Margin)
> - Test price changes by raising one product 10% and tracking sales for 2 weeks
> - Use historical data to predict demand: weekly averages, day-of-week patterns, seasonal trends
> - Monthly pricing review: check margins, competitors, feedback, and demand trends
> - Focus on profit per hour, not just revenue — some products are more efficient than others
>
> **Action Step:** Calculate margins for your top 5 products. Raise the price of one underpriced product by 10%. Track results for 2 weeks.

---

## Module 7 Quiz

**5 Questions — Passing score: 4/5**

1. **What's more important: revenue or profit margin?**
   - A) Revenue — bigger is always better
   - B) Profit margin — it tells you how much you actually keep
   - C) They're equally important and you should track both
   - D) Neither — cash flow matters most

2. **What does the SUMIF formula do?**
   - A) Adds up all values in a column
   - B) Adds up values that meet a specific condition
   - C) Counts values
   - D) Finds the average

3. **If your cost is RWF 1,000 and you want a 40% margin, what should you charge?**
   - A) RWF 1,400
   - B) RWF 1,667
   - C) RWF 2,000
   - D) RWF 400

4. **What should you do if you raise a product's price by 10% and sales drop by 15%?**
   - A) Keep the price — you're making more per unit
   - B) Lower the price back — demand is too sensitive
   - C) Try raising it by only 5% instead
   - D) Both B and C are reasonable options

5. **How often should you review your pricing?**
   - A) Every day
   - B) Once a year
   - C) Monthly — check margins, competitors, feedback, and demand
   - D) Only when a customer complains

**Answers:** 1-C, 2-B, 3-B, 4-D, 5-C

---

## Certificate Checkpoint: Module 7 Complete

**You've learned:**
- Why data matters more than gut feeling
- How to use Google Sheets for business tracking
- How to build a sales dashboard with key metrics
- How to use data for pricing decisions and demand forecasting

**Certificate:** Complete the quiz with 4/5 correct answers to unlock your Module 7 certificate and proceed to Module 8.
