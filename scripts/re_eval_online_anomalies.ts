import { runReEvaluation } from "../src/lib/monitoring/reEvaluator.ts";

const results = await runReEvaluation();

process.stdout.write(
  `${JSON.stringify(
    {
      processed: results.length,
      request_ids: results.map((result) => result.request_id),
    },
    null,
    2,
  )}\n`,
);
