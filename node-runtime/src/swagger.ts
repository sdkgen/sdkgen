import {
  ArrayType,
  Base64PrimitiveType,
  BoolPrimitiveType,
  BytesPrimitiveType,
  CnpjPrimitiveType,
  CpfPrimitiveType,
  DatePrimitiveType,
  DateTimePrimitiveType,
  DescriptionAnnotation,
  EnumType,
  FloatPrimitiveType,
  HexPrimitiveType,
  HtmlPrimitiveType,
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

function objectFromEntries<T>(entries: Array<[string, T]>): { [key: string]: T } {
  return Object.assign({}, ...Array.from(entries, ([k, v]) => ({ [k]: v })));
}

function typeToSchema(definitions: any, type: Type): any {
  if (type instanceof EnumType) {
    return {
      enum: type.values.map(x => x.value),
      type: "string",
    };
  } else if (type instanceof StructType) {
    return {
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
      required: type.fields.filter(f => !(f.type instanceof OptionalType)).map(f => f.name),
      type: "object",
    };
  } else if (
    type instanceof StringPrimitiveType ||
    type instanceof UuidPrimitiveType ||
    type instanceof HexPrimitiveType ||
    type instanceof HtmlPrimitiveType ||
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
      format: "int32",
      type: "integer",
    };
  } else if (type instanceof UIntPrimitiveType) {
    return {
      format: "int32",
      minimum: 0,
      type: "integer",
    };
  } else if (type instanceof MoneyPrimitiveType) {
    return {
      format: "int64",
      type: "integer",
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
      items: typeToSchema(definitions, type.base),
      type: "array",
    };
  } else if (type instanceof TypeReference) {
    if (!definitions[type.name]) {
      definitions[type.name] = typeToSchema(definitions, type.type);
    }

    return { $ref: `#/definitions/${type.name}` };
  }

  throw new Error(`Unhandled type ${type.constructor.name}`);
}

export function setupSwagger<ExtraContextT>(server: SdkgenHttpServer<ExtraContextT>): void {
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
              operationId: op.name,
              parameters: [
                ...ann.pathVariables.map(name => ({
                  arg: op.args.find(arg => arg.name === name)!,
                  location: "path",
                  name,
                })),
                ...ann.queryVariables.map(name => ({
                  arg: op.args.find(arg => arg.name === name)!,
                  location: "query",
                  name,
                })),
                ...[...ann.headers.entries()].map(([header, name]) => ({
                  arg: op.args.find(arg => arg.name === name)!,
                  location: "header",
                  name: header,
                })),
              ].map(({ name, location, arg }) => ({
                description:
                  arg.annotations
                    .filter(x => x instanceof DescriptionAnnotation)
                    .map(x => (x as DescriptionAnnotation).text)
                    .join(" ") || undefined,
                in: location,
                name,
                required: !(arg.type instanceof OptionalType),
                schema: typeToSchema(definitions, arg.type),
              })),
              requestBody: ann.bodyVariable
                ? {
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
                          bodyType instanceof HtmlPrimitiveType ||
                          bodyType instanceof UuidPrimitiveType ||
                          bodyType instanceof HexPrimitiveType ||
                          bodyType instanceof BytesPrimitiveType ||
                          bodyType instanceof Base64PrimitiveType
                          ? {
                              [bodyType instanceof HtmlPrimitiveType ? "text/html" : "text/plain"]: {
                                schema: typeToSchema(definitions, bodyType),
                              },
                            }
                          : {};
                      })(),
                      "application/json": {
                        schema: typeToSchema(definitions, op.args.find(arg => arg.name === ann.bodyVariable)!.type),
                      },
                    },
                    required: !(op.args.find(arg => arg.name === ann.bodyVariable)!.type instanceof OptionalType),
                  }
                : undefined,
              responses: {
                ...(op.returnType instanceof OptionalType || op.returnType instanceof VoidPrimitiveType
                  ? { [ann.method === "GET" ? "404" : "204"]: {} }
                  : {}),
                ...(op.returnType instanceof VoidPrimitiveType
                  ? {}
                  : {
                      200: {
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
                    }),
                400: {
                  content: {
                    "application/json": {
                      schema: {
                        properties: {
                          message: {
                            type: "string",
                          },
                          type: {
                            enum: server.ast.errors,
                            type: "string",
                          },
                        },
                        required: ["type", "message"],
                        type: "object",
                      },
                    },
                  },
                },
                500: {},
              },
              summary:
                op.annotations
                  .filter(x => x instanceof DescriptionAnnotation)
                  .map(x => (x as DescriptionAnnotation).text)
                  .join(" ") || undefined,
              tags: ["REST Endpoints"],
            };
          }
        }
      }

      res.write(
        JSON.stringify({
          consumes: ["application/json"],
          definitions,
          info: {},
          openapi: "3.0.3",
          paths,
          produces: ["application/json"],
          schemes: ["https"],
        }),
      );
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
    }

    res.end();
  });
}
