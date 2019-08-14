import { Parser } from "@sdkgen/parser";
import { writeFileSync } from "fs";
import { generateDartClientSource } from "./dart-client";

export * from "./dart-client";


writeFileSync("src/client.dart", generateDartClientSource(new Parser("src/api.sdkgen").parse(), {}));