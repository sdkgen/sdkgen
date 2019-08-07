#!/usr/bin/env node
import { Parser } from "@sdkgen/parser";
import { generateNodeServerSource, generateNodeClientSource } from "@sdkgen/typescript-generator";
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import { writeFileSync } from "fs";

const optionDefinitions = [
    { name: "source", defaultOption: true, description: "Specifies the source file" },
    { name: "output", alias: "o", description: "Specifies the output file" },
    { name: "target", alias: "t", description: "Specifies the target platform and language" },
    { name: "help", alias: "h", type: Boolean, description: "Display this usage guide." }
];

async function main() {
    const options: {
        source?: string
        output?: string
        target?: string
        help?: boolean
        _unknown?: string[];
    } = commandLineArgs(optionDefinitions);

    if (options.help) {
        console.log(commandLineUsage([{
            header: "Typical Example",
            content: "sdkgen src/api.sdkgen -o src/api.ts -t typescript_nodeserver"
        }, {
            header: "Options",
            optionList: optionDefinitions
        }, {
            content: "Project home: {underline https://github.com/sdkgen}"
        }]));
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
        default: {
            console.error(`Error: Unknown target '${options.target}'`);
            process.exit(1);
            return;
        }
    }
}

main().catch(console.error);
