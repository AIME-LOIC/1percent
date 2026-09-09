#!/usr/bin/env python3
"""
Upload Tech in Business and Robotics courses to Supabase.
Run: python3 supabase/upload_courses.py

Prerequisites:
1. Run the migration SQL first (supabase/migrations/20260909_add_modules_table.sql)
2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
"""

import os, re, json, sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# Load .env
env = {}
with open(os.path.join(os.path.dirname(__file__), '..', '.env')) as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")

SUPABASE_URL = env.get('SUPABASE_URL')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    sys.exit(1)

API = f"{SUPABASE_URL}/rest/v1"

def api(method, path, data=None):
    """Make a Supabase REST API call."""
    url = f"{API}/{path}"
    body = json.dumps(data).encode() if data else None
    req = Request(url, data=body, method=method)
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=representation')
    try:
        with urlopen(req) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        err = e.read().decode()
        print(f"  API Error {e.code}: {err[:200]}")
        return None

def run_migration():
    """Run the modules table migration via SQL."""
    print("\n=== Running Migration ===")
    migration_path = os.path.join(os.path.dirname(__file__), 'migrations', '20260909_add_modules_table.sql')
    with open(migration_path) as f:
        sql = f.read()
    
    result = api('POST', 'rpc/exec_sql', {'query': sql})
    if result is not None:
        print("Migration applied (or already exists)")
    else:
        print("NOTE: If 'exec_sql' RPC doesn't exist, run the migration manually in Supabase SQL Editor")
        print(f"File: {migration_path}")

def create_course(title, slug, description, icon, level, weeks, sort_order, is_published=True):
    """Create a course and return its ID."""
    print(f"\n=== Creating Course: {title} ===")
    result = api('POST', 'courses', {
        'title': title,
        'slug': slug,
        'description': description,
        'icon': icon,
        'level': level,
        'duration_weeks': weeks,
        'sort_order': sort_order,
        'is_published': is_published
    })
    if result and len(result) > 0:
        cid = result[0]['id']
        print(f"  Created course: {cid}")
        return cid
    print("  ERROR: Failed to create course")
    return None

def create_module(course_id, title, description, sort_order):
    """Create a module and return its ID. Returns None if modules table doesn't exist."""
    result = api('POST', 'modules', {
        'course_id': course_id,
        'title': title,
        'description': description,
        'sort_order': sort_order,
        'is_published': True
    })
    if result and len(result) > 0:
        mid = result[0]['id']
        print(f"  Module {sort_order}: {title} -> {mid[:8]}...")
        return mid
    # If modules table doesn't exist, continue without it
    print(f"  Module {sort_order}: {title} (no modules table - using sort_order)")
    return None

def create_lesson(course_id, module_id, title, description, content_md, lesson_type, duration_min, sort_order):
    """Create a lesson."""
    data = {
        'course_id': course_id,
        'title': title,
        'description': description,
        'content_md': content_md,
        'lesson_type': lesson_type,
        'duration_min': duration_min,
        'sort_order': sort_order,
        'is_published': True
    }
    # Only include module_id if the table exists
    if module_id:
        data['module_id'] = module_id
    
    result = api('POST', 'lessons', data)
    if result and len(result) > 0:
        return True
    print(f"    ERROR creating lesson: {title[:50]}")
    return False

def parse_module(filepath):
    """Parse a markdown module file into lessons."""
    with open(filepath) as f:
        content = f.read()
    
    # Extract module title from first # heading
    title_match = re.search(r'^# (.+)$', content, re.MULTILINE)
    module_title = title_match.group(1).strip() if title_match else os.path.basename(filepath)
    
    # Extract lessons
    lesson_pattern = r'^## Lesson (\d+\.\d+): (.+)$'
    matches = list(re.finditer(lesson_pattern, content, flags=re.MULTILINE))
    
    lessons = []
    for i, match in enumerate(matches):
        lesson_title = match.group(2).strip()
        start = match.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(content)
        lesson_content = content[start:end].strip()
        
        # Get type
        type_m = re.search(r'\*\*Type:\*\* (\w+)', lesson_content)
        lesson_type = type_m.group(1).lower() if type_m else 'reading'
        
        # Get duration
        dur_m = re.search(r'\*\*Duration:\*\* (\d+) minutes', lesson_content)
        duration = int(dur_m.group(1)) if dur_m else 20
        
        # Get description
        desc_m = re.search(r'---\n\n(.+?)(?:\n\n|\n###)', lesson_content, re.DOTALL)
        description = desc_m.group(1).strip()[:200] if desc_m else lesson_title
        
        lessons.append({
            'title': lesson_title,
            'description': description,
            'content_md': lesson_content,
            'lesson_type': lesson_type,
            'duration_min': duration,
        })
    
    return module_title, lessons

def get_existing_course(slug):
    """Get an existing course by slug."""
    result = api('GET', f'courses?slug=eq.{slug}&select=id')
    if result and len(result) > 0:
        return result[0]['id']
    return None

