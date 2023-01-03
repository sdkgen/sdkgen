#!/usr/bin/env node
import commandLineArgs from "command-line-args";

import { buildCmd } from "./build.js";
import { compatibilityCmd } from "./compatibility.js";

const mainDefinitions = [{ defaultOption: true, name: "command" }];

const options = commandLineArgs(mainDefinitions, { stopAtFirstUnknown: true });
const args = options._unknown ?? [];

switch (options.command) {
  case "compatibility":
    compatibilityCmd(args);
    break;
  default:
    buildCmd(process.argv);
    break;
}
