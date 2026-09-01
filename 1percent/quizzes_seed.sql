-- ============================================================
-- QUIZZES FOR ALL 15 COURSES
-- Run this AFTER supabase_schema.sql
-- ============================================================
-- Each course gets 1 quiz with 5 questions.
-- To auto-issue certificates on quiz pass, we update the
-- certificate service logic (no schema change needed).
-- ============================================================

-- ============================================================
-- 1. Programming Fundamentals
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT
  uuid_generate_v4(),
  c.id,
  'Programming Fundamentals — End of Course Quiz',
  'Test your knowledge of variables, control flow, functions, and data structures.',
  70,
  true
FROM public.courses c WHERE c.slug = 'programming-fundamentals'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

-- Questions for Programming Fundamentals
DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Programming Fundamentals — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is the correct way to declare a constant in modern JavaScript?',
    '[{"id":"a","text":"var x = 5"},{"id":"b","text":"const x = 5"},{"id":"c","text":"let x = 5"},{"id":"d","text":"define x = 5"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'Which data structure uses FIFO (First In, First Out)?',
    '[{"id":"a","text":"Stack"},{"id":"b","text":"Queue"},{"id":"c","text":"Tree"},{"id":"d","text":"Graph"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What does the "===" operator check in JavaScript?',
    '[{"id":"a","text":"Value only"},{"id":"b","text":"Type only"},{"id":"c","text":"Value and type"},{"id":"d","text":"Reference equality"}]',
    'c', 3, 1),
  (uuid_generate_v4(), qid, 'Which of these is NOT a valid JavaScript data type?',
    '[{"id":"a","text":"undefined"},{"id":"b","text":"boolean"},{"id":"c","text":"float"},{"id":"d","text":"symbol"}]',
    'c', 4, 1),
  (uuid_generate_v4(), qid, 'What is recursion in programming?',
    '[{"id":"a","text":"A loop that never ends"},{"id":"b","text":"A function that calls itself"},{"id":"c","text":"A type of variable"},{"id":"d","text":"A sorting algorithm"}]',
    'b', 5, 1);
END $$;

-- ============================================================
-- 2. Git & GitHub
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Git & GitHub — End of Course Quiz',
  'Test your version control knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'git-github'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Git & GitHub — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What does "git clone" do?',
    '[{"id":"a","text":"Creates a new repository"},{"id":"b","text":"Copies a remote repository to your machine"},{"id":"c","text":"Deletes a branch"},{"id":"d","text":"Merges two branches"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'Which command stages changes for the next commit?',
    '[{"id":"a","text":"git push"},{"id":"b","text":"git commit"},{"id":"c","text":"git add"},{"id":"d","text":"git stash"}]',
    'c', 2, 1),
  (uuid_generate_v4(), qid, 'What is a pull request?',
    '[{"id":"a","text":"A command to pull code"},{"id":"b","text":"A request to merge changes into a branch"},{"id":"c","text":"A way to delete a branch"},{"id":"d","text":"A Git configuration file"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'How do you create a new branch in Git?',
    '[{"id":"a","text":"git branch feature-x"},{"id":"b","text":"git new branch feature-x"},{"id":"c","text":"git create feature-x"},{"id":"d","text":"git switch --new feature-x"}]',
    'a', 4, 1),
  (uuid_generate_v4(), qid, 'What does "git merge" do?',
    '[{"id":"a","text":"Deletes a branch"},{"id":"b","text":"Combines changes from two branches"},{"id":"c","text":"Reverts to a previous commit"},{"id":"d","text":"Stashes changes"}]',
    'b', 5, 1);
END $$;

