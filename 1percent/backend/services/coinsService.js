const { adminClient } = require('../config/database');

class CoinsService {
  async getBalance(userId) {
    const { data, error } = await adminClient
      .from('profiles').select('coins').eq('id', userId).single();
    if (error) throw error;
    return data.coins || 0;
  }

  async getTransactions(userId, limit = 20) {
    const { data, error } = await adminClient
      .from('coin_transactions')
      .select('id, amount, reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }

  async addCoins(userId, amount, reason, referenceId = null) {
    const { error } = await adminClient.rpc('add_coins', {
      uid: userId, amt: amount, rsn: reason, ref: referenceId
    });
    if (error) {
      // Fallback: direct update
      const { data: profile } = await adminClient
        .from('profiles').select('coins').eq('id', userId).single();
      const newBalance = (profile?.coins || 0) + amount;
      await adminClient.from('profiles').update({ coins: newBalance }).eq('id', userId);
      await adminClient.from('coin_transactions').insert({
        user_id: userId, amount, reason, reference_id: referenceId
      });
    }
  }

  async isLessonLocked(userId, lessonId) {
    const { data: lock } = await adminClient
      .from('lesson_locks').select('coins_required, is_free')
      .eq('lesson_id', lessonId).single();

    if (!lock || lock.is_free) return false;

    const coins = await this.getBalance(userId);
    return coins < lock.coins_required;
  }

  async unlockLesson(userId, lessonId) {
    const { data: lock } = await adminClient
      .from('lesson_locks').select('coins_required')
      .eq('lesson_id', lessonId).single();

    if (!lock) return { unlocked: true, cost: 0 };

    const coins = await this.getBalance(userId);
    if (coins < lock.coins_required) {
      throw new Error(`Need ${lock.coins_required} coins to unlock. You have ${coins}.`);
    }

    await this.addCoins(userId, -lock.coins_required, `Unlocked lesson`, lessonId);
    return { unlocked: true, cost: lock.coins_required, remaining: coins - lock.coins_required };
  }

  async getChallenges(courseId) {
    const { data, error } = await adminClient
      .from('challenges')
      .select('id, title, description, difficulty, coins_reward, sort_order, challenge_type, expected_output, starter_code, course_id')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data;
  }

  async getAllChallenges() {
    const { data, error } = await adminClient
      .from('challenges')
      .select('id, title, description, difficulty, coins_reward, sort_order, challenge_type, expected_output, starter_code, course_id, courses(title, slug)')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      course_title: c.courses?.title || '',
      course_slug: c.courses?.slug || '',
      courses: undefined
    }));
  }

  async searchChallenges({ query = '', difficulty = '', course_id = '', page = 1, limit = 20 } = {}) {
    let q = adminClient
      .from('challenges')
      .select('id, title, description, difficulty, coins_reward, sort_order, challenge_type, expected_output, starter_code, course_id, courses(title, slug)', { count: 'exact' })
      .eq('is_active', true);

    if (query) {
      q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }
    if (difficulty) {
      q = q.eq('difficulty', difficulty);
    }
    if (course_id) {
      q = q.eq('course_id', course_id);
    }

    const offset = (page - 1) * limit;
    q = q.order('sort_order').range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) throw error;

    return {
      challenges: (data || []).map(c => ({
        ...c,
        course_title: c.courses?.title || '',
        course_slug: c.courses?.slug || '',
        courses: undefined
      })),
      total: count || 0,
      page,
      limit,
      pages: Math.ceil((count || 0) / limit)
    };
  }

  async getDailyChallenge() {
    // Use date-based seed to pick a consistent daily challenge
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Get all active challenges
    const { data: challenges, error } = await adminClient
      .from('challenges')
      .select('id, title, description, difficulty, coins_reward, sort_order, challenge_type, expected_output, starter_code, course_id, courses(title, slug)')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error || !challenges?.length) return null;

    // Simple hash of date string to pick a consistent challenge for the day
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % challenges.length;
    const daily = challenges[index];

    // Bonus coins for daily challenge (50% extra)
    const bonusCoins = Math.ceil(daily.coins_reward * 0.5);

    return {
      ...daily,
      course_title: daily.courses?.title || '',
      course_slug: daily.courses?.slug || '',
      courses: undefined,
      is_daily: true,
      daily_date: dateStr,
      bonus_coins: bonusCoins,
      total_reward: daily.coins_reward + bonusCoins
    };
  }

  async getUserPassedChallenges(userId) {
    const { data, error } = await adminClient
      .from('challenge_submissions')
      .select('challenge_id')
      .eq('user_id', userId)
      .eq('passed', true);
    if (error) throw error;
    return (data || []).map(s => s.challenge_id);
  }

  async getUserSubmissions(userId, courseId) {
    const { data, error } = await adminClient
      .from('challenge_submissions')
      .select('challenge_id, passed, submitted_at')
      .eq('user_id', userId);
    if (error) throw error;

    const challengeIds = (data || []).filter(s => s.passed).map(s => s.challenge_id);
    return challengeIds;
  }

  async submitChallenge(userId, challengeId, code, isDaily = false) {
    // Get challenge details
    const { data: challenge } = await adminClient
      .from('challenges').select('*').eq('id', challengeId).single();
    if (!challenge) throw new Error('Challenge not found');

    // Check if already passed
    const { data: existing } = await adminClient
      .from('challenge_submissions')
      .select('id').eq('user_id', userId).eq('challenge_id', challengeId).eq('passed', true).single();
    if (existing) return { passed: true, already: true, coins: 0 };

    // Simple test: check if code contains expected patterns
    const passed = this._evaluateCode(code, challenge);

    // Save submission
    await adminClient.from('challenge_submissions').upsert({
      user_id: userId, challenge_id: challengeId, code, passed
    }, { onConflict: 'user_id,challenge_id' });

    // Award coins if passed
    let coinsAwarded = 0;
    if (passed) {
      coinsAwarded = challenge.coins_reward;
      // Daily challenge bonus: 50% extra coins
      if (isDaily) {
        const bonus = Math.ceil(challenge.coins_reward * 0.5);
        coinsAwarded += bonus;
        await this.addCoins(userId, bonus, `Daily Challenge Bonus: ${challenge.title}`, challengeId);
      }
      await this.addCoins(userId, challenge.coins_reward, `Challenge: ${challenge.title}`, challengeId);
    }

    return { passed, coins: coinsAwarded, total: await this.getBalance(userId), is_daily: isDaily };
  }

  _evaluateCode(code, challenge) {
    const lower = (code || '').toLowerCase();
    const title = challenge.title.toLowerCase();
    const type = challenge.challenge_type || 'javascript';

    // Terminal (Linux/Git) challenges: check command output in the submitted text
    if (type === 'linux' || type === 'git') {
      return this._evaluateTerminal(code, challenge);
    }

    // SQL challenges
    if (type === 'sql') {
      return lower.includes('select') || lower.includes('create table') || lower.includes('insert') || lower.includes('alter table');
    }

    // YAML / Docker challenges
    if (type === 'yaml' || type === 'docker') {
      return code.length > 30;
    }

    // JavaScript / programming challenges — keyword matching
    if (title.includes('hello world')) {
      return lower.includes('hello') || lower.includes('print') || lower.includes('console.log');
    }
    if (title.includes('variable')) {
      return (lower.includes('let ') || lower.includes('const ') || lower.includes('var ') || lower.includes('int ') || lower.includes('def '));
    }
    if (title.includes('calculator')) {
      return lower.includes('function') && (lower.includes('+') || lower.includes('add') || lower.includes('return'));
    }
    if (title.includes('fizzbuzz')) {
      return lower.includes('fizz') || lower.includes('buzz') || lower.includes('for') || lower.includes('while');
    }
    if (title.includes('palindrome')) {
      return lower.includes('reverse') || lower.includes('palindrome') || lower.includes('split');
    }
    if (title.includes('binary') || title.includes('algorithm')) {
      return lower.includes('binary') || lower.includes('mid') || lower.includes('search');
    }
    if (title.includes('readme') || title.includes('documentation') || title.includes('blog') || title.includes('bug report') || title.includes('pr') || title.includes('architecture') || title.includes('error message')) {
      return code.length > 40;
    }
    if (title.includes('docker')) {
      return lower.includes('from ') || lower.includes('copy') || lower.includes('cmd');
    }
    if (title.includes('nginx')) {
      return lower.includes('server') || lower.includes('listen') || lower.includes('proxy_pass');
    }
    if (title.includes('react') || title.includes('component')) {
      return lower.includes('function') || lower.includes('return') || lower.includes('jsx');
    }
    if (title.includes('middleware') || title.includes('rate limit') || title.includes('brute')) {
      return lower.includes('function') || lower.includes('req') || lower.includes('next');
    }
    if (title.includes('prompt') || title.includes('ai')) {
      return code.length > 20;
    }

    // Default: substantial code
    return code.length > 30;
  }

  _evaluateTerminal(code, challenge) {
    const text = (code || '').toLowerCase();
    const title = challenge.title.toLowerCase();
    const expected = (challenge.expected_output || '').toLowerCase();

    // Linux commands
    if (title.includes('list files')) return text.includes('ls');
    if (title.includes('navigate')) return text.includes('cd');
    if (title.includes('find files')) return text.includes('find');
    if (title.includes('process')) return text.includes('ps') || text.includes('top');
    if (title.includes('permission')) return text.includes('chmod');
    if (title.includes('disk usage')) return text.includes('du') || text.includes('sort');
    if (title.includes('text processing')) return text.includes('sort') || text.includes('uniq') || text.includes('tr');
    if (title.includes('shell script') || title.includes('bash')) return text.includes('#!/bin/bash') || text.includes('echo');
    if (title.includes('monitor')) return text.includes('curl') || text.includes('grep') || text.includes('ping');
    if (title.includes('deploy')) return text.includes('bash') || text.includes('docker') || text.includes('git');

    // Git commands
    if (title.includes('init')) return text.includes('git init');
    if (title.includes('stage') && title.includes('commit')) return text.includes('git add') && text.includes('git commit');
    if (title.includes('branch') && title.includes('create')) return text.includes('git checkout -b') || text.includes('git branch');
    if (title.includes('merge')) return text.includes('git merge');
    if (title.includes('conflict')) return text.includes('git merge') || text.includes('conflict');
    if (title.includes('rebase')) return text.includes('git rebase');
    if (title.includes('cherry')) return text.includes('git cherry');

    // Docker
    if (title.includes('dockerfile')) return text.includes('from ') || text.includes('copy') || text.includes('cmd');
    if (title.includes('compose')) return text.includes('version') || text.includes('services');

    // Default: if they ran commands
    return text.includes('git ') || text.includes('ls') || text.includes('cd ') || code.length > 20;
  }
}

module.exports = new CoinsService();
