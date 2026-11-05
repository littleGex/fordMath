/** The parts of Vitest's JSON reporter output we use. */
export interface AssertionResult {
  ancestorTitles: string[];
  title: string;
  status: "passed" | "failed" | "skipped" | "pending" | "todo";
  duration?: number | null;
  failureMessages: string[];
}
export interface FileResult {
  name: string;
  status: string;
  assertionResults: AssertionResult[];
}
export interface TestReport {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  startTime: number;
  success: boolean;
  testResults: FileResult[];
}

/** Loads test-results.json written by `npm run test:report` (CI does this before every deploy). */
export async function loadTestReport(): Promise<TestReport | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}test-results.json`, { cache: "no-cache" });
    if (!res.ok) return null;
    return (await res.json()) as TestReport;
  } catch {
    return null;
  }
}
