-- ============================================================
-- Seed: Tech in Business Course
-- Run in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  course_id UUID := uuid_generate_v4();
  l01_id UUID := uuid_generate_v4();
  l02_id UUID := uuid_generate_v4();
  l03_id UUID := uuid_generate_v4();
  l04_id UUID := uuid_generate_v4();
  l05_id UUID := uuid_generate_v4();
  l06_id UUID := uuid_generate_v4();
  l07_id UUID := uuid_generate_v4();
  l08_id UUID := uuid_generate_v4();
  l09_id UUID := uuid_generate_v4();
  l10_id UUID := uuid_generate_v4();
  l11_id UUID := uuid_generate_v4();
  l12_id UUID := uuid_generate_v4();
  l13_id UUID := uuid_generate_v4();
  l14_id UUID := uuid_generate_v4();
  l15_id UUID := uuid_generate_v4();
  l16_id UUID := uuid_generate_v4();
  l17_id UUID := uuid_generate_v4();
  l18_id UUID := uuid_generate_v4();
  l19_id UUID := uuid_generate_v4();
  l20_id UUID := uuid_generate_v4();
  l21_id UUID := uuid_generate_v4();
  l22_id UUID := uuid_generate_v4();
  l23_id UUID := uuid_generate_v4();
  l24_id UUID := uuid_generate_v4();
  l25_id UUID := uuid_generate_v4();
  l26_id UUID := uuid_generate_v4();
  l27_id UUID := uuid_generate_v4();
  l28_id UUID := uuid_generate_v4();
  l29_id UUID := uuid_generate_v4();
  l30_id UUID := uuid_generate_v4();
  l31_id UUID := uuid_generate_v4();
  l32_id UUID := uuid_generate_v4();
  l33_id UUID := uuid_generate_v4();
  l34_id UUID := uuid_generate_v4();
  l35_id UUID := uuid_generate_v4();
  l36_id UUID := uuid_generate_v4();
BEGIN

  INSERT INTO public.courses (id, slug, title, description, icon, level, duration_weeks, is_published, sort_order)
  VALUES (course_id, 'tech-in-business', 'Tech in Business', 'A practical course for Rwandan business owners to use technology to sell smarter, automate tasks, and grow their business.', 'briefcase', 'beginner', 18, true, 20);

  -- MODULE 1: Getting Your Business Online
  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l01_id, course_id, 'Why Every Business Needs a Digital Address', 'Why Every Business Needs a Digital Address', $$**Duration:** 20 minutes | **Type:** Reading

---

Your business already exists. Customers already know you. So why would you need to be "online"?

Because your next customer is searching for you right now — on their phone, in a matatu, during lunch break — and if they can't find you, they'll find someone else.

### The Problem With Being Invisible

Imagine Grace runs a small tailoring shop in Kicukiro. She's been sewing for 12 years. Her customers love her work. But when her existing customers move away or stop coming, Grace has no way to reach new people. She relies entirely on word of mouth and foot traffic.

Now imagine a 25-year-old named David just moved to Kicukiro. He needs a suit altered. He opens Google Maps on his phone and searches "tailor near me." Three results come up — none of them are Grace's shop. David goes to the first result he sees.

Grace lost a customer she never knew existed. Not because her work is bad, but because she has no digital address.

### What a Digital Address Actually Is

A digital address is simply a way for customers to find you online. It doesn't have to be a website. It can be:

- **A Google Business Profile** — shows your shop on Google Maps when people search
- **A social media page** — Instagram, Facebook, or TikTok where people can see your work
- **A WhatsApp Business account** — lets customers message you with a professional profile
- **A simple website** — a one-page site with your address, hours, and what you do

You don't need all of these. You need at least one. The right one depends on your business.

### Which Digital Address Fits Your Business?

| Your Business Type | Best Starting Point | Why |
|---|---|---|
| Shop, restaurant, salon | Google Business Profile | People search "near me" on Maps |
| Service provider (plumber, tutor) | WhatsApp Business | Customers want to message first |
| Creative (photographer, designer) | Instagram | Visual work gets attention |
| Professional (accountant, consultant) | Simple website | Builds credibility and trust |

### The Cost of Doing Nothing

Every month you stay invisible online, you lose customers to competitors who are visible. In Kigali alone, there are over 200 new businesses registered every month. Many of them are setting up Google Business Profiles this week.

The good news: setting up a Google Business Profile takes 20 minutes and costs nothing. That's your first action step.

### What You'll Learn in This Module

Over the next four lessons, you'll:

1. **Set up a Google Business Profile** so people find you on Maps
2. **Create a simple website** without writing any code
3. **Build a social media presence** that actually brings in customers
4. **Put it all together** with a checklist you can complete in one weekend

No technical background required. If you can send a WhatsApp message, you can do this.

---

### ✅ Worked Example: Grace's Tailoring Shop

Grace has been running her tailoring shop in Kicukiro for 12 years. She has no online presence — no Google listing, no social media, no website.

**Step 1: Create a Google Business Profile (10 minutes)**

1. Go to [google.com/business](https://google.com/business) on your phone or computer
2. Click "Manage now" and sign in with any Google account (Gmail)
3. Enter your business name: "Grace's Tailoring — Kicukiro"
4. Choose "Storefront" since customers visit your shop
5. Enter your address: Street, Sector, District, Kigali
6. Add your phone number (use your WhatsApp number)
7. Set your business hours
8. Choose your category: "Tailor" or "Clothing alteration service"
9. Click "Finish" — Google will send a postcard with a verification code (arrives in 5-14 days)

**Step 2: Add photos immediately (5 minutes)**

Even before verification, upload:
- A photo of your shop front (so people recognize it)
- 3-5 photos of your best work (suits, dresses, alterations)
- A photo of you working (people trust faces)

**Result:** Within a week of verification, when someone in Kicukiro searches "tailor near me," Grace's shop appears on Google Maps with photos, hours, and a phone number. David finds her and walks in.

---

### 📝 Your Exercise

1. Open [google.com/business](https://google.com/business) on your phone
2. Search for your business name — does it already exist? (Sometimes customers leave reviews for businesses that haven't claimed their profile yet)
3. If it exists, claim it. If not, create a new listing
4. Upload at least 3 photos before you close the page
5. Write down the verification code arrival date in your calendar

**Time needed:** 20 minutes
**Cost:** Free

---

### 📄 PDF Summary: Why Every Business Needs a Digital Address

> **Key Takeaways:**
>
> - A digital address = a way for customers to find you online
> - You don't need a website to start — Google Business Profile is free and takes 20 minutes
> - Every month without an online presence, you lose customers to competitors who have one
> - At minimum, set up one of: Google Business Profile, WhatsApp Business, Instagram, or a simple website
>
> **Action Step:** Create a Google Business Profile today at google.com/business. Upload 3 photos. Write down when your verification postcard arrives.

---$$, 'reading', 20, 1, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l02_id, course_id, 'Google Business Profile — Your Free Shopfront', 'Google Business Profile — Your Free Shopfront', $$**Duration:** 25 minutes | **Type:** Reading

---

In Lesson 1.1, you created your Google Business Profile. Now let's make it work for you. A half-filled profile is almost worse than no profile — it looks unprofessional and gives people a reason to skip you.

### Completing Your Profile (The Non-Negotiable Parts)

Google ranks complete profiles higher in search results. Here's what you must fill in:

**Business Name:** Use your real business name. Don't stuff keywords. "Grace's Tailoring" beats "Best Tailor Kigali Sewing Alterations Cheap Prices."

**Address:** Be precise. Include plot number, street, sector, and district. If you work from home and don't want your home address public, you can set a service area instead.

**Phone Number:** Use a number that's always on. If you have WhatsApp on this number, even better — customers can message you directly from your Google listing.

**Hours:** Set accurate hours. If you close for lunch (1-2pm), mark it. Nothing frustrates a customer more than showing up to a closed shop.

**Category:** Choose the most specific category available. "Restaurant" is okay. "Noodle restaurant" or "Fish and chips restaurant" is better. Google uses this to show you to the right searches.

**Description:** Write 2-3 sentences about what you do, who you serve, and what makes you different. No jargon. Example:

> "Grace's Tailoring has been fitting Kigali's professionals for 12 years. We specialize in men's suits, women's office wear, and wedding attire. Walk-ins welcome, appointments preferred for complex alterations."

### Photos That Bring Customers In

Google says businesses with photos receive 42% more direction requests and 35% more website clicks. Here's what to upload:

**Must-have photos:**
- **Exterior (2-3):** So customers can recognize your shop from the street. Shoot from across the road.
- **Interior (2-3):** Show your space is clean and welcoming.
- **Products/Work (5-10):** Your best work, your most popular items, your signature dishes.
- **Team (1-2):** Faces build trust. A photo of you or your team smiling.

**Photo tips for phone cameras:**
- Shoot in natural light (near a window or outside)
- Hold the phone horizontally for landscape shots
- Clean your lens before shooting (seriously — it makes a difference)
- No filters. Authentic beats polished.

**What NOT to upload:**
- Screenshots of your WhatsApp
- Blurry photos
- Photos with other people's branding visible
- Stock photos from the internet

### Getting (and Responding to) Reviews

Reviews are the most powerful tool on Google Business Profile. Here's the honest truth: people trust reviews from strangers more than they trust your marketing.

**How to ask for reviews:**

1. After a good service, ask in person: "If you're happy with the work, I'd really appreciate a Google review. It helps other people find me."
2. Share your review link: In your Google Business Profile dashboard, click "Ask for reviews" and copy the link. Send it via WhatsApp.
3. Make it easy: The link goes directly to the review form. No searching required.

**How to respond to reviews (do this for every review):**

- **Positive review:** "Thank you so much, [Name]! It was a pleasure working with you. Come back anytime." (Short, warm, personal.)
- **Negative review:** "I'm sorry about your experience, [Name]. I want to make this right. Please message me at [phone number] so we can resolve this." (Never argue publicly. Always offer to take it offline.)

**Target:** Get your first 5 reviews within 30 days of verification. Ask your best customers first — they're your easiest wins.

### Google Posts: Free Marketing You're Not Using

Google Business Profile lets you publish short posts — like social media, but directly on your Google listing. Most businesses don't use this. You should.

**What to post:**
- Weekly specials or promotions
- New products or services
- Event announcements (sale days, workshops)
- Tips related to your industry

**Example post for Grace's Tailoring:**
> **Title:** Wedding Season Special
> **Body:** Getting married this year? Book your suit or dress fitting this month and get 10% off. Walk-ins welcome, appointments preferred.
> **Button:** Call now

**Frequency:** Post once a week minimum. Google rewards active profiles with better rankings.

### Insights: What Your Profile Data Tells You

Google Business Profile shows you free analytics. Check these monthly:

- **How many people found you** (searches and views)
- **What they did next** (called you, asked for directions, visited your website)
- **What they searched** (the exact words people used to find you)
- **Where they came from** (Google Search vs. Google Maps)

If you see "direction requests" going up, your photos and address are working. If you see "calls" going up, your phone number placement is working. If you see the search terms people use, you know what to emphasize in your description.

---

### ✅ Worked Example: Simba Grill — Complete Profile Walkthrough

Simba Grill is a small restaurant in Remera, Kigali. The owner, Patrick, set up a Google Business Profile but left most fields empty. Here's how we fix it:

**Before (incomplete):**
- Business name: "Simba Grill"
- No photos
- Hours: blank
- Description: blank
- Category: "Restaurant"

**After (complete):**
- Business name: "Simba Grill — Grilled Chicken & Fish"
- Photos: 8 (exterior from Kimironko Road, interior showing seating, 5 food photos of signature dishes, 1 team photo)
- Hours: Mon-Sat 11am-10pm, Sunday 12pm-9pm
- Description: "Simba Grill has been serving Kigali's best grilled chicken and tilapia since 2018. Our signature is the Simba Platter — half chicken with ugali, fries, and kachumbari. Dine-in, takeaway, and delivery via Glovo."
- Category: "Grill restaurant"
- Reviews: Patrick asked his 20 best customers. He now has 14 five-star reviews with personal responses to each.

**Result:** Simba Grill now appears in the top 3 when someone searches "grilled chicken Remera" or "best restaurant near me Kigali." Patrick gets 5-8 calls per week from Google alone.

---

### 📝 Your Exercise

1. Open your Google Business Profile dashboard
2. Go through each section and fill in everything you left blank:
   - [ ] Complete business description (2-3 sentences)
   - [ ] Set accurate hours (including holidays)
   - [ ] Upload 8+ photos (exterior, interior, products, team)
   - [ ] Choose the most specific category
3. Ask 3 customers today for a review (send them your review link)
4. Write and publish your first Google Post (a special, new product, or tip)
5. Set a calendar reminder to check your Insights on the 1st of every month

**Time needed:** 45 minutes
**Cost:** Free

---

### 📄 PDF Summary: Google Business Profile — Your Free Shopfront

> **Key Takeaways:**
>
> - Complete profiles rank higher in Google searches — fill in every field
> - Upload 8+ quality photos: exterior, interior, products/work, team
> - Ask for reviews systematically — target 5 reviews in your first 30 days
> - Respond to every review (positive and negative) within 24 hours
> - Post weekly updates (promotions, new products, tips) to stay active
> - Check Insights monthly to understand what's working
>
> **Action Step:** Complete your profile today. Ask 3 customers for reviews. Publish your first Google Post.

---$$, 'reading', 25, 2, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l03_id, course_id, 'Building Your First Website (No Code Required)', 'Building Your First Website (No Code Required)', $$**Duration:** 30 minutes | **Type:** Reading

---

You don't need to learn programming to have a website. In 2026, website builders let you create a professional site by dragging and dropping elements. The hard part isn't building the site — it's knowing what to put on it.

### Do You Actually Need a Website?

Before we build anything, let's be honest: not every business needs a website. You need a website if:

- You sell products online (e-commerce)
- Customers need to book appointments
- You want to appear professional to clients or investors
- You need a portfolio to showcase your work
- Your business serves customers across multiple locations

You probably don't need a website yet if:
- You're a sole trader with steady local customers
- Your Google Business Profile and WhatsApp are working well
- You're just starting out and revenue is under RWF 500,000/month

If you're in the second group, focus on making your Google Business Profile excellent first. Come back to this lesson when you're ready.

### Choosing a Website Builder

Three options that work well in Rwanda:

| Builder | Best For | Cost | Difficulty |
|---|---|---|---|
| **Google Sites** | Simple one-page sites | Free | Very easy |
| **WordPress.com** | Blogs and content sites | Free basic, RWF 15,000/mo for premium | Medium |
| **Wix** | Small business sites | Free basic, RWF 20,000/mo for premium | Easy |
| **Shopify** | Online stores | RWF 35,000/mo | Medium |

**Our recommendation for most Rwandan small businesses:** Start with Google Sites (free, fast) or Wix (more design options).

### The Only Pages a Small Business Website Needs

Don't overcomplicate this. A small business website needs four pages maximum:

1. **Home** — What you do, who you serve, one call-to-action ("Call Now" or "Order on WhatsApp")
2. **About** — Your story, your experience, why people should trust you
3. **Services/Menu** — What you offer with prices (or "Contact for pricing")
4. **Contact** — Phone, WhatsApp link, email, address with map, hours

That's it. Four pages. Everything else is optional.

### Writing Website Copy That Converts

Most business websites fail because they talk about themselves instead of the customer. Fix this by flipping your language.

**Bad (business-focused):**
> "We are a leading provider of quality tailoring services with over 12 years of experience in the industry."

**Good (customer-focused):**
> "Need a suit that fits perfectly? Bring your fabric — we'll handle the rest. Walk-ins welcome, same-day alterations available."

The formula: **What the customer wants → What you do → What they should do next.**

### Adding a WhatsApp Button

This is the single most important element on a Rwandan business website. Most of your customers are more comfortable texting than calling.

On Wix or Google Sites, you can add a button that opens WhatsApp with a pre-written message:

**WhatsApp link format:**
```
https://wa.me/250788123456?text=Hello%2C%20I%20saw%20your%20website%20and%20I%27m%20interested%20in%20your%20services.
```

Replace `250788123456` with your phone number (include country code, no spaces or dashes). The text after `?text=` is pre-filled when they click.

**Where to put it:** Bottom-right corner of every page (floating button), and in your header next to your phone number.

### Mobile-First: Why Your Phone Is Your Website's Test

80% of your visitors will see your website on a phone. Before you publish, open your site on your own phone and ask:

- Can I read the text without zooming?
- Can I tap the buttons with my thumb?
- Does the WhatsApp button work?
- Do photos load in under 3 seconds?
- Is my phone number clickable (tap to call)?

If any answer is no, fix it before you share your site with anyone.

---

### ✅ Worked Example: Amahoro Cleaners — Building a One-Page Site

Jean runs a cleaning service in Kimironko. He has 5 staff and serves homes and offices. He wants a website to look professional when he sends proposals to companies.

**Platform:** Google Sites (free)

**Page structure:** Single page (one-page site)

**Content:**

**Header:**
- Business name: "Amahoro Cleaners"
- Tagline: "Professional cleaning for homes and offices in Kigali"
- Phone number (clickable): +250 788 123 456
- WhatsApp button

**Section 1 — Hero:**
> "Your space, spotless. We handle the cleaning so you can focus on what matters."
> Button: "Get a Free Quote" (links to WhatsApp)

**Section 2 — Services:**
> - Home cleaning — from RWF 15,000
> - Office cleaning — from RWF 50,000
> - Deep cleaning — from RWF 30,000
> - Post-construction cleanup — quote required

**Section 3 — Why Us:**
> - 5 years of experience
> - 200+ homes and offices served
> - All staff trained and insured
> - Eco-friendly products available

**Section 4 — Contact:**
> Phone: +250 788 123 456
> WhatsApp: [Button]
> Hours: Mon-Sat 7am-6pm
> Service area: Kigali city

**Time to build:** 45 minutes
**Cost:** RWF 0

**Result:** Jean now includes his website link in every email proposal. His close rate increased from 30% to 55% because clients trust him more after seeing a professional site.

---

### 📝 Your Exercise

1. Choose a platform (Google Sites for free, Wix for more design)
2. Register your account
3. Create a single page with these sections:
   - [ ] Hero: What you do in one sentence + WhatsApp button
   - [ ] Services: 3-5 things you offer with prices (or "Contact for pricing")
   - [ ] Trust signals: Years in business, number of customers, certifications
   - [ ] Contact: Phone, WhatsApp, hours, address
4. Add a WhatsApp floating button
5. Test on your phone — can you read everything? Do all buttons work?
6. Share the link with 3 customers and ask for feedback

**Time needed:** 1 hour
**Cost:** Free (Google Sites) or RWF 0-20,000/month (Wix)

---

### 📄 PDF Summary: Building Your First Website

> **Key Takeaways:**
>
> - Not every business needs a website yet — a strong Google Business Profile might be enough
> - If you do need one, keep it simple: Home, About, Services, Contact
> - Write copy that talks about what the customer wants, not what you do
> - Add a WhatsApp button — it's the most important element on a Rwandan business website
> - 80% of visitors view on phones — test everything on your own phone first
> - Start with Google Sites (free) before paying for a premium builder
>
> **Action Step:** Build a single-page website today using Google Sites. Add your services, WhatsApp button, and contact info. Share the link with 3 people.

---$$, 'reading', 30, 3, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l04_id, course_id, 'Social Media That Actually Brings Customers', 'Social Media That Actually Brings Customers', $$**Duration:** 25 minutes | **Type:** Reading

---

Most small businesses post randomly on social media and wonder why it doesn't bring customers. The problem isn't posting — it's posting without a strategy.

Social media for business isn't about going viral. It's about showing up consistently so that when someone needs what you sell, they think of you first.

### Picking the Right Platform (You Don't Need All of Them)

Each platform serves a different purpose:

**Instagram** — Best for visual businesses (food, fashion, beauty, design, photography). People discover you through hashtags and Reels.

**Facebook** — Best for community and older demographics (30+). Groups, events, and Marketplace are powerful for local businesses.

**TikTok** — Best for reaching younger audiences (18-35). Short videos, trends, and behind-the-scenes content. High reach potential.

**LinkedIn** — Best for B2B services (consulting, accounting, legal, tech). Professional credibility and networking.

**WhatsApp Business** — Not traditional social media, but it's where Rwandan customers prefer to communicate. Your broadcast lists and status updates are marketing tools.

**Rule:** Pick ONE platform and do it well. Once you're consistent there, add a second.

### The Content That Actually Works

Forget "engagement hacks" and "algorithm tricks." The content that brings customers follows one rule: **be useful.**

**The 4 content types that work for small businesses:**

1. **Show your work** — Photos and videos of what you do. Food you cooked. Hair you styled. Clothes you tailored. Buildings you cleaned. This is your portfolio.

2. **Educate your customer** — Teach them something related to your business. A restaurant posts a recipe. A tailor posts fabric care tips. A cleaner shares cleaning hacks. This builds trust and expertise.

3. **Social proof** — Customer testimonials, before/after photos, review screenshots, delivery photos. Other people's words are more powerful than yours.

4. **Behind the scenes** — Show your process. How you choose ingredients. How you train your team. How you pack orders. This builds connection.

**The 1 content type that wastes your time:**
- Memes and trending content unrelated to your business. It gets likes but doesn't bring customers.

### Posting Schedule: Quality Over Quantity

You don't need to post every day. You need to post consistently.

**Minimum viable schedule:**
- **3 posts per week** on your main platform
- **1 Story/Status per day** (WhatsApp Status, Instagram Stories, Facebook Stories)
- **Respond to every comment and message** within 2 hours

**Best times to post in Rwanda:**
- Morning: 7am-9am (people checking phones on commute)
- Lunch: 12pm-1pm
- Evening: 7pm-9pm (people relaxing after work)

### Hashtags That Bring Local Customers

Hashtags help people find you. But random hashtags bring random people. You want local, specific hashtags.

**Formula:** `[Your Industry] + [Your Location]`

**Good hashtags for a Kigali restaurant:**
- #KigaliFood #KigaliEats #KigaliRestaurant #RwandaFood #KigaliDining #RemeraFood

**Bad hashtags:**
- #Food (too broad — you'll be competing with millions of posts)
- #InstaFood #Yummy #Delicious (doesn't bring local customers)

**Research tip:** Search your industry + location on Instagram. See what hashtags similar businesses use. Copy the ones that have 1,000-50,000 posts (enough people search them, not so many you disappear).

### WhatsApp Status as a Marketing Channel

WhatsApp Status is the most underused marketing tool in Rwanda. Everyone checks Status. It disappears after 24 hours. It's free.

**How to use WhatsApp Status for business:**
- Post 2-3 times per day
- Share product photos, behind-the-scenes videos, customer reviews
- Use it for flash sales ("Today only: 20% off all dresses")
- Share customer testimonials (screenshot their WhatsApp praise, with permission)

**Pro tip:** Pin your best Status as your WhatsApp Business catalog. New customers who visit your profile see your best work first.

### Measuring What Matters

Stop counting followers. Start counting:

- **Messages received** — Are people contacting you from social media?
- **Website clicks** — Are people visiting your site from your bio link?
- **In-store mentions** — Are new customers saying "I saw you on Instagram"?
- **Saves and shares** — These matter more than likes (they signal intent to buy)

**Track this for 30 days:** Every new customer, ask "How did you find us?" Write it down. This tells you which platform is actually working.

---

### ✅ Worked Example: Inema Café — Instagram Strategy

Inema Café is a small coffee shop in Kimihurura. The owner, Alice, posts randomly — sometimes a photo of coffee, sometimes a meme, sometimes nothing for two weeks. She has 400 followers and no measurable sales from Instagram.

**The fix — a simple 3-day content calendar:**

**Monday (Show your work):**
- Post: Photo of today's special latte art
- Caption: "Monday mornings call for a double espresso. Our house blend is sourced from Nyungwe. Come try it. 📍 Kimihurura"
- Hashtags: #KigaliCoffee #Kimihurura #RwandaCoffee #KigaliCafe

**Wednesday (Educate):**
- Reel: 30-second video showing how they make their signature drink
- Caption: "Ever wondered how we make the Inema Special? It's our take on a vanilla oat latte with Rwandan vanilla. Recipe in the caption:"
- Hashtags: #CoffeeLover #KigaliFood #BaristaLife

**Friday (Social proof):**
- Post: Screenshot of a customer's WhatsApp review (with permission)
- Caption: "'Best coffee in Kigali, no contest.' — @customer_name. Thank you! 🙏"
- Hashtags: #KigaliCafe #CoffeeReview #RwandaFood

**Daily (Stories/Status):**
- Morning: Photo of the shop opening, "Good morning! We're open."
- Afternoon: Short video of the team working
- Evening: "Sold out of [item]. See you tomorrow!"

**After 30 days:** Alice's follower count went from 400 to 680. More importantly, she tracked 12 new customers who said "I saw you on Instagram." At RWF 5,000 average spend per visit, that's RWF 60,000 in new revenue from a free marketing channel.

---

### 📝 Your Exercise

1. Choose ONE platform (Instagram, Facebook, or TikTok)
2. Set up a business account (not personal) — it's free and gives you analytics
3. Write a bio that says: [What you do] + [Where you are] + [What to do next]
   - Example: "Custom tailoring in Kigali 📍Kicukiro | DM or WhatsApp to book 📱+250788..."
4. Post your first 3 pieces of content this week:
   - [ ] A photo of your best work (product, food, space)
   - [ ] An educational tip related to your business
   - [ ] A customer review or testimonial
5. Set up 5 hashtags using the formula: [Industry] + [Location]
6. Track how many people mention finding you on social media this week

**Time needed:** 30 minutes to set up, 20 minutes per post
**Cost:** Free

---

### 📄 PDF Summary: Social Media That Brings Customers

> **Key Takeaways:**
>
> - Pick ONE platform and do it well before adding others
> - Post content that's useful: show your work, educate, share social proof, show behind-the-scenes
> - Post 3 times per week minimum, respond to messages within 2 hours
> - Use local hashtags: [Industry] + [Location] (e.g., #KigaliFood)
> - WhatsApp Status is free marketing — post 2-3 times daily
> - Measure success by customers brought, not followers gained
>
> **Action Step:** Set up a business account on one platform. Post 3 times this week using the content calendar. Track where your next customer came from.

---$$, 'reading', 25, 4, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l05_id, course_id, 'Your Digital Presence Checklist', 'Your Digital Presence Checklist', $$**Duration:** 15 minutes | **Type:** Reading

---

You've learned the fundamentals. Now let's make sure you actually do them. This lesson is a checklist — go through each item and check it off. Everything here should take one weekend.

### Saturday Morning: Google Business Profile (1 hour)

- [ ] Claim or create your Google Business Profile at google.com/business
- [ ] Fill in EVERY field: name, address, phone, hours, category, description
- [ ] Upload 8+ photos (exterior, interior, products/work, team)
- [ ] Ask 3 customers for Google reviews (send them your review link)
- [ ] Write and publish your first Google Post

### Saturday Afternoon: Website (1-2 hours)

- [ ] Choose a platform: Google Sites (free), Wix (more options), or WordPress
- [ ] Create a single page with:
  - [ ] Hero section: What you do + call-to-action
  - [ ] Services/Menu: 3-5 offerings with prices
  - [ ] Trust section: Years in business, number of customers served
  - [ ] Contact section: Phone, WhatsApp link, hours, address
- [ ] Add a WhatsApp floating button
- [ ] Test on your phone — read everything, tap every button
- [ ] Share the link with 3 people for feedback

### Sunday Morning: Social Media (1 hour)

- [ ] Choose ONE platform: Instagram, Facebook, or TikTok
- [ ] Set up a business account (not personal)
- [ ] Write a clear bio: [What you do] + [Where] + [What to do next]
- [ ] Post your first 3 pieces of content:
  - [ ] Your best work (photo)
  - [ ] An educational tip
  - [ ] A customer review or testimonial
- [ ] Create 5 hashtags using [Industry] + [Location]
- [ ] Set up WhatsApp Business with your catalog and hours

### Sunday Afternoon: Connect Everything (30 minutes)

- [ ] Add your website link to your social media bio
- [ ] Add your social media links to your website
- [ ] Add your Google Business Profile link to your website contact section
- [ ] Add your WhatsApp number to your Google Business Profile
- [ ] Add your website to your Google Business Profile
- [ ] Set a calendar reminder: "Check digital presence" on the 1st of every month

### The Monthly Maintenance Routine (15 minutes/month)

On the 1st of every month:

1. Check Google Business Profile Insights — are views going up?
2. Read and respond to any new reviews
3. Publish 1 new Google Post
4. Post 3 times on your social media this week
5. Check your website — is everything current? Any broken links?

### What's Next

You now have a digital presence. In Module 2, we'll teach you how to use technology to sell smarter — with point-of-sale tools and inventory tracking that prevent you from running out of stock or losing track of money.

---

### ✅ Worked Example: Mama Nkechi's Shop — Full Weekend Setup

Nkechi runs a small provision shop in Gikondo. She has no online presence at all. Here's her weekend:

**Saturday 8am-9am:**
- Creates Google Business Profile: "Mama Nkechi's Shop — Provisions & Household"
- Adds address, phone, hours (Mon-Sat 7am-8pm, Sun 8am-5pm)
- Category: "Grocery store"
- Uploads 5 photos: shop front, interior, shelves, products, her smiling behind the counter

**Saturday 9am-9:30am:**
- Asks 5 regular customers for reviews via WhatsApp: "Hi! If you're happy with my shop, I'd really appreciate a quick Google review. Here's the link: [review link]. Thank you!"

**Saturday 2pm-3:30pm:**
- Builds a one-page site on Google Sites
- Sections: "Your Neighborhood Shop" (hero), "What We Stock" (list of categories), "Visit Us" (address with map, hours, phone), WhatsApp button

**Sunday 10am-11am:**
- Sets up Instagram: @mamankechishop
- Bio: "Provisions & household goods 📍Gikondo, Kigali | Open Mon-Sat 7am-8pm | WhatsApp to order 📱"
- Posts 3 photos: shop display, new products, customer smiling with shopping bag

**Sunday 11am-11:30am:**
- Links everything: Instagram bio → website, website → Google listing, Google listing → WhatsApp

**Result after 2 weeks:**
- 3 Google reviews (all 5 stars)
- 45 Instagram followers
- 8 WhatsApp messages from new customers who found her on Google Maps
- She's now visible to every person in Gikondo who searches "shop near me"

---

### 📝 Your Exercise

Use the checklist above. Block out your Saturday and Sunday. Complete every item. Take photos of your progress and share them in the course community.

**Time needed:** 4-5 hours over a weekend
**Cost:** Free

---

### 📄 PDF Summary: Your Digital Presence Checklist

> **Key Takeaways:**
>
> - A complete digital presence takes one weekend to set up
> - Start with Google Business Profile (Saturday morning)
> - Build a simple website (Saturday afternoon)
> - Set up social media (Sunday morning)
> - Connect everything together (Sunday afternoon)
> - Maintain with a 15-minute monthly routine
>
> **Action Step:** Block this weekend. Follow the checklist. By Sunday evening, your business will be findable online.

---

## Module 1 Quiz

**5 Questions — Passing score: 4/5**

1. **What is a "digital address" for a business?**
   - A) A website URL
   - B) A way for customers to find you online (Google listing, social media, WhatsApp, or website)
   - C) An email address
   - D) A social media username

