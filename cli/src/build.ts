/* eslint-disable no-process-exit */
import { writeFileSync } from "fs";

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
import { exec } from "./utils";

const optionDefinitions = [
  { defaultOption: true, description: "Specifies the source file", name: "sources", multiple: true },
  { alias: "o", description: "Specifies the output file", name: "output" },
  { alias: "t", description: "Specifies the target platform and language", name: "target" },
  { alias: "h", description: "Display this usage guide.", name: "help", type: Boolean },
  { alias: "r", description: "Clones from a git repository", name: "repository" },
];

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

    const repo = parse(options.repository);
    cloneGit(repo.ssh!)
	.then(() => {
	    const sources = options.sources!.map(source => `./tmp/${source}`)
	    buildOutput(sources, options);
	    process.exit(0);
	});
}

const buildOutput = (filePath: string[], options: any) => {
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

const supported = new Set(['github', 'gitlab', 'bitbucket']);

function parse(src: string) {
    const match = /^(?:(?:https:\/\/)?([^:/]+\.[^:/]+)\/|git@([^:/]+)[:/]|([^/]+):)?([^/\s]+)\/([^/\s#]+)(?:((?:\/[^/\s#]+)+))?(?:\/)?(?:#(.+))?/.exec(
	src
    );
    if (!match) {
	console.log('its a file path')
	return { file: src }
    }

    const site = (match[1] || match[2] || match[3] || 'github').replace(
	/\.(com|org)$/,
	''
    );
    if (!supported.has(site)) {
	console.log('only supports GitHub, GitLab and Bitbucket')
    }

    const user = match[4];
    const name = match[5].replace(/\.git$/, '');
    const subdir = match[6];
    const ref = match[7] || 'HEAD';

    const domain = `${site}.${site === 'bitbucket' ? 'org' : 'com'}`;
    const url = `https://${domain}/${user}/${name}`;
    const ssh = `git@${domain}:${user}/${name}`;

    const mode = supported.has(site) ? 'tar' : 'git';

    return { site, user, name, ref, url, ssh, subdir, mode };
}

const cloneGit = async (ssh: string) => {
    await exec(`git clone --depth 1 ${ssh} ./tmp`);
}