-- ============================================================
-- 3. Command Line / Linux Basics
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Command Line / Linux — End of Course Quiz',
  'Test your terminal and shell knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'command-line-linux'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Command Line / Linux — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'Which command lists files in a directory?',
    '[{"id":"a","text":"dir"},{"id":"b","text":"ls"},{"id":"c","text":"list"},{"id":"d","text":"show"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What does "chmod 755 file.sh" do?',
    '[{"id":"a","text":"Deletes the file"},{"id":"b","text":"Makes it executable for owner, readable by all"},{"id":"c","text":"Copies the file"},{"id":"d","text":"Renames the file"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'Which command changes the current directory?',
    '[{"id":"a","text":"dir"},{"id":"b","text":"mov"},{"id":"c","text":"cd"},{"id":"d","text":"change"}]',
    'c', 3, 1),
  (uuid_generate_v4(), qid, 'What does the pipe operator "|" do?',
    '[{"id":"a","text":"Redirects output to a file"},{"id":"b","text":"Sends output of one command as input to another"},{"id":"c","text":"Runs two commands in parallel"},{"id":"d","text":"Deletes a file"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'Which command searches for text within files?',
    '[{"id":"a","text":"find"},{"id":"b","text":"search"},{"id":"c","text":"grep"},{"id":"d","text":"locate"}]',
    'c', 5, 1);
END $$;

-- ============================================================
-- 4. Backend Development
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Backend Development — End of Course Quiz',
  'Test your API, server, and database knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'backend-development'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Backend Development — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What does REST stand for in API design?',
    '[{"id":"a","text":"Remote Execution Standard Transfer"},{"id":"b","text":"Representational State Transfer"},{"id":"c","text":"Resource Encoding Standard Transport"},{"id":"d","text":"Rapid Exchange Service Thread"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'Which HTTP method is used to create a new resource?',
    '[{"id":"a","text":"GET"},{"id":"b","text":"PUT"},{"id":"c","text":"POST"},{"id":"d","text":"DELETE"}]',
    'c', 2, 1),
  (uuid_generate_v4(), qid, 'What is middleware in Express.js?',
    '[{"id":"a","text":"A database query layer"},{"id":"b","text":"Functions that run between request and response"},{"id":"c","text":"A frontend template engine"},{"id":"d","text":"A type of HTTP header"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What status code indicates a resource was successfully created?',
    '[{"id":"a","text":"200"},{"id":"b","text":"201"},{"id":"c","text":"204"},{"id":"d","text":"301"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'What does JWT stand for?',
    '[{"id":"a","text":"Java Web Token"},{"id":"b","text":"JSON Web Token"},{"id":"c","text":"JavaScript Wire Transfer"},{"id":"d","text":"Joint Web Token"}]',
    'b', 5, 1);
END $$;

-- ============================================================
-- 5. Frontend Development
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Frontend Development — End of Course Quiz',
  'Test your UI, React, and browser knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'frontend-development'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Frontend Development — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is the virtual DOM in React?',
    '[{"id":"a","text":"A copy of the real DOM kept in memory"},{"id":"b","text":"A browser API"},{"id":"c","text":"A CSS framework"},{"id":"d","text":"A database"}]',
    'a', 1, 1),
  (uuid_generate_v4(), qid, 'Which hook is used for side effects in React?',
    '[{"id":"a","text":"useState"},{"id":"b","text":"useEffect"},{"id":"c","text":"useRef"},{"id":"d","text":"useMemo"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What does CSS Grid use for layout?',
    '[{"id":"a","text":"Flex direction"},{"id":"b","text":"Rows and columns"},{"id":"c","text":"Float property"},{"id":"d","text":"Table layout"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What is a "controlled component" in React?',
    '[{"id":"a","text":"A component with no state"},{"id":"b","text":"A component whose value is driven by React state"},{"id":"c","text":"A component that uses Redux"},{"id":"d","text":"A component with error boundaries"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'Which HTML element is used for the main content of a page?',
    '[{"id":"a","text":"<div>"},{"id":"b","text":"<section>"},{"id":"c","text":"<main>"},{"id":"d","text":"<article>"}]',
    'c', 5, 1);
END $$;

