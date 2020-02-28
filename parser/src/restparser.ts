import { parse as pathParse } from "path";
import { RestAnnotation } from "./ast";

export function parseRestAnnotation(text: string) {
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
        if (!query.match(/^\{\w+\}(&\{\w+\})*$/)) {
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

function scanHeaders(text: string) {
    const headerRegex = /\[header ([\w-]+): \{(\w+)\}\]/gu;
    const headers = new Map<string, string>();

    let match: RegExpExecArray | null;
    while ((match = headerRegex.exec(text)) !== null) {
        headers.set(match[1], match[2]);
    }

    return headers;
}

function scanBody(text: string) {
    const bodyRegex = /\[body \{(\w+)\}\]/u;
    const match = text.match(bodyRegex);
    if (match) {
        return match[1];
    }

    return null;
}

function scanVariables(text: string) {
    const variableRegex = /\{(\w+)\}/gu;
    const variables: string[] = [];

    let match: RegExpExecArray | null;
    while ((match = variableRegex.exec(text)) !== null) {
        variables.push(match[1]);
    }

    return variables;
}
