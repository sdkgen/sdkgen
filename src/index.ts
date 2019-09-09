#!/usr/bin/env node
import commandLineArgs from "command-line-args";
import { buildCmd } from "./build";
import { compatibilityCmd } from "./compatibility";

const mainDefinitions = [
    { name: "command", defaultOption: true }
]

const mainOptions = commandLineArgs(mainDefinitions, { stopAtFirstUnknown: true })
const argv = mainOptions._unknown || []

switch (mainOptions.command) {
    case undefined:
        buildCmd(argv).catch(console.error);
        break;
    case "compatibility":
        compatibilityCmd(argv).catch(console.error);
        break;
    default:
        console.error("Error: Unknown command");
        process.exit(1);
}
