/* eslint-disable no-process-exit */
import { generateCSharpServerSource } from "@sdkgen/csharp-generator";
import { generateDartClientSource } from "@sdkgen/dart-generator";
import { generateAndroidClientSource } from "@sdkgen/kotlin-generator";
import { Parser } from "@sdkgen/parser";
import {
  generateBrowserClientSource,
  generateNodeClientSource,
  generateNodeServerSource,
  generateTypescriptInterfaces,
} from "@sdkgen/typescript-generator";
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import { writeFileSync } from "fs";

const optionDefinitions = [
  { defaultOption: true, description: "Specifies the source file", name: "source" },
  { alias: "o", description: "Specifies the output file", name: "output" },
  { alias: "t", description: "Specifies the target platform and language", name: "target" },
  { alias: "h", description: "Display this usage guide.", name: "help", type: Boolean },
];

export function buildCmd(argv: string[]): void {
  const options: {
    source?: string;
    output?: string;
    target?: string;
    help?: boolean;
    _unknown?: string[];
  } = commandLineArgs(optionDefinitions, { argv });

  if (options.help) {
    console.log(
      commandLineUsage([
        {
          content: "sdkgen src/api.sdkgen -o src/api.ts -t typescript_nodeserver",
          header: "Typical Example",
        },
        {
          header: "Options",
          optionList: optionDefinitions,
        },
        {
          content: "Project home: {underline https://github.com/sdkgen}",
        },
      ]),
    );
    process.exit(0);
  }

  if (!options.source) {
    console.error("Error: Missing source option.");
    process.exit(1);
  }

  if (!options.output) {
    console.error("Error: Missing output option.");
    process.exit(1);
  }

  if (!options.target) {
    console.error("Error: Missing target option.");
    process.exit(1);
  }

  const ast = new Parser(options.source).parse();

  for (const warning of ast.warnings) {
    console.error(`WARNING: ${warning}`);
  }

  switch (options.target) {
    case "typescript_nodeserver": {
      writeFileSync(options.output, generateNodeServerSource(ast));
      break;
    }

    case "typescript_nodeclient": {
      writeFileSync(options.output, generateNodeClientSource(ast));
      break;
    }

    case "typescript_web": {
      writeFileSync(options.output, generateBrowserClientSource(ast));
      break;
    }

    case "typescript_interfaces": {
      writeFileSync(options.output, generateTypescriptInterfaces(ast));
      break;
    }

    case "flutter": {
      writeFileSync(options.output, generateDartClientSource(ast));
      break;
    }

    case "csharp_server": {
      writeFileSync(options.output, generateCSharpServerSource(ast));
      break;
    }

    case "kotlin_android": {
      writeFileSync(options.output, generateAndroidClientSource(ast));
      break;
    }

    default: {
      console.error(`Error: Unknown target '${options.target}'`);
      process.exit(1);
    }
  }
}
