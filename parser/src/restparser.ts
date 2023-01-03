import { RestAnnotation } from "./ast.js";

function scanHeaders(text: string) {
  // Header name: https://tools.ietf.org/html/rfc2616#section-4.2
  const headerRegex = /\[header (?<header>[^()<>@,;:\\"/[\]?={}\s\t]+): \{(?<name>\w+)\}\]/gu;
  const headers = new Map<string, string>();

  let match: RegExpExecArray | null;

  while ((match = headerRegex.exec(text)) !== null) {
    if (match.groups?.header && match.groups.name) {
      headers.set(match.groups.header.toLowerCase(), match.groups.name);
    }
  }

  return headers;
}

function scanBody(text: string) {
  const match = /\[body \{(?<name>\w+)\}\]/u.exec(text);

  if (match?.groups?.name) {
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

  // eslint-disable-next-line prefer-destructuring
  let path = fragments[1];

  if (!path.startsWith("/")) {
    throw new Error(`Invalid path`);
  }

  let queryVariables: string[] = [];

  if (path.includes("?")) {
    const [base, ...queryArray] = path.split("?");

    path = base;
    const query = queryArray.join("?");

    if (!/^\{\w+\}(?:&\{\w+\})*$/u.test(query)) {
      throw new Error(`Invalid querystring on path`);
    }

    queryVariables = scanVariables(query);
  }

  const pathVariables = scanVariables(path);

  const remaining = fragments.slice(2).join(" ");
  const headers = scanHeaders(remaining);
  const bodyVariable = scanBody(remaining);

  return new RestAnnotation(method, path, pathVariables, queryVariables, headers, bodyVariable);
}
