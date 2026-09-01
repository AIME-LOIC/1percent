/* ============================================================
   1% Expert Programme — Roadmap & Lesson Content
   ============================================================
   4 phases, each with modules, each module with lessons.
   This is the source of truth for the curriculum.
   ============================================================ */

const ROADMAP = {
  title: 'The 1% Expert Programme',
  subtitle: 'From Junior Developer to World-Class Expert',
  description: 'A rigorous, hands-on programme that transforms junior developers into the top 1% of engineers worldwide.',
  totalWeeks: 32,
  certification: '1% Expert Certified Developer',

  phases: [
    /* ========================================================
       PHASE 1: FOUNDATION (Weeks 1–8)
       ======================================================== */
    {
      id: 'foundation',
      title: 'Foundation',
      subtitle: 'Master the Fundamentals',
      description: 'Every expert starts with a rock-solid foundation. You will master the tools, languages, and workflows that professional developers use daily.',
      duration_weeks: 8,
      color: '#16a34a',
      icon: '🌱',
      modules: [
        {
          id: 'dev-environment',
          title: 'Developer Environment',
          description: 'Set up your professional development environment like a senior engineer.',
          lessons: [
            { id: 'terminal-basics', title: 'Terminal & Command Line', duration_min: 45, type: 'video', description: 'Navigate the file system, run commands, and automate tasks from the terminal.' },
            { id: 'git-fundamentals', title: 'Git Version Control', duration_min: 60, type: 'video', description: 'Commits, branches, merges, rebasing, and collaborative workflows with Git.' },
            { id: 'git-workflow', title: 'Git Branching Strategies', duration_min: 40, type: 'lab', description: 'Practice Git Flow and trunk-based development with hands-on exercises.' },
            { id: 'vscode-setup', title: 'VS Code Power User', duration_min: 30, type: 'video', description: 'Extensions, keybindings, debugging, and productivity shortcuts.' },
            { id: 'dotfiles', title: 'Dotfiles & Environment Setup', duration_min: 25, type: 'lab', description: 'Create your personal dotfiles repo and set up a reproducible dev environment.' }
          ]
        },
        {
          id: 'html-css',
          title: 'HTML & CSS Mastery',
          description: 'Build semantic, accessible, and responsive web pages from scratch.',
          lessons: [
            { id: 'html-semantics', title: 'Semantic HTML5', duration_min: 45, type: 'video', description: 'Tags, accessibility, SEO, and document structure.' },
            { id: 'css-fundamentals', title: 'CSS Fundamentals', duration_min: 60, type: 'video', description: 'Selectors, box model, flexbox, grid, and responsive design.' },
            { id: 'responsive-design', title: 'Responsive Design Patterns', duration_min: 50, type: 'lab', description: 'Build a responsive portfolio page from a Figma design.' },
            { id: 'css-animations', title: 'CSS Animations & Transitions', duration_min: 35, type: 'video', description: 'Keyframes, transitions, and micro-interactions.' },
            { id: 'html-css-project', title: 'Project: Landing Page', duration_min: 120, type: 'project', description: 'Build a production-quality landing page with HTML, CSS, and animations.' }
          ]
        },
        {
          id: 'javascript-core',
          title: 'JavaScript Core',
          description: 'Master the language of the web — variables, functions, async, and DOM manipulation.',
          lessons: [
            { id: 'js-variables', title: 'Variables, Types & Operators', duration_min: 45, type: 'video', description: 'let/const, primitives, objects, type coercion, and comparison operators.' },
            { id: 'js-functions', title: 'Functions & Scope', duration_min: 50, type: 'video', description: 'Function declarations, expressions, arrow functions, closures, and scope chains.' },
            { id: 'js-arrays', title: 'Arrays & Iteration', duration_min: 45, type: 'video', description: 'map, filter, reduce, forEach, and array destructuring.' },
            { id: 'js-objects', title: 'Objects & Prototypes', duration_min: 40, type: 'video', description: 'Object literals, destructuring, spread, and prototype chain.' },
            { id: 'js-async', title: 'Async JavaScript', duration_min: 60, type: 'video', description: 'Callbacks, Promises, async/await, error handling, and fetch API.' },
            { id: 'js-dom', title: 'DOM Manipulation', duration_min: 50, type: 'lab', description: 'Select elements, handle events, and build interactive UIs.' },
            { id: 'js-project', title: 'Project: Interactive App', duration_min: 180, type: 'project', description: 'Build a fully interactive web application using vanilla JavaScript.' }
          ]
        },
        {
          id: 'databases',
          title: 'Database Fundamentals',
          description: 'Understand relational databases, SQL, and data modeling.',
          lessons: [
            { id: 'db-intro', title: 'Database Concepts', duration_min: 40, type: 'video', description: 'Relational vs NoSQL, tables, rows, columns, and primary/foreign keys.' },
            { id: 'sql-basics', title: 'SQL Fundamentals', duration_min: 60, type: 'video', description: 'SELECT, INSERT, UPDATE, DELETE, JOINs, and aggregation.' },
            { id: 'db-modeling', title: 'Data Modeling', duration_min: 45, type: 'video', description: 'Normalization, entity relationships, and schema design.' },
            { id: 'supabase-intro', title: 'Supabase Deep Dive', duration_min: 50, type: 'lab', description: 'Set up a Supabase project, create tables, and use the dashboard.' },
            { id: 'db-project', title: 'Project: Data Layer', duration_min: 120, type: 'project', description: 'Design and implement a database schema for a real-world application.' }
          ]
        },
        {
          id: 'dev-workflow',
          title: 'Professional Workflow',
          description: 'Work like a professional developer with testing, documentation, and collaboration.',
          lessons: [
            { id: 'testing-intro', title: 'Introduction to Testing', duration_min: 45, type: 'video', description: 'Why test, unit tests, integration tests, and test-driven development.' },
            { id: 'testing-practice', title: 'Writing Your First Tests', duration_min: 60, type: 'lab', description: 'Write tests for a JavaScript module using Jest.' },
            { id: 'api-basics', title: 'What is an API?', duration_min: 35, type: 'video', description: 'REST, HTTP methods, status codes, and JSON.' },
            { id: 'documentation', title: 'Technical Documentation', duration_min: 30, type: 'video', description: 'README files, JSDoc, and API documentation.' },
            { id: 'agile-intro', title: 'Agile & Project Management', duration_min: 30, type: 'video', description: 'Sprints, standups, kanban boards, and Git issues.' }
          ]
        }
      ]
    },

    /* ========================================================
       PHASE 2: FULL-STACK ENGINEERING (Weeks 9–18)
       ======================================================== */
    {
      id: 'fullstack',
      title: 'Full-Stack Engineering',
      subtitle: 'Build Production Applications',
      description: 'Now you build real, full-stack applications. Frontend frameworks, backend APIs, authentication, and deployment.',
      duration_weeks: 10,
      color: '#7c3aed',
      icon: '⚡',
      modules: [
        {
          id: 'react-fundamentals',
          title: 'React Fundamentals',
          description: 'Component-based UI development with React.',
          lessons: [
            { id: 'react-intro', title: 'Why React?', duration_min: 30, type: 'video', description: 'Component model, virtual DOM, and the React ecosystem.' },
            { id: 'react-components', title: 'Components & JSX', duration_min: 50, type: 'video', description: 'Functional components, JSX syntax, props, and composition.' },
            { id: 'react-state', title: 'State & Hooks', duration_min: 60, type: 'video', description: 'useState, useEffect, useRef, useContext, and custom hooks.' },
            { id: 'react-forms', title: 'Forms & Controlled Inputs', duration_min: 40, type: 'lab', description: 'Build a multi-step form with validation.' },
            { id: 'react-project', title: 'Project: Dashboard App', duration_min: 180, type: 'project', description: 'Build a dashboard with charts, tables, and real-time data.' }
          ]
        },
        {
          id: 'nodejs-backend',
          title: 'Node.js Backend',
          description: 'Build robust APIs with Express.js and middleware.',
          lessons: [
            { id: 'node-intro', title: 'Node.js Runtime', duration_min: 40, type: 'video', description: 'Event loop, modules, npm, and the Node.js ecosystem.' },
            { id: 'express-basics', title: 'Express.js Fundamentals', duration_min: 55, type: 'video', description: 'Routing, middleware, request/response, and error handling.' },
            { id: 'rest-api', title: 'Building REST APIs', duration_min: 60, type: 'lab', description: 'Create a full CRUD API with validation and error handling.' },
            { id: 'auth-system', title: 'Authentication Systems', duration_min: 70, type: 'video', description: 'JWT, session-based auth, OAuth2, and Supabase Auth.' },
            { id: 'api-security', title: 'API Security', duration_min: 45, type: 'video', description: 'Rate limiting, CORS, input sanitization, and OWASP top 10.' },
            { id: 'backend-project', title: 'Project: Production API', duration_min: 200, type: 'project', description: 'Build a production-ready API with auth, validation, and tests.' }
          ]
        },
        {
          id: 'supabase-integration',
          title: 'Supabase Integration',
          description: 'Real-time databases, auth, storage, and edge functions.',
          lessons: [
            { id: 'supabase-auth', title: 'Supabase Authentication', duration_min: 50, type: 'lab', description: 'Email/password, social login, RLS policies, and user management.' },
            { id: 'supabase-realtime', title: 'Real-time Subscriptions', duration_min: 45, type: 'lab', description: 'Live data with Supabase real-time and WebSockets.' },
            { id: 'supabase-storage', title: 'File Storage', duration_min: 35, type: 'lab', description: 'Upload, serve, and manage files with Supabase Storage.' },
            { id: 'supabase-edge', title: 'Edge Functions', duration_min: 50, type: 'lab', description: 'Serverless functions with Supabase Edge Functions and Deno.' }
          ]
        },
        {
          id: 'deployment',
          title: 'Deployment & DevOps',
          description: 'Ship your applications to production.',
          lessons: [
            { id: 'hosting', title: 'Web Hosting Platforms', duration_min: 40, type: 'video', description: 'Vercel, Render, Railway, Netlify — when to use what.' },
            { id: 'docker-intro', title: 'Docker Fundamentals', duration_min: 55, type: 'video', description: 'Containers, Dockerfiles, images, and docker-compose.' },
            { id: 'ci-cd', title: 'CI/CD Pipelines', duration_min: 50, type: 'lab', description: 'Set up GitHub Actions for testing and deployment.' },
            { id: 'monitoring', title: 'Monitoring & Logging', duration_min: 35, type: 'video', description: 'Application monitoring, error tracking, and logging.' },
            { id: 'fullstack-project', title: 'Capstone: Full-Stack App', duration_min: 300, type: 'project', description: 'Build and deploy a complete full-stack application from scratch.' }
          ]
        }
      ]
    },

    /* ========================================================
       PHASE 3: SPECIALISATION (Weeks 19–28)
       ======================================================== */
    {
      id: 'specialisation',
      title: 'Specialisation',
      subtitle: 'Choose Your Expert Track',
      description: 'Pick one of four expert tracks and go deep. Each track is taught by one of our domain experts.',
      duration_weeks: 10,
      color: '#ea580c',
      icon: '🎯',
      tracks: [
        {
          id: 'ai-track',
          title: 'AI & Machine Learning',
          mentor: 'Aimé Loïc',
          icon: '🧠',
          modules: [
            {
              id: 'ai-fundamentals',
              title: 'AI Fundamentals',
              lessons: [
                { id: 'ml-basics', title: 'Machine Learning Concepts', duration_min: 50, type: 'video', description: 'Supervised vs unsupervised learning, model evaluation, and bias.' },
                { id: 'python-intro', title: 'Python for AI', duration_min: 60, type: 'video', description: 'Python basics, NumPy, Pandas, and Jupyter notebooks.' },
                { id: 'llm-intro', title: 'Large Language Models', duration_min: 55, type: 'video', description: 'How LLMs work, prompting, fine-tuning, and API usage.' },
                { id: 'rag-basics', title: 'RAG Systems', duration_min: 60, type: 'lab', description: 'Build a retrieval-augmented generation system with embeddings.' },
                { id: 'ai-agents', title: 'Building AI Agents', duration_min: 70, type: 'lab', description: 'Tool use, memory, planning, and multi-agent systems.' },
                { id: 'ai-project', title: 'Capstone: AI Application', duration_min: 300, type: 'project', description: 'Build a production AI application with agents and real-time data.' }
              ]
            }
          ]
        },
        {
          id: 'security-track',
          title: 'Cybersecurity',
          mentor: 'Dieu Merci',
          icon: '🛡️',
          modules: [
            {
              id: 'sec-fundamentals',
              title: 'Security Fundamentals',
              lessons: [
                { id: 'sec-overview', title: 'Security Landscape', duration_min: 45, type: 'video', description: 'Threat modeling, attack surfaces, and the CIA triad.' },
                { id: 'web-security', title: 'Web Application Security', duration_min: 60, type: 'video', description: 'OWASP Top 10, XSS, CSRF, SQL injection, and more.' },
                { id: 'pen-testing', title: 'Penetration Testing', duration_min: 70, type: 'lab', description: 'Reconnaissance, exploitation, and reporting with Burp Suite.' },
                { id: 'secure-coding', title: 'Secure Coding Practices', duration_min: 50, type: 'video', description: 'Input validation, authentication, session management, and encryption.' },
                { id: 'incident-response', title: 'Incident Response', duration_min: 40, type: 'video', description: 'Detection, containment, eradication, and recovery procedures.' },
                { id: 'security-project', title: 'Capstone: Security Audit', duration_min: 300, type: 'project', description: 'Perform a full security audit on a web application and write the report.' }
              ]
            }
          ]
        },
        {
          id: 'devops-track',
          title: 'DevOps & Cloud',
          mentor: 'Nani',
          icon: '☁️',
          modules: [
            {
              id: 'devops-fundamentals',
              title: 'DevOps Fundamentals',
              lessons: [
                { id: 'linux-admin', title: 'Linux Administration', duration_min: 50, type: 'video', description: 'File systems, process management, users, permissions, and shell scripting.' },
                { id: 'docker-deep', title: 'Docker in Production', duration_min: 60, type: 'lab', description: 'Multi-stage builds, networking, volumes, and orchestration.' },
                { id: 'kubernetes-intro', title: 'Kubernetes Fundamentals', duration_min: 65, type: 'video', description: 'Pods, services, deployments, and kubectl.' },
                { id: 'aws-fundamentals', title: 'AWS Cloud Services', duration_min: 55, type: 'video', description: 'EC2, S3, RDS, Lambda, IAM, and VPC.' },
                { id: 'terraform', title: 'Infrastructure as Code', duration_min: 60, type: 'lab', description: 'Terraform basics — provision cloud infrastructure declaratively.' },
                { id: 'devops-project', title: 'Capstone: Production Pipeline', duration_min: 300, type: 'project', description: 'Set up a complete CI/CD pipeline with Docker, Kubernetes, and monitoring.' }
              ]
            }
          ]
        },
        {
          id: 'iot-track',
          title: 'IoT & Embedded',
          mentor: 'Greyson',
          icon: '🔌',
          modules: [
            {
              id: 'iot-fundamentals',
              title: 'IoT Fundamentals',
              lessons: [
                { id: 'embedded-intro', title: 'Embedded Systems Basics', duration_min: 45, type: 'video', description: 'Microcontrollers, GPIO, sensors, and actuators.' },
                { id: 'arduino', title: 'Arduino Programming', duration_min: 55, type: 'lab', description: 'Blink LEDs, read sensors, and build circuits with Arduino.' },
                { id: 'esp32', title: 'ESP32 & WiFi', duration_min: 60, type: 'lab', description: 'WiFi, Bluetooth, and IoT projects with ESP32.' },
                { id: 'mqtt', title: 'MQTT & IoT Protocols', duration_min: 40, type: 'video', description: 'MQTT, CoAP, and real-time IoT communication.' },
                { id: 'iot-dashboard', title: 'IoT Dashboards', duration_min: 50, type: 'lab', description: 'Build a real-time IoT dashboard with Node-RED and Grafana.' },
                { id: 'iot-project', title: 'Capstone: IoT System', duration_min: 300, type: 'project', description: 'Build a complete IoT system with sensors, cloud backend, and dashboard.' }
              ]
            }
          ]
        }
      ]
    },

    /* ========================================================
       PHASE 4: CERTIFICATION (Weeks 29–32)
       ======================================================== */
    {
      id: 'certification',
      title: '1% Expert Certification',
      subtitle: 'Prove Your Expertise',
      description: 'Pass our rigorous final assessment. Build, present, and defend a production-grade project.',
      duration_weeks: 4,
      color: '#dc2626',
      icon: '🏆',
      modules: [
        {
          id: 'capstone',
          title: 'Capstone Project',
          description: 'Build a real-world production application from scratch.',
          lessons: [
            { id: 'capstone-proposal', title: 'Project Proposal', duration_min: 60, type: 'lab', description: 'Define your project, create a technical spec, and present to mentors.' },
            { id: 'capstone-build', title: 'Build Phase', duration_min: 600, type: 'project', description: 'Build the complete application with tests, documentation, and deployment.' },
            { id: 'capstone-review', title: 'Code Review', duration_min: 90, type: 'lab', description: 'Present your code for peer and mentor review. Address feedback.' },
            { id: 'capstone-present', title: 'Final Presentation', duration_min: 45, type: 'lab', description: 'Present your project to the team and community.' }
          ]
        },
        {
          id: 'assessment',
          title: 'Final Assessment',
          description: 'Prove you are in the top 1%.',
          lessons: [
            { id: 'written-exam', title: 'Technical Written Exam', duration_min: 120, type: 'exam', description: 'Architecture, system design, security, and best practices.' },
            { id: 'live-coding', title: 'Live Coding Challenge', duration_min: 120, type: 'exam', description: 'Build a feature from scratch under time pressure with mentor observation.' },
            { id: 'system-design', title: 'System Design Interview', duration_min: 60, type: 'exam', description: 'Design a scalable system and present your architecture decisions.' }
          ]
        }
      ]
    }
  ]
};

