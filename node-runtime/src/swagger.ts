import {
    ArrayType,
    Base64PrimitiveType,
    BoolPrimitiveType,
    BytesPrimitiveType,
    CepPrimitiveType,
    CnpjPrimitiveType,
    CpfPrimitiveType,
    DatePrimitiveType,
    DateTimePrimitiveType,
    DescriptionAnnotation,
    EnumType,
    FloatPrimitiveType,
    HexPrimitiveType,
    IntPrimitiveType,
    MoneyPrimitiveType,
    OptionalType,
    RestAnnotation,
    StringPrimitiveType,
    StructType,
    Type,
    TypeReference,
    UIntPrimitiveType,
    UrlPrimitiveType,
    UuidPrimitiveType,
    VoidPrimitiveType,
} from "@sdkgen/parser";
import staticFilesHandler from "serve-handler";
import { getAbsoluteFSPath as getSwaggerUiAssetPath } from "swagger-ui-dist";
import { SdkgenHttpServer } from "./http-server";

const swaggerUiAssetPath = getSwaggerUiAssetPath();

export function setupSwagger<ExtraContextT>(server: SdkgenHttpServer<ExtraContextT>) {
    server.addHttpHandler("GET", "/swagger", (req, res) => {
        if (!server.introspection) {
            res.statusCode = 404;
            res.end();
            return;
        }

        if (!server.introspection) {
            res.statusCode = 404;
            res.end();
            return;
        }
        res.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Swagger UI</title>
                <link rel="stylesheet" type="text/css" href="/swagger/swagger-ui.css" >
                <link rel="icon" type="image/png" href="/swagger/favicon-32x32.png" sizes="32x32" />
                <link rel="icon" type="image/png" href="/swagger/favicon-16x16.png" sizes="16x16" />
                <style>
                    html {
                        box-sizing: border-box;
                        overflow: -moz-scrollbars-vertical;
                        overflow-y: scroll;
                    }

                    *, *:before, *:after {
                        box-sizing: inherit;
                    }

                    body {
                        margin: 0;
                        background: #fafafa;
                    }

                    .swagger-ui .scheme-container, .swagger-ui .topbar {
                        display: none !important;
                    }
                </style>
            </head>

            <body>
                <div id="swagger-ui"></div>
                <script src="/swagger/swagger-ui-bundle.js"> </script>
                <script src="/swagger/swagger-ui-standalone-preset.js"> </script>
                <script>
                window.onload = function() {
                    window.ui = SwaggerUIBundle({
                        url: location.origin + "/swagger.json",
                        dom_id: '#swagger-ui',
                        deepLinking: true,
                        presets: [
                            SwaggerUIBundle.presets.apis,
                            SwaggerUIStandalonePreset,
                        ],
                        plugins: [
                            SwaggerUIBundle.plugins.DownloadUrl,
                        ],
                        layout: "StandaloneLayout"
                    });
                }
            </script>
            </body>
            </html>
        `);
        res.end();
    });

    server.addHttpHandler("GET", /^\/swagger/u, (req, res) => {
        if (!server.introspection) {
            res.statusCode = 404;
            res.end();
            return;
        }

        if (req.url) {
            req.url = req.url.replace(/\/swagger/u, "");
        }

        staticFilesHandler(req, res, {
            cleanUrls: false,
            directoryListing: false,
            etag: true,
            public: swaggerUiAssetPath,
        }).catch(e => {
            console.error(e);
            res.statusCode = 500;
            res.write(e.toString());
            res.end();
        });
    });

    server.addHttpHandler("GET", "/swagger.json", (req, res) => {
        if (!server.introspection) {
            res.statusCode = 404;
            res.end();
            return;
        }

        try {
            const definitions: any = {};
            const paths: any = {};

            for (const op of server.ast.operations) {
                for (const ann of op.annotations) {
                    if (ann instanceof RestAnnotation) {
                        if (!paths[ann.path]) {
                            paths[ann.path] = {};
                        }

                        paths[ann.path][ann.method.toLowerCase()] = {
                            summary:
                                op.annotations
                                    .filter(x => x instanceof DescriptionAnnotation)
                                    .map(x => (x as DescriptionAnnotation).text)
                                    .join(" ") || undefined,
                            tags: ["REST Endpoints"],
                            operationId: op.name,
                            parameters: [
                                ...ann.pathVariables.map(name => ({
                                    name,
                                    location: "path",
                                    arg: op.args.find(arg => arg.name === name)!,
                                })),
                                ...ann.queryVariables.map(name => ({
                                    name,
                                    location: "query",
                                    arg: op.args.find(arg => arg.name === name)!,
                                })),
                                ...[...ann.headers.entries()].map(([header, name]) => ({
                                    name: header,
                                    location: "header",
                                    arg: op.args.find(arg => arg.name === name)!,
                                })),
                            ].map(({ name, location, arg }) => ({
                                name,
                                in: location,
                                required: !(arg.type instanceof OptionalType),
                                schema: typeToSchema(definitions, arg.type),
                                description:
                                    arg.annotations
                                        .filter(x => x instanceof DescriptionAnnotation)
                                        .map(x => (x as DescriptionAnnotation).text)
                                        .join(" ") || undefined,
                            })),
                            requestBody: ann.bodyVariable
                                ? {
                                      required: !(
                                          op.args.find(arg => arg.name === ann.bodyVariable)!.type instanceof
                                          OptionalType
                                      ),
                                      content: {
                                          ...(() => {
                                              const bodyType = op.args.find(arg => arg.name === ann.bodyVariable)!.type;

                                              return bodyType instanceof BoolPrimitiveType ||
                                                  bodyType instanceof IntPrimitiveType ||
                                                  bodyType instanceof UIntPrimitiveType ||
                                                  bodyType instanceof FloatPrimitiveType ||
                                                  bodyType instanceof StringPrimitiveType ||
                                                  bodyType instanceof DatePrimitiveType ||
                                                  bodyType instanceof DateTimePrimitiveType ||
                                                  bodyType instanceof MoneyPrimitiveType ||
                                                  bodyType instanceof CpfPrimitiveType ||
                                                  bodyType instanceof CnpjPrimitiveType ||
                                                  bodyType instanceof CepPrimitiveType ||
                                                  bodyType instanceof UuidPrimitiveType ||
                                                  bodyType instanceof HexPrimitiveType ||
                                                  bodyType instanceof BytesPrimitiveType ||
                                                  bodyType instanceof Base64PrimitiveType
                                                  ? {
                                                        "text/plain": { schema: typeToSchema(definitions, bodyType) },
                                                    }
                                                  : {};
                                          })(),
                                          "application/json": {
                                              schema: typeToSchema(
                                                  definitions,
                                                  op.args.find(arg => arg.name === ann.bodyVariable)!.type,
                                              ),
                                          },
                                      },
                                  }
                                : undefined,
                            responses: {
                                ...(op.returnType instanceof OptionalType || op.returnType instanceof VoidPrimitiveType
                                    ? { [ann.method === "GET" ? "404" : "204"]: {} }
                                    : {}),
                                ...(!(op.returnType instanceof VoidPrimitiveType)
                                    ? {
                                          "200": {
                                              content: {
                                                  ...(() => {
                                                      return op.returnType instanceof BoolPrimitiveType ||
                                                          op.returnType instanceof IntPrimitiveType ||
                                                          op.returnType instanceof UIntPrimitiveType ||
                                                          op.returnType instanceof FloatPrimitiveType ||
                                                          op.returnType instanceof StringPrimitiveType ||
                                                          op.returnType instanceof DatePrimitiveType ||
                                                          op.returnType instanceof DateTimePrimitiveType ||
                                                          op.returnType instanceof MoneyPrimitiveType ||
                                                          op.returnType instanceof CpfPrimitiveType ||
                                                          op.returnType instanceof CnpjPrimitiveType ||
                                                          op.returnType instanceof CepPrimitiveType ||
                                                          op.returnType instanceof UuidPrimitiveType ||
                                                          op.returnType instanceof HexPrimitiveType ||
                                                          op.returnType instanceof BytesPrimitiveType ||
                                                          op.returnType instanceof Base64PrimitiveType
                                                          ? {
                                                                "text/plain": {
                                                                    schema: typeToSchema(definitions, op.returnType),
                                                                },
                                                            }
                                                          : {};
                                                  })(),
                                                  "application/json": {
                                                      schema: typeToSchema(definitions, op.returnType),
                                                  },
                                              },
                                          },
                                      }
                                    : {}),
                                "400": {
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object",
                                                required: ["type", "message"],
                                                properties: {
                                                    type: {
                                                        type: "string",
                                                        enum: server.ast.errors,
                                                    },
                                                    message: {
                                                        type: "string",
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                                "500": {},
                            },
                        };
                    }
                }
            }

            res.write(
                JSON.stringify({
                    openapi: "3.0.3",
                    info: {},
                    schemes: ["https"],
                    consumes: ["application/json"],
                    produces: ["application/json"],
                    paths,
                    definitions,
                }),
            );
        } catch (error) {
            console.error(error);
            res.statusCode = 500;
        }

        res.end();
    });
}

function objectFromEntries<T>(entries: [string, T][]): { [key: string]: T } {
    return Object.assign({}, ...Array.from(entries, ([k, v]) => ({ [k]: v })));
}

function typeToSchema(definitions: any, type: Type): any {
    if (type instanceof EnumType) {
        return {
            type: "string",
            enum: type.values.map(x => x.value),
        };
    } else if (type instanceof StructType) {
        return {
            type: "object",
            required: type.fields.filter(f => !(f.type instanceof OptionalType)).map(f => f.name),
            properties: objectFromEntries(
                type.fields.map(field => [
                    field.name,
                    {
                        description:
                            field.annotations
                                .filter(x => x instanceof DescriptionAnnotation)
                                .map(x => (x as DescriptionAnnotation).text)
                                .join(" ") || undefined,
                        ...typeToSchema(definitions, field.type),
                    },
                ]),
            ),
        };
    } else if (
        type instanceof StringPrimitiveType ||
        type instanceof CepPrimitiveType ||
        type instanceof UuidPrimitiveType ||
        type instanceof HexPrimitiveType ||
        type instanceof Base64PrimitiveType
    ) {
        return {
            type: "string",
        };
    } else if (type instanceof UrlPrimitiveType) {
        return {
            format: "uri",
            type: "string",
        };
    } else if (type instanceof DatePrimitiveType) {
        return {
            format: "date",
            type: "string",
        };
    } else if (type instanceof DateTimePrimitiveType) {
        return {
            format: "date-time",
            type: "string",
        };
    } else if (type instanceof CpfPrimitiveType) {
        return {
            type: "string",
        };
    } else if (type instanceof CnpjPrimitiveType) {
        return {
            type: "string",
        };
    } else if (type instanceof BoolPrimitiveType) {
        return {
            type: "boolean",
        };
    } else if (type instanceof BytesPrimitiveType) {
        return {
            format: "byte",
            type: "string",
        };
    } else if (type instanceof IntPrimitiveType) {
        return {
            type: "integer",
            format: "int32",
        };
    } else if (type instanceof UIntPrimitiveType) {
        return {
            type: "integer",
            format: "int32",
            minimum: 0,
        };
    } else if (type instanceof MoneyPrimitiveType) {
        return {
            type: "integer",
            format: "int64",
        };
    } else if (type instanceof FloatPrimitiveType) {
        return {
            type: "number",
        };
    } else if (type instanceof OptionalType) {
        return {
            oneOf: [typeToSchema(definitions, type.base), { type: "null" }],
        };
    } else if (type instanceof ArrayType) {
        return {
            type: "array",
            items: typeToSchema(definitions, type.base),
        };
    } else if (type instanceof TypeReference) {
        if (!definitions[type.name]) {
            definitions[type.name] = typeToSchema(definitions, type.type);
        }
        return { $ref: `#/definitions/${type.name}` };
    } else {
        throw new Error(`Unhandled type ${type.constructor.name}`);
    }
}
