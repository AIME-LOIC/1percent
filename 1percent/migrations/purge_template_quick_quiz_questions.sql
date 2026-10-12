-- ============================================================
-- Remove quick-quiz questions made by the OLD template generator
-- ============================================================
-- The old generate_lesson_quizzes.js produced questions that were
-- guessable ("A decorative term with no technical meaning") and, for
-- about half of the lessons, marked a wrong option as correct.
-- These three question shapes exist ONLY in that generator, so this
-- touches nothing hand-written.
--
-- 1) Run the SELECT and look at the count.
-- 2) Run the DELETE, then re-run:  node generate_lesson_quizzes.js --review
-- ============================================================

SELECT count(*) AS old_template_questions
FROM public.quiz_questions
WHERE question LIKE 'Which concept is central to this lesson ("%")?'
   OR question LIKE 'In this lesson, "%", which item belongs to its core subject matter?'
   OR question LIKE 'The lesson on "%" teaches that "%" is best understood as what?';

-- DELETE FROM public.quiz_questions
-- WHERE question LIKE 'Which concept is central to this lesson ("%")?'
--    OR question LIKE 'In this lesson, "%", which item belongs to its core subject matter?'
--    OR question LIKE 'The lesson on "%" teaches that "%" is best understood as what?';