2. **Which platform should most Rwandan small businesses set up first?**
   - A) TikTok
   - B) LinkedIn
   - C) Google Business Profile
   - D) Shopify

3. **How many pages does a small business website need?**
   - A) At least 10
   - B) 4 (Home, About, Services, Contact)
   - C) It depends on the business, but usually 4 is enough
   - D) None — social media is enough

4. **What's the most important element on a Rwandan business website?**
   - A) A photo gallery
   - B) A WhatsApp button
   - C) A blog
   - D) An email signup form

5. **How often should you post on your main social media platform?**
   - A) Every hour
   - B) Once a month
   - C) At least 3 times per week, plus daily Stories/Status
   - D) Only when you have something to sell

**Answers:** 1-B, 2-C, 3-C, 4-B, 5-C

---

## Certificate Checkpoint: Module 1 Complete

**You've learned:**
- Why digital presence matters and what a digital address is
- How to set up and optimize a Google Business Profile
- How to build a simple website without code
- How to use social media strategically to bring in customers
- A complete checklist to set up your digital presence in one weekend

**Certificate:** Complete the quiz with 4/5 correct answers to unlock your Module 1 certificate and proceed to Module 2.

---

*🔒 Modules 2-9 are part of the premium Tech in Business course. Complete Module 1 and upgrade to continue learning.*$$, 'reading', 15, 5, true);


  -- MODULE 2: Selling Smarter with POS & Inventory
  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l06_id, course_id, 'Moving Beyond Paper Receipts', 'Moving Beyond Paper Receipts', $$**Duration:** 25 minutes | **Type:** Reading

---

You made a sale. You wrote it in a notebook. At the end of the day, you try to remember how much you sold. By the end of the week, the numbers don't add up. You know you made money, but you're not sure exactly how much — or where it went.

This is how most small businesses in Rwanda track their sales. And it's costing you money.

### The Hidden Cost of Manual Tracking

When you write sales in a notebook, three things go wrong:

**1. You lose track of what's sold.**
Without knowing exactly what sold and what's left, you either run out of popular items (lost sales) or overstock slow items (dead money sitting on shelves).

**2. You can't see your real profit.**
You know you sold RWF 500,000 this week. But how much did those goods cost you? Without tracking cost of goods, you're guessing at your profit margin.

**3. You miss patterns.**
Which day is your busiest? Which product is most popular? Which hours are slow? Without data, you're making decisions based on gut feeling instead of facts.

A point-of-sale (POS) system solves all three problems. And it doesn't have to cost you anything.

### What a POS System Actually Does

A POS system does three things:

1. **Records each sale** — what was sold, for how much, when, and to whom
2. **Tracks your inventory** — what's in stock, what's running low, what's expired
3. **Generates reports** — daily sales, weekly totals, best-selling items, profit margins

Think of it as a digital version of your notebook — but one that never loses data, never makes math errors, and can show you trends you'd never spot by hand.

### Free vs. Paid POS Options

| Tool | Best For | Cost | Inventory Tracking |
|---|---|---|---|
| **Google Sheets** | Very small shops | Free | Manual but works |
| **Square POS** | Shops and restaurants | Free (1.6% per transaction) | Built-in |
| **Lipa Na M-PESA Online** | M-PESA businesses | Free | Basic |
| **Tally** | Freelancers and services | Free | Limited |
| **Odoo** | Growing businesses | Free basic, paid advanced | Full |
| **Lightspeed** | Restaurants and retail | RWF 30,000+/mo | Full |

**For most Rwandan small businesses:** Start with Google Sheets (if you're very small) or Square POS (if you process card payments). Both are free.

### The Minimum Viable Tracking System

If you're not ready for a POS system yet, start with this Google Sheets setup today:

**Sheet 1: Daily Sales**

| Date | Product | Quantity | Unit Price | Total | Payment Method | Customer |
|---|---|---|---|---|---|---|
| 2026-09-01 | White rice (kg) | 5 | 2,500 | 12,500 | MTN MoMo | Walk-in |
| 2026-09-01 | Cooking oil (L) | 3 | 4,000 | 12,000 | Cash | Regular customer |

**Sheet 2: Inventory**

| Product | Starting Stock | Received | Sold | Remaining | Cost Price | Selling Price | Reorder Level |
|---|---|---|---|---|---|---|---|
| White rice (kg) | 50 | 0 | 5 | 45 | 1,800 | 2,500 | 10 |
| Cooking oil (L) | 20 | 0 | 3 | 17 | 3,000 | 4,000 | 5 |

**Sheet 3: Daily Summary**

| Date | Total Sales | Total Cost | Profit | Cash | Mobile Money | Outstanding |
|---|---|---|---|---|---|---|
| 2026-09-01 | 24,500 | 15,000 | 9,500 | 12,000 | 12,500 | 0 |

This takes 5 minutes to fill in at the end of each day. In Module 7, you'll learn how to turn these sheets into dashboards that show you trends automatically.

### Making the Transition

If you currently use a notebook, don't throw it away. Run both systems for two weeks:

1. **Week 1:** Write in your notebook AND enter into Google Sheets/POS at the end of each day
2. **Week 2:** Only use the digital system, but check your notebook at the end of each day to catch anything you missed
3. **Week 3:** Go fully digital

This gradual transition prevents you from losing data during the switch.

---

### ✅ Worked Example: Patrice's Provision Shop — From Notebook to Sheets

Patrice runs a provision shop in Nyamirambo. He sells groceries, cleaning supplies, and household items. He has about 80 different products. His current system: a notebook where he writes daily sales.

**The problem:** At the end of each month, Patrice knows his total revenue but has no idea which products are most profitable. He suspects some items are selling at a loss after transport costs, but he can't prove it.

**Week 1 setup:**

Patrice creates three Google Sheets on his phone (using the Google Sheets app):

**Sheet 1 — Daily Sales:** He records every sale as it happens. Instead of writing in his notebook, he opens Google Sheets and adds a row. This takes 30 seconds per sale.

**Sheet 2 — Inventory:** He counts all his products and enters the starting stock. He updates this sheet when stock arrives and when he notices items running low.

**Sheet 3 — Daily Summary:** At closing time (8pm), he totals the day: total sales, total cost, profit, payment methods.

**After 2 weeks, Patrice discovers:**
- Cooking oil is his best-selling product by revenue (RWF 180,000/month)
- But rice has the highest profit margin (40% vs. 25% for cooking oil)
- Wednesdays are his busiest day — he should ensure full stock on Tuesday evenings
- He's been selling matches at a loss (cost RWF 200, sells for RWF 250, but transport is RWF 80 per box) — he raises the price to RWF 350

**Result:** In his first month of tracking, Patrice increased profit by RWF 45,000 — not by selling more, but by making smarter decisions about pricing and stocking.

---

### 📝 Your Exercise

1. Create a Google Sheet with three tabs: "Daily Sales," "Inventory," "Daily Summary"
2. Use the templates from this lesson (copy the column headers)
3. Count your current inventory and enter it into the Inventory sheet
4. For the next 7 days, record every sale in the Daily Sales sheet
5. At the end of each day, fill in the Daily Summary
6. After 7 days, review: What's your best-selling product? What's your most profitable? What day is busiest?

**Time needed:** 30 minutes to set up, 5 minutes per day to maintain
**Cost:** Free

---

### 📄 PDF Summary: Moving Beyond Paper Receipts

> **Key Takeaways:**
>
> - Manual tracking costs you money through lost inventory data and pricing mistakes
> - A POS system records sales, tracks inventory, and generates reports
> - Start with Google Sheets if you're small — three tabs: Daily Sales, Inventory, Daily Summary
> - Run both systems (notebook + digital) for 2 weeks during the transition
> - Even basic tracking reveals pricing mistakes and stocking patterns you'd never spot by hand
>
> **Action Step:** Create the three Google Sheets today. Count your inventory. Start recording every sale digitally.

---$$, 'reading', 25, 1, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l07_id, course_id, 'Choosing the Right POS Tool', 'Choosing the Right POS Tool', $$**Duration:** 30 minutes | **Type:** Reading

---

In Lesson 2.1, you learned why tracking sales matters. Now let's pick the right tool for your specific business.

### The Three Types of POS

**Type 1: Mobile POS (mPOS)**
Runs on your phone or tablet. Best for: small shops, market vendors, food trucks, service providers who visit customers.

Examples: Square POS, Tally, Lipa Na M-PESA Online

**Type 2: Terminal POS**
A dedicated screen and card reader on your counter. Best for: restaurants, retail stores with consistent locations.

Examples: Square Terminal, Lightspeed, Odoo POS

**Type 3: Cloud-Based POS**
Runs in your browser, accessible from any device. Best for: businesses with multiple locations or that need remote access.

Examples: Odoo, Zoho Commerce, Shopify POS

### What to Look For (The Checklist)

Before choosing a POS, answer these questions:

**Payment methods you accept:**
- [ ] Cash → Almost any POS works
- [ ] M-PESA → Need Lipa Na M-PESA Online or a POS that integrates with it
- [ ] Cards (Visa/Mastercard) → Need Square or a card-enabled terminal
- [ ] QR codes → Some POS systems support this natively

**Your inventory size:**
- [ ] Under 50 products → Google Sheets or basic POS is fine
- [ ] 50-500 products → Need a POS with inventory tracking
- [ ] 500+ products → Need a full inventory management system

**Your team:**
- [ ] Just you → Any tool works
- [ ] 2-5 staff → Need user accounts and permissions
- [ ] 5+ staff → Need detailed reporting per staff member

**Your budget:**
- [ ] RWF 0 → Google Sheets, Square POS (free), or Tally (free)
- [ ] RWF 10,000-30,000/month → Odoo, Zoho
- [ ] RWF 30,000+/month → Lightspeed, Shopify

### Setting Up Square POS (Free Option)

Square POS is free to use and charges 1.6% per card transaction. Here's how to set it up:

**Step 1: Download and register**
1. Download "Square Point of Sale" from Google Play or App Store
2. Create an account with your email
3. Enter your business details

**Step 2: Add your products**
1. Go to Items → Create Item
2. Add name, price, description, photo (optional)
3. Organize into categories (e.g., "Beverages," "Snacks," "Household")

**Step 3: Set up payment methods**
1. Go to Settings → Payments
2. Enable Cash (free)
3. Enable Card (Square Reader costs RWF 25,000 one-time, or use tap-to-phone on compatible Android phones)

**Step 4: Start selling**
1. Open the app → tap items to add to cart
2. Tap "Charge" → select payment method
3. Receipt sent automatically via email/SMS (or skip for cash sales)

### Setting Up Google Sheets POS (Zero Cost)

If you're not ready for a dedicated POS app, this Google Sheets template works:

1. Open Google Sheets on your phone
2. Create a new sheet called "POS — [Date]"
3. Columns: Item | Quantity | Price | Total | Payment | Time
4. At the end of each day, copy the data to your master "Daily Sales" sheet

**Pro tip:** Create a Google Form linked to your sheet. Each sale = one form submission. The form automatically fills the sheet. This is faster than typing into a spreadsheet.

### The "Good Enough" Principle

Don't spend weeks choosing the perfect POS. The best POS is the one you'll actually use consistently. Start with the simplest option that handles your payment methods. You can always upgrade later.

**Rule of thumb:** If you're spending more than 30 minutes a day on sales tracking, your system is too manual. Upgrade to a proper POS.

---

### ✅ Worked Example: Esther's Bakery — Choosing Square POS

Esther runs a small bakery in Kabuga. She sells bread, cakes, and pastries. She accepts cash and M-PESA. She has 2 employees who handle sales when she's not there.

**Her needs:**
- Cash and M-PESA payments
- 35 products
- 2 staff members
- Budget: Free

**Her choice: Square POS**

**Setup process (45 minutes):**

1. Downloaded Square POS on her phone
2. Created account
3. Added all 35 products with prices and categories (Breads, Cakes, Pastries, Beverages)
4. Enabled Cash payments
5. Set up M-PESA as a "manual payment" (she records M-PESA transactions as a separate payment method)
6. Created staff accounts for her 2 employees (limited permissions — they can process sales but can't see reports or change settings)

**Weekly routine:**
- Monday morning: Check inventory, order supplies
- Daily: Square tracks all sales automatically
- Sunday evening: Export weekly sales report, review in Google Sheets

**Result:** Esther can now see which products sell best, track her daily revenue without manual calculations, and give her employees their own login to process sales. She upgraded to a Square Reader (RWF 25,000) after a month to accept card payments from office workers who buy lunch at her bakery.

---

### 📝 Your Exercise

1. Answer the checklist questions in this lesson (payment methods, inventory size, team, budget)
2. Based on your answers, choose a POS tool
3. Set it up today (most free options take under 45 minutes)
4. Add your top 10 products to start
5. Process your next 5 sales using the POS instead of your notebook
6. At the end of the week, check if the POS captured everything correctly

**Time needed:** 45 minutes to set up
**Cost:** Free (Square, Tally, Google Sheets) or RWF 25,000 (Square Reader for card payments)

---

### 📄 PDF Summary: Choosing the Right POS Tool

> **Key Takeaways:**
>
> - Three types of POS: mobile (phone), terminal (dedicated screen), cloud-based (browser)
> - Match your POS to your payment methods, inventory size, team size, and budget
> - Square POS is free and handles cash + cards — good starting point for most businesses
> - Google Sheets with a linked Google Form is a zero-cost POS alternative
> - Don't spend weeks choosing — pick the simplest tool that works and start using it
> - If sales tracking takes more than 30 minutes/day, your system is too manual
>
> **Action Step:** Choose a POS tool based on your checklist answers. Set it up and add your top 10 products today.

---$$, 'reading', 30, 2, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l08_id, course_id, 'Inventory Tracking That Prevents Stockouts', 'Inventory Tracking That Prevents Stockouts', $$**Duration:** 25 minutes | **Type:** Reading

---

Running out of a popular product is like closing your shop for a day. The customer who wanted to buy it doesn't wait — they go to your competitor. And they might not come back.

Inventory tracking isn't just about knowing what you have. It's about knowing what you'll need — before you need it.

### The Two Types of Inventory Problems

**Problem 1: Stockouts (too little)**
You run out of a product. Customers ask for it, you don't have it, they leave. Worse: they tell other people your shop is unreliable.

**Problem 2: Overstock (too much)**
You bought too much of something. It sits on your shelf, taking up space and tying up money. If it expires or goes out of season, you lose the entire investment.

Both problems come from the same root cause: you don't have reliable data on what sells and how fast.

### The Reorder Point Formula

The reorder point tells you exactly when to reorder a product. Here's the simple formula:

**Reorder Point = (Average Daily Sales × Lead Time) + Safety Stock**

Let's break this down:

- **Average Daily Sales:** How many units of this product do you sell per day? (Track for 2 weeks to find this.)
- **Lead Time:** How many days does it take from ordering to receiving the product? (Ask your supplier.)
- **Safety Stock:** A buffer for unexpected demand. Use 2-3 days' worth of sales.

**Example:**
- You sell 10 bags of rice per day
- Your supplier takes 3 days to deliver
- Safety stock: 3 days × 10 bags = 30 bags
- Reorder point: (10 × 3) + 30 = **60 bags**

When your rice stock drops to 60 bags, you reorder. This ensures you never run out, even if demand spikes or the supplier is delayed.

### Setting Up Inventory Tracking

**In Google Sheets:**

Create a column for each metric:

| Product | Current Stock | Avg Daily Sales | Lead Time (days) | Safety Stock | Reorder Point | Status |
|---|---|---|---|---|---|---|
| Rice (bags) | 65 | 10 | 3 | 30 | 60 | ⚠️ Reorder |
| Cooking oil (L) | 25 | 5 | 2 | 10 | 20 | ✅ OK |
| Sugar (kg) | 8 | 3 | 5 | 9 | 24 | 🔴 Urgent |

**Status rules:**
- ✅ OK: Stock is above reorder point
- ⚠️ Reorder: Stock is at or near reorder point
- 🔴 Urgent: Stock is below safety stock — order immediately

**In Square POS:**
Square tracks inventory automatically. Set low-stock alerts:
1. Go to Items → select a product
2. Set "Low stock threshold" (your reorder point)
3. Square alerts you when stock drops below this level

### The Weekly Inventory Ritual

Every Sunday evening (or your slowest day), do this:

1. **Physical count:** Walk your shelves and count every product
2. **Compare to system:** Check your POS or spreadsheet against the physical count
3. **Investigate gaps:** If the system says 50 but you count 45, figure out where 5 went (theft? waste? counting error?)
4. **Update reorder points:** If a product is selling faster than expected, increase your reorder point
5. **Place orders:** Order everything at or below its reorder point

This 20-minute ritual prevents both stockouts and overstock.

### The ABC Method: Not All Products Are Equal

You don't need to track everything with the same intensity. Use the ABC method:

**A items (top 20% of revenue):** Track daily. These are your money-makers. Never run out.
**B items (next 30% of revenue):** Track weekly. Important but not critical.
**C items (bottom 50% of revenue):** Track monthly. Nice to have, but running out won't hurt much.

For a provision shop, this might look like:
- **A:** Rice, cooking oil, sugar (high volume, high revenue)
- **B:** Beans, flour, soap (moderate volume)
- **C:** Matches, salt, toothpicks (low volume, low revenue)

### Preventing Spoilage and Waste

If you sell perishable goods (food, flowers, medicine), inventory tracking prevents waste:

**First In, First Out (FIFO):** Always sell older stock first. Put new deliveries behind existing stock.

**Expiration tracking:** Add an "Expiry Date" column to your inventory sheet. Check weekly for items expiring within 7 days. Discount or bundle them before they expire.

**Demand forecasting:** If you sell 20 units per week and the product expires in 2 weeks, don't buy more than 40 units at a time.

---

### ✅ Worked Example: Uncle Ben's Supermarket — Inventory System

Ben runs a small supermarket in Rusizi with about 200 products. He frequently runs out of popular items and occasionally discovers expired products on his shelves.

**Step 1: ABC classification (30 minutes)**

Ben downloads his sales data from Square POS and sorts by revenue:
- **A items (25 products):** Rice, sugar, cooking oil, milk, bread, soap, etc. — these 25 products generate 60% of his revenue
- **B items (50 products):** Canned goods, snacks, drinks — 25% of revenue
- **C items (125 products):** Everything else — 15% of revenue

**Step 2: Set reorder points for A items (20 minutes)**

For each A item, Ben calculates:
- Rice: 15 bags/day × 5-day lead time + 45 bags safety = **120 bags reorder point**
- Cooking oil: 8L/day × 3-day lead time + 24L safety = **48L reorder point**
- Milk: 30 packets/day × 2-day lead time + 60 packets safety = **120 packets reorder point**

**Step 3: Set up Google Sheets tracking (15 minutes)**

Ben creates a sheet with: Product, Current Stock, Reorder Point, Status, Last Ordered, Supplier Contact.

**Step 4: Weekly inventory ritual (every Sunday, 30 minutes)**

Ben counts A items every week, B items every 2 weeks, C items every month. He orders anything at or below its reorder point.

**After 1 month:**
- Zero stockouts on A items (previously 3-4 per month)
- Reduced expired products from 12 items/month to 2 items/month
- Freed up RWF 350,000 in cash that was tied up in overstocked C items

---

### 📝 Your Exercise

1. List your top 10 products by revenue
2. For each, calculate: average daily sales, lead time from supplier, safety stock
3. Calculate the reorder point for each product
4. Set up a tracking sheet with: Product, Current Stock, Reorder Point, Status
5. Do your first physical inventory count
6. Set a weekly reminder for your inventory ritual

**Time needed:** 1 hour to set up, 20 minutes per week to maintain
**Cost:** Free

---

### 📄 PDF Summary: Inventory Tracking That Prevents Stockouts

> **Key Takeaways:**
>
> - Stockouts lose customers; overstock ties up cash — both come from poor data
> - Reorder Point = (Avg Daily Sales × Lead Time) + Safety Stock
> - Use the ABC method: track A items daily, B items weekly, C items monthly
> - Do a weekly inventory ritual: count, compare to system, investigate gaps, reorder
> - FIFO (First In, First Out) prevents spoilage for perishable goods
> - Track expiration dates and discount items before they expire
>
> **Action Step:** Calculate reorder points for your top 10 products. Set up a tracking sheet. Do your first physical count today.

---$$, 'reading', 25, 3, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l09_id, course_id, 'Connecting Your POS to Mobile Money', 'Connecting Your POS to Mobile Money', $$**Duration:** 25 minutes | **Type:** Reading

---

In Rwanda, mobile money isn't optional — it's how most of your customers want to pay. If your POS system doesn't handle mobile money smoothly, you're losing sales every day.

### Why Mobile Money Integration Matters

Consider this: a customer walks into your shop, picks up items worth RWF 15,000, and reaches for their phone. They want to pay with MTN MoMo or Airtel Money. If you can't accept mobile money, one of two things happens:

1. They pay cash (if they have it)
2. They leave and go to a shop that accepts mobile money

In a 2025 Central Bank of Rwanda report, over 70% of Rwandan adults use mobile money. Not integrating it is like refusing to accept cash.

### How to Accept Mobile Money Payments

**Option 1: Lipa Na M-PESA (Pay with M-PESA)**

If your customers use M-PESA:
1. Register for a Lipa Na M-PESA business account at any M-PESA agent
2. You get a till number
3. Customer sends payment to your till number
4. You receive confirmation via SMS
5. Record the transaction in your POS

**Option 2: MTN Mobile Money Business**

If your customers use MTN MoMo:
1. Register for MTN MoMo Business at any MTN service center
2. You get a business merchant code
3. Customer pays by entering your merchant code in their MoMo menu
4. You receive instant notification
5. Record the transaction

**Option 3: QR Code Payments**

Both MTN and Airtel support QR code payments:
1. Generate a QR code from your MoMo/Airtel Money business account
2. Print it and display at your counter
3. Customer scans with their phone camera
4. Enters the amount and confirms

### Recording Mobile Money in Your POS

If you're using Square POS, mobile money is treated as a "manual payment":
1. Process the sale in Square (add items, total)
2. Select "Manual Payment" → "Mobile Money"
3. Enter the M-PESA/Airtel transaction reference number
4. Complete the sale

If you're using Google Sheets:
1. In your Daily Sales sheet, add a "Payment Method" column
2. Record "MTN MoMo" or "M-PESA" with the transaction reference
3. In your Daily Summary, separate cash from mobile money totals

### Reconciling Mobile Money with Your Bank

At the end of each week, reconcile:
1. Log into your MoMo/M-PESA business account
2. Download or screenshot your transaction history
3. Compare against your POS records
4. Check for discrepancies (missed entries, double entries, wrong amounts)
5. Transfer funds to your bank account (or keep in mobile money for operational expenses)

**Important:** Mobile money balances can be lost if your phone is compromised. Transfer large amounts to your bank account weekly.

### Accepting Card Payments

If your customers include office workers, expats, or tourists, they may want to pay by card. Options:

- **Square Reader:** RWF 25,000 one-time cost. Connects to your phone via Bluetooth. Accepts Visa, Mastercard.
- **Tap-to-phone:** Some Android phones (NFC-enabled) can accept contactless payments without a card reader. Check if your phone supports this.
- **Bank POS terminal:** Contact your bank (Bank of Kigali, Equity, etc.) for a merchant terminal. Monthly fees vary.

---

### ✅ Worked Example: Fahmida's Hair Salon — Mobile Money Setup

Fahmida runs a hair salon in Nyabugogo. She currently only accepts cash. About 30% of her customers ask if they can pay via mobile money, and she has to turn them away or ask them to go find an ATM.

**Setup (30 minutes):**

1. Visits MTN service center with her ID and business registration
2. Registers for MTN MoMo Business
3. Receives merchant code: *182*1*1*0788123456#
4. Prints the merchant code on an A4 paper and tapes it to her mirror

**New process:**
1. Customer finishes hair styling — total RWF 8,000
2. Fahmida says: "You can pay via MoMo. Use merchant code *182*1*1*0788123456#"
3. Customer pays on their phone
4. Fahmida receives SMS confirmation
5. She records in her Google Sheet: Date | Customer | Service | Amount | MoMo | Reference#

**After 1 month:**
- 35% of payments are now via MoMo
- She no longer loses customers who don't carry cash
- Weekly reconciliation takes 10 minutes

---

### 📝 Your Exercise

1. Choose a mobile money option based on your customers' preferred platform (ask them!)
2. Register for a business account (MTN MoMo Business or Lipa Na M-PESA)
3. Display your payment details (QR code or merchant code) at your counter
4. Update your POS to record mobile money as a payment method
5. Practice: process 3 mobile money payments and record them correctly
6. Set a weekly reconciliation reminder

**Time needed:** 30 minutes to set up
**Cost:** Free (merchant registration is free)

---

### 📄 PDF Summary: Connecting Your POS to Mobile Money

> **Key Takeaways:**
>
> - Over 70% of Rwandan adults use mobile money — not accepting it loses customers
> - Register for MTN MoMo Business or Lipa Na M-PESA (free, takes 30 minutes)
> - Display your QR code or merchant code at your counter
> - Record mobile money transactions in your POS with the reference number
> - Reconcile weekly: compare your POS records against your MoMo/M-PESA history
> - Transfer large balances to your bank account weekly to protect against phone compromise
>
> **Action Step:** Register for a mobile money business account today. Display your payment details. Start accepting mobile money tomorrow.

---

## Module 2 Quiz

**5 Questions — Passing score: 4/5**

1. **What is the formula for calculating a reorder point?**
   - A) Total stock ÷ days in month
   - B) (Average Daily Sales × Lead Time) + Safety Stock
   - C) Cost price × quantity
   - D) Revenue - Expenses