-- ============================================================
-- 6. Databases (SQL + NoSQL)
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Databases — End of Course Quiz',
  'Test your SQL, NoSQL, and data modeling knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'databases'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Databases — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What does SQL stand for?',
    '[{"id":"a","text":"Simple Query Language"},{"id":"b","text":"Structured Query Language"},{"id":"c","text":"Standard Query Logic"},{"id":"d","text":"System Query Language"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'Which SQL clause is used to filter rows?',
    '[{"id":"a","text":"GROUP BY"},{"id":"b","text":"ORDER BY"},{"id":"c","text":"WHERE"},{"id":"d","text":"HAVING"}]',
    'c', 2, 1),
  (uuid_generate_v4(), qid, 'What is a primary key?',
    '[{"id":"a","text":"A column that can have NULL values"},{"id":"b","text":"A unique identifier for each row in a table"},{"id":"c","text":"A foreign reference to another table"},{"id":"d","text":"An index for fast queries"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What type of join returns all rows from both tables?',
    '[{"id":"a","text":"INNER JOIN"},{"id":"b","text":"LEFT JOIN"},{"id":"c","text":"FULL OUTER JOIN"},{"id":"d","text":"CROSS JOIN"}]',
    'c', 4, 1),
  (uuid_generate_v4(), qid, 'In MongoDB, what is a "document"?',
    '[{"id":"a","text":"A file on disk"},{"id":"b","text":"A JSON-like record in a collection"},{"id":"c","text":"A SQL row"},{"id":"d","text":"An index entry"}]',
    'b', 5, 1);
END $$;

-- ============================================================
-- 7. Authentication & Security Fundamentals
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Auth & Security — End of Course Quiz',
  'Test your knowledge of authentication, JWT, and security best practices.',
  70, true
FROM public.courses c WHERE c.slug = 'auth-security'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Auth & Security — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is the purpose of password hashing?',
    '[{"id":"a","text":"To make passwords shorter"},{"id":"b","text":"To store passwords securely so they cannot be reversed"},{"id":"c","text":"To compress password data"},{"id":"d","text":"To encrypt network traffic"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What does CSRF stand for?',
    '[{"id":"a","text":"Cross-Site Request Forgery"},{"id":"b","text":"Cross-Server Resource Fetching"},{"id":"c","text":"Client-Side Request Forwarding"},{"id":"d","text":"Cross-Site Response Forgery"}]',
    'a', 2, 1),
  (uuid_generate_v4(), qid, 'Which header helps prevent XSS attacks?',
    '[{"id":"a","text":"Content-Type"},{"id":"b","text":"X-Frame-Options"},{"id":"c","text":"Content-Security-Policy"},{"id":"d","text":"Cache-Control"}]',
    'c', 3, 1),
  (uuid_generate_v4(), qid, 'What is a JWT composed of?',
    '[{"id":"a","text":"Username and password"},{"id":"b","text":"Header, payload, and signature"},{"id":"c","text":"API key and secret"},{"id":"d","text":"Session ID and cookie"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'What is the principle of least privilege?',
    '[{"id":"a","text":"Give all users admin access"},{"id":"b","text":"Only grant the minimum permissions needed to perform a task"},{"id":"c","text":"Use the cheapest hosting plan"},{"id":"d","text":"Encrypt all database columns"}]',
    'b', 5, 1);
END $$;

-- ============================================================
-- 8. System Design Basics
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'System Design — End of Course Quiz',
  'Test your architecture and scalability knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'system-design'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'System Design — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is a load balancer used for?',
    '[{"id":"a","text":"Storing user sessions"},{"id":"b","text":"Distributing incoming traffic across multiple servers"},{"id":"c","text":"Compressing database queries"},{"id":"d","text":"Encrypting API keys"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What is horizontal scaling?',
    '[{"id":"a","text":"Adding more RAM to a single server"},{"id":"b","text":"Adding more servers to handle load"},{"id":"c","text":"Upgrading the CPU"},{"id":"d","text":"Moving to a faster hard drive"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What is caching used for?',
    '[{"id":"a","text":"Storing permanent data"},{"id":"b","text":"Storing frequently accessed data temporarily for faster access"},{"id":"c","text":"Compressing files"},{"id":"d","text":"Running background jobs"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What is the CAP theorem about?',
    '[{"id":"a","text":"CPU, Accuracy, Performance"},{"id":"b","text":"Consistency, Availability, Partition tolerance"},{"id":"c","text":"Concurrency, Authentication, Privacy"},{"id":"d","text":"Capacity, Automation, Protection"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'What is a CDN?',
    '[{"id":"a","text":"A database system"},{"id":"b","text":"Content Delivery Network — serves content from edge locations"},{"id":"c","text":"A code deployment tool"},{"id":"d","text":"A CI/CD pipeline"}]',
    'b', 5, 1);
END $$;

