-- Existing written-answer questions predate AI-assisted grading and were
-- saved with normalized literal matching. Upgrade only that legacy mode;
-- questions explicitly configured for exact matching remain deterministic.
UPDATE "Question"
SET
  "matchMode" = 'AI_ASSISTED',
  "aiGradingRubric" = COALESCE(
    NULLIF(BTRIM("aiGradingRubric"), ''),
    'Accept concise paraphrases that preserve the essential meaning of an accepted answer. Reject contradictory, unrelated, or too-vague responses.'
  )
WHERE
  "type" = 'SHORT_TEXT'
  AND "matchMode" = 'NORMALIZED';

-- This wording was confirmed during playtesting as a valid concise answer for
-- the Exaltus/ExaItus payment-account mechanism. Save it explicitly so this
-- known-good response does not depend on a probabilistic model decision.
UPDATE "Question"
SET "acceptedAnswers" = array_append(
  "acceptedAnswers",
  'Switched accounts in the system'
)
WHERE
  "type" = 'SHORT_TEXT'
  AND "matchMode" = 'AI_ASSISTED'
  AND EXISTS (
    SELECT 1
    FROM unnest("acceptedAnswers") AS accepted(answer)
    WHERE
      accepted.answer ILIKE '%payee name%'
      AND accepted.answer ILIKE '%alternate account%'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM unnest("acceptedAnswers") AS accepted(answer)
    WHERE LOWER(BTRIM(accepted.answer)) =
      LOWER('Switched accounts in the system')
  );
