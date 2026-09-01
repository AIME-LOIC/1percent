-- ============================================================
-- 1% Digital Solutions — Complete Supabase Schema
-- ============================================================
-- Run this in the Supabase SQL Editor to bootstrap the DB.
--
-- ICON CONVENTION: `icon` columns store icon NAMES, not emoji.
-- These names must match a key in js/icons.js on the frontend
-- (Icons.get('code'), Icons.get('shield'), etc.) so every course
-- and service renders a real SVG icon, not an emoji glyph.
--
-- THUMBNAIL CONVENTION: `thumbnail_url` stores a path inside a
-- Supabase Storage bucket (not a hotlinked external image), e.g.
-- 'course-thumbnails/programming-fundamentals.jpg'. Upload the
-- actual photo to that bucket, then build the public URL as:
--   https://<project-ref>.supabase.co/storage/v1/object/public/<path>
-- If thumbnail_url is null, the frontend falls back to the
-- icon + gradient card style already used on the homepage.
-- ============================================================

-- 0. Extensions
-- ============================================================
create extension if not exists "uuid-ossp";

-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  avatar_url  text,
  role        text not null default 'student' check (role in ('student', 'mentor', 'admin')),
  country     text default 'Rwanda',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. COURSES (15 required courses + extras)
-- ============================================================
create table public.courses (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  title         text not null,
  description   text not null,
  thumbnail_url text,                      -- Supabase Storage path, e.g. 'course-thumbnails/git-github.jpg'
  icon          text not null default 'book-open',  -- must match a key in js/icons.js
  level         text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  duration_weeks int not null default 8,
  is_published  boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3. LESSONS (ordered content within courses)
-- ============================================================
create table public.lessons (
  id            uuid primary key default uuid_generate_v4(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  title         text not null,
  description   text default '',
  content_md    text not null default '',
  lesson_type   text not null default 'video' check (lesson_type in ('video', 'lab', 'project', 'quiz', 'reading')),
  duration_min  int not null default 30,
  sort_order    int not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now()
);

create index idx_lessons_course on public.lessons(course_id, sort_order);

-- 4. ENROLLMENTS
-- ============================================================
create table public.enrollments (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

-- 5. LESSON PROGRESS
-- ============================================================
create table public.lesson_progress (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  completed     boolean not null default false,
  completed_at  timestamptz,
  unique (user_id, lesson_id)
);

-- 6. QUIZZES
-- ============================================================
create table public.quizzes (
  id            uuid primary key default uuid_generate_v4(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  title         text not null,
  description   text default '',
  passing_score int not null default 70,
  time_limit_min int default null,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 7. QUIZ QUESTIONS
-- ============================================================
create table public.quiz_questions (
  id            uuid primary key default uuid_generate_v4(),
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  question      text not null,
  options       jsonb not null,
  correct_answer text not null,
  sort_order    int not null default 0,
  points        int not null default 1
);

create index idx_quiz_questions_quiz on public.quiz_questions(quiz_id, sort_order);

-- 8. QUIZ ATTEMPTS
-- ============================================================
create table public.quiz_attempts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  answers       jsonb not null default '{}',
  score         int not null default 0,
  max_score     int not null default 0,
  percentage    int not null default 0,
  passed        boolean not null default false,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index idx_quiz_attempts_user on public.quiz_attempts(user_id, quiz_id);

-- 9. CERTIFICATES
-- ============================================================
create table public.certificates (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete cascade,
  certificate_number text unique not null,
  learner_name  text not null default '',    -- student full name at time of issuance
  course_title  text not null default '',    -- course title snapshot
  course_level  text not null default '',    -- course level snapshot
  duration_weeks int not null default 0,    -- course duration snapshot
  issued_at     timestamptz not null default now(),
  completed_at  timestamptz,                -- exact completion date
  unique (user_id, course_id)
);

-- 10. SERVICES
-- ============================================================
create table public.services (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  title       text not null,
  icon        text not null default 'rocket',
  description text not null,
  features    jsonb not null default '[]',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 11. SERVICE REQUESTS
-- ============================================================
create table public.service_requests (
  id            uuid primary key default uuid_generate_v4(),
  full_name     text not null,
  email         text not null,
  company       text,
  service_slug  text references public.services(slug),
  budget_range  text,
  message       text not null,
  status        text not null default 'pending' check (status in ('pending', 'reviewed', 'in_progress', 'completed', 'archived')),
  created_at    timestamptz not null default now()
);

-- 12. TERMS ACCEPTANCE LOG
-- ============================================================
create table public.terms_acceptance (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete set null,
  ip_address    inet,
  policy_version text not null default '1.0',
  accepted_at   timestamptz not null default now()
);

-- 13. CHALLENGES
-- ============================================================
create table public.challenges (
  id            uuid primary key default uuid_generate_v4(),
  course_id     uuid references public.courses(id) on delete set null,
  title         text not null,
  description   text not null default '',
  difficulty    text not null default 'easy' check (difficulty in ('easy', 'medium', 'hard', 'expert')),
  challenge_type text not null default 'javascript' check (challenge_type in ('javascript', 'python', 'html', 'css', 'git', 'linux', 'sql', 'yaml', 'docker', 'markdown', 'nginx')),
  coins_reward  int not null default 10,
  sort_order    int not null default 0,
  expected_output text default '',
  starter_code  text default '',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index idx_challenges_course on public.challenges(course_id, sort_order);

-- 14. CHALLENGE SUBMISSIONS
-- ============================================================
create table public.challenge_submissions (
  id            uuid primary key default uuid_generate_v4(),\  user_id       uuid not null references public.profiles(id) on delete cascade,
  challenge_id  uuid not null references public.challenges(id) on delete cascade,
  code          text not null default '',
  passed        boolean not null default false,
  submitted_at  timestamptz not null default now(),
  unique (user_id, challenge_id)
);

-- 15. COINS / TRANSACTIONS
-- ============================================================
create table public.coin_transactions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  amount        int not null,
  reason        text not null default '',
  reference_id  uuid,
  created_at    timestamptz not null default now()
);

-- Profiles: add coins column
alter table public.profiles add column if not exists coins int not null default 0;
alter table public.profiles add column if not exists has_used_free_cert_view boolean not null default false;

alter table public.challenges enable row level security;
alter table public.challenge_submissions enable row level security;
alter table public.coin_transactions enable row level security;

create policy "Anyone can view active challenges" on public.challenges for select using (is_active = true);
create policy "Admins can manage challenges" on public.challenges for all using (public.is_admin(auth.uid()));
create policy "Users can view own submissions" on public.challenge_submissions for select using (auth.uid() = user_id);
create policy "Users can insert own submissions" on public.challenge_submissions for insert with check (auth.uid() = user_id);
create policy "Users can update own submissions" on public.challenge_submissions for update using (auth.uid() = user_id);
create policy "Users can view own transactions" on public.coin_transactions for select using (auth.uid() = user_id);

-- 16. SIGNATURES (stored once, reused across all certificates)
-- ============================================================
create table public.signatures (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  signature_url text not null,            -- base64 data URL or Supabase storage path
  full_name     text not null default '',
  created_at    timestamptz not null default now(),
  unique (user_id)
);

alter table public.signatures enable row level security;
create policy "Users can view own signature" on public.signatures for select using (auth.uid() = user_id);
create policy "Users can insert own signature" on public.signatures for insert with check (auth.uid() = user_id);
create policy "Users can update own signature" on public.signatures for update using (auth.uid() = user_id);

-- 17. COOKIE CONSENT LOG
-- ============================================================
create table public.cookie_consents (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete set null,
  ip_address    inet,
  analytics     boolean not null default false,
  marketing     boolean not null default false,
  accepted_at   timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.services enable row level security;
alter table public.service_requests enable row level security;
alter table public.terms_acceptance enable row level security;
alter table public.cookie_consents enable row level security;

-- Profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- SECURITY FIX: admin policy uses a SECURITY DEFINER function to avoid
-- infinite recursion (policy queries profiles FROM profiles = recursion).
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin');
$$;

create policy "Admins can view all profiles" on public.profiles for select using (public.is_admin(auth.uid()));

-- Courses
create policy "Anyone can view published courses" on public.courses for select using (is_published = true);
create policy "Admins can manage courses" on public.courses for all using (public.is_admin(auth.uid()));

-- Lessons
create policy "Anyone can view published lessons" on public.lessons for select using (is_published = true);
create policy "Admins can manage lessons" on public.lessons for all using (public.is_admin(auth.uid()));

-- Enrollments
create policy "Users can view own enrollments" on public.enrollments for select using (auth.uid() = user_id);
create policy "Users can enroll themselves" on public.enrollments for insert with check (auth.uid() = user_id);
create policy "Admins can manage enrollments" on public.enrollments for all using (public.is_admin(auth.uid()));

-- Lesson progress
create policy "Users can view own progress" on public.lesson_progress for select using (auth.uid() = user_id);
create policy "Users can insert own progress" on public.lesson_progress for insert with check (auth.uid() = user_id);
create policy "Users can update own progress" on public.lesson_progress for update using (auth.uid() = user_id);

-- Quizzes
create policy "Anyone can view published quizzes" on public.quizzes for select using (is_published = true);
create policy "Admins can manage quizzes" on public.quizzes for all using (public.is_admin(auth.uid()));

-- Quiz questions
create policy "Anyone can view quiz questions" on public.quiz_questions for select using (true);
create policy "Admins can manage questions" on public.quiz_questions for all using (public.is_admin(auth.uid()));

-- Quiz attempts
create policy "Users can view own attempts" on public.quiz_attempts for select using (auth.uid() = user_id);
create policy "Users can create own attempts" on public.quiz_attempts for insert with check (auth.uid() = user_id);

-- Certificates
create policy "Users can view own certificates" on public.certificates for select using (auth.uid() = user_id);
create policy "Anyone can verify certificates" on public.certificates for select using (true);

-- Services
create policy "Anyone can view active services" on public.services for select using (is_active = true);
create policy "Admins can manage services" on public.services for all using (public.is_admin(auth.uid()));

-- Service requests
create policy "Anyone can submit a service request" on public.service_requests for insert with check (true);
create policy "Admins can view all service requests" on public.service_requests for select using (public.is_admin(auth.uid()));

-- Terms + Cookie consent
create policy "Anyone can log terms acceptance" on public.terms_acceptance for insert with check (true);
create policy "Anyone can log cookie consent" on public.cookie_consents for insert with check (true);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger update_courses_updated_at before update on public.courses
  for each row execute function public.update_updated_at();

-- ============================================================
-- SEED: 15 Courses
-- ============================================================
insert into public.courses (slug, title, description, icon, thumbnail_url, level, duration_weeks, is_published, sort_order) values
('programming-fundamentals',     'Programming Fundamentals',       'Master core programming concepts — variables, control flow, functions, data structures, and problem-solving mindset.',        'code',      'course-thumbnails/programming-fundamentals.jpg', 'beginner',     4, true, 1),
('git-github',                   'Git & GitHub',                    'Version control mastery — branching, merging, pull requests, collaborative workflows, and open-source contribution.',       'github',    'course-thumbnails/git-github.jpg',                'beginner',     3, true, 2),
('command-line-linux',           'Command Line / Linux Basics',     'Navigate the terminal like a pro — file systems, shell scripting, permissions, and server management.',                     'terminal',  'course-thumbnails/command-line-linux.jpg',        'beginner',     3, true, 3),
('backend-development',          'Backend Development',             'Build robust APIs with Node.js, Express, authentication, databases, and production deployment.',                            'package',   'course-thumbnails/backend-development.jpg',       'intermediate', 6, true, 4),
('frontend-development',         'Frontend Development',            'Build modern UIs with React, component design, state management, and responsive design patterns.',                           'laptop',    'course-thumbnails/frontend-development.jpg',      'intermediate', 6, true, 5),
('databases',                    'Databases (SQL + NoSQL)',         'Master PostgreSQL, MongoDB, data modeling, migrations, query optimization, and ORMs.',                                      'book-open', 'course-thumbnails/databases.jpg',                 'intermediate', 5, true, 6),
('auth-security',                'Authentication & Security Fundamentals', 'JWT, sessions, OAuth2, password hashing, OWASP Top 10, XSS, CSRF, and secure coding practices.',                     'shield',    'course-thumbnails/auth-security.jpg',             'intermediate', 4, true, 7),
('system-design',                'System Design Basics',            'Architect scalable systems — load balancing, caching, databases, microservices, and trade-off analysis.',                  'target',    'course-thumbnails/system-design.jpg',             'advanced',     5, true, 8),
('testing-debugging',            'Testing & Debugging Discipline',  'Unit tests, integration tests, TDD, debugging techniques, coverage, and CI/CD test pipelines.',                              'flask',     'course-thumbnails/testing-debugging.jpg',         'intermediate', 4, true, 9),
('devops-basics',                'DevOps Basics',                   'Docker, CI/CD, cloud deployment, monitoring, logging, and infrastructure as code.',                                         'cloud',     'course-thumbnails/devops-basics.jpg',             'intermediate', 4, true, 10),
('ai-coding-tools',              'Working with AI Coding Tools Properly', 'Prompt engineering for code, AI pair programming, code review with AI, and knowing when NOT to use AI.',              'brain',     'course-thumbnails/ai-coding-tools.jpg',           'intermediate', 3, true, 11),
('capstone-project',             'Capstone: Build and Ship a Real Portfolio Project', 'Plan, build, test, and deploy a production-quality application from scratch. Your portfolio centerpiece.',      'trophy',    'course-thumbnails/capstone-project.jpg',          'advanced',     6, true, 12),
('reading-codebases',            'Reading and Contributing to Existing Codebases', 'Navigate large codebases, understand architecture, write good PRs, and contribute to open source effectively.', 'file-check','course-thumbnails/reading-codebases.jpg',         'intermediate', 3, true, 13),
('technical-communication',      'Technical Communication',         'Write clear documentation, technical blog posts, README files, and communicate complex ideas simply.',                       'mail',      'course-thumbnails/technical-communication.jpg',   'beginner',     2, true, 14),
('problem-solving',              'Problem-Solving Under Constraints', 'Break down problems, work within time/budget limits, prioritize effectively, and ship under pressure.',                    'zap',       'course-thumbnails/problem-solving.jpg',           'intermediate', 3, true, 15);

-- ============================================================
-- SEED: Sample services
-- ============================================================
insert into public.services (slug, title, icon, description, features) values
('web-development',   'Web Development',     'globe',      'Full-stack web apps built with modern frameworks.', '["React / Next.js", "Node.js / Express", "PostgreSQL / Supabase", "REST & GraphQL APIs"]'),
('mobile-apps',       'Mobile Applications', 'smartphone', 'Cross-platform mobile apps for iOS and Android.', '["React Native / Flutter", "Push Notifications", "Offline-first Architecture", "App Store Deployment"]'),
('ai-automation',     'AI & Automation',     'brain',      'Intelligent agents, workflow automation, and ML pipelines.', '["Custom AI Agents", "NLP & Computer Vision", "Workflow Automation", "Data Pipelines"]'),
('cybersecurity',     'Cybersecurity',       'shield',     'Offensive testing, hardening, and incident response.', '["Penetration Testing", "Security Auditing", "Hardening & Patching", "Incident Response"]'),
('iot-embedded',      'IoT & Embedded',      'plug',       'Hardware-software integration with real devices.', '["ESP32 / Arduino", "Sensor Networks", "MQTT & Real-time Dashboards", "Digital Twins"]'),
('ui-ux-design',      'UI/UX Design',        'palette',    'User research, wireframing, and polished interfaces.', '["User Research", "Wireframes & Prototypes", "Design Systems", "Figma Delivery"]');