2. **In the ABC inventory method, which products should you track daily?**
   - A) The cheapest products
   - B) The newest products
   - C) The top 20% of products by revenue (A items)
   - D) All products equally

3. **What's the first step when transitioning from a notebook to digital tracking?**
   - A) Throw away your notebook immediately
   - B) Run both systems for 2 weeks
   - C) Buy an expensive POS terminal
   - D) Hire an accountant

4. **Why should you reconcile mobile money weekly?**
   - A) To check for discrepancies between your POS and payment provider
   - B) Because the bank requires it
   - C) To earn interest
   - D) To get a free phone upgrade

5. **What does FIFO stand for and why does it matter?**
   - A) First In, First Out — prevents spoilage by selling older stock first
   - B) Free Items For Operators — a discount program
   - C) Financial Inventory for Future Orders — a planning tool
   - D) Full Inventory, Full Optimization — a management technique

**Answers:** 1-B, 2-C, 3-B, 4-A, 5-A

---

## Certificate Checkpoint: Module 2 Complete

**You've learned:**
- Why manual tracking costs you money and how to fix it
- How to choose the right POS tool for your business
- How to set up inventory tracking with reorder points
- How to accept and record mobile money payments

**Certificate:** Complete the quiz with 4/5 correct answers to unlock your Module 2 certificate and proceed to Module 3.$$, 'reading', 25, 4, true);


  -- MODULE 3: Mobile Money & Digital Payments
  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l10_id, course_id, 'How Mobile Money Works for Business', 'How Mobile Money Works for Business', $$**Duration:** 20 minutes | **Type:** Reading

---

You've probably sent money via MTN MoMo or Airtel Money. But using mobile money for personal transfers and using it as a business tool are two different things.

Personal mobile money is simple: send money, receive money. Business mobile money involves tracking, reconciliation, limits, and security — all things that matter when someone else's money is involved.

### Personal vs. Business Mobile Money

| Feature | Personal Account | Business Account |
|---|---|---|
| Transaction limits | Lower (RWF 500,000/day typical) | Higher (RWF 5,000,000+/day) |
| Merchant tools | None | QR codes, till numbers, bulk payments |
| Transaction fees | Standard | Reduced for high volume |
| Reporting | Basic statement | Detailed business reports |
| Multiple users | No | Yes (employees can process payments) |
| Tax compliance | Your problem | Integrated with tax systems |

**The key difference:** A business account gives you tools to accept payments from customers at scale, track every transaction, and stay compliant with tax requirements.

### Registering for a Business Mobile Money Account

**MTN MoMo Business (most common in Rwanda):**

1. Visit any MTN service center with:
   - National ID
   - Business registration certificate (or certificate of incorporation)
   - TIN (Taxpayer Identification Number)
2. Request a "Merchant Account"
3. Choose your plan:
   - **Starter:** Free, up to RWF 2,000,000/month in transactions
   - **Growth:** RWF 5,000/month, up to RWF 10,000,000/month
   - **Enterprise:** Custom pricing, unlimited
4. Receive your merchant code and QR code
5. Set your PIN (different from your personal MoMo PIN)

**Airtel Money Business:**

1. Visit an Airtel service center with your ID and business documents
2. Request a "Merchant Account"
3. Choose your plan
4. Receive your merchant code

**Processing times:** Same day for basic accounts. 2-3 business days for higher-tier accounts.

### Transaction Fees You Should Know About

Mobile money fees eat into your profit if you don't account for them:

| Transaction Type | Typical Fee |
|---|---|
| Customer pays you (merchant) | 0.5-1% |
| You send money to supplier | 1-1.5% |
| Cash out at agent | 1-2% |
| Transfer to bank | 0.5-1% |

**Important:** These fees vary by provider and amount. Always check the current fee schedule on the MTN or Airtel website.

**How to handle fees in your accounting:**
- Record the gross amount (what the customer paid)
- Record the fee separately as "Mobile Money Charges"
- Your actual revenue = gross amount - fee

Example: Customer pays RWF 10,000 via MoMo. Fee is RWF 100 (1%). You receive RWF 9,900. In your books: Revenue = RWF 10,000, Mobile Money Charges = RWF 100, Net = RWF 9,900.

### Security: Protecting Your Business Money

Business mobile money accounts hold more money and are bigger targets. Follow these rules:

