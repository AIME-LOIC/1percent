-- ============================================================
-- Seed: Tech in Business Course
-- ============================================================
-- Run this in the Supabase SQL Editor.
-- Course is published and premium-locked.
--
-- NOTE: Lesson content is read from markdown files.
-- For the full content, load each module file into the
-- content_md field via the admin dashboard or API.
-- ============================================================

DO $$
DECLARE
  course_id UUID := uuid_generate_v4();
  lesson01_id UUID := uuid_generate_v4();
  lesson02_id UUID := uuid_generate_v4();
  lesson03_id UUID := uuid_generate_v4();
  lesson04_id UUID := uuid_generate_v4();
  lesson05_id UUID := uuid_generate_v4();
  lesson06_id UUID := uuid_generate_v4();
  lesson07_id UUID := uuid_generate_v4();
  lesson08_id UUID := uuid_generate_v4();
  lesson09_id UUID := uuid_generate_v4();
  lesson10_id UUID := uuid_generate_v4();
  lesson11_id UUID := uuid_generate_v4();
  lesson12_id UUID := uuid_generate_v4();
  lesson13_id UUID := uuid_generate_v4();
  lesson14_id UUID := uuid_generate_v4();
  lesson15_id UUID := uuid_generate_v4();
  lesson16_id UUID := uuid_generate_v4();
  lesson17_id UUID := uuid_generate_v4();
  lesson18_id UUID := uuid_generate_v4();
  lesson19_id UUID := uuid_generate_v4();
  lesson20_id UUID := uuid_generate_v4();
  lesson21_id UUID := uuid_generate_v4();
  lesson22_id UUID := uuid_generate_v4();
  lesson23_id UUID := uuid_generate_v4();
  lesson24_id UUID := uuid_generate_v4();
  lesson25_id UUID := uuid_generate_v4();
  lesson26_id UUID := uuid_generate_v4();
  lesson27_id UUID := uuid_generate_v4();
  lesson28_id UUID := uuid_generate_v4();
  lesson29_id UUID := uuid_generate_v4();
  lesson30_id UUID := uuid_generate_v4();
  lesson31_id UUID := uuid_generate_v4();
  lesson32_id UUID := uuid_generate_v4();
  lesson33_id UUID := uuid_generate_v4();
  lesson34_id UUID := uuid_generate_v4();
  lesson35_id UUID := uuid_generate_v4();
