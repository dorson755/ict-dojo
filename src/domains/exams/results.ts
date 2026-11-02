export class ExamError extends Error {}
export type ExamActionResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Only deliberate user-facing errors cross the server-action boundary. */
export async function examAction<T>(work: () => Promise<T>): Promise<ExamActionResult<T>> {
  try {
    return { ok: true, value: await work() };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ExamError
          ? error.message
          : 'The paper service could not finish this request. Please retry; if it keeps failing, contact the site administrator.',
    };
  }
}
export function unwrapExamResult<T>(result: ExamActionResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