-- ============================================================
-- 9. Testing & Debugging Discipline
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Testing & Debugging — End of Course Quiz',
  'Test your TDD, unit testing, and debugging knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'testing-debugging'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Testing & Debugging — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What does TDD stand for?',
    '[{"id":"a","text":"Test-Driven Development"},{"id":"b","text":"Total Debug Discipline"},{"id":"c","text":"Technical Design Document"},{"id":"d","text":"Test Deployment Dashboard"}]',
    'a', 1, 1),
  (uuid_generate_v4(), qid, 'What is a unit test?',
    '[{"id":"a","text":"A test that runs the entire application"},{"id":"b","text":"A test that verifies a single function or unit of code"},{"id":"c","text":"A test that checks the database"},{"id":"d","text":"A test that measures performance"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What does the "AAA" pattern stand for in testing?',
    '[{"id":"a","text":"Assert, Act, Arrange"},{"id":"b","text":"Arrange, Act, Assert"},{"id":"c","text":"Analyze, Apply, Approve"},{"id":"d","text":"Attach, Assert, Accept"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What is a mock in testing?',
    '[{"id":"a","text":"A fake implementation of a dependency used in tests"},{"id":"b","text":"A production database"},{"id":"c","text":"A deployment script"},{"id":"d","text":"A type of HTTP request"}]',
    'a', 4, 1),
  (uuid_generate_v4(), qid, 'What is code coverage?',
    '[{"id":"a","text":"The number of lines of code"},{"id":"b","text":"The percentage of code exercised by tests"},{"id":"c","text":"The amount of documentation"},{"id":"d","text":"The number of dependencies"}]',
    'b', 5, 1);
END $$;

-- ============================================================
-- 10. DevOps Basics
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'DevOps Basics — End of Course Quiz',
  'Test your Docker, CI/CD, and deployment knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'devops-basics'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'DevOps Basics — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is Docker?',
    '[{"id":"a","text":"A programming language"},{"id":"b","text":"A containerization platform"},{"id":"c","text":"A database management tool"},{"id":"d","text":"A frontend framework"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What does CI/CD stand for?',
    '[{"id":"a","text":"Code Integration / Code Deployment"},{"id":"b","text":"Continuous Integration / Continuous Deployment"},{"id":"c","text":"Central Interface / Central Database"},{"id":"d","text":"Continuous Inspection / Continuous Debugging"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What is Infrastructure as Code (IaC)?',
    '[{"id":"a","text":"Writing documentation for infrastructure"},{"id":"b","text":"Managing infrastructure through machine-readable configuration files"},{"id":"c","text":"A programming paradigm for databases"},{"id":"d","text":"A type of cloud hosting"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What is a Dockerfile?',
    '[{"id":"a","text":"A file that stores container data"},{"id":"b","text":"A text file with instructions to build a Docker image"},{"id":"c","text":"A database schema file"},{"id":"d","text":"A deployment manifest"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'What is the purpose of a health check in deployment?',
    '[{"id":"a","text":"To test user passwords"},{"id":"b","text":"To verify that a service is running and responsive"},{"id":"c","text":"To check database backups"},{"id":"d","text":"To monitor network bandwidth"}]',
    'b', 5, 1);
END $$;

-- ============================================================
-- 11. Working with AI Coding Tools Properly
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'AI Coding Tools — End of Course Quiz',
  'Test your prompt engineering and AI-assisted coding knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'ai-coding-tools'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'AI Coding Tools — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is prompt engineering?',
    '[{"id":"a","text":"Writing code in a new language"},{"id":"b","text":"Crafting effective inputs to get desired outputs from AI models"},{"id":"c","text":"Building AI hardware"},{"id":"d","text":"Training a neural network from scratch"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'Why should you review AI-generated code before using it?',
    '[{"id":"a","text":"AI code is always wrong"},{"id":"b","text":"AI may introduce bugs, security issues, or incorrect logic"},{"id":"c","text":"AI cannot write code"},{"id":"d","text":"Review is not necessary"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'Which is a best practice when using AI coding assistants?',
    '[{"id":"a","text":"Accept all suggestions without reviewing"},{"id":"b","text":"Provide clear context and constraints in your prompts"},{"id":"c","text":"Use AI to replace all testing"},{"id":"d","text":"Never ask follow-up questions"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What is AI pair programming?',
    '[{"id":"a","text":"Two developers sharing one keyboard"},{"id":"b","text":"Using an AI tool alongside a human developer for collaborative coding"},{"id":"c","text":"Having AI write all the code automatically"},{"id":"d","text":"Running AI tests on production servers"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'When should you NOT use AI for coding?',
    '[{"id":"a","text":"For boilerplate code"},{"id":"b","text":"For security-critical code without thorough review"},{"id":"c","text":"For documentation"},{"id":"d","text":"For refactoring"}]',
    'b', 5, 1);
