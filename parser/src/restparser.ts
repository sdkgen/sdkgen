import { parse as pathParse } from "path";
import { RestAnnotation } from "./ast";

function scanHeaders(text: string) {
  const headerRegex = /\[header (?<header>[\w-]+): \{(?<name>\w+)\}\]/gu;
  const headers = new Map<string, string>();

  let match: RegExpExecArray | null;

  while ((match = headerRegex.exec(text)) !== null) {
    if (match.groups?.header && match.groups?.name) {
      headers.set(match.groups.header, match.groups.name);
    }
  }

  return headers;
}

function scanBody(text: string) {
  const bodyRegex = /\[body \{(?<name>\w+)\}\]/u;
  const match = text.match(bodyRegex);

  if (match && match.groups?.name) {
    return match.groups.name;
  }

  return null;
}

function scanVariables(text: string) {
  const variableRegex = /\{(?<name>\w+)\}/gu;
  const variables: string[] = [];

  let match: RegExpExecArray | null;

  while ((match = variableRegex.exec(text)) !== null) {
    if (match.groups?.name) {
      variables.push(match.groups.name);
    }
  }

  return variables;
}

export function parseRestAnnotation(text: string): RestAnnotation {
  const fragments = text.split(" ");
  const method = fragments[0].toUpperCase();

  if (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    throw new Error(`Unsupported method '${method}'`);
  }

  const parsedPath = pathParse(fragments[1]);

  if (parsedPath.root !== "/") {
    throw new Error(`Invalid path`);
  }

  if (parsedPath.dir === "/") {
    parsedPath.dir = "";
  }

  let queryVariables: string[] = [];

  if (parsedPath.base.includes("?")) {
    const [base, ...queryArray] = parsedPath.base.split("?");

    parsedPath.base = base;
    const query = queryArray.join("?");

    if (!query.match(/^\{\w+\}(?:&\{\w+\})*$/u)) {
      throw new Error(`Invalid querystring on path`);
    }

    queryVariables = scanVariables(query);
  }

  const path = `${parsedPath.dir}/${parsedPath.base}`;
  const pathVariables = scanVariables(path);

  const remaining = fragments.slice(2).join(" ");
  const headers = scanHeaders(remaining);
  const bodyVariable = scanBody(remaining);

  return new RestAnnotation(method, path, pathVariables, queryVariables, headers, bodyVariable);
}