1. **Separate PINs:** Your business MoMo PIN must be different from your personal one
2. **Limit access:** Only give employee accounts limited permissions (process payments, don't transfer)
3. **Set daily limits:** Cap how much can be sent from your account per day
4. **Enable notifications:** Get SMS alerts for every transaction
5. **Weekly transfers:** Move large balances to your bank account weekly
6. **Never share PINs:** Not with employees, not with suppliers, not with "MTN agents" who call you

---

### ✅ Worked Example: Accessor Car Wash — Business MoMo Setup

Accessor runs a car wash in Kimihurura with 4 employees. Customers pay between RWF 3,000-15,000 per wash. Currently, all payments are cash.

**Problem:** Customers frequently say "I'll send via MoMo" and Accessor uses his personal account. He can't track business money separately from personal money. Last month, he mixed up RWF 200,000.

**Setup process:**

1. Accessor visits MTN with his ID, business certificate, and TIN
2. Registers for MoMo Business (Starter plan — free)
3. Receives merchant code and QR code
4. Sets a business PIN (different from personal)
5. Prints QR code on A4, laminates it, puts it at the payment counter

**New process:**
- Customer finishes wash → Accessor shows total on his phone screen
- Customer scans QR code → enters amount → confirms
- Accessor gets instant SMS: "Payment of RWF 5,000 received from 0788..."
- He records in his tracking sheet

**Security measures:**
- Business PIN is different from personal PIN
- Daily transfer limit set to RWF 500,000 (enough for business, limits theft risk)
- Only Accessor and his manager have the business PIN
- Every Friday, balance over RWF 200,000 is transferred to his bank account

**Result:** Clean separation of personal and business money. Full transaction history for tax purposes. No more "I'll pay you later" customers who never do.

---

### 📝 Your Exercise

1. Check: do you have a separate mobile money account for your business? If not, register this week
2. Set your business PIN (different from personal)
3. Set daily transaction limits appropriate for your business
4. Enable SMS notifications for all transactions
5. Set a weekly reminder to transfer large balances to your bank
6. Create a rule: all business payments go to the business account, never personal

**Time needed:** 1 hour (including visit to service center)
**Cost:** Free

---

### 📄 PDF Summary: How Mobile Money Works for Business

> **Key Takeaways:**
>
> - Business mobile money accounts offer higher limits, merchant tools, and reporting
> - Register with your ID, business certificate, and TIN
> - Transaction fees range from 0.5-2% — track them separately in your books
> - Security: separate PINs, limited access, daily caps, weekly bank transfers
> - Always record gross amount, fees, and net in your accounting
>
> **Action Step:** Register for a business mobile money account this week. Set up your PIN, limits, and weekly transfer schedule.

---$$, 'reading', 20, 1, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l11_id, course_id, 'Setting Up MTN MoMo / Airtel Money for Business', 'Setting Up MTN MoMo / Airtel Money for Business', $$**Duration:** 25 minutes | **Type:** Reading

---

Now that you understand how business mobile money works, let's set it up properly. This lesson walks you through the specific configuration for both MTN and Airtel.

### MTN MoMo Business: Complete Setup

**Step 1: Choose your merchant type**

MTN offers three merchant types:
- **Pay Merchant:** Customers pay you by entering your merchant code. Best for: shops, restaurants.
- **Pay QR:** Customers scan your QR code. Best for: fixed-price services.
- **Pay Bill:** Customers pay a specific bill number. Best for: utilities, school fees.

For most small businesses, **Pay Merchant + Pay QR** is the right combination.

**Step 2: Configure your account**

1. Dial *182# on your registered phone
2. Select "Business" → "My Account"
3. Set your daily transaction limit (recommend: RWF 1,000,000 for small businesses)
4. Set your monthly limit
5. Enable transaction notifications
6. Set up a sub-account for employee access (optional)

**Step 3: Get your payment tools**

- **Merchant code:** Dial *182# → Business → My Code. This is your payment code.
- **QR code:** Request from MTN service center or generate via the MoMo Business portal
- **Payment link:** Create a web payment link at momo.mtn.co.rw (for online orders)

**Step 4: Display your payment information**

Create a clear sign for your counter:
```
PAY WITH MOBILE MONEY
━━━━━━━━━━━━━━━━━━━
MTN MoMo: *182*1*1*MERCHANT_CODE#
QR Code: [Your QR code here]
━━━━━━━━━━━━━━━━━━━
Scan or dial to pay
```

### Airtel Money Business: Complete Setup

**Step 1: Register**
1. Visit Airtel service center with business documents
2. Choose merchant plan
3. Receive merchant code

**Step 2: Configure**
1. Dial *500# on your registered phone
2. Select "Business" → "Settings"
3. Set limits and notifications
4. Download the Airtel Money Business app for easier management

**Step 3: Display**
```
PAY WITH AIRTEL MONEY
━━━━━━━━━━━━━━━━━━
Dial: *185*1*1*MERCHANT_CODE#
QR Code: [Your QR code here]
━━━━━━━━━━━━━━━━━━
```

### Handling Multiple Payment Methods

Most businesses need to accept both MTN and Airtel. Here's how:

1. Register for both (they're free)
2. Display both QR codes side by side at your counter
3. In your POS, record which provider was used (important for reconciliation)
4. Reconcile each provider separately at the end of the week

**Reconciliation template:**

| Date | MTN MoMo Transactions | MTN Total | Airtel Transactions | Airtel Total | Cash Total | Day Total |
|---|---|---|---|---|---|---|
| Mon | 12 | 85,000 | 8 | 52,000 | 120,000 | 257,000 |
| Tue | 15 | 95,000 | 6 | 38,000 | 98,000 | 231,000 |

### Bulk Payments: Paying Suppliers via Mobile Money

You can also use mobile money to pay suppliers:

1. Dial *182# → Business → Send Money
2. Enter supplier's phone number
3. Enter amount
4. Add a reference (e.g., "Invoice #1234 - Rice delivery")
5. Confirm with your business PIN

**Benefits:** Instant payment, automatic record, no need to visit the bank. Your supplier receives the money immediately.

### Payment Confirmation: What to Do When Something Goes Wrong

Common issues and solutions:

**"Customer says they paid but I didn't receive it"**
1. Ask for their transaction reference number
2. Dial *182*9# to check your recent transactions
3. If the money isn't there, ask them to check their sent items
4. If they sent it to the wrong number, contact MTN customer care

**"Transaction failed but money was deducted"**
1. The money should auto-reverse within 24 hours
2. If not, contact MTN/Airtel with the transaction reference
3. Never reship or provide service until you confirm payment

**"I sent money to the wrong number"**
1. Contact MTN/Airtel immediately with the transaction reference
2. If the recipient hasn't cashed out, the money can be reversed
3. If they have, it's much harder — contact them directly if possible

---

### ✅ Worked Example: Ishema Restaurant — Full Payment Setup

Ishema Restaurant in Kimironko serves lunch to office workers. They serve about 80 customers per day. Average spend: RWF 4,500.

**Setup:**

1. Registered for MTN MoMo Business (Growth plan — RWF 5,000/month) and Airtel Money Business (free)
2. Created a sign for the counter showing both MTN and Airtel payment options
3. Set daily limits: MTN RWF 500,000, Airtel RWF 500,000
4. Enabled notifications on both accounts

**Daily process:**
1. Customer orders → gets food → comes to counter
2. Cashier shows total on tablet screen
3. Customer scans their preferred QR code (MTN or Airtel)
4. Enters amount → confirms
5. Cashier sees confirmation on their phone → marks order as paid
6. If cash: enters amount in till

**Weekly reconciliation (every Sunday):**
1. Download MTN MoMo transaction history
2. Download Airtel Money transaction history
3. Count cash in till
4. Compare all three against the POS records
5. Investigate any discrepancies
6. Transfer balances over RWF 300,000 to the business bank account

**After 3 months:**
- 60% of payments are mobile money, 40% cash
- Zero "I didn't pay" disputes (every transaction has a reference)
- Monthly reconciliation takes 30 minutes instead of the old 3-hour cash counting
- Total mobile money fees: about RWF 45,000/month (0.8% of revenue) — worth it for the convenience and tracking

---

### 📝 Your Exercise

1. Set up at least one business mobile money account (MTN or Airtel)
2. Create and display a payment sign at your counter
3. Process 5 payments using the new system
4. Create a daily reconciliation template (copy the one from this lesson)
5. At the end of the week, do your first reconciliation
6. Set up a weekly reminder for reconciliation

**Time needed:** 1 hour to set up, 15 minutes per day to maintain
**Cost:** Free (account setup), RWF 0-5,000/month (transaction fees)

---

### 📄 PDF Summary: Setting Up MTN MoMo / Airtel Money for Business

> **Key Takeaways:**
>
> - Register for both MTN and Airtel business accounts to serve all customers
> - Choose "Pay Merchant" + "Pay QR" for maximum flexibility
> - Display clear payment signs at your counter with both providers
> - Set daily limits and enable notifications for security
> - Reconcile weekly: compare POS records against MoMo/Airtel statements
> - Transfer large balances to your bank account weekly
> - Keep transaction references for all payments — they're your proof
>
> **Action Step:** Set up your business mobile money accounts this week. Create your payment sign. Start accepting mobile money.

---$$, 'reading', 25, 2, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l12_id, course_id, 'Accepting Cards & QR Payments', 'Accepting Cards & QR Payments', $$**Duration:** 20 minutes | **Type:** Reading

---

Mobile money covers most Rwandan transactions. But there's a growing segment of customers — office workers, tourists, expats, and corporate clients — who prefer to pay by card. If you only accept cash and mobile money, you're missing these customers.

### When Card Payments Make Sense

You should accept card payments if:
- Your average transaction is over RWF 10,000 (card fees matter less on larger amounts)
- You serve customers who work in offices or international organizations
- You sell to tourists or expats
- You want to appear more professional to corporate clients
- You're tired of "I don't have cash" excuses

You probably don't need card payments yet if:
- Your average transaction is under RWF 5,000
- Your customers are mostly local residents who prefer mobile money
- You're just starting out and revenue is low

### Card Payment Options in Rwanda

**Option 1: Square Reader (Recommended for small businesses)**

- Cost: RWF 25,000 one-time (hardware)
- Transaction fee: 1.6% per card payment
- Accepts: Visa, Mastercard, contactless (NFC)
- Setup: 30 minutes
- Best for: Small shops, restaurants, service providers

**Setup:**
1. Download Square POS app
2. Buy Square Reader from Square's website or authorized retailers
3. Pair with your phone via Bluetooth
4. Process a test payment

**Option 2: Tap-to-Phone (Free if your phone supports it)**

- Cost: RWF 0 (if your Android phone has NFC)
- Transaction fee: 1.6-2%
- Accepts: Contactless cards and phone wallets (Apple Pay, Google Pay)
- Setup: 15 minutes
- Best for: Mobile businesses, market vendors

**Check if your phone supports tap-to-phone:**
1. Open Settings → search "NFC"
2. If NFC is available, your phone can accept contactless payments
3. Download a tap-to-phone app (like Square or SumUp)

**Option 3: Bank POS Terminal**

- Cost: Monthly rental (RWF 5,000-15,000/month)
- Transaction fee: 2-3%
- Accepts: Visa, Mastercard, local cards
- Setup: 3-5 business days
- Best for: Established businesses with high card transaction volume

**To get a bank POS:**
1. Visit your bank (Bank of Kigali, Equity, etc.)
2. Apply for a merchant account
3. Provide business registration, TIN, bank statements
4. Receive terminal and training

### The Cost of Accepting Cards

Let's do the math for a typical small business:

**Monthly card transactions:** RWF 500,000
**Square fee (1.6%):** RWF 8,000
**Monthly card revenue:** RWF 500,000
**Net after fees:** RWF 492,000

Is RWF 8,000 worth it? If those customers would have walked away without card payment, you gained RWF 492,000 you wouldn't have had. That's a 6,000% return on the fee.

### Handling Card Payment Disputes

Sometimes a customer disputes a card charge. Here's how to protect yourself:

1. **Always get a signature** (for physical card payments)
2. **Keep receipts** (Square stores these digitally)
3. **Match the cardholder name** to the person paying
4. **For large amounts** (over RWF 100,000), ask for ID
5. **If a dispute occurs,** Square handles it — you provide the receipt and transaction details

---

### ✅ Worked Example: Kigali Tech Hub Café — Adding Card Payments

The café serves coffee, pastries, and light meals to tech workers and startup founders. Average transaction: RWF 8,500.

**Current state:** 80% mobile money, 20% cash. About 15% of customers ask "Do you accept cards?" and seem disappointed when the answer is no.

**Solution:** Square Reader

**Setup:**
1. Ordered Square Reader online (arrived in 3 days)
2. Downloaded Square POS on the café's tablet
3. Added all menu items with prices
4. Paired Square Reader via Bluetooth
5. Tested with own card

**New process:**
1. Barista enters order in Square POS
2. Customer taps or inserts card on Square Reader
3. Payment processes in 3 seconds
4. Digital receipt sent via email (or skip)
5. Done

**After 2 months:**
- Card payments: 25% of transactions (up from 0%)
- Average card transaction: RWF 11,000 (higher than cash/MoMo average of RWF 7,500)
- Monthly card fees: RWF 13,000
- Additional revenue from card-only customers: RWF 380,000/month
- Net gain: RWF 367,000/month

---

### 📝 Your Exercise

1. Assess: do your customers want card payments? (Ask your next 10 customers)
2. If yes, choose an option: Square Reader (RWF 25,000), tap-to-phone (free), or bank POS
3. Set it up and process 3 test transactions
4. Add the card payment option to your payment sign at the counter
5. Track card transactions separately for 2 weeks to see if they increase revenue

**Time needed:** 30 minutes (tap-to-phone) to 1 hour (Square Reader)
**Cost:** RWF 0 (tap-to-phone) or RWF 25,000 (Square Reader)

---

### 📄 PDF Summary: Accepting Cards & QR Payments

> **Key Takeaways:**
>
> - Card payments attract office workers, tourists, and corporate customers
> - Square Reader (RWF 25,000) or tap-to-phone (free) are the best options for small businesses
> - Card fees (1.6-2%) are worth it if they bring additional revenue
> - Always get signatures and keep digital receipts for dispute protection
> - Track card transactions separately to measure the actual revenue impact
>
> **Action Step:** If your customers want card payments, set up Square Reader or tap-to-phone this week.

---$$, 'reading', 20, 3, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l13_id, course_id, 'Reconciling Digital Payments in Your Books', 'Reconciling Digital Payments in Your Books', $$**Duration:** 25 minutes | **Type:** Reading

---

You've set up mobile money and maybe card payments. Sales are flowing in through multiple channels. But at the end of the month, you need to answer one question: **how much money did I actually make?**

Reconciliation is the process of matching your records against your payment providers' records to make sure nothing fell through the cracks.

### Why Reconciliation Matters

Without reconciliation, you'll discover:
- Money you thought you received but didn't (failed transactions)
- Money you received but forgot to record (double income — sounds good but causes tax problems)
- Fees you didn't account for (your "profit" was actually lower)
- Theft or errors (employee pocketing cash, wrong change given)

**Rule:** If your books don't match your bank/mobile money statements, you have a problem. Find it before it gets bigger.

### The Weekly Reconciliation Process (30 minutes)

**Step 1: Gather your sources**
- Your POS records (Google Sheets or Square export)
- MTN MoMo statement
- Airtel Money statement
- Cash register count
- Bank statement (if you transfer weekly)

**Step 2: Match transactions**

For each day, compare:
1. Your POS total for the day
2. MoMo incoming transactions for the day
3. Airtel incoming transactions for the day
4. Cash counted at end of day

**If POS says RWF 250,000 but MoMo + Airtel + Cash = RWF 245,000:**
You're missing RWF 5,000. Find it. Common causes:
- A transaction was recorded in POS but the mobile money didn't go through
- Cash was given as change but not recorded
- A discount was given but not recorded

**Step 3: Record fees**
- MTN fees for the week
- Airtel fees for the week
- Card processing fees (if applicable)
- Bank transfer fees

**Step 4: Update your books**

Create a weekly summary:

| Category | Amount |
|---|---|
| Total Sales (gross) | 1,750,000 |
| MTN MoMo payments | 700,000 |
| Airtel payments | 450,000 |
| Card payments | 200,000 |
| Cash payments | 400,000 |
| **Total payments** | **1,750,000** |
| MTN fees | -5,600 |
| Airtel fees | -3,600 |
| Card fees | -3,200 |
| **Net revenue** | **1,737,600** |

### Handling Discrepancies

When your numbers don't match, investigate systematically:

**Common discrepancy: "I recorded more than I received"**
- Check for failed mobile money transactions (customer's phone showed "sent" but it didn't arrive)
- Check for bounced card payments
- Check for wrong amounts entered

**Common discrepancy: "I received more than I recorded"**
- Check for sales you forgot to enter
- Check for overpayments from customers
- Check for duplicate entries

**Common discrepancy: "Fees don't match"**
- Fee schedules change — check current rates
- Different transaction amounts have different fee tiers
- Some providers charge flat fees, others charge percentages

### Month-End Close: The Full Picture

At the end of each month, do a more thorough reconciliation:

1. **Download full statements** from MTN, Airtel, and your bank
2. **Compare totals** against your monthly summary
3. **Check for pending transactions** (sometimes payments take 1-2 days to appear)
4. **Calculate true profit:** Revenue - Cost of goods - All fees - Expenses = Profit
5. **Set aside money for taxes** (15% turnover tax for small businesses in Rwanda, or income tax if larger)

### Using Google Sheets for Automated Reconciliation

Create a reconciliation sheet:

| Date | POS Total | MoMo Received | Airtel Received | Cash Counted | Card Received | Total Received | Difference |
|---|---|---|---|---|---|---|---|
| Mon | 85,000 | 35,000 | 20,000 | 25,000 | 5,000 | 85,000 | 0 |
| Tue | 92,000 | 40,000 | 25,000 | 28,000 | 0 | 93,000 | +1,000 |

The "Difference" column automatically flags issues. If it's not zero, investigate.

**Formula for Difference cell:** `=POS Total - (MoMo + Airtel + Cash + Card)`

---

### ✅ Worked Example: Bright Ideas Electronics — Weekly Reconciliation

Bright Ideas sells phones and accessories in downtown Kigali. They accept cash, MTN MoMo, Airtel Money, and cards.

**Week 1 reconciliation:**

| Day | POS | MoMo | Airtel | Cash | Card | Total | Diff |
|---|---|---|---|---|---|---|---|
| Mon | 450,000 | 180,000 | 120,000 | 130,000 | 20,000 | 450,000 | 0 |
| Tue | 380,000 | 150,000 | 90,000 | 140,000 | 0 | 380,000 | 0 |
| Wed | 520,000 | 200,000 | 150,000 | 150,000 | 25,000 | 525,000 | +5,000 |
| Thu | 290,000 | 120,000 | 80,000 | 95,000 | 0 | 295,000 | +5,000 |
| Fri | 610,000 | 250,000 | 180,000 | 160,000 | 30,000 | 620,000 | +10,000 |

**Investigation:** Wednesday's +5,000 was a customer who paid RWF 5,000 extra (meant to pay 85,000 but entered 90,000). Thursday's +5,000 was a cash overpayment that wasn't returned. Friday's +10,000 was a duplicate entry — the same phone sale was entered twice.

**Resolution:** All three were recording errors, not theft. The owner updated the POS entries and noted the issues for staff training.

**Fees for the week:**
- MTN: RWF 13,400 (on RWF 900,000)
- Airtel: RWF 7,200 (on RWR 620,000)
- Card: RWF 1,200 (on RWF 75,000)
- Total fees: RWF 21,800

**Monthly impact:** RWF 87,200 in fees — but the business processes RWF 7.4 million monthly, so fees are 1.2% of revenue. Worth it for the tracking and convenience.

---

### 📝 Your Exercise

1. Create a reconciliation sheet (copy the template from this lesson)
2. At the end of this week, gather all your payment records
3. Do your first reconciliation — compare POS totals against MoMo, Airtel, cash, and card
4. If there are discrepancies, investigate and resolve them
5. Calculate your total fees for the week
6. Set a weekly calendar reminder: "Reconcile payments — 30 minutes"

**Time needed:** 30 minutes per week
**Cost:** Free

---

### 📄 PDF Summary: Reconciling Digital Payments

> **Key Takeaways:**
>
> - Reconciliation = matching your records against payment providers' records
> - Do it weekly, not monthly — find problems while they're small
> - Record all fees separately — they directly impact your profit
> - The "Difference" column should always be zero — if not, investigate
> - Month-end: download full statements, calculate true profit, set aside tax money
> - Consistent reconciliation prevents fraud, errors, and tax surprises
>
> **Action Step:** Create a reconciliation sheet. Do your first reconciliation this Friday. Set a weekly reminder.

---

## Module 3 Quiz

**5 Questions — Passing score: 4/5**

1. **What's the main advantage of a business mobile money account over a personal one?**
   - A) Higher interest rates
   - B) Merchant tools, higher limits, and transaction tracking
   - C) Free transactions
   - D) A dedicated phone number

2. **When reconciling payments, what does "reconciliation" mean?**
   - A) Paying your bills on time
   - B) Matching your POS records against your payment providers' statements
   - C) Counting your cash
   - D) Updating your inventory

3. **What should you do with large mobile money balances at the end of each week?**
   - A) Leave them in the account
   - B) Transfer them to your bank account
   - C) Cash them out at an agent
   - D) Send them to your personal account

4. **What's the typical fee for card payments via Square?**
   - A) 0%
   - B) 1.6%
   - C) 5%
   - D) 10%

5. **If your POS says you made RWF 100,000 but your payment records show RWF 95,000, what should you do?**
   - A) Ignore the difference — it's small
   - B) Add RWF 5,000 to make them match
   - C) Investigate the discrepancy (failed transactions, recording errors, theft)
   - D) Start using a different POS system

**Answers:** 1-B, 2-B, 3-B, 4-B, 5-C

---

## Certificate Checkpoint: Module 3 Complete

**You've learned:**
- The difference between personal and business mobile money
- How to set up and configure MTN MoMo and Airtel Money for business
- How to accept card payments with Square or tap-to-phone
- How to reconcile digital payments weekly and maintain accurate books

**Certificate:** Complete the quiz with 4/5 correct answers to unlock your Module 3 certificate and proceed to Module 4.$$, 'reading', 25, 4, true);


  -- MODULE 4: Automating Your Daily Tasks
  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l14_id, course_id, 'What to Automate First (and What Not To)', 'What to Automate First (and What Not To)', $$**Duration:** 20 minutes | **Type:** Reading

---

You're spending 3 hours a day on tasks that a computer could do in 3 minutes. Not because you're slow — because you haven't set up the right tools yet.

Automation doesn't mean replacing yourself. It means eliminating the repetitive tasks that drain your time so you can focus on what actually grows your business.

### The Automation Prioritization Matrix

Not everything should be automated. Use this framework:

**Automate NOW (high frequency, low complexity):**
- Sending invoices and payment reminders
- Appointment confirmations and reminders
- Daily sales summaries
- Inventory reorder alerts
- Customer follow-up messages

**Automate LATER (high frequency, high complexity):**
- Marketing email campaigns
- Social media posting
- Financial reporting
- Customer segmentation

**Don't automate (low frequency, high touch):**
- Handling complaints and refunds
- Negotiating with suppliers
- Building relationships with key customers
- Making strategic business decisions

**Don't automate yet (low frequency, low complexity):**
- Filing documents
- Updating your website
- Answering common questions (until you have enough volume)

### The Time Audit: Where Are Your Hours Going?

Before automating, figure out where your time goes. For one week, log your activities in 30-minute blocks:

| Time | Activity | Could be automated? |
|---|---|---|
| 7:00-7:30 | Count cash, check inventory | Partially (POS does this) |
| 7:30-8:00 | Reply to WhatsApp messages | Yes (auto-replies, templates) |
| 8:00-9:00 | Open shop, arrange displays | No |
| 9:00-12:00 | Serve customers | Partially (self-checkout for some) |
| 12:00-12:30 | Create invoices for today's sales | Yes (POS generates these) |
| 12:30-1:00 | Lunch | No |
| 1:00-2:00 | Follow up with suppliers | Partially (automated reorder) |
| 2:00-3:00 | Post on social media | Yes (schedule in advance) |
| 3:00-5:00 | Serve customers | No |
| 5:00-6:00 | Update inventory sheet | Partially (POS does this) |
| 6:00-6:30 | Send payment reminders to credit customers | Yes (automated reminders) |
| 6:30-7:00 | Reconcile daily sales | Partially (automated reports) |

**Total automatable time:** About 2.5 hours per day. That's 12.5 hours per week — time you could spend on business development, customer relationships, or simply resting.

### The Free Automation Tools You Should Know

| Tool | What it does | Cost | Best for |
|---|---|---|---|
| **Google Forms → Sheets** | Collect data automatically | Free | Customer orders, feedback, registrations |
| **Google Sheets + Apps Script** | Automate calculations and alerts | Free | Inventory alerts, daily summaries |
| **WhatsApp Business** | Auto-replies, quick replies, labels | Free | Customer communication |
| **Canva** | Schedule social media posts | Free basic | Marketing content |
| **Zapier** | Connect apps together | Free (100 tasks/mo) | Complex automations |
| **IFTTT** | Simple "if this, then that" rules | Free | Simple automations |

### What NOT to Automate

Automation fails when you try to automate:
- **Relationships:** Don't send automated "Happy Birthday" messages that feel robotic. Send a personal WhatsApp message instead.
- **Quality control:** Don't automate quality checks. A human eye catches what software misses.
- **Strategy:** Don't use automated reports as a substitute for thinking about your business.
- **Complaints:** Never automate complaint handling. Angry customers need a human.

---

### ✅ Worked Example: Urumuri Electronics — Time Audit Results

Urumuri sells electronics in downtown Kigali. The owner, Samuel, works 12 hours a day, 6 days a week. He's exhausted and feels like he's always busy but not making progress.

**Time audit results (1 week average):**

| Activity | Hours/day | Automatable? |
|---|---|---|
| Serving customers | 5.0 | No |
| Replying to WhatsApp inquiries | 1.5 | Yes — templates + auto-reply |
| Creating invoices | 0.5 | Yes — POS generates these |
| Updating inventory | 0.5 | Yes — POS does this |
| Posting on social media | 1.0 | Yes — schedule weekly |
| Following up with suppliers | 0.5 | Partially — automated reorder |
| Sending payment reminders | 0.5 | Yes — automated messages |
| Reconciling sales | 0.5 | Partially — POS reports |
| Admin work (filing, planning) | 1.0 | Partially |
| Breaks and meals | 1.0 | No |

**Total automatable:** 4.5 hours/day

**Samuel's plan:**
1. Week 1: Set up POS to auto-generate invoices and track inventory (saves 1 hour)
2. Week 2: Set up WhatsApp Business auto-replies and templates (saves 1.5 hours)
3. Week 3: Schedule social media posts for the week in one session (saves 1 hour)
4. Week 4: Set up automated payment reminders (saves 0.5 hours)

**After 1 month:** Samuel works 8 hours instead of 12. His revenue hasn't dropped — in fact, it's increased because he has time to focus on customer relationships and business development.

---

### 📝 Your Exercise

1. Do a 1-week time audit (log activities in 30-minute blocks)
2. Identify your top 3 automatable tasks (highest time spent)
3. For each, choose the right tool from the list above
4. Set a goal: automate one task per week for the next 4 weeks
5. Track how much time you save each week

**Time needed:** 30 minutes per week for 4 weeks
**Cost:** Free

---

### 📄 PDF Summary: What to Automate First

> **Key Takeaways:**
>
> - Automate high-frequency, low-complexity tasks first (invoices, reminders, reports)
> - Don't automate relationships, quality control, strategy, or complaints
> - Do a time audit to find where your hours actually go
> - Free tools: Google Forms/Sheets, WhatsApp Business, Canva, Zapier
> - Goal: save 2-4 hours per day by automating repetitive tasks
>
> **Action Step:** Do a 1-week time audit. Identify your top 3 automatable tasks. Start automating one this week.

---$$, 'reading', 20, 1, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l15_id, course_id, 'Automated Invoicing with Free Tools', 'Automated Invoicing with Free Tools', $$**Duration:** 25 minutes | **Type:** Reading

---

Every time you make a sale on credit, you need to send an invoice. Every time a payment is late, you need to send a reminder. Every month, you need to know who owes you money.

Doing this manually is possible. It's also a waste of your time.

### Why Invoicing Matters

Without proper invoicing:
- Customers forget they owe you money
- You forget who owes you money
- You can't prove a sale happened (disputes)
- Tax time is a nightmare

With proper invoicing:
- Customers receive clear, professional payment requests
- You track all outstanding payments automatically
- You have documentation for every transaction
- Tax filing takes 30 minutes instead of 3 days

### The Anatomy of a Good Invoice

Every invoice needs these elements:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INVOICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Invoice #: INV-2026-001
Date: September 9, 2026
Due: September 23, 2026 (14 days)

FROM:
Your Business Name
Your Address
Your Phone
Your TIN

TO:
Customer Name
Customer Address
Customer Phone

Items:
1. Product A      2 x RWF 15,000 = RWF 30,000
2. Service B      1 x RWF 25,000 = RWF 25,000

Subtotal:                      RWF 55,000
Tax (18% VAT):                RWF 9,900
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL DUE:                    RWF 64,900
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Payment methods:
- MTN MoMo: *182*1*1*MERCHANT_CODE#
- Airtel Money: *185*1*1*MERCHANT_CODE#
- Cash: at our shop
- Bank: Bank of Kigali, Account #XXXXX