END $$;

-- ============================================================
-- 12. Capstone Project
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Capstone Project — End of Course Quiz',
  'Test your project planning, build, and deployment knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'capstone-project'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Capstone Project — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What should you do first when starting a capstone project?',
    '[{"id":"a","text":"Start coding immediately"},{"id":"b","text":"Define requirements, plan architecture, and set up version control"},{"id":"c","text":"Choose the most complex technology stack"},{"id":"d","text":"Deploy to production on day one"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What is the purpose of a project README?',
    '[{"id":"a","text":"To store API keys"},{"id":"b","text":"To document what the project does, how to set it up, and how to run it"},{"id":"c","text":"To list all dependencies"},{"id":"d","text":"To hold environment variables"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'Why is a portfolio project important?',
    '[{"id":"a","text":"It looks nice on social media"},{"id":"b","text":"It demonstrates real-world skills to employers"},{"id":"c","text":"It replaces a resume"},{"id":"d","text":"It is required by law"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What should a production deployment include?',
    '[{"id":"a","text":"console.log statements"},{"id":"b","text":"Error handling, logging, environment config, and security headers"},{"id":"c","text":"Only the frontend code"},{"id":"d","text":"Hardcoded API keys"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'How should you handle secrets in a deployed application?',
    '[{"id":"a","text":"Commit them to Git"},{"id":"b","text":"Use environment variables and never expose them in client-side code"},{"id":"c","text":"Store them in localStorage"},{"id":"d","text":"Hardcode them in the source code"}]',
    'b', 5, 1);
END $$;

-- ============================================================
-- 13. Reading and Contributing to Existing Codebases
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Reading Codebases — End of Course Quiz',
  'Test your code navigation and open-source contribution knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'reading-codebases'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Reading Codebases — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is the first step when joining an existing codebase?',
    '[{"id":"a","text":"Rewrite everything"},{"id":"b","text":"Read the README, run the app, and understand the project structure"},{"id":"c","text":"Delete old code"},{"id":"d","text":"Create new branches immediately"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What is a good way to understand how a function works?',
    '[{"id":"a","text":"Guess by its name"},{"id":"b","text":"Read its implementation, check callers, and write a test"},{"id":"c","text":"Delete it and see what breaks"},{"id":"d","text":"Ask ChatGPT to explain it"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What makes a good pull request?',
    '[{"id":"a","text":"Changes to 50+ files at once"},{"id":"b","text":"Small, focused changes with clear description and tests"},{"id":"c","text":"No description needed"},{"id":"d","text":"Renaming files without logic changes"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'How should you approach contributing to open source?',
    '[{"id":"a","text":"Start with small, well-defined issues"},{"id":"b","text":"Immediately refactor the entire project"},{"id":"c","text":"Only contribute to projects you built"},{"id":"d","text":"Skip reading contributing guidelines"}]',
    'a', 4, 1),
  (uuid_generate_v4(), qid, 'What does "git blame" show?',
    '[{"id":"a","text":"Who committed each line of a file"},{"id":"b","text":"The git configuration"},{"id":"c","text":"Merge conflicts"},{"id":"d","text":"Repository statistics"}]',
    'a', 5, 1);
END $$;