def upload_course(course_config, modules_dir):
    """Upload a complete course with modules and lessons."""
    print(f"\n{'='*60}")
    print(f"UPLOADING: {course_config['title']}")
    print(f"{'='*60}")
    
    # Check if course already exists
    course_id = get_existing_course(course_config['slug'])
    if course_id:
        print(f"  Course already exists: {course_id[:8]}...")
    else:
        # Create course
        course_id = create_course(
            title=course_config['title'],
            slug=course_config['slug'],
            description=course_config['description'],
            icon=course_config['icon'],
            level=course_config['level'],
            weeks=course_config['weeks'],
            sort_order=course_config['sort_order'],
            is_published=course_config.get('published', True)
        )
    if not course_id:
        return False
    
    total_lessons = 0
    
    for mod_idx, (filename, mod_desc) in enumerate(course_config['modules']):
        filepath = os.path.join(modules_dir, filename)
        if not os.path.exists(filepath):
            print(f"  SKIP: {filename} not found")
            continue
        
        module_title, lessons = parse_module(filepath)
        
        # Try to create module (may fail if table doesn't exist)
        module_id = create_module(course_id, module_title, mod_desc, mod_idx + 1)
        
        # Create lessons
        for les_idx, lesson in enumerate(lessons):
            # Calculate global sort order across all modules
            global_sort = mod_idx * 100 + les_idx + 1
            ok = create_lesson(
                course_id=course_id,
                module_id=module_id,
                title=lesson['title'],
                description=lesson['description'],
                content_md=lesson['content_md'],
                lesson_type=lesson['lesson_type'],
                duration_min=lesson['duration_min'],
                sort_order=global_sort
            )
            if ok:
                total_lessons += 1
                print(f"    Lesson: {lesson['title'][:50]}...")
    
    print(f"\n  DONE: {course_config['title']} - {total_lessons} lessons uploaded")
    return True

# ============================================================
# Course Configurations
# ============================================================

TECH_IN_BUSINESS = {
    'title': 'Tech in Business',
    'slug': 'tech-in-business',
    'description': 'A practical course for Rwandan business owners to use technology to sell smarter, automate tasks, and grow their business. No jargon, no filler — every lesson teaches something actionable.',
    'icon': 'briefcase',
    'level': 'beginner',
    'weeks': 18,
    'sort_order': 20,
    'published': True,
    'modules': [
        ('module-01-getting-your-business-online.md', 'Build your digital presence from scratch: Google Business Profile, websites, social media.'),
        ('module-02-selling-smarter-with-pos-and-inventory.md', 'Set up POS, track inventory, connect to mobile money.'),
        ('module-03-mobile-money-and-digital-payments.md', 'Accept MTN MoMo, Airtel Money, card payments, reconcile weekly.'),
        ('module-04-automating-your-daily-tasks.md', 'Automated invoicing, scheduling, reminders, Google Forms.'),
        ('module-05-ai-tools-for-marketing.md', 'ChatGPT, Canva AI, chatbots, customer feedback analysis.'),
        ('module-06-cybersecurity-for-small-business.md', 'Phone theft, phishing, passwords, mobile money safety, data protection.'),
        ('module-07-data-driven-decisions.md', 'Google Sheets dashboards, pricing, demand forecasting.'),
        ('module-08-finding-and-hiring-tech-help.md', 'DIY vs hire, vetting freelancers, project management.'),
        ('module-09-your-business-suite.md', 'Recap, Business Suite intro, 90-day roadmap.'),
    ]
}

ROBOTICS = {
    'title': 'Robotics',
    'slug': 'robotics',
    'description': 'Learn robotics from scratch: electronics, Arduino, sensors, motors, and build your own robot. Free course for students and hobbyists in Rwanda and Africa.',
    'icon': 'cpu',
    'level': 'beginner',
    'weeks': 10,
    'sort_order': 21,
    'published': True,
    'modules': [
        ('module-01-electronics-fundamentals.md', 'Voltage, current, resistance, resistors, series/parallel circuits.'),
        ('module-02-your-first-circuit.md', 'LED patterns, 555 timer, piezo buzzer.'),
        ('module-03-microcontroller-basics.md', 'Arduino intro, Blink sketch, analog sensors.'),
        ('module-04-sensors-and-actuators.md', 'Ultrasonic sensor, servo motors, DC motors + drivers.'),
        ('module-05-line-follower-robot.md', 'IR sensors, chassis build, line-following code.'),
        ('module-06-obstacle-avoider-robot.md', 'Ultrasonic scanning, build, avoidance code.'),
        ('module-07-robot-code-patterns.md', 'Functions, state machines, debugging.'),
        ('module-08-capstone-project.md', 'Choose challenge, build, document, share.'),
    ]
}

# ============================================================
# Main
# ============================================================

if __name__ == '__main__':
    print("Supabase Course Uploader")
    print(f"API: {SUPABASE_URL}")
    
    # Try running migration (may fail if exec_sql doesn't exist)
    run_migration()
    
    # Upload courses
    base_dir = os.path.join(os.path.dirname(__file__), '..', 'courses')
    
    upload_course(TECH_IN_BUSINESS, os.path.join(base_dir, 'tech-in-business'))
    upload_course(ROBOTICS, os.path.join(base_dir, 'robotics'))
    
    print(f"\n{'='*60}")
    print("ALL DONE! Courses uploaded to Supabase.")
    print(f"{'='*60}")
