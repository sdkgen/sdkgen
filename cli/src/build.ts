/* eslint-disable no-process-exit */
import { writeFileSync } from "fs";
import path from "path";

import { generateCSharpServerSource } from "@sdkgen/csharp-generator";
import { generateDartClientSource } from "@sdkgen/dart-generator";
import { generateFSharpServerSource } from "@sdkgen/fsharp-generator";
import { generateAndroidClientSource } from "@sdkgen/kotlin-generator";
import { Parser } from "@sdkgen/parser";
import { generateSwiftClientSource } from "@sdkgen/swift-generator";
import {
  generateBrowserClientSource,
  generateNodeClientSource,
  generateNodeServerSource,
  generateTypescriptInterfaces,
} from "@sdkgen/typescript-generator";
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import { fetch, extract } from "gittar";

const optionDefinitions = [
  { defaultOption: true, description: "Specifies the source file", name: "sources", multiple: true },
  { alias: "o", description: "Specifies the output file", name: "output" },
  { alias: "t", description: "Specifies the target platform and language", name: "target" },
  { alias: "h", description: "Display this usage guide.", name: "help", type: Boolean },
  { alias: "r", description: "Clones from a git repository", name: "repository" },
];

function buildOutput(filePath: string[], options: any) {
  const ast = new Parser(filePath).parse();

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

    case "fsharp_server": {
      writeFileSync(options.output, generateFSharpServerSource(ast));
      break;
    }

    case "kotlin_android": {
      writeFileSync(options.output, generateAndroidClientSource(ast, true));
      break;
    }

    case "kotlin_android_without_callbacks": {
      writeFileSync(options.output, generateAndroidClientSource(ast, false));
      break;
    }

    case "swift_ios": {
      writeFileSync(options.output, generateSwiftClientSource(ast, false));
      break;
    }

    case "rxswift_ios": {
      writeFileSync(options.output, generateSwiftClientSource(ast, true));
      break;
    }

    default: {
      console.error(`Error: Unknown target '${options.target}'`);
      process.exit(1);
    }
  }
}

export function buildCmd(argv: string[]): void {
  const options = commandLineArgs(optionDefinitions, { argv }) as {
    sources?: string[];
    output?: string;
    target?: string;
    repository?: string;
    help?: boolean;
    _unknown?: string[];
  };

  if (options.help) {
    console.log(
      commandLineUsage([
        {
          content: "sdkgen src/api.sdkgen -o src/api.ts -t typescript_nodeserver",
          header: "Typical Example",
        },
        {
          content: [
            "- typescript_nodeserver",
            "- typescript_nodeclient",
            "- typescript_web",
            "- typescript_interfaces",
            "- flutter",
            "- csharp_server",
            "- kotlin_android",
            "- kotlin_android_without_callbacks",
            "- swift_ios",
            "- rxswift_ios",
          ].join("\n"),
          header: "Available targets",
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

  if (!options.sources || options.sources.length === 0) {
    console.error("Error: Missing 'sources' option.");
    process.exit(1);
  }

  if (!options.output) {
    console.error("Error: Missing 'output' option.");
    process.exit(1);
  }

  if (!options.target) {
    console.error("Error: Missing 'target' option.");
    process.exit(1);
  }

  if (!options.repository) {
    buildOutput(options.sources, options);
    process.exit(0);
  }

  fetch(options.repository)
    .then(file => {
      extract(file, path.join(__dirname, ".ignore"))
        .then(extractedPath => {
          const sources = options.sources!.map(source => path.join(extractedPath, source));

          buildOutput(sources, options);

          process.exit(0);
        })
        .catch(error => {
          console.error("failed to extract files", error);
        });
    })
    .catch(error => {
      console.error("Failed to download repository", error);
      process.exit(1);
    });
}
