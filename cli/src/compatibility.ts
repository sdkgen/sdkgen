/* eslint-disable no-process-exit */
import { compatibilityIssues, Parser } from "@sdkgen/parser";

export function compatibilityCmd(argv: string[]): void {
  const [source1, source2] = argv;

  if (!source1 || !source2) {
    console.error("Error: Need to specify two source files.");
    process.exit(1);
  }

  if (argv.length > 2) {
    console.error("Error: Too many arguments.");
    process.exit(1);
  }

  const ast1 = new Parser(source1).parse();
  const ast2 = new Parser(source2).parse();

  const issues = compatibilityIssues(ast1, ast2);

  for (const issue of issues) {
    console.log(issue);
  }

  if (issues.length) {
    process.exit(1);
  } else {
    console.log("No breaking changes.");
  }
}
