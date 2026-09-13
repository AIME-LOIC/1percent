/* ============================================================
   AI REVIEW SERVICE — governance layer for the trained engine
   ============================================================
   Flow (the "only when admin approve it" rule):

     student submits code
        │
        ▼
   coinsService grades it deterministically (tests/execution)
        │
        ▼
   aiReviewService.queueReview()  ──► reviewer.reviewSubmission()
        │                             (the trained model reads the
        │                              code, scores it, writes a
        │                              human-readable review)
        ▼
   stored in ai_reviews with status='pending'
   (nothing changes for the student yet)
        │
        ▼
   admin opens Admin → AI Reviews panel
        │  ├─ approve  → verdict applied: pass sets passed=true &
        │ │              awards coins; fail/needs_review does not
        │ └─ reject    → AI review discarded; nothing applied
        ▼
   status='applied' | 'rejected', decided_at + reviewed_by recorded

   The DB is the source of truth for governance; the engine can
   never mutate a student record on its own.
   ============================================================ */

const { adminClient } = require('../config/database');
const reviewer = require('../ai/reviewer');
const logService = require('./logService');

class AiReviewService {
  /**
   * Run the trained model over a submission and queue the result
   * for admin approval. Called from coinsService.submitChallenge()
   * AFTER the deterministic grade is known.
   *
   * @param {object} challenge - full challenge row
   * @param {string} userId    - submitting student
   * @param {string} code      - submitted code
   * @param {object} deterministic - { passed, reason } from the rule engine
   * @returns {object|null} the queued review row (null = engine not ready)
   */
  async queueReview(challenge, userId, code, deterministic) {
    try {
      if (!reviewer.isModelReady()) return null; // model not trained yet — skip silently

      const review = reviewer.reviewSubmission(challenge, code);

      /* Combine the two brains:
         - deterministic pass/fail (real execution — authoritative)
         - AI quality assessment (trained on the course corpus)
         The AI can upgrade a FAIL to needs_review (e.g. it sees a
         genuinely good solution that only failed a formatting test),
         and it can flag passes as suspicious (duplicate shapes). */
      let verdict = review.verdict;
      if (deterministic.passed && verdict === 'pass') verdict = 'pass';
      else if (deterministic.passed) verdict = 'pass';
      else if (review.verdict === 'needs_review' || review.duplication?.suspicious) verdict = 'needs_review';
      else verdict = 'fail';

      const model = reviewer.loadModel();
      const { data, error } = await adminClient
        .from('ai_reviews')
        .insert({
          user_id: userId,
          challenge_id: challenge.id,
          verdict,
          score: review.score,
          quality: review.quality,
          review,                                   // whole artifact as jsonb
          shape_signature: review.shapeSignature || '',
          engine_version: `1percent-local-engine-v${model?.version || 1}`,
          model_trained_at: model?.trainedAt || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Tell the admins there is something to look at (fails safe)
      try {
        await logService.logAlert({
          title: verdict === 'pass' ? 'AI review ready (pass)' : 'AI review needs attention',
          message: `${challenge.title}: AI marked ${verdict} (score ${review.score}/100). Awaiting admin approval.`,
          type: 'system',
          severity: verdict === 'needs_review' ? 'warning' : 'info',
          link: '/admin',
        });
      } catch { /* alerts are best-effort */ }

      return data;
    } catch (err) {
      // The AI layer must NEVER break the student's submission flow
      console.error('[AI-REVIEW] queueReview failed (non-fatal):', err.message);
      return null;
    }
  }

  /**
   * Admin: list reviews by status.
   */
  async listByStatus(status = 'pending', limit = 50) {
    const query = adminClient
      .from('ai_reviews')
      .select('*, profiles!ai_reviews_user_id_fkey(full_name), challenges(title, challenge_type, coins_reward), reviewer:profiles!ai_reviews_reviewed_by_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    const { data, error } = status === 'all'
      ? await query
      : await query.eq('status', status);
    if (error) throw error;
    return data || [];
  }

  /**
   * Admin: pending count for the sidebar badge.
   */
  async pendingCount() {
    const { count, error } = await adminClient
      .from('ai_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (error) return 0;
    return count || 0;
  }

  /**
   * Admin: the decision point.
   *  - approve: apply the AI verdict to the student's record
   *    (pass → mark submission passed + award coins; fail → nothing
   *    to apply, the submission stays unpassed; needs_review with
   *    deterministic pass → treat as pass)
   *  - reject: discard the AI review entirely.
   */
  async decide(reviewId, adminId, decision, adminNote = '') {
    const { data: rev, error } = await adminClient
      .from('ai_reviews')
      .select('*')
      .eq('id', reviewId)
      .single();
    if (error || !rev) throw new Error('Review not found');
    if (rev.status !== 'pending') throw new Error('Review already decided');

    if (decision === 'reject') {
      const { data, error: upErr } = await adminClient
        .from('ai_reviews')
        .update({ status: 'rejected', reviewed_by: adminId, decided_at: new Date().toISOString(), admin_note: adminNote })
        .eq('id', reviewId)
        .select()
        .single();
      if (upErr) throw upErr;
      return { applied: false, review: data };
    }

    if (decision !== 'approve') throw new Error('decision must be approve|reject');

    /* ── APPLY the verdict ── */
    const effectivePass = rev.verdict === 'pass' ||
      (rev.verdict === 'needs_review' && rev.review?.deterministicPassed === true);

    if (effectivePass) {
      // Mark the challenge submission as passed (if not already)
      const { data: existing } = await adminClient
        .from('challenge_submissions')
        .select('id, passed')
        .eq('user_id', rev.user_id)
        .eq('challenge_id', rev.challenge_id)
        .single();

      let alreadyPassed = existing?.passed === true;
      if (existing && !alreadyPassed) {
        await adminClient
          .from('challenge_submissions')
          .update({ passed: true })
          .eq('id', existing.id);
      } else if (!existing) {
        // Submission row vanished (shouldn't happen) — recreate minimally
        await adminClient
          .from('challenge_submissions')
          .upsert({ user_id: rev.user_id, challenge_id: rev.challenge_id, code: rev.review?.submittedCode || '', passed: true },
            { onConflict: 'user_id,challenge_id' });
      }

      // Award coins once (even if the deterministic grader already did)
      if (!alreadyPassed) {
        const { data: challenge } = await adminClient
          .from('challenges').select('coins_reward, title').eq('id', rev.challenge_id).single();
        if (challenge) {
          const coinsService = require('./coinsService');
          await coinsService.addCoins(rev.user_id, challenge.coins_reward, `Challenge (AI-approved): ${challenge.title}`, rev.challenge_id);
        }
      }
    }

    const { data, error: upErr } = await adminClient
      .from('ai_reviews')
      .update({ status: 'applied', reviewed_by: adminId, decided_at: new Date().toISOString(), admin_note: adminNote })
      .eq('id', reviewId)
      .select()
      .single();
    if (upErr) throw upErr;
    return { applied: effectivePass, review: data };
  }

  /**
   * Student-facing: own review for a challenge (read-only).
   */
  async getOwn(userId, challengeId) {
    const { data, error } = await adminClient
      .from('ai_reviews')
      .select('verdict, score, quality, review, status, created_at, admin_note')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error) return null;
    return data;
  }

  /**
   * Audit trail: record a training run in ai_model_versions.
   */
  async recordModelVersion(model, adminId) {
    try {
      await adminClient.from('ai_model_versions').insert({
        version: model.version || 1,
        trained_by: adminId,
        stats: model.stats || {},
        notes: `courses=${model.stats?.courses} challenges=${model.stats?.challenges} vocab=${model.stats?.vocabulary}`,
      });
    } catch (err) {
      console.warn('[AI-REVIEW] could not record model version:', err.message);
    }
  }
}

module.exports = new AiReviewService();