Thank you for your business!
Questions? WhatsApp: +250 788 123 456
```

### Free Invoicing Tools

**Option 1: Google Docs/Sheets Template**

Create a reusable invoice template:
1. Open Google Docs
2. Create a template with all the invoice fields above
3. Save as "Invoice Template"
4. For each sale: make a copy, fill in the details, save as PDF
5. Send via WhatsApp or email

**Pros:** Free, fully customizable, no learning curve
**Cons:** Manual entry, no automatic tracking

**Option 2: Wave (Free Accounting Software)**

Wave is free accounting software that handles invoicing:
1. Sign up at waveapps.com
2. Create your business profile
3. Create invoices with a few clicks
4. Send via email
5. Track payments automatically
6. Generate financial reports

**Pros:** Free, professional invoices, payment tracking, accounting
**Cons:** Web-based (needs internet), learning curve

**Option 3: Zoho Invoice (Free for small businesses)**

Zoho Invoice offers:
1. Professional invoice templates
2. Automatic payment reminders
3. Mobile app for invoicing on the go
4. Multi-currency support
5. Free for businesses with under 5 customers

### Automating Payment Reminders

The biggest win from invoicing automation: automatic reminders.

**Manual process:** You remember to call the customer, they're busy, you forget, 3 months pass, you've lost the money.

**Automated process:** The system sends a WhatsApp or email reminder 3 days before the due date, on the due date, and 3 days, 7 days, and 14 days after. You don't have to remember anything.

**In Wave:**
1. Create the invoice
2. Set the payment terms (Net 14, Net 30, etc.)
3. Wave automatically sends reminders at the intervals you set

**In Google Sheets + WhatsApp:**
1. Create a "Payments Due" sheet
2. Column A: Customer name
3. Column B: Invoice amount
4. Column C: Due date
5. Column D: Status (Paid/Unpaid)
6. Set a Google Calendar reminder for each due date
7. Send a WhatsApp message template when a payment is due

**WhatsApp reminder template:**
> Hi [Name], this is a friendly reminder that your invoice #[NUMBER] for RWF [AMOUNT] is due on [DATE]. You can pay via MoMo to [MERCHANT CODE] or visit our shop. Thank you!

### Handling Credit Sales

If you sell on credit (customer pays later), you need a credit tracking system:

**In Google Sheets:**

| Invoice # | Customer | Date | Amount | Due Date | Paid? | Paid Date | Amount Paid | Balance |
|---|---|---|---|---|---|---|---|---|
| 001 | Jean | Sep 1 | 50,000 | Sep 15 | Yes | Sep 14 | 50,000 | 0 |
| 002 | Marie | Sep 3 | 75,000 | Sep 17 | Partial | Sep 16 | 40,000 | 35,000 |
| 003 | Pierre | Sep 5 | 30,000 | Sep 19 | No | - | 0 | 30,000 |

**Rule:** Don't let any single customer's balance exceed RWF 100,000 without a written agreement. Credit is a loan — treat it like one.

---

### ✅ Worked Example: Kivu Construction Supplies — Invoice Automation

Kivu sells building materials on credit to small contractors. They have about 50 active credit customers and RWF 2.5 million in outstanding balances.

**Problem:** The owner manually calls each customer to remind them about payments. He forgets经常, and some customers haven't paid in 3+ months.

**Solution: Wave + Google Sheets**

1. Created a Wave account and set up the business
2. Created invoice templates for their 3 product categories (cement, iron sheets, plumbing)
3. For each credit sale, generated an invoice in Wave with 14-day payment terms
4. Set Wave to send automatic email reminders at: 3 days before, on due date, 3 days after, 7 days after
5. Created a Google Sheet as a backup tracker: Invoice #, Customer, Amount, Due Date, Status

**Weekly process (15 minutes instead of 2 hours):**
1. Monday morning: Check Wave for unpaid invoices
2. For invoices 7+ days overdue: send a personal WhatsApp message
3. For invoices 14+ days overdue: call the customer
4. Update the Google Sheet with payment status

**Result:**
- Average payment time dropped from 22 days to 11 days
- Outstanding balances dropped from RWF 2.5M to RWF 800K in 2 months
- Time spent on collections: 15 minutes/week instead of 2 hours/week

---

### 📝 Your Exercise

1. Choose an invoicing tool (Google Docs template, Wave, or Zoho Invoice)
2. Create your invoice template with all required fields
3. For your next 5 sales, send a proper invoice
4. Set up automatic payment reminders
5. Create a "Payments Due" tracking sheet
6. Set a weekly 15-minute reminder to check outstanding payments

**Time needed:** 1 hour to set up, 15 minutes per week to maintain
**Cost:** Free

---

### 📄 PDF Summary: Automated Invoicing

> **Key Takeaways:**
>
> - Every sale needs an invoice — it's your proof of transaction and your collections tool
> - Good invoicing = clear details, payment methods, and terms
> - Free tools: Google Docs templates, Wave, Zoho Invoice
> - Automate payment reminders — they're the biggest time saver
> - Track all credit sales in a spreadsheet with due dates and statuses
> - Don't let any customer's balance exceed RWF 100,000 without written agreement
>
> **Action Step:** Set up an invoicing tool today. Send your next 5 sales as proper invoices with automatic reminders.

---$$, 'reading', 25, 2, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l16_id, course_id, 'Scheduling & Reminders That Run Themselves', 'Scheduling & Reminders That Run Themselves', $$**Duration:** 20 minutes | **Type:** Reading

---

You have 47 things to remember: supplier meetings, customer follow-ups, bill payments, staff schedules, tax deadlines. If you're relying on your memory, you're going to forget something important.

The solution: let computers remember so you don't have to.

### Types of Reminders Every Business Needs

**Daily reminders:**
- Open the shop (if you need a nudge)
- Check social media messages
- Review tomorrow's orders

**Weekly reminders:**
- Reconcile payments (Friday afternoon)
- Order inventory for next week
- Review social media analytics
- Back up important files

**Monthly reminders:**
- Pay rent and utilities
- File tax returns
- Review pricing (are you still profitable?)
- Check Google Business Profile insights
- Update your website

**One-time reminders:**
- Supplier meeting on Thursday at 2pm
- Customer pickup on Saturday
- Appointment with accountant next week

### Free Scheduling Tools

**Google Calendar (Best for most businesses)**
- Free, works on any phone
- Set recurring events (daily, weekly, monthly)
- Set multiple reminders (1 day before, 1 hour before)
- Share calendars with employees
- Color-code: red for urgent, blue for routine

**Google Tasks (Best for to-do lists)**
- Free, integrated with Gmail and Calendar
- Create tasks with due dates
- Get reminders at the right time
- Check off completed tasks

**WhatsApp Business Quick Replies (Best for customer communication)**
- Set up template messages for common inquiries
- One tap to send a pre-written response
- No typing required

### Setting Up Your Reminder System

**Step 1: Create recurring calendar events**

Open Google Calendar and create:
- "Daily: Check WhatsApp messages" — every day at 8am
- "Weekly: Reconcile payments" — every Friday at 5pm
- "Weekly: Order inventory" — every Thursday at 10am
- "Monthly: Pay rent" — 1st of every month at 9am
- "Monthly: Check Google Business Profile" — 1st of every month at 10am
- "Monthly: Review pricing" — 15th of every month at 2pm

**Step 2: Set reminders for each event**
- For daily tasks: 0-minute reminder (just shows on your screen)
- For weekly tasks: 1-hour reminder
- For monthly tasks: 1-day reminder
- For one-time events: 1-day and 1-hour reminders

**Step 3: Share with employees**
- If you have a manager, share your calendar
- They can see what needs to be done and when
- They can add their own events

### Automating WhatsApp Quick Replies

WhatsApp Business lets you create template messages:

**To set up:**
1. Open WhatsApp Business
2. Go to Settings → Business Tools → Quick Replies
3. Create templates for common messages:

**Template 1: Price inquiry**
> Shortcut: /price
> Message: "Hello! Thanks for your interest. Here are our current prices: [list]. Would you like to place an order? You can pay via MoMo or visit us at [address]."

**Template 2: Order confirmation**
> Shortcut: /confirm
> Message: "Your order #[NUMBER] is confirmed! Total: RWF [AMOUNT]. Please pay via MoMo to [MERCHANT_CODE]. We'll have it ready by [DATE/TIME]. Thank you!"

**Template 3: Follow-up**
> Shortcut: /follow
> Message: "Hi [NAME], just checking in on your order from [DATE]. Is everything okay? Let us know if you need anything!"

**To use:** Type "/" in a WhatsApp chat → select the template → customize the [BRACKETS] → send.

### Scheduling Social Media in Advance

Instead of posting every day, batch your social media:

**The 1-hour weekly batch:**
1. Sunday evening, sit down for 1 hour
2. Plan 3-4 posts for the week
3. Create the content (photos, captions)
4. Use a scheduling tool:
   - **Meta Business Suite** (free): Schedule Facebook and Instagram posts
   - **Canva** (free): Design graphics and schedule them
   - **Later** (free basic): Schedule Instagram posts
5. Set them to post at the best times (7am, 12pm, 7pm)
6. Forget about social media for the rest of the week

---

### ✅ Worked Example: Ishyo Arts Center — Complete Reminder System

Ishyo is a performing arts center in Kacyiru. They host workshops, performances, and classes. They have 12 staff members and 200+ monthly attendees.

**Before:** The director manages everything in her head. She forgets to send workshop reminders, misses supplier deadlines, and double-books spaces.

**After — the complete system:**

**Google Calendar:**
- Every Monday at 8am: "Plan the week" (30 min)
- Every day at 7am: "Check WhatsApp messages"
- Every Wednesday at 2pm: "Review upcoming events"
- Every Friday at 5pm: "Reconcile weekly finances"
- Every 1st at 9am: "Pay rent and utilities"
- Every 1st at 10am: "Check Google Business Profile"

**Google Calendar shared with:** All 12 staff members (each with their own color)

**WhatsApp Quick Replies:**
- /book → Workshop booking confirmation
- /remind → Workshop reminder (sent 24 hours before)
- /cancel → Cancellation and refund process
- /follow → Post-workshop feedback request

**Weekly social media batch:**
- Every Sunday at 7pm, the marketing coordinator schedules 4 posts for the week using Meta Business Suite
- Posts go out at 7am, 12pm, and 7pm on Tuesday, Wednesday, Thursday, and Saturday

**Result:**
- Zero missed deadlines in 3 months
- Workshop attendance up 25% (automated reminders mean people actually show up)
- Marketing coordinator saves 5 hours/week on social media

---

### 📝 Your Exercise

1. Open Google Calendar and create all recurring events (daily, weekly, monthly)
2. Set reminders for each (1-day, 1-hour)
3. Create 3 WhatsApp Business quick reply templates for your most common messages
4. Plan and schedule your social media for next week in one sitting
5. Share your calendar with any employees or partners

**Time needed:** 1 hour to set up, 15 minutes per week to maintain
**Cost:** Free

---

### 📄 PDF Summary: Scheduling & Reminders That Run Themselves

> **Key Takeaways:**
>
> - Set up recurring calendar events for daily, weekly, and monthly tasks
> - Use Google Calendar with reminders (1-day and 1-hour before)
> - Create WhatsApp Business quick reply templates for common messages
> - Batch social media: plan and schedule 1 week of posts in 1 hour
> - Share your calendar with employees so everyone knows what's due
> - The goal: stop relying on memory, start relying on systems
>
> **Action Step:** Set up your Google Calendar with all recurring tasks today. Create 3 WhatsApp quick reply templates. Schedule your social media for next week.

---$$, 'reading', 20, 3, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l17_id, course_id, 'Building Simple Forms for Customer Data', 'Building Simple Forms for Customer Data', $$**Duration:** 25 minutes | **Type:** Reading

---

Every time a customer fills out a form — an order form, a feedback form, a registration form — that data goes straight into a spreadsheet you can analyze. No typing. No lost papers. No "I forgot to write it down."

Forms are the simplest automation tool, and they're free.

### When to Use Forms

**Order forms:** Customer fills out what they want → goes to your Google Sheet → you prepare the order
**Registration forms:** Customer signs up for an event/course → goes to your Sheet → you have their details
**Feedback forms:** Customer rates their experience → goes to your Sheet → you identify problems
**Lead capture forms:** Customer expresses interest → goes to your Sheet → you follow up
**Inventory request forms:** Staff reports what's needed → goes to your Sheet → you order supplies

### Building a Google Form (Step by Step)

**Example: Customer Order Form for a restaurant**

1. Go to forms.google.com
2. Click "+" to create a new form
3. Title: "Place Your Order — [Restaurant Name]"
4. Add questions:
   - Short answer: "Your name"
   - Short answer: "Phone number"
   - Multiple choice: "Pickup or delivery?" → Options: Pickup, Delivery
   - Short answer: "Delivery address" (show if delivery selected)
   - Checkbox: "What would you like?" → Options: Menu items
   - Number: "Quantity"
   - Paragraph: "Special instructions"
5. Click the settings gear → turn on "Collect email addresses" (optional)
6. Click "Send" → copy the link

**Share the form:**
- Put the link in your WhatsApp Business description
- Add it to your website
- Print a QR code and put it on your counter
- Share it on social media

### Linking Forms to Google Sheets

Every Google Form automatically creates a linked Google Sheet:

1. In your form, click the "Responses" tab
2. Click the green Sheets icon
3. Choose "Create a new spreadsheet"
4. Every form submission now appears as a row in the sheet

**This is where the magic happens:** You can now:
- Sort submissions by date, name, or any field
- Filter to find specific orders
- Create charts to see trends
- Share the sheet with your team

### Practical Form Templates

**Template 1: Customer Feedback Form**
1. "How would you rate your experience?" (1-5 stars)
2. "What did you like most?" (Short answer)
3. "What could we improve?" (Paragraph)
4. "Would you recommend us to a friend?" (Yes/No)
5. "Anything else?" (Paragraph)

**Template 2: Event Registration Form**
1. "Full name"
2. "Phone number"
3. "Email" (optional)
4. "How many tickets?" (Number)
5. "Dietary requirements?" (Short answer)
6. "How did you hear about us?" (Multiple choice)

**Template 3: Staff Supply Request Form**
1. "Your name"
2. "Item needed"
3. "Quantity"
4. "Urgency" (Low/Medium/High)
5. "Why is it needed?" (Short answer)

### Automating Form Responses

When a form is submitted, you can trigger actions:

**Google Apps Script (free, no coding needed for simple tasks):**

1. In your linked Google Sheet, go to Extensions → Apps Script
2. Write a simple script to send a WhatsApp message when a new order comes in:

```javascript
function onFormSubmit(e) {
  var name = e.values[1];
  var phone = e.values[2];
  var order = e.values[3];
  // You can integrate with WhatsApp API here
  Logger.log("New order from " + name + ": " + order);
}
```

3. Set up a trigger: Run this function every time a form is submitted

**Simpler alternative:** Just check your Google Sheet regularly. If you get 10-20 submissions per day, checking every hour is fine.

---

### ✅ Worked Example: Inzuki Designs — Order Form

Inzuki sells handmade jewelry and crafts. They get orders via WhatsApp, but messages get buried and orders get lost.

**Solution: Google Form order system**

**Form: "Order from Inzuki"**

Questions:
1. "Your name" (Short answer, required)
2. "Phone number" (Short answer, required)
3. "Item" (Multiple choice: Necklaces, Bracelets, Earrings, Custom)
4. "Quantity" (Number, required)
5. "Color preference" (Short answer)
6. "Delivery or pickup?" (Multiple choice: Delivery, Pickup at Kimironko shop)
7. "Delivery address" (Paragraph, show if delivery)
8. "How did you find us?" (Multiple choice: Instagram, WhatsApp, Friend, Google, Other)

**Linked Google Sheet columns:**
Timestamp | Name | Phone | Item | Qty | Color | Method | Address | Source

**How it works:**
1. Inzuki shares the form link on Instagram bio, WhatsApp status, and website
2. Customer fills out the form
3. Response appears in the Google Sheet instantly
4. Inzuki checks the sheet every 2 hours
5. For each new order: sends a WhatsApp confirmation with price and payment details

**After 1 month:**
- 45 orders placed via form (vs. 30 via WhatsApp — customers prefer the form because it's structured)
- Zero lost orders (everything is in the Sheet)
- Clear data on where customers come from (60% Instagram, 25% WhatsApp, 15% Google)

---

### 📝 Your Exercise

1. Think: what form would save you the most time? (Orders, feedback, registration, or supply requests)
2. Create a Google Form with 5-7 questions
3. Link it to a Google Sheet
4. Share the form link with 10 customers or contacts
5. Process the first 5 submissions
6. Add the form link to your WhatsApp Business profile and social media bio

**Time needed:** 30 minutes to create, ongoing use
**Cost:** Free

---

### 📄 PDF Summary: Building Simple Forms for Customer Data

> **Key Takeaways:**
>
> - Google Forms are free and automatically save responses to Google Sheets
> - Use forms for orders, registrations, feedback, and supply requests
> - Link forms to Google Sheets for instant data collection — no typing required
> - Share form links on WhatsApp, social media, and your website
> - Forms give you structured data you can sort, filter, and analyze
> - Start with one form for your most common customer interaction
>
> **Action Step:** Create a Google Form for your most common customer interaction. Share the link with 10 people this week.

---

## Module 4 Quiz

**5 Questions — Passing score: 4/5**

1. **Which tasks should you automate FIRST?**
   - A) Customer complaints
   - B) Strategic business decisions
   - C) Invoices, payment reminders, and daily summaries
   - D) Building customer relationships

2. **What's the biggest benefit of automated payment reminders?**
   - A) They look professional
   - B) They ensure customers pay on time without you having to remember to follow up
   - C) They reduce your phone bill
   - D) They eliminate the need for invoices

3. **How often should you batch your social media posts?**
   - A) Every hour
   - B) Once a month
   - C) Once a week — plan and schedule 1 week of content in 1 hour
   - D) Only when you have something to sell

4. **What happens when someone fills out a Google Form?**
   - A) You get an email notification only
   - B) The response is automatically saved to a linked Google Sheet
   - C) You have to manually enter the data
   - D) The form deletes itself

5. **What should you NOT automate?**
   - A) Sending invoices
   - B) Appointment reminders
   - C) Handling customer complaints and refunds
   - D) Daily sales summaries

**Answers:** 1-C, 2-B, 3-C, 4-B, 5-C

---

## Certificate Checkpoint: Module 4 Complete

**You've learned:**
- How to prioritize what to automate using the time audit
- How to set up automated invoicing with free tools
- How to create a reminder system that runs itself
- How to build Google Forms for customer data collection

**Certificate:** Complete the quiz with 4/5 correct answers to unlock your Module 4 certificate and proceed to Module 5.$$, 'reading', 25, 4, true);


  -- MODULE 5: AI Tools for Marketing & Customer Service
  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l18_id, course_id, 'AI Tools Every Business Owner Should Know', 'AI Tools Every Business Owner Should Know', $$**Duration:** 20 minutes | **Type:** Reading

---

AI isn't coming for your business — it's already here, and your competitors are using it. The good news: you don't need to be a tech expert to use AI tools. You just need to know which ones exist and how they help your business.

### What AI Can Actually Do for Your Business

AI tools are software that can:
- **Write text** — marketing copy, product descriptions, social media posts, emails
- **Create images** — product photos, social media graphics, logos
- **Answer customer questions** — chatbots that respond 24/7
- ** analyze data** — find patterns in your sales and customer data
- **Schedule and automate** — handle repetitive tasks without human intervention

AI won't replace your judgment, your relationships, or your creativity. But it can handle the 80% of routine work that eats your time.

### The AI Toolkit for Rwandan Small Businesses

**For writing and content (free):**

| Tool | What it does | Cost | Best for |
|---|---|---|---|
| **ChatGPT** | Writes text, answers questions, generates ideas | Free basic, RWF 15,000/mo for Plus | Marketing copy, emails, plans |
| **Google Gemini** | Similar to ChatGPT, integrated with Google | Free | Quick questions, research |
| **Canva AI** | Designs graphics, removes backgrounds, generates images | Free basic | Social media posts, flyers |

**For customer service (free to start):**

| Tool | What it does | Cost | Best for |
|---|---|---|---|
| **ManyChat** | WhatsApp/Instagram chatbot | Free basic | Automated customer responses |
| **Chatfuel** | Facebook Messenger chatbot | Free basic | FAQ automation |
| **Tidio** | Website live chat + chatbot | Free basic | Website customer support |

**For marketing automation (free to start):**

| Tool | What it does | Cost | Best for |
|---|---|---|---|
| **Mailchimp** | Email marketing | Free up to 500 contacts | Newsletters, promotions |
| **Canva** | Social media design + scheduling | Free basic | Visual marketing |
| **Buffer** | Social media scheduling | Free (3 channels) | Multi-platform posting |

### Getting Started with ChatGPT

ChatGPT is the most versatile AI tool for business. Here's how to use it:

**Visit:** chatgpt.com (or download the app)
**Create an account:** Free email signup
**Start typing:** Ask it anything

**Business prompts that work:**

1. "Write a WhatsApp message to remind my customers about our end-of-month sale. We sell clothing in Kigali. Tone: friendly, urgent."
2. "Create 5 Instagram post ideas for a restaurant in Remera, Kigali. Include hashtags."
3. "Write a professional email to a supplier requesting a price quote for 100 bags of rice."
4. "Help me write a job description for a part-time cashier at my shop in Nyamirambo."
5. "Create a simple business plan outline for a mobile money agent shop."

**Important:** Always review and edit AI output. It doesn't know your business as well as you do. Use it as a starting point, not a final product.

### The "AI Won't Replace You" Mindset

AI is a tool, not a replacement. It can write a social media post, but it can't:
- Know what your customers actually want
- Build genuine relationships
- Make ethical business decisions
- Understand local context and culture
- Feel empathy for a frustrated customer

Use AI for the 80% of routine work. Keep the 20% that requires human judgment for yourself.

---

### ✅ Worked Example: Umuco Bookshop — AI for Marketing

Umuco is a small bookshop in Kimihurura. The owner, Alice, wants to post on social media but doesn't know what to write.

**Using ChatGPT:**

Alice opens ChatGPT and types:
> "I run a bookshop in Kimihurura, Kigali. Write 3 Instagram posts for this week. One should promote a new arrivals, one should be a reading tip, and one should be a customer spotlight. Use emojis and include hashtags."

**ChatGPT output:**
> **Post 1 (New Arrivals):**
> 📚 New this week! "Atomic Habits" by James Clear is finally back in stock. Transform your habits, transform your life. 📍 Kimihurura, open Mon-Sat 9am-7pm. #KigaliBooks #RwandaReads #BookShopKigali
>
> **Post 2 (Reading Tip):**
> 💡 Reading tip: Set a timer for 20 minutes and read without your phone. You'll be surprised how much you get through! What are you reading this week? Tell us in the comments 👇 #ReadingTip #KigaliLife
>
> **Post 3 (Customer Spotlight):**
> 🌟 Meet David, one of our regulars! He's read 12 books from our shop this year. "Reading has changed how I think about my business," he says. Come find your next great read! #KigaliBooks #ReadingCommunity

**Alice edits the posts** to add her own voice and specific details, then schedules them using Meta Business Suite.

**Time spent:** 15 minutes (instead of 2 hours of staring at a blank screen).

---

### 📝 Your Exercise

1. Create a ChatGPT account (free)
2. Use these 5 prompts to generate content for your business:
   - [ ] A WhatsApp message for a promotion
   - [ ] 3 Instagram post ideas
   - [ ] A professional email to a supplier
   - [ ] A job description (if applicable)
   - [ ] A simple business plan outline
3. Edit each output to match your voice and business
4. Publish at least one AI-generated piece of content this week

**Time needed:** 30 minutes
**Cost:** Free

---

### 📄 PDF Summary: AI Tools Every Business Owner Should Know

> **Key Takeaways:**
>
> - AI can write text, create images, answer customer questions, and automate tasks
> - ChatGPT (free) is the most versatile tool for business writing and ideas
> - Canva AI (free) handles graphic design and social media visuals
> - Always review and edit AI output — it's a starting point, not a final product
> - AI handles the 80% of routine work; you handle the 20% requiring human judgment
>
> **Action Step:** Sign up for ChatGPT. Use the 5 business prompts listed in this lesson. Edit and publish at least one piece of AI-generated content.

---$$, 'reading', 20, 1, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l19_id, course_id, 'Creating Marketing Content with AI', 'Creating Marketing Content with AI', $$**Duration:** 25 minutes | **Type:** Reading

---

Creating marketing content takes time. AI can cut that time by 70-80% — but only if you know how to prompt it correctly.

### The Art of Good AI Prompts

A bad prompt: "Write a social media post."
A good prompt: "Write an Instagram post for a hair salon in Kigali. We're running a 20% discount on braids this week. Target audience: women aged 18-35. Tone: friendly, confident. Include 5 hashtags."

The more specific your prompt, the better the output.

### The 5-Part Prompt Formula

**Part 1: Role** — Tell AI who to be
> "You are a social media manager for a restaurant in Kigali."

**Part 2: Task** — Tell it what to do
> "Write 3 Instagram posts for this week."

**Part 3: Context** — Give it background
> "We serve Rwandan and international cuisine. Our best-selling dish is the Chicken Platter. We're located in Remera."

**Part 4: Style** — How should it sound?
> "Tone: warm, inviting, slightly playful. Use emojis. Keep each post under 150 words."

**Part 5: Format** — How should it look?
> "Each post should have: hook line, body, call-to-action, and 5 hashtags."

### Content Templates for Common Business Needs

**Template 1: Product announcement**
> Prompt: "Write a WhatsApp broadcast message announcing a new product at my [BUSINESS TYPE] in [LOCATION]. Product: [NAME]. Price: [PRICE]. Why it's special: [FEATURE]. Tone: excited but not pushy."

**Template 2: Customer testimonial post**
> Prompt: "Create an Instagram post featuring a customer review. Business: [TYPE] in [LOCATION]. Review: '[PASTE REVIEW]'. Make it feel authentic and grateful. Include a call-to-action."

**Template 3: Educational content**
> Prompt: "Write a short, practical tip related to [YOUR INDUSTRY] for small business owners in Rwanda. Keep it under 200 words. Make it actionable — something they can do today."

**Template 4: Promotional email**
> Prompt: "Write a promotional email for [BUSINESS NAME]. Offer: [DISCOUNT/DEAL]. Valid until: [DATE]. Tone: professional but warm. Include: headline, 3 bullet points of what's included, clear call-to-action button."

### Creating Images with AI

**Canva AI (Magic Design):**
1. Open Canva → Create a design
2. Click "Magic Design" or "Text to Image"
3. Describe what you want: "A warm, inviting photo of a plate of grilled chicken with fries and salad, African restaurant setting, natural lighting"
4. Canva generates options
5. Edit and add your text

**For social media posts:**
1. Choose a template (Instagram post, Facebook post, etc.)
2. Use AI to generate a background image
3. Add your text overlay (use the prompt from ChatGPT)
4. Download and post

### Batch Content Creation (The 2-Hour Monthly System)

**Once a month, spend 2 hours creating all your content:**

1. **Hour 1: Write all content**
   - Use ChatGPT to generate 12 posts (3 per week × 4 weeks)
   - Edit each one to match your voice
   - Write 4 WhatsApp broadcast messages (1 per week)

2. **Hour 2: Create all graphics**
   - Use Canva to design 12 social media graphics
   - Create 4 WhatsApp Status images
   - Design 1 promotional flyer for the month's special

**Result:** You have 4 weeks of content ready. Schedule it using Meta Business Suite or Buffer. Done for the month.

---

### ✅ Worked Example: Inzozi Café — Monthly Content Batch

Inzozi Café in Kimihurura wants to post 3 times per week on Instagram and send 1 WhatsApp broadcast per week.

**Hour 1: Writing (60 minutes)**

Alice uses ChatGPT with the 5-part prompt formula:

> "You are a social media manager for Inzozi Café, a cozy coffee shop in Kimihurura, Kigali. Write 12 Instagram posts for September 2026 — 3 per week. Our specialties: Rwandan single-origin coffee, fresh pastries, light lunches. Tone: warm, community-focused, slightly witty. Each post should have: hook, body, CTA, and 5 hashtags. Also write 4 WhatsApp broadcast messages for weekly promotions."

ChatGPT generates 12 posts and 4 broadcasts. Alice edits each one in 3-5 minutes.

**Hour 2: Designing (60 minutes)**

Alice opens Canva and creates:
- 12 Instagram post graphics using café photos and AI-generated backgrounds
- 4 WhatsApp Status images with promotional text
- 1 flyer for September's special: "Iftar Coffee Deal — Buy one, get one free during Ramadan"

**Scheduling:**
Alice opens Meta Business Suite and schedules all 12 Instagram posts at optimal times (7am, 12pm, 7pm on Tuesdays, Thursdays, Saturdays).

**Result:** Inzozi has 4 weeks of content ready in 2 hours. Alice doesn't think about social media again until next month's batch session.

---

### 📝 Your Exercise

1. Use the 5-part prompt formula to write 4 social media posts for your business
2. Use Canva AI to create graphics for each post
3. Write 1 WhatsApp broadcast message for a promotion
4. Schedule everything for next week using Meta Business Suite or manual posting
5. Time yourself — how long did it take? (Target: under 2 hours)

**Time needed:** 2 hours
**Cost:** Free

---

### 📄 PDF Summary: Creating Marketing Content with AI

> **Key Takeaways:**
>
> - Good AI prompts include: Role, Task, Context, Style, and Format
> - Use templates for product announcements, testimonials, tips, and promotions
> - Canva AI generates graphics from text descriptions
> - Batch your content: create 4 weeks of posts in a 2-hour monthly session
> - Always edit AI output to add your personal voice and local context
>
> **Action Step:** Do a 2-hour content batch this week. Create 4 weeks of social media posts using AI. Schedule them in advance.

---$$, 'reading', 25, 2, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l20_id, course_id, 'Chatbots & Automated Customer Support', 'Chatbots & Automated Customer Support', $$**Duration:** 25 minutes | **Type:** Reading

---

Your customers have questions. Most of them are the same 5 questions: "What are your prices?" "Where are you located?" "Are you open today?" "Do you deliver?" "How do I pay?"

A chatbot answers these questions 24/7 without you lifting a finger.

### Why Chatbots Matter for Small Business

**Without a chatbot:**
- Customer messages at 10pm: "What are your prices?"
- You see it at 7am: "Sorry, we're open now! Here are the prices..."
- Customer already went to a competitor

**With a chatbot:**
- Customer messages at 10pm: "What are your prices?"
- Bot responds instantly: "Here are our current prices: [list]. Would you like to order?"
- Customer orders at 10pm, you fulfill it in the morning

### Setting Up a WhatsApp Auto-Reply (Simplest Option)

WhatsApp Business has built-in auto-reply features:

**Away message (when you're closed):**
1. Open WhatsApp Business → Settings → Business Tools → Away Message
2. Turn on "Send away message"
3. Write: "Thanks for messaging [Business Name]! We're currently closed. We're open Mon-Sat 8am-6pm. Leave your message and we'll respond first thing in the morning. For urgent inquiries, call [PHONE]."
4. Set schedule: Automatically send outside business hours

**Greeting message (first contact):**
1. Settings → Business Tools → Greeting Message
2. Write: "Welcome to [Business Name]! 🎉 How can we help you today? Reply with: 1️⃣ for Prices, 2️⃣ for Location & Hours, 3️⃣ to Place an Order, 4️⃣ for Other Questions"
3. This sends automatically when someone messages you for the first time

**Quick replies (for common questions):**
1. Settings → Business Tools → Quick Replies
2. Create templates:
   - /prices → "Our current prices: [list]. Want to order?"
   - /location → "We're at [ADDRESS]. Open Mon-Sat 8am-6pm. Google Maps: [LINK]"
   - /delivery → "We deliver within Kigali! Delivery fee: RWF 2,000-5,000 depending on location."

### Setting Up a Chatbot with ManyChat (More Advanced)

ManyChat creates a chatbot for WhatsApp, Instagram, or Facebook:

1. Go to manychat.com → Sign up (free)
2. Connect your WhatsApp Business or Instagram account
3. Create automated flows:

**Flow 1: Price inquiry**
- Trigger: Customer sends "price" or "prices"
- Bot responds: "Here are our current prices: [list]. Would you like to: 1) Order now, 2) Visit our shop, 3) Talk to a person"

**Flow 2: Order taking**
- Trigger: Customer selects "Order now"
- Bot asks: "What would you like to order?"
- Customer selects items
- Bot asks: "Pickup or delivery?"
- Bot asks: "Your name and phone number?"
- Bot confirms: "Order placed! Total: RWF [AMOUNT]. Pay via MoMo to [CODE]. We'll confirm when ready."

**Flow 3: Business hours**
- Trigger: Customer sends "hours" or "open"
- Bot responds: "We're open Mon-Sat 8am-6pm, Sunday 10am-4pm. Currently [OPEN/CLOSED]."

### When to Hand Off to a Human

A chatbot should handle 80% of inquiries. But some things need a human:

**Always hand off to a human:**
- Complaints or refunds
- Complex orders with special requirements
- Questions the bot doesn't understand (after 2 failed attempts)
- Customer explicitly asks for a person

**In ManyChat, set up a "Talk to human" option:**
- In every flow, add "Talk to a person" as an option
- When selected, it sends a notification to your phone
- You take over the conversation manually

---

### ✅ Worked Example: Fresh Bites Juice Bar — Chatbot Setup

Fresh Bites in Nyamirambo sells fresh juices and smoothies. They get 30+ WhatsApp messages per day, mostly asking the same questions.

**Setup (1 hour):**

1. **WhatsApp Business auto-reply:**
   - Greeting: "Hey! 🍹 Welcome to Fresh Bites. Reply: 1 for Menu, 2 for Location, 3 to Order, 4 for Delivery info"
   - Away message: "We're closed! Open Mon-Sat 7am-7pm. Leave your order and we'll prepare it first thing."
   - Quick replies: /menu, /location, /delivery, /order

2. **ManyChat Instagram bot (30 minutes):**
   - Connected Instagram business account
   - Created 3 flows: Menu, Location, Order
   - Set up "Talk to human" handoff for complaints

**Results after 1 month:**
- Messages answered instantly (24/7)
- 60% of orders now come through the bot (no human needed)
- Owner spends 30 minutes/day on WhatsApp instead of 2 hours
- Customer satisfaction up — they love getting instant responses

---

### 📝 Your Exercise

1. Set up WhatsApp Business greeting message and away message
2. Create 3 quick reply templates for your most common questions
3. If you want a more advanced chatbot, sign up for ManyChat (free)
4. Create 2 automated flows: FAQ and order taking
5. Test the bot by messaging yourself from a different number
6. Add a "Talk to a person" option in every flow

**Time needed:** 1 hour
**Cost:** Free

---

### 📄 PDF Summary: Chatbots & Automated Customer Support

> **Key Takeaways:**
>
> - Customers ask the same 5 questions — a chatbot answers them 24/7
> - Start with WhatsApp Business: greeting message, away message, quick replies
> - ManyChat (free) creates more advanced chatbots for WhatsApp and Instagram
> - A chatbot should handle 80% of inquiries; hand off complex issues to a human
> - Test your bot thoroughly before making it live
>
> **Action Step:** Set up WhatsApp Business auto-replies today. Create 3 quick reply templates. Test with a friend.

---$$, 'reading', 25, 3, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l21_id, course_id, 'AI for Customer Feedback & Insights', 'AI for Customer Feedback & Insights', $$**Duration:** 20 minutes | **Type:** Reading

---

You can't improve what you don't measure. And you can't measure customer satisfaction without asking. AI makes collecting and analyzing feedback easier than ever.

### Why Customer Feedback Matters

Without feedback, you're guessing:
- You think your food is great, but customers are leaving because portions are small
- You think your prices are competitive, but customers think they're too high
- You think your service is fast, but customers wait 30 minutes

With feedback, you know:
- Exactly what customers love (do more of it)
- Exactly what they hate (fix it)
- What they wish you offered (new products/services)

### Collecting Feedback with AI

**Method 1: Google Forms (Post-Purchase)**
Create a 3-question feedback form:
1. "How would you rate your experience?" (1-5 stars)
2. "What did you like most?" (Short answer)
3. "What could we improve?" (Short answer)

Share the form link via WhatsApp after each sale:
> "Thanks for your purchase! We'd love your feedback: [FORM LINK]. It takes 30 seconds."

**Method 2: WhatsApp Quick Survey**
Send a simple message:
> "Hi [Name]! Quick question: How was your experience today? Reply with a number: 1 (Bad) to 5 (Excellent)"

Record responses in a Google Sheet.

**Method 3: Instagram Story Polls**
Use Instagram's built-in poll sticker:
- "How was your last visit?" → 😍 Love it / 😐 It was okay / 😕 Needs improvement
- "What should we add to the menu?" → Option A / Option B
- "When should we be open late?" → Friday / Saturday / Both

### Analyzing Feedback with AI

Once you have feedback data, use AI to find patterns:

**Step 1: Export your feedback**
Copy all responses from your Google Sheet into ChatGPT:

> "Here are 50 customer feedback responses for my restaurant in Kigali. Analyze them and tell me:
> 1. The top 3 things customers love
> 2. The top 3 things customers want improved
> 3. Any patterns in negative feedback
> 4. Specific suggestions I should implement
> 5. A summary I can share with my team"

**Step 2: Get actionable insights**
ChatGPT will analyze the feedback and give you:
- Common themes (e.g., "60% of negative feedback mentions slow service")
- Specific suggestions (e.g., "Add a lunch combo deal — mentioned 8 times")
- Priority actions (e.g., "Fix wait times — this is your biggest complaint")

**Step 3: Take action**
Create a simple action plan:

| Feedback Theme | Action | Timeline | Owner |
|---|---|---|---|
| Slow service during lunch | Add 1 staff member during 12-2pm | This week | Manager |
| Need vegetarian options | Add 3 vegetarian dishes to menu | This month | Chef |
| Parking is difficult | Add parking directions to Google listing | Today | Owner |

### Closing the Feedback Loop

When you make a change based on feedback, tell your customers:

**Social media post:**
> "You asked, we listened! 🎉 Based on your feedback, we've: ✅ Added 3 new vegetarian options ✅ Extended hours on Saturdays ✅ Increased portion sizes. Thank you for helping us improve! 🙏"

This shows customers their feedback matters and encourages more people to share.

---

### ✅ Worked Example: Umubano Hotel — AI Feedback Analysis

Umubano Hotel in Kigali wants to improve guest satisfaction. They collect feedback via Google Forms sent to guests after checkout.

**Month 1: Collection**
- 87 responses collected
- Average rating: 3.8/5

**Month 2: AI Analysis**

The manager copies all 87 responses into ChatGPT:

> "Analyze these 87 hotel guest feedback responses. Identify: top 3 positives, top 3 complaints, patterns, and actionable recommendations."

**ChatGPT insights:**
- **Top positives:** Staff friendliness (mentioned 62 times), clean rooms (45), good location (38)
- **Top complaints:** Slow WiFi (mentioned 41 times), breakfast variety (28), noisy construction nearby (19)
- **Pattern:** WiFi complaints spike on weekends when hotel is full — bandwidth issue
- **Recommendations:** Upgrade WiFi package, add 3 breakfast items, provide earplugs and room relocation for light sleepers

**Month 3: Action**
1. Upgraded WiFi package (RWF 150,000/month → RWF 250,000/month)
2. Added 3 new breakfast items (matooke, chapati, fresh fruit)
3. Created a "quiet rooms" section away from construction

**Month 4: Results**
- Average rating: 4.3/5 (up from 3.8)
- WiFi complaints: 3 (down from 41)
- Breakfast satisfaction: 92% positive (up from 65%)

---

### 📝 Your Exercise

1. Create a 3-question Google Form for customer feedback
2. Share the form link with 10 customers this week
3. Collect at least 20 responses
4. Copy all responses into ChatGPT for analysis
5. Identify your top 3 positives and top 3 improvements
6. Create an action plan with timelines
7. Make one change this week based on feedback

**Time needed:** 30 minutes setup, ongoing collection
**Cost:** Free

---

### 📄 PDF Summary: AI for Customer Feedback & Insights

> **Key Takeaways:**
>
> - Collect feedback via Google Forms, WhatsApp surveys, or Instagram polls
> - Use ChatGPT to analyze feedback and find patterns you'd miss manually
> - Create an action plan: theme → action → timeline → owner
> - Close the feedback loop: tell customers what you changed because of their input
> - Feedback is free market research — use it to make better business decisions
>
> **Action Step:** Create a feedback form. Collect 20 responses. Analyze with ChatGPT. Make one change this week.

---

## Module 5 Quiz

**5 Questions — Passing score: 4/5**

1. **What's the most versatile free AI tool for business writing and ideas?**
   - A) Excel
   - B) ChatGPT
   - C) Photoshop
   - D) YouTube

2. **What are the 5 parts of a good AI prompt?**
   - A) Who, What, Where, When, How
   - B) Role, Task, Context, Style, Format
   - C) Name, Date, Time, Location, Amount
   - D) Title, Body, Signature, Hashtags, Link

3. **What should a chatbot handle, and what should it hand off to a human?**
   - A) Handle everything — humans aren't needed
   - B) Handle 80% of routine questions; hand off complaints, complex orders, and requests for a person
   - C) Handle nothing — all customer communication should be human
   - D) Handle only after-hours messages

4. **How often should you batch-create social media content?**
   - A) Every day
   - B) Once a month — create 4 weeks of content in a 2-hour session
   - C) Only when you have a promotion
   - D) Never — post spontaneously

5. **What's the "feedback loop"?**
   - A) Asking customers for feedback
   - B) Making changes based on feedback and telling customers about it
   - C) Reading reviews on Google
   - D) Counting your sales

**Answers:** 1-B, 2-B, 3-B, 4-B, 5-B

---

## Certificate Checkpoint: Module 5 Complete

**You've learned:**
- The essential AI tools for small business (ChatGPT, Canva, ManyChat)
- How to create marketing content with AI prompts
- How to set up chatbots for automated customer support
- How to collect and analyze customer feedback with AI

**Certificate:** Complete the quiz with 4/5 correct answers to unlock your Module 5 certificate and proceed to Module 6.$$, 'reading', 20, 4, true);


  -- MODULE 6: Cybersecurity for Small Business
  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l22_id, course_id, 'The 5 Threats Every Rwandan Business Faces', 'The 5 Threats Every Rwandan Business Faces', $$**Duration:** 20 minutes | **Type:** Reading

---

You don't need to be a tech company to be a target. In Rwanda, small businesses face the same cyber threats as large corporations — they just have fewer defenses.

### Threat 1: Phone Theft and SIM Swap

Your phone holds your business: mobile money, customer data, WhatsApp conversations, banking apps. If it's stolen, the thief has everything.

**SIM swap:** A scammer tricks your mobile provider into transferring your phone number to their SIM card. They then receive your OTP codes and access your mobile money and bank accounts.

**How common:** In 2024, the Rwanda Investigation Bureau reported a 40% increase in mobile money fraud cases.

### Threat 2: Phishing Messages

You receive an SMS or WhatsApp message that looks like it's from MTN, your bank, or a government agency:

> "URGENT: Your MoMo account has been suspended. Click here to verify: [LINK]"

You click. You enter your PIN. A thief now has your PIN and drains your account.

**Red flags:**
- Messages creating urgency ("Your account will be closed!")
- Links that don't match the official website
- Requests for your PIN or password
- Messages from unknown numbers

### Threat 3: Weak Passwords

If your password is "123456" or "password" or your birthday, you're not protected. Most people use the same password for everything. If one site gets hacked, all your accounts are compromised.

### Threat 4: Employee Access

Your employee processes a payment on your phone. They see your MoMo PIN. They notice you don't change it. They wait until you're not looking and transfer money to their account.

This isn't a cyber threat — it's a human threat. But the result is the same: money gone.

### Threat 5: Fake Invoices and Payment Scams

You receive an email or WhatsApp message with an invoice for something you didn't order:

> "Invoice #4521: Website hosting renewal, RWF 150,000. Pay within 7 days."

If you pay without verifying, you've sent money to a scammer.

### The Cost of Ignoring Cybersecurity

| Threat | Potential Loss | Prevention Cost |
|---|---|---|
| Phone theft | Everything on your phone | RWF 0 (free security settings) |
| Phishing | RWF 100,000-5,000,000+ | RWF 0 (awareness) |
| Weak passwords | All connected accounts | RWF 0 (free password manager) |
| Employee theft | RWF 50,000-500,000 | RWF 0 (access controls) |
| Fake invoices | RWF 50,000-1,000,000 | RWF 0 (verification habit) |

---

### ✅ Worked Example: Agaciro Trading — Phone Theft Disaster

Agaciro Trading is a import-export business in Kigali. The owner, Emmanuel, uses one phone for everything: personal WhatsApp, business MoMo, email, banking.

**What happened:**
Emmanuel's phone was stolen at a bus stop. Within 2 hours:
- Thief accessed his phone (no screen lock)
- Transferred RWF 450,000 from his MoMo to unknown numbers
- Accessed his email and sent fake invoices to his customers
- Read his WhatsApp messages and impersonated him to request money from contacts

**Total loss:** RWF 680,000 in direct theft + RWF 200,000 in damaged customer relationships

**What could have prevented it:**
- Screen lock (PIN or fingerprint) → Thief can't access phone
- Separate phones for personal and business → Business data isn't on the stolen phone
- MoMo PIN different from screen lock → Can't access mobile money
- Remote wipe capability → Can delete all data remotely

---

### 📝 Your Exercise

1. Check: does your phone have a screen lock? If not, set one up now (Settings → Security → Screen Lock)
2. Check: is your MoMo PIN different from your screen lock? If not, change it
3. Check: do you use the same password everywhere? If yes, start changing them (Lesson 6.2)
4. Check: do you have remote wipe enabled? (Settings → Security → Find My Device → Enable)
5. Check: do you open links from unknown SMS/WhatsApp messages? If yes, stop

**Time needed:** 15 minutes
**Cost:** Free

---

### 📄 PDF Summary: The 5 Threats Every Rwandan Business Faces

> **Key Takeaways:**
>
> - Phone theft, phishing, weak passwords, employee access, and fake invoices are the top threats
> - Your phone is your biggest vulnerability — protect it with a screen lock
> - Never click links in unsolicited SMS or WhatsApp messages
> - Use different passwords for different accounts
> - Enable remote wipe so you can delete data if your phone is stolen
>
> **Action Step:** Set up a screen lock, enable remote wipe, and change your MoMo PIN today.

---$$, 'reading', 20, 1, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l23_id, course_id, 'Passwords, 2FA & Account Security', 'Passwords, 2FA & Account Security', $$**Duration:** 25 minutes | **Type:** Reading

---

Your password is the lock on your digital front door. A weak password is like leaving the door open with a sign that says "come in."

### The Password Rules That Actually Matter

**Rule 1: Use a different password for every account**
If you use the same password everywhere and one site gets hacked, every account is compromised.

**Rule 2: Make passwords long, not complex**
- Bad: `P@DOUBLEDOLLAR$w0rd` (8 characters, looks complex, easy to crack)
- Good: `my-shop-in-kigali-2026!` (24 characters, easy to remember, extremely hard to crack)

**Rule 3: Use a password manager**
A password manager remembers all your passwords so you only need to remember one master password.

**Free password managers:**
- **Google Password Manager** — built into Chrome and Android
- **Bitwarden** — free, works on all devices
- **Apple Keychain** — built into iPhones and Macs

**How to use Google Password Manager:**
1. Open Chrome → Settings → Passwords
2. Turn on "Offer to save passwords"
3. When you log into a site, Chrome asks to save the password
4. Next time you visit, Chrome fills it in automatically
5. To see your saved passwords: Chrome → Settings → Passwords → click the eye icon

### Two-Factor Authentication (2FA)

2FA means even if someone steals your password, they can't access your account without a second code (usually sent to your phone).

**Where to enable 2FA (do all of these):**
- [ ] Google account (Gmail, YouTube, Drive)
- [ ] WhatsApp (Settings → Account → Two-step verification)
- [ ] Facebook/Instagram
- [ ] Mobile money (MTN and Airtel support this)
- [ ] Your email provider
- [ ] Banking apps

**How to enable 2FA on WhatsApp:**
1. Open WhatsApp → Settings → Account → Two-step verification
2. Tap "Enable"
3. Enter a 6-digit PIN (different from your screen lock)
4. Enter your email (for recovery)
5. Done — every time you install WhatsApp on a new phone, you need this PIN

### Protecting Your Mobile Money

**MTN MoMo security settings:**
1. Dial *182# → My Account → Security
2. Change your PIN quarterly (every 3 months)
3. Set transaction limits
4. Enable transaction notifications (SMS for every transaction)

**Airtel Money security settings:**
1. Dial *500# → My Account → Security
2. Change PIN regularly
3. Set daily limits
4. Enable notifications

**Critical rule:** Never share your MoMo PIN with anyone. Not with "MTN agents" who call you. Not with employees. Not with family. No legitimate company will ever ask for your PIN.

### The "Verify Before You Pay" Habit

Before paying any invoice or clicking any link:

1. **Check the sender:** Is this email/number from a known contact?
2. **Check the request:** Does this make sense? Did you order this?
3. **Check the link:** Hover over it (or long-press on mobile). Does the URL match the real website?
4. **Verify separately:** Call the person or company using a known number (not the one in the message)

**Example:**
> Message: "Your website hosting expires today. Pay RWF 15,000 to save your site."
> → Don't click the link. Open your browser and go to your hosting provider's website directly. Log in. Check if it's actually expiring.

---

### ✅ Worked Example: Umwiza Boutique — Password Cleanup

Umwiza is a clothing boutique with 3 staff members. The owner, Diane, uses the same password for everything: her birthday + "123". She shares it with all employees.

**Security audit:**

| Account | Current Password | Risk Level |
|---|---|---|
| Gmail | diane1990123 | 🔴 High — same as everything |
| MoMo | 1990123 | 🔴 High — same as screen lock |
| Instagram | diane1990123 | 🔴 High — shared with employees |
| Facebook | diane1990123 | 🔴 High — shared with employees |
| Website admin | diane1990123 | 🔴 Critical — anyone can access |

**Diane's action plan:**

**Day 1: Password manager setup**
1. Downloaded Bitwarden (free)
2. Created a strong master password: `Umwiza-Boutique-Kigali-2026!`
3. Saved all accounts in Bitwarden

**Day 2: Changed critical passwords**
1. Gmail: new unique password (generated by Bitwarden)
2. MoMo: new PIN (different from screen lock)
3. Website admin: new unique password

**Day 3: Changed remaining passwords**
1. Instagram: new unique password
2. Facebook: new unique password

**Day 4: Enabled 2FA**
1. WhatsApp two-step verification
2. Gmail 2FA (sends code to phone)
3. Facebook 2FA

**Day 5: Employee access**
1. Created separate accounts for employees (not shared passwords)
2. Gave employees limited permissions (can post on social media, can't access admin)
3. Set a reminder to change passwords every 3 months

**Total time:** 3 hours over 5 days
**Cost:** RWF 0
**Result:** Diane's accounts are now protected even if one password is compromised.

---

### 📝 Your Exercise

1. Download a password manager (Google Password Manager or Bitwarden)
2. Change your 3 most critical passwords today (email, MoMo, banking)
3. Make each password long and unique (use the password manager to generate them)
4. Enable 2FA on WhatsApp, Gmail, and your most important accounts
5. Check: do you share passwords with employees? If yes, create separate accounts
6. Set a calendar reminder: "Change passwords" every 3 months

**Time needed:** 1-2 hours
**Cost:** Free

---

### 📄 PDF Summary: Passwords, 2FA & Account Security

> **Key Takeaways:**
>
> - Use a different password for every account — use a password manager to remember them
> - Long passwords are better than complex ones: `my-shop-kigali-2026!` beats `P@DOUBLEDOLLAR$w0rd`
> - Enable 2FA on WhatsApp, Gmail, Facebook, and mobile money
> - Never share your MoMo PIN with anyone
> - The "Verify Before You Pay" habit: check sender, check request, verify separately
> - Change passwords every 3 months
>
> **Action Step:** Set up a password manager. Change your 3 most critical passwords. Enable 2FA on WhatsApp and Gmail.

---$$, 'reading', 25, 2, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l24_id, course_id, 'Safe Mobile Money Practices', 'Safe Mobile Money Practices', $$**Duration:** 20 minutes | **Type:** Reading

---

Mobile money is the lifeblood of Rwandan commerce. It's also the primary target for fraud. Here's how to protect your money.

### The Most Common Mobile Money Scams

**Scam 1: Fake MoMo Messages**
You receive: "You have received RWF 500,000 from 0788XXXXXX. To confirm, dial *182*1*1*PIN#"
Reality: The scammer wants you to accidentally send them money.

**Rule:** Never dial anything based on an SMS. Check your balance by dialing *182*9# (the official check balance code).

**Scam 2: "Wrong Number" Transfers**
Someone sends you money by "mistake" and asks you to send it back.
Reality: The transfer was made with a stolen account. When the real owner reports it, the money is reversed from YOUR account — you lose.

**Rule:** Never send money back. Tell them to contact MTN/Airtel customer care. They'll reverse it properly.

**Scam 3: Agent Impersonation**
Someone calls claiming to be from MTN: "We need to verify your account. Please share your PIN."
Reality: MTN will NEVER ask for your PIN over the phone.

**Rule:** Hang up. If concerned, call MTN's official number (100) yourself.

**Scam 4: QR Code Scams**
A QR code is posted at a shop: "Scan to pay." You scan, enter the amount, and confirm.
Reality: The QR code belongs to the scammer, not the shop.

**Rule:** Always verify the recipient name matches the business before confirming payment.

### Protecting Your Mobile Money Account

**Daily habits:**
1. Check your balance daily (dial *182*9# for MTN, *131# for Airtel)
2. Review recent transactions weekly
3. Never share your PIN (not even with family)
4. Never write your PIN down anywhere

**Weekly habits:**
1. Transfer large balances to your bank account
2. Review all transactions for unauthorized ones
3. Check that your registered phone number is correct

**Monthly habits:**
1. Change your MoMo PIN
2. Review your registered devices
3. Update your phone's software
4. Check your account limits

### What to Do If You're Scammed

**Immediate steps (within 1 hour):**
1. Call your mobile provider immediately:
   - MTN: 100
   - Airtel: 100
2. Report the fraudulent transaction with the reference number
3. Ask them to freeze your account temporarily
4. File a police report (can be done online at police.rw or in person)

**Follow-up:**
1. Change all your PINs and passwords
2. Check other accounts (email, social media) for unauthorized access
3. Notify your bank if you have auto-debit setup
4. Monitor your accounts daily for the next month

### Securing Your Staff's Mobile Money Access

If employees handle mobile money on your behalf:

1. **Create a separate business MoMo account** — don't let employees use your personal account
2. **Set transaction limits** — cap how much can be sent per day
3. **Enable notifications** — get SMS alerts for every transaction
4. **Require confirmation** — for transactions over RWF 50,000, require your approval
5. **Audit weekly** — review all transactions and compare to your POS records

---

### ✅ Worked Example: Copacabana Bar — Mobile Money Security

Copacabana is a bar in Gisenyi that accepts mobile money payments. They process about RWF 300,000 per day via MoMo.

**Security measures implemented:**

1. **Dedicated business phone:** A cheap Android phone just for MoMo — not the owner's personal phone
2. **Screen lock:** 6-digit PIN (different from MoMo PIN)
3. **MoMo PIN:** Only the owner and manager know it
4. **Transaction limit:** RWF 500,000/day (enough for business, limits theft)
5. **Notifications:** SMS for every transaction
6. **Daily check:** Owner reviews all transactions at closing

**Incident:** One evening, a "customer" sent a fake MoMo confirmation SMS to the bartender. The SMS showed "Payment of RWF 25,000 received." But the owner's phone didn't get a notification. The bartender checked the official balance (*182*9#) and confirmed no payment was received.

**Result:** The scam was caught because the owner had trained staff to verify payments via the official balance check, not trust customer SMS messages.

---

### 📝 Your Exercise

1. Check: do you have a dedicated phone for business mobile money? If not, consider it
2. Set your MoMo transaction limits to an appropriate level
3. Enable SMS notifications for all transactions
4. Train your staff: never trust customer SMS confirmations — always check balance
5. Set a daily reminder to check your MoMo balance
6. Change your MoMo PIN this month

**Time needed:** 30 minutes
**Cost:** Free

---

### 📄 PDF Summary: Safe Mobile Money Practices

> **Key Takeaways:**
>
> - Never trust SMS confirmations — always verify via official balance check (*182*9#)
> - Never send money back to "wrong number" senders — tell them to contact customer care
> - MTN/Airtel will NEVER ask for your PIN over the phone — hang up
> - Set transaction limits, enable notifications, check balance daily
> - Train staff to verify payments before releasing goods
> - If scammed: call provider immediately, file police report, change all PINs
>
> **Action Step:** Set your MoMo limits, enable notifications, and train your staff to verify payments.

---$$, 'reading', 20, 3, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l25_id, course_id, 'Protecting Customer Data', 'Protecting Customer Data', $$**Duration:** 20 minutes | **Type:** Reading

---

You collect customer data: names, phone numbers, addresses, purchase history. If that data gets leaked, you lose trust — and customers.

### What Customer Data You Hold

Think about what information you store:
- Customer names and phone numbers (from orders, WhatsApp)
- Email addresses (from your website or forms)
- Purchase history (from your POS or spreadsheet)
- Payment details (mobile money numbers, card info)
- Delivery addresses

All of this is valuable to scammers and harmful if leaked.

### The Data Protection Act (Rwanda)

Rwanda's Data Protection Law (2021) requires you to:
1. **Collect only what you need** — don't ask for data you won't use
2. **Keep it secure** — protect it from unauthorized access
3. **Delete it when no longer needed** — don't hoard old data
4. **Tell customers what you collect** — be transparent
5. **Report breaches** — if data is leaked, notify authorities

**Penalties:** Up to RWF 50,000,000 or 2% of annual revenue for serious violations.

### Simple Data Protection Steps

**Step 1: Know what you have**
Create a list:
| Data Type | Where It's Stored | Who Has Access |
|---|---|---|
| Customer names/phones | Google Sheet, WhatsApp | Owner, manager |
| Email addresses | Mailchimp | Owner |
| Purchase history | POS system | Owner, cashier |
| Financial records | Google Sheets | Owner, accountant |

**Step 2: Limit access**
- Only give employees access to the data they need
- Use separate accounts (not shared passwords)
- Remove access when an employee leaves

**Step 3: Secure your storage**
- Use password-protected devices
- Enable encryption (built into most modern phones)
- Back up data to a secure cloud service (Google Drive, not a USB stick lying around)

**Step 4: Delete old data**
- Delete customer data you no longer need (e.g., customers who haven't purchased in 2+ years)
- Shred paper records
- Clear old phones before selling them (factory reset)

**Step 5: Be transparent**
- Tell customers what data you collect and why
- Don't share customer data with other businesses without permission
- If a customer asks you to delete their data, do it

### Handling a Data Breach

If you suspect customer data has been leaked:

1. **Contain:** Change all passwords immediately
2. **Assess:** What data was exposed? How many customers affected?
3. **Notify:** Tell affected customers within 72 hours
4. **Report:** Notify the Rwanda Data Protection Authority
5. **Prevent:** Fix the vulnerability that caused the breach

---

### ✅ Worked Example: Kigali Pets — Data Protection

Kigali Pets is an online pet store. They have 500 customer records: names, phone numbers, delivery addresses, and purchase history.

**Data audit:**

| Data | Stored in | Access |
|---|---|---|
| Customer list (500) | Google Sheets | Owner only |
| Email list (300) | Mailchimp | Owner, marketing person |
| Financial records | Wave | Owner, accountant |
| Website analytics | Google Analytics | Owner |

**Protection measures:**
1. Google account secured with 2FA and strong password
2. Employee accounts have limited access (can't see financial data)
3. Old customer data (not purchased in 3 years) deleted — reduced from 500 to 380 records
4. Customer-facing privacy notice added to website: "We collect your name, phone, and address to deliver your orders. We don't share this data with anyone."

**Result:** Kigali Pets is compliant with data protection law and customers trust them with their information.

---

### 📝 Your Exercise

1. List what customer data you collect and where it's stored
2. Check: who has access to this data? Remove unnecessary access
3. Delete data you no longer need (old customers, expired records)
4. Add a simple privacy statement to your website or shop: "We collect [X] to [Y]. We don't share it."
5. Ensure your phone and computer have screen locks and encryption enabled

**Time needed:** 1 hour
**Cost:** Free

---

### 📄 PDF Summary: Protecting Customer Data

> **Key Takeaways:**
>
> - Rwanda's Data Protection Law requires you to secure customer data
> - Collect only what you need, keep it secure, delete when no longer needed
> - Limit data access — only employees who need it should have it
> - Use password-protected, encrypted devices
> - Be transparent: tell customers what you collect and why
> - If breached: contain, assess, notify, report, prevent
>
> **Action Step:** Do a data audit this week. List what you collect, where it's stored, and who has access. Secure everything.

---

## Module 6 Quiz

**5 Questions — Passing score: 4/5**

1. **What should you do if someone calls claiming to be from MTN and asks for your PIN?**
   - A) Give them the PIN to verify your identity
   - B) Hang up — MTN will never ask for your PIN
   - C) Give them a fake PIN
   - D) Ask them to call back later

2. **What is 2FA (Two-Factor Authentication)?**
   - A) Using two phones
   - B) A second layer of security that requires a code in addition to your password
   - C) Having two bank accounts
   - D) Using two mobile money providers

3. **What's the best type of password?**
   - A) Your birthday
   - B) A short, complex password like P@DOUBLEDOLLAR$w0rd
   - C) A long, easy-to-remember phrase like "my-shop-kigali-2026!"
   - D) The same password for everything

4. **If you receive MoMo money by "mistake," what should you do?**
   - A) Send it back immediately
   - B) Keep it
   - C) Tell the sender to contact MTN/Airtel customer care for proper reversal
   - D) Forward it to someone else

5. **Under Rwanda's Data Protection Law, what must you do with customer data?**
   - A) Keep it forever "just in case"
   - B) Collect only what you need, secure it, and delete when no longer needed
   - C) Share it with anyone who asks
   - D) Store it on a USB stick

**Answers:** 1-B, 2-B, 3-C, 4-C, 5-B

---

## Certificate Checkpoint: Module 6 Complete

**You've learned:**
- The 5 main cyber threats facing Rwandan businesses
- How to create strong passwords and enable 2FA
- Safe mobile money practices to prevent fraud
- How to protect customer data under Rwanda's Data Protection Law

**Certificate:** Complete the quiz with 4/5 correct answers to unlock your Module 6 certificate and proceed to Module 7.$$, 'reading', 20, 4, true);


  -- MODULE 7: Data-Driven Decisions with Free Tools
  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l26_id, course_id, 'Why Data Matters (Even for a Small Shop)', 'Why Data Matters (Even for a Small Shop)', $$**Duration:** 20 minutes | **Type:** Reading

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

---$$, 'reading', 20, 1, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l27_id, course_id, 'Google Sheets for Business Tracking', 'Google Sheets for Business Tracking', $$**Duration:** 25 minutes | **Type:** Reading

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

---$$, 'reading', 25, 2, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l28_id, course_id, 'Building Your First Sales Dashboard', 'Building Your First Sales Dashboard', $$**Duration:** 25 minutes | **Type:** Reading

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

---$$, 'reading', 25, 3, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l29_id, course_id, 'Using Data to Set Prices & Predict Demand', 'Using Data to Set Prices & Predict Demand', $$**Duration:** 20 minutes | **Type:** Reading

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

**Certificate:** Complete the quiz with 4/5 correct answers to unlock your Module 7 certificate and proceed to Module 8.$$, 'reading', 20, 4, true);


  -- MODULE 8: Finding & Hiring Tech Help
  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l30_id, course_id, 'When You Need Help (and When You Don''t)', 'When You Need Help (and When You Don''t)', $$**Duration:** 20 minutes | **Type:** Reading

---

You've been doing a lot yourself: setting up your website, managing social media, tracking data, automating tasks. Some of this you can keep doing. Some of it might need a professional.

The question is: when should you hire help, and when should you keep doing it yourself?

### The DIY vs. Hire Decision Framework

**Keep doing it yourself if:**
- It takes less than 2 hours per week
- You enjoy doing it
- The quality of your work is "good enough"
- It doesn't require specialized skills you don't have
- The cost of hiring isn't justified by the value

**Hire help if:**
- It takes more than 5 hours per week
- The quality of your work is noticeably poor
- It requires skills you can't learn in a reasonable time
- Mistakes are costly (legal, financial, security)
- The time you save would generate more revenue elsewhere

### Common Tasks: DIY or Hire?

| Task | DIY? | When to Hire |
|---|---|---|
| Posting on social media | ✅ Yes | When you need professional photography or video |
| Basic website updates | ✅ Yes | When you need a new feature or redesign |
| Google Business Profile | ✅ Yes | When you need SEO optimization |
| Bookkeeping | ⚠️ Maybe | When you have 50+ transactions/month |
| Graphic design | ⚠️ Maybe | When you need branded materials (logos, menus) |
| App development | ❌ No | Always hire |
| Legal contracts | ❌ No | Always hire a lawyer |
| Tax filing | ⚠️ Maybe | When your revenue exceeds RWF 10M/year |
| Cybersecurity audit | ❌ No | When you handle sensitive customer data |

### The Cost of Bad Tech Help

Hiring the wrong person is worse than not hiring at all. Common horror stories:

- Paid RWF 500,000 for a website that never launched
- Hired a "social media manager" who posted once and disappeared
- Gave a freelancer access to accounts and they changed the passwords

**Prevention is cheaper than cure.** The lessons in this module will teach you how to find, vet, and manage tech help effectively.

### The Right Mindset About Tech Help

Tech help isn't about replacing your judgment. It's about:
- Getting specialized skills you don't have
- Freeing your time for higher-value work
- Getting a fresh perspective on your business
- Having someone who stays current with technology

You're still the CEO. Tech help is your contractor — they execute your vision, not the other way around.

---

### ✅ Worked Example: Umurinzi Security Services — When to Hire

Umurinzi provides security guard services in Kigali. The owner, Patrick, has 50 guards and 15 corporate clients.

**Patrick's current workload:**

| Task | Hours/week | DIY quality | Should hire? |
|---|---|---|---|
| Managing guard schedules | 8 | Good (spreadsheet) | Maybe — if he had a scheduling app |
| Invoicing clients | 3 | Good | No — he can handle it |
| Social media | 2 | Poor (rarely posts) | Yes — for content creation |
| Website maintenance | 1 | Okay | No — nothing to fix |
| Accounting | 5 | Poor (errors in books) | Yes — for monthly bookkeeping |
| HR (guard management) | 10 | Good | No — this is his core competency |

**Patrick's decision:**
1. Hire a freelance bookkeeper for 5 hours/month (RWF 25,000/month) — fixes his accounting errors
2. Hire a social media content creator for 4 posts/month (RWF 40,000/month) — improves online presence
3. Do scheduling and HR himself — these are his core strengths

**Total cost:** RWF 65,000/month
**Value gained:** 7 hours/week freed up + professional books + better marketing

---

### 📝 Your Exercise

1. List everything you do in your business (all tasks)
2. For each, estimate hours per week
3. Mark: DIY (good quality) or Needs improvement
4. For tasks marked "Needs improvement," decide: learn it yourself or hire?
5. If hiring, write a brief description of what you need

**Time needed:** 30 minutes
**Cost:** Free

---

### 📄 PDF Summary: When You Need Help

> **Key Takeaways:**
>
> - Keep doing it yourself if it's under 2 hours/week and your quality is good
> - Hire help if it's over 5 hours/week, requires specialized skills, or your quality is poor
> - Common hire tasks: bookkeeping, graphic design, content creation, app development
> - Always hire for: legal, app development, cybersecurity, tax filing (at scale)
> - Tech help executes your vision — you're still the CEO
>
> **Action Step:** List all your tasks. Identify which ones need professional help. Get quotes from 2-3 freelancers for one task.

---$$, 'reading', 20, 1, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l31_id, course_id, 'What to Look For in a Tech Freelancer', 'What to Look For in a Tech Freelancer', $$**Duration:** 25 minutes | **Type:** Reading

---

Finding good tech help in Rwanda is possible — but you need to know where to look and what to look for.

### Where to Find Tech Freelancers in Rwanda

**Local platforms:**
- **Rwanda Freelancers Facebook Group** — Active community of local tech workers
- **Andela Rwanda** — Vetted software developers
- **Home of Skills (HOS)** — Tech training graduates looking for work
- **University job boards** — University of Rwanda, Carnegie Mellon Africa

**International platforms (accessible from Rwanda):**
- **Fiverr** — Logo design, social media, basic websites (from RWF 5,000)
- **Upwork** — More complex projects, ongoing work
- **Toptal** — Premium developers (higher cost, higher quality)

**Word of mouth:**
- Ask other business owners who they use
- Check who built websites you admire
- Ask in business WhatsApp groups

### The 5 Things to Check Before Hiring

**1. Portfolio: Have they done this before?**
Ask: "Can I see examples of similar work?"
Red flag: They can't show any previous work.

**2. References: Do past clients recommend them?**
Ask: "Can I talk to a previous client?"
Red flag: They refuse or make excuses.

**3. Communication: Do they understand your needs?**
Test: Describe your project. Do they ask clarifying questions?
Red flag: They say "yes, I can do everything" without asking questions.

**4. Timeline: When can they deliver?**
Ask: "What's your timeline for this project?"
Red flag: They promise unrealistic timelines ("I'll build your app in 2 days").

**5. Price: Is it reasonable?**
Compare: Get 3 quotes for the same project. If one is dramatically cheaper, there's a reason.
Red flag: Price is 1/3 of others with no explanation.

### Red Flags When Hiring

🚩 **No portfolio or references** — They're either new or hiding bad work
🚩 **Promises everything** — "I can do design, development, marketing, and accounting!" (nobody is good at everything)
🚩 **No contract** — Always get the scope, timeline, price, and payment terms in writing
🚩 **Requests full payment upfront** — Standard is 30-50% upfront, remainder on delivery
🚩 **Poor communication during the hiring process** — If they're bad now, they'll be worse during the project
🚩 **Can't explain their approach** — They should be able to explain how they'll solve your problem in simple terms

### The Interview Questions

Before hiring, ask these questions:

1. "Tell me about a similar project you've completed."
2. "What's your process for a project like mine?"
3. "How long will it take?"
4. "What's included in the price, and what costs extra?"
5. "How do you handle revisions?"
6. "What happens if the project goes over budget or timeline?"
7. "Can you provide 2 references?"

---

### ✅ Worked Example: Inkingoma Security — Hiring a Website Developer

Inkingoma needs a website for their security consulting firm. Budget: RWF 300,000.

**They interview 3 developers:**

**Developer 1: James (Fiverr)**
- Portfolio: 5 websites, mostly e-commerce
- Price: RWF 150,000
- Timeline: 2 weeks
- Red flags: No references, promises "everything including SEO and social media"

**Developer 2: Grace (Rwanda Freelancers group)**
- Portfolio: 8 websites, including 2 for professional services firms
- Price: RWF 280,000
- Timeline: 4 weeks
- References: 2 past clients (both positive)
- Good signs: Asked detailed questions about the business, explained her process clearly

**Developer 3: Kevin (Upwork)**
- Portfolio: 15 websites, very professional
- Price: RWF 500,000
- Timeline: 6 weeks
- References: 5 past clients (all positive)
- Good signs: Excellent portfolio, but over budget

**Decision:** Hire Grace. She's within budget, has relevant experience, good references, and clear communication.

**Contract (in writing):**
- Scope: 5-page website (Home, About, Services, Team, Contact)
- Price: RWF 280,000
- Payment: RWF 90,000 upfront, RWF 90,000 at design approval, RWF 100,000 at launch
- Timeline: 4 weeks
- Revisions: 2 rounds included, additional at RWF 10,000/round
- Ownership: Inkingoma owns all content and design

---

### 📝 Your Exercise

1. Identify one task you want to hire help for
2. Find 3 candidates (use the platforms listed above or word of mouth)
3. Ask each the 7 interview questions
4. Check portfolios and references for your top candidate
5. Get a written quote with scope, timeline, and price
6. Compare all 3 and make your decision

**Time needed:** 2-3 hours
**Cost:** Free

---

### 📄 PDF Summary: What to Look For in a Tech Freelancer

> **Key Takeaways:**
>
> - Find freelancers: Facebook groups, Fiverr, Upwork, university job boards, word of mouth
> - Check 5 things: portfolio, references, communication, timeline, price
> - Red flags: no portfolio, promises everything, no contract, full payment upfront
> - Always get scope, timeline, price, and payment terms in writing
> - Get 3 quotes and compare before deciding
>
> **Action Step:** Find 3 candidates for one tech task. Interview them. Check references. Hire the best one.

---$$, 'reading', 25, 2, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l32_id, course_id, 'Managing Tech Projects Without Technical Skills', 'Managing Tech Projects Without Technical Skills', $$**Duration:** 20 minutes | **Type:** Reading

---

You hired a freelancer. Now what? Managing someone who speaks a different technical language than you requires clear communication and simple processes.

### The Project Brief Template

Before any work starts, write a project brief. This is your single source of truth:

```
PROJECT BRIEF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project name: [What are you building?]
Business goal: [Why are you building it?]
Target user: [Who will use this?]

