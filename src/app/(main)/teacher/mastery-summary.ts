export interface MasterySummaryRow {
  skill_id: string;
  mastery_score: number;
  mastery_level: string;
  practice_count: number;
}

export interface MasterySummary {
  /** Catalog skills the learner has actually been scored on. */
  assessed: number;
  total: number;
  /** Skills at strong or mastered. */
  secure: number;
  /** Average session score across assessed skills only, or null when nothing is assessed. */
  averageScore: number | null;
  /** Share of the whole catalog that has been assessed, 0 to 100. */
  coverage: number;
}

const SECURE_LEVELS = new Set(['strong', 'mastered']);

/**
 * A skill counts as assessed once it has a score above zero. Skills with no
 * row are unknown, not zero, so they stay out of the average and show up as
 * missing coverage instead.
 */
export function summarizeMastery(
  rows: MasterySummaryRow[],
  catalogIds: ReadonlySet<string>,
): MasterySummary {
  const total = catalogIds.size;
  const assessedRows = rows.filter((row) => catalogIds.has(row.skill_id) && row.mastery_score > 0);
  const assessed = assessedRows.length;
  return {
    assessed,
    total,
    secure: assessedRows.filter((row) => SECURE_LEVELS.has(row.mastery_level)).length,
    averageScore: assessed
      ? Math.round(assessedRows.reduce((sum, row) => sum + row.mastery_score, 0) / assessed)
      : null,
    coverage: total ? Math.round((assessed / total) * 100) : 0,
  };
}

/** Plain sentence for tooltips and screen readers. */
export function masteryExplanation(summary: MasterySummary): string {
  if (summary.assessed === 0) return 'No skills assessed yet.';
  const skills = `${summary.assessed} of ${summary.total} skills`;
  return `Assessed on ${skills}. ${summary.secure} strong or better. Average score ${summary.averageScore} out of 100 across the assessed skills only.`;
}
