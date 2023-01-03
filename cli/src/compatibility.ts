/* eslint-disable no-process-exit */
import { readFileSync } from "fs";

import { compatibilityIssues, Parser } from "@sdkgen/parser";
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";

const optionDefinitions = [
  { description: "Specifies the old version", name: "old" },
  { description: "Specifies the new version", name: "new" },
  { alias: "h", description: "Display this usage guide.", name: "help", type: Boolean },
];

export function compatibilityCmd(argv: string[]): void {
  const options: {
    old?: string;
    new?: string;
    help?: boolean;
    _unknown?: string[];
  } = commandLineArgs(optionDefinitions, { argv, partial: true });

  if (options.help) {
    console.log(
      commandLineUsage([
        {
          content: "sdkgen compatibility --old src/old.sdkgen --new src/new.sdkgen",
          header: "Typical Example",
        },
        {
          header: "Options",
          optionList: optionDefinitions,
        },
        {
          content: "Project home: {underline https://sdkgen.github.io}",
        },
      ]),
    );
    process.exit(0);
  }

  const args = options._unknown ?? [];

  if (!options.old) {
    options.old = args.shift();
    if (!options.old) {
      console.error("Error: Missing 'old' option.");
      process.exit(1);
    }
  }

  if (!options.new) {
    options.new = args.shift();
    if (!options.new) {
      console.error("Error: Missing 'new' option.");
      process.exit(1);
    }
  }

  if (args.length > 0) {
    console.error("Error: Too many arguments.");
    process.exit(1);
  }

  const astOld = new Parser(options.old, readFileSync).parse();
  const astNew = new Parser(options.new, readFileSync).parse();

  const issues = compatibilityIssues(astOld, astNew);

  for (const issue of issues) {
    console.log(issue);
  }

  if (issues.length) {
    process.exit(1);
  } else {
    console.log("No breaking changes.");
  }
}