Requirements (what it must do):
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

Nice to have (if budget allows):
1. [Feature 4]
2. [Feature 5]

Design preferences:
- Colors: [Your brand colors]
- Style: [Professional, modern, playful, etc.]
- Examples: [Links to websites you like]

Budget: RWF [Amount]
Timeline: [Deadline]
Payment terms: [30% upfront, 40% at approval, 30% at launch]

Success criteria: How will you know this project is done well?
[Example: "Customers can find our services and contact us within 3 clicks"]
```

### Communication Rules

**Rule 1: Weekly check-ins**
Schedule a 15-minute call or WhatsApp voice note every week. Ask:
1. What did you complete this week?
2. What are you working on next week?
3. Are there any blockers?

**Rule 2: One channel for project communication**
Choose one: WhatsApp, email, or a project management tool. Don't scatter conversations across multiple channels.

**Rule 3: Review work before it's "done"**
Never let a freelancer say "it's done" without you reviewing it first. Create a checklist:

- [ ] Does it match the requirements in the brief?
- [ ] Does it work on mobile?
- [ ] Does it look professional?
- [ ] Are all links working?
- [ ] Is the content correct?

**Rule 4: Request changes in writing**
Instead of: "Make it look better"
Say: "Please change the header font to Space Grotesk, increase the button size by 20%, and move the contact form to the top of the page."

### Handling Problems

**Problem: They're behind schedule**
→ Ask: "What's causing the delay? What do you need from me to get back on track?"
→ If delay is significant: discuss adjusting scope or timeline

**Problem: The work isn't what you wanted**
→ Show examples: "I wanted something more like [link]. Can you adjust?"
→ Reference the original brief: "The brief says X, but the delivery is Y"

**Problem: They've disappeared**
→ Send a written follow-up: "I haven't heard from you in [X] days. Please confirm you're still working on this project by [date]."
→ If no response: escalate (contact their references, leave a review, consider a different freelancer)

### Accepting Delivery and Final Payment

Before making the final payment:

1. **Review everything** against the project brief
2. **Test thoroughly** — click every button, fill every form, check on mobile
3. **Get all access** — ensure you have login credentials for everything
4. **Get the source files** — all design files, code, and content should be yours
5. **Get a handoff document** — instructions for how to use and maintain what they built
6. **Make final payment** only after everything passes your checklist

---

### ✅ Worked Example: Urwego Bank — Website Project Management

Urwego Bank (a fictional microfinance) hired a freelancer to build their website. The manager, Alice, has no tech background.

**Project brief:** (written in the first meeting)
- 6-page website: Home, About, Services, Loan Calculator, Apply, Contact
- Must work on mobile (80% of their customers use phones)
- Must include a loan calculator tool
- Budget: RWF 500,000
- Timeline: 6 weeks

**Communication plan:**
- Weekly Friday WhatsApp voice note: "Status update"
- Shared Google Doc for all project communication
- Alice reviews work every Monday

**Week 1-2:** Freelancer sends wireframes. Alice reviews, suggests 3 changes. Approved.

**Week 3-4:** Freelancer sends design mockups. Alice checks against brief:
- ✅ All 6 pages included
- ✅ Mobile responsive
- ✅ Loan calculator works
- ❌ Color scheme is wrong (was supposed to be green, came out blue)
- ❌ Contact form missing

Alice sends: "The colors don't match our brand (see attached brand guide). Also, the contact form from the brief is missing. Please fix these before proceeding."

**Week 5-6:** Final delivery. Alice's checklist:
- [x] All 6 pages present
- [x] Mobile responsive
- [x] Loan calculator works correctly
- [x] Colors match brand
- [x] Contact form works
- [x] All links functional
- [x] Fast loading (under 3 seconds)
- [x] Login credentials received
- [x] Source files received
- [x] Handoff document received

**Final payment released.**

---

### 📝 Your Exercise

1. Write a project brief for your next tech project (use the template)
2. Set up a weekly check-in schedule with your freelancer
3. Create a review checklist based on your project requirements
4. Before approving delivery, test everything on your phone
5. Get all access credentials and source files before making final payment

**Time needed:** 30 minutes to write the brief, ongoing management
**Cost:** Free

---

### 📄 PDF Summary: Managing Tech Projects

> **Key Takeaways:**
>
> - Always write a project brief before work starts — it's your source of truth
> - Schedule weekly 15-minute check-ins
> - Review work against the brief, not against your mood
> - Request changes in writing with specific details
> - Never make final payment until everything passes your review checklist
> - Get all access credentials, source files, and handoff documents before paying
>
> **Action Step:** Write a project brief for your next tech project. Schedule weekly check-ins with your freelancer.

---$$, 'reading', 20, 3, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l33_id, course_id, 'Building a Long-Term Tech Relationship', 'Building a Long-Term Tech Relationship', $$**Duration:** 20 minutes | **Type:** Reading

---

One-off projects are expensive. A long-term tech relationship saves you money and gets better results over time.

### Why Long-Term Relationships Beat One-Off Projects

**One-off project:**
- You explain your business from scratch every time
- The freelancer doesn't know your brand, customers, or goals
- Every new project starts with a learning curve
- Pricing is higher (they charge more for unfamiliar work)

**Long-term relationship:**
- The freelancer knows your business deeply
- They can anticipate your needs
- Work is faster and better quality
- Pricing is often better (retainer rates)

### How to Build a Tech Relationship

**Step 1: Start with a small project**
Don't give a freelancer your biggest project first. Start with something small (a logo, a single page, a social media template). See how they work, communicate, and deliver.

**Step 2: Pay fairly and on time**
Nothing kills a relationship faster than late payments. If the work is good, pay immediately. Good freelancers have other clients — if you don't pay, they'll prioritize someone who does.

**Step 3: Give clear feedback**
Instead of: "I don't like it."
Say: "The layout is good, but I'd prefer the green to be darker, and the text should be larger on mobile."

**Step 4: Respect their expertise**
You hired them because they know something you don't. If they suggest a different approach, listen. They might be right.

**Step 5: Refer them to others**
When someone asks you for a tech recommendation, refer your freelancer. This builds loyalty and goodwill.

### Retainer Agreements

A retainer is a monthly fee for ongoing work. Instead of paying per project, you pay a fixed monthly amount for a set number of hours.

**Example retainer:**
- Monthly fee: RWF 100,000
- Includes: 10 hours of work per month
- Use for: Website updates, social media graphics, data entry, troubleshooting
- Unused hours don't roll over

**When to use a retainer:**
- You have ongoing tech needs (weekly social media graphics, monthly website updates)
- You want priority service (retainer clients get faster responses)
- You want predictable costs (same amount every month)

### When to End a Relationship

Not all relationships work out. End it if:
- They consistently miss deadlines without communication
- Quality drops after the initial project
- They're unresponsive for extended periods
- They breach your trust (accessing accounts without permission, sharing your data)

**How to end professionally:**
1. Give written notice (2 weeks is standard)
2. Pay all outstanding invoices
3. Revoke all their access to your accounts
4. Get all source files and credentials
5. Thank them for their work (keep it professional — you may need them again)

---

### ✅ Worked Example: Inzuki Designs — Building a Tech Team

Inzuki sells handmade jewelry online. They need ongoing help with website updates, social media graphics, and product photography.

**Step 1: Small project test**
Hired Grace for a product photoshoot (RWF 50,000). She delivered beautiful photos on time.

**Step 2: Second project**
Hired Grace for 5 product listing graphics (RWF 30,000). She nailed the brand style.

**Step 3: Retainer proposal**
After 2 successful projects, offered Grace a retainer:
- RWF 80,000/month for 8 hours of work
- Includes: 4 social media graphics, 2 product photos, website updates as needed
- 3-month trial period

**Step 4: Ongoing relationship (6 months in)**
- Grace knows Inzuki's brand perfectly
- She anticipates needs (creates graphics for holidays before being asked)
- Inzuki gets priority service (Grace responds within 2 hours)
- Cost is predictable and fair

**Result:** Inzuki's online presence went from amateur to professional. Social media engagement up 200%. Website conversion up 40%.

---

### 📝 Your Exercise

1. Think about your ongoing tech needs (monthly tasks that require help)
2. If you have a freelancer you've worked with before, reach out about a retainer
3. If not, hire someone for a small project first (RWF 20,000-50,000)
4. Evaluate: communication, quality, reliability
5. If good, propose a retainer for ongoing work
6. Pay on time, give clear feedback, refer them to others

**Time needed:** Ongoing
**Cost:** Varies

---

### 📄 PDF Summary: Building a Long-Term Tech Relationship

> **Key Takeaways:**
>
> - Long-term relationships beat one-off projects: deeper understanding, better quality, lower cost
> - Start small, pay fairly, give clear feedback, respect their expertise
> - Retainer agreements provide ongoing help at a predictable monthly cost
> - End relationships professionally if quality or communication drops
> - Good freelancers are worth their weight in gold — treat them well
>
> **Action Step:** If you have a good freelancer, propose a retainer. If not, hire one for a small test project this month.

---

## Module 8 Quiz

**5 Questions — Passing score: 4/5**

1. **When should you hire tech help instead of doing it yourself?**
   - A) For every task — outsource everything
   - B) When it takes more than 5 hours/week, requires specialized skills, or your quality is poor
   - C) Only for app development
   - D) Never — do everything yourself to save money

2. **What's a red flag when hiring a freelancer?**
   - A) They ask clarifying questions about your project
   - B) They provide a portfolio with relevant examples
   - C) They promise everything and ask for full payment upfront
   - D) They give a detailed timeline

3. **What should be in a project brief?**
   - A) Just the budget
   - B) Project name, business goal, requirements, budget, timeline, success criteria
   - C) A description of the freelancer's skills
   - D) Your personal biography

4. **When should you make the final payment to a freelancer?**
   - A) When they say it's done
   - B) After you've reviewed everything against the brief, tested it, and received all access credentials
   - C) At the start of the project
   - D) After they send the first draft

5. **What's a retainer?**
   - A) A one-time payment for a project
   - B) A monthly fee for ongoing work (e.g., 10 hours/month)
   - C) A discount for paying early
   - D) A refund policy

**Answers:** 1-B, 2-C, 3-B, 4-B, 5-B

---

## Certificate Checkpoint: Module 8 Complete

**You've learned:**
- When to DIY vs. hire help
- How to find, vet, and interview tech freelancers
- How to manage projects without technical skills
- How to build long-term tech relationships

**Certificate:** Complete the quiz with 4/5 correct answers to unlock your Module 8 certificate and proceed to Module 9.$$, 'reading', 20, 4, true);


  -- MODULE 9: Your Business Suite - Next Steps
  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l34_id, course_id, 'What You''ve Built — A Quick Recap', 'What You''ve Built — A Quick Recap', $$**Duration:** 15 minutes | **Type:** Reading

---

Over the past 8 modules, you've transformed your business with technology. Let's look at what you've accomplished.

### Your Tech Stack (What You Now Use)

**Digital Presence:**
- ✅ Google Business Profile (optimized with photos, reviews, posts)
- ✅ Simple website (Google Sites or Wix)
- ✅ Social media presence (one platform, posting consistently)

**Sales & Payments:**
- ✅ POS system (Square, Google Sheets, or similar)
- ✅ Inventory tracking with reorder points
- ✅ Mobile money integration (MTN MoMo + Airtel Money)
- ✅ Card payments (Square Reader or tap-to-phone)

**Automation:**
- ✅ Automated invoicing with payment reminders
- ✅ Calendar system with recurring reminders
- ✅ Google Forms for orders, feedback, and data collection
- ✅ WhatsApp Business auto-replies and quick templates

**Marketing & AI:**
- ✅ AI-generated content (ChatGPT + Canva)
- ✅ Chatbots for customer service
- ✅ Customer feedback collection and analysis
- ✅ Monthly content batching system

**Security:**
- ✅ Strong passwords with a password manager
- ✅ Two-factor authentication on critical accounts
- ✅ Mobile money security practices
- ✅ Customer data protection

**Data & Decisions:**
- ✅ Google Sheets tracking system
- ✅ Sales dashboard with key metrics
- ✅ Data-driven pricing decisions
- ✅ Demand forecasting

**Tech Support:**
- ✅ Know when to DIY vs. hire
- ✅ How to find and vet freelancers
- ✅ How to manage tech projects
- ✅ How to build long-term tech relationships

### What This Means for Your Business

**Before this course:**
- Customers couldn't find you online
- You tracked sales in a notebook
- You lost money to stockouts and overstock
- You spent hours on repetitive tasks
- You had no data to guide decisions
- You were overwhelmed by technology

**After this course:**
- Customers find you on Google, social media, and your website
- Every sale is tracked automatically
- You never run out of popular products
- Hours of daily tasks are automated
- You make decisions based on data, not guesses
- You know exactly what tech to use and when to hire help

### The Numbers Tell the Story

If you completed the exercises in this course, here's what you likely achieved:

| Metric | Before | After | Change |
|---|---|---|---|
| Weekly hours on admin | 25+ | 10-15 | -40% |
| Monthly stockouts | 3-5 | 0-1 | -80% |
| Revenue from online channels | RWF 0 | RWF 50,000-200,000+ | New income |
| Customer reviews | 0-2 | 15-30+ | +500% |
| Data-driven decisions | 0 | Weekly | Complete shift |

These aren't hypothetical numbers. They're based on what our students achieve.

---

### ✅ Self-Assessment: Where Are You Now?

Rate yourself 1-5 on each area (1 = not started, 5 = fully implemented):

- [ ] Digital presence (Google, website, social): ___/5
- [ ] POS and inventory tracking: ___/5
- [ ] Mobile money and payments: ___/5
- [ ] Automation (invoices, reminders, forms): ___/5
- [ ] Marketing with AI tools: ___/5
- [ ] Cybersecurity: ___/5
- [ ] Data-driven decisions: ___/5
- [ ] Tech help (hiring, managing): ___/5

**Score interpretation:**
- **32-40:** You're a tech-powered business. You're ahead of 95% of small businesses in Rwanda.
- **24-31:** Strong foundation. Focus on your lowest-scoring areas.
- **16-23:** Good progress. Revisit the modules where you scored lowest.
- **Below 16:** Start from Module 1 and complete each exercise before moving on.

---

### 📝 Your Exercise

1. Complete the self-assessment above
2. Identify your 2 lowest-scoring areas
3. Create an action plan: 1 specific action per area for this week
4. Celebrate your highest-scoring area — you've earned it

**Time needed:** 15 minutes
**Cost:** Free

---

### 📄 PDF Summary: What You've Built

> **Key Takeaways:**
>
> - You now have a complete tech stack for your business
> - Digital presence, POS, automation, AI marketing, security, data, and tech support
> - The exercises in this course should have measurably improved your business
> - Use the self-assessment to identify areas that need more work
> - Technology is a journey, not a destination — keep improving
>
> **Action Step:** Complete the self-assessment. Identify your 2 weakest areas. Take one action in each this week.

---$$, 'reading', 15, 1, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l35_id, course_id, 'Introducing Business Suite — Everything Connected', 'Introducing Business Suite — Everything Connected', $$**Duration:** 15 minutes | **Type:** Reading

---

You've built your tech stack using free tools: Google Sheets, Square, ChatGPT, Canva, WhatsApp Business. These tools work — but they don't talk to each other.

You track sales in one place, inventory in another, customer data in a third. When something changes in one tool, you manually update the others. It works, but it's fragile.

**Business Suite** is what happens when all of these tools are connected into one system.

### The Problem With Separate Tools

Right now, you're using:
- **Google Sheets** for sales tracking
- **Square POS** for processing payments
- **Google Forms** for orders
- **WhatsApp Business** for customer communication
- **ChatGPT** for content creation
- **Google Calendar** for scheduling

Each tool is good at its job. But:
- Data doesn't flow between them automatically
- You spend time copying data from one tool to another
- When something breaks, you don't know which tool is the problem
- Reporting requires combining data from multiple sources

### What Business Suite Does

Business Suite (#techinbusiness) connects these tools into one platform:

**One dashboard, all your data:**
- Sales, inventory, customers, and finances in one view
- No more copying data between spreadsheets
- Real-time updates across all modules

**Automated workflows:**
- Customer places order → inventory updates → invoice sent → payment tracked → receipt delivered
- No manual steps. Everything flows automatically.

**Built-in marketing:**
- AI-generated social media content from your actual sales data
- Automated customer follow-ups based on purchase history
- Email and WhatsApp campaigns from one place

**Smart analytics:**
- Automatic profit margin calculations
- Demand forecasting based on your sales patterns
- Customer lifetime value tracking

### Who Business Suite Is For

Business Suite is designed for Rwandan small businesses who:
- Have completed the Tech in Business course
- Are currently using 3+ separate tools
- Want to save time on data management
- Want better insights without hiring an analyst
- Are ready to scale their operations

### How to Get Started

Business Suite is a companion product to this course. It's not a requirement — everything you learned in this course works with free tools.

But if you're ready to level up, Business Suite connects everything you've built into one system.

**To learn more:**
- Visit: 1percent.rw/business-suite
- Use code: #techinbusiness
- Or ask in the course community

---

### ✅ Comparison: Your Current Stack vs. Business Suite

| Feature | Current Stack (Free Tools) | Business Suite |
|---|---|---|
| Sales tracking | Google Sheets (manual) | Automatic from POS |
| Inventory | Google Sheets (manual) | Real-time, auto-reorder alerts |
| Invoicing | Wave or Google Docs | Built-in, auto-sent |
| Customer data | Scattered across tools | Centralized customer profiles |
| Marketing | ChatGPT + Canva (separate) | AI content from your sales data |
| Reporting | Manual dashboard building | Automatic dashboards |
| Integration | None (manual data transfer) | Everything connected |
| Cost | Free | Subscription-based |

### The Bridge, Not the Replacement

Business Suite doesn't replace what you've learned. It builds on it:
- Your Google Sheets knowledge → understand the data Business Suite shows
- Your POS setup → Business Suite connects to your existing POS
- Your automation skills → Business Suite automates even more
- Your data analysis → Business Suite automates the analysis

Everything you learned in this course makes Business Suite more valuable to you.

---

### 📝 Your Exercise

1. Review your current tech stack (what tools are you using?)
2. Count: how many separate tools do you use daily?
3. Estimate: how many hours per week do you spend copying data between tools?
4. Visit 1percent.rw/business-suite to see if it's right for you
5. If interested, join the waitlist or start a trial

**Time needed:** 15 minutes
**Cost:** Free to explore

---

### 📄 PDF Summary: Introducing Business Suite

> **Key Takeaways:**
>
> - Separate tools work but don't talk to each other — you spend time managing the gaps
> - Business Suite connects your sales, inventory, customers, and marketing into one platform
> - It automates workflows: order → inventory → invoice → payment → receipt
> - It builds on what you learned in this course — it's a bridge, not a replacement
> - It's optional — your current free tools still work perfectly
>
> **Action Step:** Evaluate your current tool stack. If you're using 3+ separate tools and spending time on data transfer, explore Business Suite.

---$$, 'reading', 15, 2, true);

  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES (l36_id, course_id, 'Your Roadmap — What Comes Next', 'Your Roadmap — What Comes Next', $$**Duration:** 15 minutes | **Type:** Reading

---

This course is a starting point, not an ending point. Technology evolves, your business grows, and there's always more to learn.

### Your 90-Day Action Plan

**Month 1 (Immediate — this week):**
- [ ] Complete any unfinished modules
- [ ] Implement the top 3 actions from your self-assessment
- [ ] Set up your dashboard and review it weekly

**Month 2 (Build momentum):**
- [ ] Hire a freelancer for one task you've been putting off
- [ ] Launch one marketing campaign using AI tools
- [ ] Get your first 10 Google reviews

**Month 3 (Scale):**
- [ ] Review your pricing using data from your dashboard
- [ ] Automate one more process (invoicing, reminders, or social media)
- [ ] Explore Business Suite for integrated management

### Skills to Develop Next

Based on your business goals, consider learning:

**If you want to sell online:**
- E-commerce platforms (Shopify, WooCommerce)
- Product photography
- Online payment gateways

**If you want to grow your team:**
- HR basics (hiring, onboarding, performance management)
- Communication tools (Slack, project management)
- Delegation and leadership

**If you want to expand:**
- Multi-location management
- Franchising basics
- Supply chain optimization

**If you want to specialize:**
- Industry-specific certifications
- Advanced data analysis
- Digital marketing specializations

### Resources for Continued Learning

**Free courses:**
- Google Digital Skills for Africa (digiskills.africa)
- Coursera (audit mode for free access)
- YouTube (practical tutorials on everything)

**Communities:**
- Rwanda Tech Community (Facebook groups)
- Kigali Innovation City events
- Local business associations

**Mentorship:**
- 1% Rwanda mentorship programme
- Industry-specific mentors in your field
- Online communities (Reddit, Twitter/X, LinkedIn)

### The 1% Mindset

The "1%" in 1% Rwanda stands for the 1% of effort that separates good businesses from great ones. You don't need to do everything perfectly. You need to do a few things consistently better than everyone else.

This course gave you the tools. Now it's about using them — not all at once, but one at a time, consistently, over months and years.

**The formula:**
1. Pick one area from this course
2. Implement it fully
3. Measure the results
4. Move to the next area
5. Repeat

That's it. That's how you build a tech-powered business in Rwanda.

---

### ✅ Your Certificate

If you've completed all 9 modules and passed all quizzes, congratulations — you've earned your **Tech in Business Certificate** from 1% Rwanda.

This certificate means you have practical, actionable knowledge to:
- Build and maintain a digital presence
- Accept and track digital payments
- Automate your daily tasks
- Use AI for marketing and customer service
- Protect your business from cyber threats
- Make data-driven decisions
- Find and manage tech help

You're now part of a community of Rwandan business owners who are building the future of commerce in Africa.

**Share your achievement:**
- Post your certificate on social media with #techinbusiness
- Tag @1percentrw so we can celebrate with you
- Tell other business owners about the course

---

### 📝 Final Exercise

1. Write down your #1 business goal for the next 6 months
2. Identify which module from this course best supports that goal
3. Create a weekly plan: 1 hour per week dedicated to improving that area
4. Set a 90-day review date: "Am I closer to my goal?"
5. Share your goal in the course community for accountability

**Time needed:** 15 minutes
**Cost:** Free

---

### 📄 PDF Summary: Your Roadmap

> **Key Takeaways:**
>
> - This course is a starting point — keep learning and improving
> - Follow the 90-day action plan: immediate, momentum, scale
> - Choose your next skill based on your business goals
> - Use free resources: Google Digital Skills, Coursera, YouTube, communities
> - The 1% mindset: implement one area fully before moving to the next
> - You've earned your Tech in Business Certificate — share it!
>
> **Action Step:** Write your #1 business goal. Create a weekly plan. Set a 90-day review date. Share your goal with the community.

---

## Module 9 Quiz

**5 Questions — Passing score: 4/5**

1. **What's the main benefit of Business Suite over separate tools?**
   - A) It's cheaper
   - B) It connects all your tools into one system with automated workflows
   - C) It has more features
   - D) It's made by 1% Rwanda

2. **What should you do first after completing this course?**
   - A) Delete all your free tools
   - B) Complete the self-assessment and implement your top 3 actions
   - C) Sign up for Business Suite immediately
   - D) Do nothing — you already know everything

3. **How often should you review your business data?**
   - A) Once a year
   - B) Weekly (brief review) and monthly (detailed analysis)
   - C) Every hour
   - D) Only when something goes wrong

4. **What's the "1% mindset"?**
   - A) Do everything perfectly
   - B) Implement one area fully before moving to the next, consistently over time
   - C) Only focus on the top 1% of customers
   - D) Spend 1% of your revenue on technology

5. **How can you share your achievement?**
   - A) Keep it secret
   - B) Post your certificate on social media with #techinbusiness
   - C) Send it to the tax office
   - D) Frame it and hang it in your office (this is fine too!)

**Answers:** 1-B, 2-B, 3-B, 4-B, 5-B

---

## Final Certificate: Tech in Business — Course Complete 🎉

**You've completed all 9 modules:**

1. ✅ Getting Your Business Online
2. ✅ Selling Smarter with POS & Inventory
3. ✅ Mobile Money & Digital Payments
4. ✅ Automating Your Daily Tasks
5. ✅ AI Tools for Marketing & Customer Service
6. ✅ Cybersecurity for Small Business
7. ✅ Data-Driven Decisions with Free Tools
8. ✅ Finding & Hiring Tech Help
9. ✅ Your Business Suite — Next Steps

**You are now a certified Tech in Business graduate.**

Welcome to the 1% of Rwandan business owners who use technology to build better, faster, and smarter.

**#techinbusiness**$$, 'reading', 15, 3, true);


END $$;
-- Total: 1 course, 36 lessons