-- ============================================================
-- 14. Technical Communication
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Technical Communication — End of Course Quiz',
  'Test your documentation and technical writing knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'technical-communication'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Technical Communication — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is the purpose of a README file?',
    '[{"id":"a","text":"To store passwords"},{"id":"b","text":"To explain what a project does, how to set it up, and how to use it"},{"id":"c","text":"To hold configuration files"},{"id":"d","text":"To log errors"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'Who is the primary audience for technical documentation?',
    '[{"id":"a","text":"The original developer only"},{"id":"b","text":"Other developers and users who need to understand the system"},{"id":"c","text":"Marketing teams"},{"id":"d","text":"Investors only"}]',
    'b', 2, 1),
  (uuid_generate_v4(), qid, 'What makes technical writing effective?',
    '[{"id":"a","text":"Using as many jargon words as possible"},{"id":"b","text":"Being clear, concise, and well-organized"},{"id":"c","text":"Writing very long paragraphs"},{"id":"d","text":"Avoiding code examples"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What should an API documentation include?',
    '[{"id":"a","text":"Only the endpoint URL"},{"id":"b","text":"Endpoints, parameters, request/response examples, and error codes"},{"id":"c","text":"Just the database schema"},{"id":"d","text":"Only the authentication method"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'What is the difference between a tutorial and a reference guide?',
    '[{"id":"a","text":"There is no difference"},{"id":"b","text":"Tutorials teach concepts step-by-step; reference guides provide detailed API/function info"},{"id":"c","text":"Tutorials are for beginners, reference guides are for experts only"},{"id":"d","text":"Reference guides are shorter than tutorials"}]',
    'b', 5, 1);
END $$;

-- ============================================================
-- 15. Problem-Solving Under Constraints
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
  'Problem-Solving — End of Course Quiz',
  'Test your analytical thinking and constraint management knowledge.',
  70, true
FROM public.courses c WHERE c.slug = 'problem-solving'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = c.id);

DO $$
DECLARE qid UUID;
BEGIN
  SELECT id INTO qid FROM public.quizzes WHERE title = 'Problem-Solving — End of Course Quiz' LIMIT 1;
  IF qid IS NULL THEN RETURN; END IF;

  INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
  (uuid_generate_v4(), qid, 'What is the first step in solving a complex problem?',
    '[{"id":"a","text":"Start coding immediately"},{"id":"b","text":"Break it down into smaller, manageable parts"},{"id":"c","text":"Ask someone else to solve it"},{"id":"d","text":"Choose the most complex solution"}]',
    'b', 1, 1),
  (uuid_generate_v4(), qid, 'What is the Pareto Principle (80/20 rule)?',
    '[{"id":"a","text":"80% of bugs come from 20% of code"},{"id":"b","text":"80% of effects come from 20% of causes"},{"id":"c","text":"80% of users use 20% of features"},{"id":"d","text":"All of the above are valid applications"}]',
    'd', 2, 1),
  (uuid_generate_v4(), qid, 'How should you prioritize tasks under tight deadlines?',
    '[{"id":"a","text":"Do everything at once"},{"id":"b","text":"Focus on high-impact, must-have features first"},{"id":"c","text":"Start with the easiest tasks"},{"id":"d","text":"Skip testing to save time"}]',
    'b', 3, 1),
  (uuid_generate_v4(), qid, 'What is a "time-box" in project management?',
    '[{"id":"a","text":"A type of clock"},{"id":"b","text":"Setting a fixed maximum time for a task"},{"id":"c","text":"A deadline for the entire project"},{"id":"d","text":"A type of database query"}]',
    'b', 4, 1),
  (uuid_generate_v4(), qid, 'When stuck on a problem, what should you do?',
    '[{"id":"a","text":"Give up immediately"},{"id":"b","text":"Take a break, re-read the problem, try a different approach, or ask for help"},{"id":"c","text":"Keep trying the same approach"},{"id":"d","text":"Delete the code and start over"}]',
    'b', 5, 1);
END $$;

-- ============================================================
-- FILE STORAGE TABLE (for lab files saved to S3)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lab_files (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  file_name     text not null,
  file_path     text not null,           -- S3 key path
  file_size     int not null default 0,  -- bytes
  mime_type     text not null default 'text/plain',
  language      text not null default 'javascript',
  content       text not null default '', -- file content stored locally too
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

CREATE INDEX idx_lab_files_user ON public.lab_files(user_id, created_at DESC);

ALTER TABLE public.lab_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own lab files" ON public.lab_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lab files" ON public.lab_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lab files" ON public.lab_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lab files" ON public.lab_files FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_lab_files_updated_at BEFORE UPDATE ON public.lab_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- STORAGE LIMITS per tier (used by lab file service)
-- ============================================================
-- Free:     5 files
-- Starter:  5 files (same as free)
-- Pro:      10 files
-- Unlimited: unlimited (999)
-- ============================================================