/* ============================================================
   HELPER FUNCTIONS
   ============================================================ */

function getPhaseById(phaseId) {
  return ROADMAP.phases.find(p => p.id === phaseId);
}

function getTrackById(phaseId, trackId) {
  const phase = getPhaseById(phaseId);
  if (!phase || !phase.tracks) return null;
  return phase.tracks.find(t => t.id === trackId);
}

function getTotalLessons() {
  let count = 0;
  for (const phase of ROADMAP.phases) {
    if (phase.modules) {
      for (const mod of phase.modules) {
        count += mod.lessons.length;
      }
    }
    if (phase.tracks) {
      for (const track of phase.tracks) {
        for (const mod of track.modules) {
          count += mod.lessons.length;
        }
      }
    }
  }
  return count;
}

function getTotalDuration() {
  let minutes = 0;
  for (const phase of ROADMAP.phases) {
    if (phase.modules) {
      for (const mod of phase.modules) {
        for (const lesson of mod.lessons) {
          minutes += lesson.duration_min;
        }
      }
    }
    if (phase.tracks) {
      for (const track of phase.tracks) {
        for (const mod of track.modules) {
          for (const lesson of mod.lessons) {
            minutes += lesson.duration_min;
          }
        }
      }
    }
  }
  return minutes;
}

module.exports = {
  ROADMAP,
  getPhaseById,
  getTrackById,
  getTotalLessons,
  getTotalDuration
};