BEGIN

  -- 1. Insert course
  INSERT INTO public.courses (
    id, slug, title, description, icon, level, duration_weeks,
    is_published, sort_order
  ) VALUES (
    course_id,
    'tech-in-business',
    'Tech in Business',
    'A practical course for Rwandan business owners who want to use technology to sell smarter, automate tasks, and grow their business. No jargon, no filler — every lesson teaches something actionable.',
    'briefcase',
    'beginner',
    18,
    true,
    20
  );

  -- Module 1: Getting Your Business Online
  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson01_id,
    course_id,
    'Module 1 — Lesson 1',
    'Build your digital presence from scratch: Google Business Profile, websites, soc...',
    -- Load full content from courses/tech-in-business/module-01-getting-your-business-online.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-01-getting-your-business-online.md') or paste content here
    E'See module file for full content',
    'reading',
    15,
    1,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson02_id,
    course_id,
    'Module 1 — Lesson 2',
    'Build your digital presence from scratch: Google Business Profile, websites, soc...',
    -- Load full content from courses/tech-in-business/module-01-getting-your-business-online.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-01-getting-your-business-online.md') or paste content here
    E'See module file for full content',
    'reading',
    20,
    2,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson03_id,
    course_id,
    'Module 1 — Lesson 3',
    'Build your digital presence from scratch: Google Business Profile, websites, soc...',
    -- Load full content from courses/tech-in-business/module-01-getting-your-business-online.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-01-getting-your-business-online.md') or paste content here
    E'See module file for full content',
    'reading',
    25,
    3,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson04_id,
    course_id,
    'Module 1 — Lesson 4',
    'Build your digital presence from scratch: Google Business Profile, websites, soc...',
    -- Load full content from courses/tech-in-business/module-01-getting-your-business-online.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-01-getting-your-business-online.md') or paste content here
    E'See module file for full content',
    'reading',
    30,
    4,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson05_id,
    course_id,
    'Module 1 — Lesson 5',
    'Build your digital presence from scratch: Google Business Profile, websites, soc...',
    -- Load full content from courses/tech-in-business/module-01-getting-your-business-online.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-01-getting-your-business-online.md') or paste content here
    E'See module file for full content',
    'reading',
    35,
    5,
    true
  );


  -- Module 2: Selling Smarter with POS & Inventory
  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson06_id,
    course_id,
    'Module 2 — Lesson 1',
    'Move beyond paper receipts. Set up a POS system, track inventory with reorder po...',
    -- Load full content from courses/tech-in-business/module-02-selling-smarter-with-pos-and-inventory.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-02-selling-smarter-with-pos-and-inventory.md') or paste content here
    E'See module file for full content',
    'reading',
    15,
    1,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson07_id,
    course_id,
    'Module 2 — Lesson 2',
    'Move beyond paper receipts. Set up a POS system, track inventory with reorder po...',
    -- Load full content from courses/tech-in-business/module-02-selling-smarter-with-pos-and-inventory.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-02-selling-smarter-with-pos-and-inventory.md') or paste content here
    E'See module file for full content',
    'reading',
    20,
    2,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson08_id,
    course_id,
    'Module 2 — Lesson 3',
    'Move beyond paper receipts. Set up a POS system, track inventory with reorder po...',
    -- Load full content from courses/tech-in-business/module-02-selling-smarter-with-pos-and-inventory.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-02-selling-smarter-with-pos-and-inventory.md') or paste content here
    E'See module file for full content',
    'reading',
    25,
    3,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson09_id,
    course_id,
    'Module 2 — Lesson 4',
    'Move beyond paper receipts. Set up a POS system, track inventory with reorder po...',
    -- Load full content from courses/tech-in-business/module-02-selling-smarter-with-pos-and-inventory.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-02-selling-smarter-with-pos-and-inventory.md') or paste content here
    E'See module file for full content',
    'reading',
    30,
    4,
    true
  );


  -- Module 3: Mobile Money & Digital Payments
  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson10_id,
    course_id,
    'Module 3 — Lesson 1',
    'Accept MTN MoMo, Airtel Money, and card payments. Set up business accounts, reco...',
    -- Load full content from courses/tech-in-business/module-03-mobile-money-and-digital-payments.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-03-mobile-money-and-digital-payments.md') or paste content here
    E'See module file for full content',
    'reading',
    15,
    1,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson11_id,
    course_id,
    'Module 3 — Lesson 2',
    'Accept MTN MoMo, Airtel Money, and card payments. Set up business accounts, reco...',
    -- Load full content from courses/tech-in-business/module-03-mobile-money-and-digital-payments.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-03-mobile-money-and-digital-payments.md') or paste content here
    E'See module file for full content',
    'reading',
    20,
    2,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson12_id,
    course_id,
    'Module 3 — Lesson 3',
    'Accept MTN MoMo, Airtel Money, and card payments. Set up business accounts, reco...',
    -- Load full content from courses/tech-in-business/module-03-mobile-money-and-digital-payments.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-03-mobile-money-and-digital-payments.md') or paste content here
    E'See module file for full content',
    'reading',
    25,
    3,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson13_id,
    course_id,
    'Module 3 — Lesson 4',
    'Accept MTN MoMo, Airtel Money, and card payments. Set up business accounts, reco...',
    -- Load full content from courses/tech-in-business/module-03-mobile-money-and-digital-payments.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-03-mobile-money-and-digital-payments.md') or paste content here
    E'See module file for full content',
    'reading',
    30,
    4,
    true
  );


  -- Module 4: Automating Your Daily Tasks
  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson14_id,
    course_id,
    'Module 4 — Lesson 1',
    'Save 2-4 hours per day with automated invoicing, scheduling, reminders, and Goog...',
    -- Load full content from courses/tech-in-business/module-04-automating-your-daily-tasks.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-04-automating-your-daily-tasks.md') or paste content here
    E'See module file for full content',
    'reading',
    15,
    1,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson15_id,
    course_id,
    'Module 4 — Lesson 2',
    'Save 2-4 hours per day with automated invoicing, scheduling, reminders, and Goog...',
    -- Load full content from courses/tech-in-business/module-04-automating-your-daily-tasks.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-04-automating-your-daily-tasks.md') or paste content here
    E'See module file for full content',
    'reading',
    20,
    2,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson16_id,
    course_id,
    'Module 4 — Lesson 3',
    'Save 2-4 hours per day with automated invoicing, scheduling, reminders, and Goog...',
    -- Load full content from courses/tech-in-business/module-04-automating-your-daily-tasks.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-04-automating-your-daily-tasks.md') or paste content here
    E'See module file for full content',
    'reading',
    25,
    3,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson17_id,
    course_id,
    'Module 4 — Lesson 4',
    'Save 2-4 hours per day with automated invoicing, scheduling, reminders, and Goog...',
    -- Load full content from courses/tech-in-business/module-04-automating-your-daily-tasks.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-04-automating-your-daily-tasks.md') or paste content here
    E'See module file for full content',
    'reading',
    30,
    4,
    true
  );


  -- Module 5: AI Tools for Marketing & Customer Service
  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson18_id,
    course_id,
    'Module 5 — Lesson 1',
    'Use ChatGPT, Canva AI, and chatbots to create marketing content, automate custom...',
    -- Load full content from courses/tech-in-business/module-05-ai-tools-for-marketing.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-05-ai-tools-for-marketing.md') or paste content here
    E'See module file for full content',
    'reading',
    15,
    1,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson19_id,
    course_id,
    'Module 5 — Lesson 2',
    'Use ChatGPT, Canva AI, and chatbots to create marketing content, automate custom...',
    -- Load full content from courses/tech-in-business/module-05-ai-tools-for-marketing.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-05-ai-tools-for-marketing.md') or paste content here
    E'See module file for full content',
    'reading',
    20,
    2,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson20_id,
    course_id,
    'Module 5 — Lesson 3',
    'Use ChatGPT, Canva AI, and chatbots to create marketing content, automate custom...',
    -- Load full content from courses/tech-in-business/module-05-ai-tools-for-marketing.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-05-ai-tools-for-marketing.md') or paste content here
    E'See module file for full content',
    'reading',
    25,
    3,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson21_id,
    course_id,
    'Module 5 — Lesson 4',
    'Use ChatGPT, Canva AI, and chatbots to create marketing content, automate custom...',
    -- Load full content from courses/tech-in-business/module-05-ai-tools-for-marketing.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-05-ai-tools-for-marketing.md') or paste content here
    E'See module file for full content',
    'reading',
    30,
    4,
    true
  );


  -- Module 6: Cybersecurity for Small Business
  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson22_id,
    course_id,
    'Module 6 — Lesson 1',
    'Protect your business from phone theft, phishing, weak passwords, and data breac...',
    -- Load full content from courses/tech-in-business/module-06-cybersecurity-for-small-business.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-06-cybersecurity-for-small-business.md') or paste content here
    E'See module file for full content',
    'reading',
    15,
    1,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson23_id,
    course_id,
    'Module 6 — Lesson 2',
    'Protect your business from phone theft, phishing, weak passwords, and data breac...',
    -- Load full content from courses/tech-in-business/module-06-cybersecurity-for-small-business.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-06-cybersecurity-for-small-business.md') or paste content here
    E'See module file for full content',
    'reading',
    20,
    2,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson24_id,
    course_id,
    'Module 6 — Lesson 3',
    'Protect your business from phone theft, phishing, weak passwords, and data breac...',
    -- Load full content from courses/tech-in-business/module-06-cybersecurity-for-small-business.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-06-cybersecurity-for-small-business.md') or paste content here
    E'See module file for full content',
    'reading',
    25,
    3,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson25_id,
    course_id,
    'Module 6 — Lesson 4',
    'Protect your business from phone theft, phishing, weak passwords, and data breac...',
    -- Load full content from courses/tech-in-business/module-06-cybersecurity-for-small-business.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-06-cybersecurity-for-small-business.md') or paste content here
    E'See module file for full content',
    'reading',
    30,
    4,
    true
  );


  -- Module 7: Data-Driven Decisions with Free Tools
  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson26_id,
    course_id,
    'Module 7 — Lesson 1',
    'Build dashboards in Google Sheets, analyze sales data, set optimal prices, and p...',
    -- Load full content from courses/tech-in-business/module-07-data-driven-decisions.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-07-data-driven-decisions.md') or paste content here
    E'See module file for full content',
    'reading',
    15,
    1,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson27_id,
    course_id,
    'Module 7 — Lesson 2',
    'Build dashboards in Google Sheets, analyze sales data, set optimal prices, and p...',
    -- Load full content from courses/tech-in-business/module-07-data-driven-decisions.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-07-data-driven-decisions.md') or paste content here
    E'See module file for full content',
    'reading',
    20,
    2,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson28_id,
    course_id,
    'Module 7 — Lesson 3',
    'Build dashboards in Google Sheets, analyze sales data, set optimal prices, and p...',
    -- Load full content from courses/tech-in-business/module-07-data-driven-decisions.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-07-data-driven-decisions.md') or paste content here
    E'See module file for full content',
    'reading',
    25,
    3,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson29_id,
    course_id,
    'Module 7 — Lesson 4',
    'Build dashboards in Google Sheets, analyze sales data, set optimal prices, and p...',
    -- Load full content from courses/tech-in-business/module-07-data-driven-decisions.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-07-data-driven-decisions.md') or paste content here
    E'See module file for full content',
    'reading',
    30,
    4,
    true
  );


  -- Module 8: Finding & Hiring Tech Help
  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson30_id,
    course_id,
    'Module 8 — Lesson 1',
    'Know when to DIY vs hire. Find, vet, and manage freelancers. Build long-term tec...',
    -- Load full content from courses/tech-in-business/module-08-finding-and-hiring-tech-help.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-08-finding-and-hiring-tech-help.md') or paste content here
    E'See module file for full content',
    'reading',
    15,
    1,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson31_id,
    course_id,
    'Module 8 — Lesson 2',
    'Know when to DIY vs hire. Find, vet, and manage freelancers. Build long-term tec...',
    -- Load full content from courses/tech-in-business/module-08-finding-and-hiring-tech-help.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-08-finding-and-hiring-tech-help.md') or paste content here
    E'See module file for full content',
    'reading',
    20,
    2,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson32_id,
    course_id,
    'Module 8 — Lesson 3',
    'Know when to DIY vs hire. Find, vet, and manage freelancers. Build long-term tec...',
    -- Load full content from courses/tech-in-business/module-08-finding-and-hiring-tech-help.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-08-finding-and-hiring-tech-help.md') or paste content here
    E'See module file for full content',
    'reading',
    25,
    3,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson33_id,
    course_id,
    'Module 8 — Lesson 4',
    'Know when to DIY vs hire. Find, vet, and manage freelancers. Build long-term tec...',
    -- Load full content from courses/tech-in-business/module-08-finding-and-hiring-tech-help.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-08-finding-and-hiring-tech-help.md') or paste content here
    E'See module file for full content',
    'reading',
    30,
    4,
    true
  );


  -- Module 9: Your Business Suite — Next Steps
  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson34_id,
    course_id,
    'Module 9 — Lesson 1',
    'Recap your tech stack, explore the Business Suite companion product, and create ...',
    -- Load full content from courses/tech-in-business/module-09-your-business-suite.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-09-your-business-suite.md') or paste content here
    E'See module file for full content',
    'reading',
    15,
    1,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson35_id,
    course_id,
    'Module 9 — Lesson 2',
    'Recap your tech stack, explore the Business Suite companion product, and create ...',
    -- Load full content from courses/tech-in-business/module-09-your-business-suite.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-09-your-business-suite.md') or paste content here
    E'See module file for full content',
    'reading',
    20,
    2,
    true
  );

  INSERT INTO public.lessons (
    id, course_id, title, description, content_md, lesson_type,
    duration_min, sort_order, is_published
  ) VALUES (
    lesson36_id,
    course_id,
    'Module 9 — Lesson 3',
    'Recap your tech stack, explore the Business Suite companion product, and create ...',
    -- Load full content from courses/tech-in-business/module-09-your-business-suite.md
    -- Use: pg_read_file('/home/aime/1percent/1percent/courses/tech-in-business/module-09-your-business-suite.md') or paste content here
    E'See module file for full content',
    'reading',
    25,
    3,
    true
  );


END $$;

-- ============================================================
-- To load full lesson content, run this after the seed:
-- UPDATE public.lessons SET content_md = pg_read_file(...)
-- Or use the admin dashboard to paste content into each lesson.
-- ============================================================
