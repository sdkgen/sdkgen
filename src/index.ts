import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import { Parser } from "@sdkgen/parser";
import { generateNodeServerSource } from "@sdkgen/typescript-generator";
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
        console.log(commandLineUsage([
            {
                header: "Typical Example",
                content: "sdkgen src/api.sdkgen -o src/api.ts -t typescript_nodeserver"
            },
            {
                header: "Options",
                optionList: optionDefinitions
            },
            {
                content: "Project home: {underline https://github.com/sdkgen}"
            }
        ]));
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

    const parser = new Parser(options.source);
    const ast = parser.parse();
    let code: string | null = null;

    switch (options.target) {
        case "typescript_nodeserver": {
            generateNodeServerSource(ast, {
                outputFile: options.output
            });
            break;
        }
        default: {
            console.error(`Error: Unknown target '${options.target}'`);
            process.exit(1);
            return;
        }
    }

    writeFileSync(options.output, code);
}

main().catch(console.error);
