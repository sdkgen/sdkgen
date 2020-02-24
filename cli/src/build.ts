import { generateKtClientSource } from "@sdkgen/kt-generator";
import { generateDartClientSource } from "@sdkgen/dart-generator";
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
    { name: "source", defaultOption: true, description: "Specifies the source file" },
    { name: "output", alias: "o", description: "Specifies the output file" },
    { name: "target", alias: "t", description: "Specifies the target platform and language" },
    { name: "help", alias: "h", type: Boolean, description: "Display this usage guide." },
];

export function buildCmd(argv: string[]) {
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
                    header: "Typical Example",
                    content: "sdkgen src/api.sdkgen -o src/api.ts -t typescript_nodeserver",
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
        return;
    }

    if (!options.source) {
        console.error("Error: Missing source option.");
        process.exit(1);
        return;
    }

    if (!options.output) {
        console.error("Error: Missing output option.");
        process.exit(1);
        return;
    }

    if (!options.target) {
        console.error("Error: Missing target option.");
        process.exit(1);
        return;
    }

    const ast = new Parser(options.source).parse();

    switch (options.target) {
        case "typescript_nodeserver": {
            writeFileSync(options.output, generateNodeServerSource(ast, {}));
            break;
        }
        case "typescript_nodeclient": {
            writeFileSync(options.output, generateNodeClientSource(ast, {}));
            break;
        }
        case "typescript_web": {
            writeFileSync(options.output, generateBrowserClientSource(ast, {}));
            break;
        }
        case "typescript_interfaces": {
            writeFileSync(options.output, generateTypescriptInterfaces(ast, {}));
            break;
        }
        case "flutter": {
            writeFileSync(options.output, generateDartClientSource(ast, {}));
            break;
        }
        case "android": {
            writeFileSync(options.output, generateKtClientSource(ast, {}));
            break;
        }
        default: {
            console.error(`Error: Unknown target '${options.target}'`);
            process.exit(1);
            return;
        }
    }
}
