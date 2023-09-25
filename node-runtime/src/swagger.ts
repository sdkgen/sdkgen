import type { ErrorNode, Type } from "@sdkgen/parser";
import {
  StatusCodeAnnotation,
  ThrowsAnnotation,
  DecimalPrimitiveType,
  JsonPrimitiveType,
  ArrayType,
  Base64PrimitiveType,
  BigIntPrimitiveType,
  BoolPrimitiveType,
  BytesPrimitiveType,
  CnpjPrimitiveType,
  CpfPrimitiveType,
  DatePrimitiveType,
  DateTimePrimitiveType,
  DescriptionAnnotation,
  EmailPrimitiveType,
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
  TypeReference,
  UIntPrimitiveType,
  UrlPrimitiveType,
  UuidPrimitiveType,
  VoidPrimitiveType,
} from "@sdkgen/parser";
import type { JSONSchema } from "json-schema-typed";
import staticFilesHandler from "serve-handler";
import { getAbsoluteFSPath as getSwaggerUiAssetPath } from "swagger-ui-dist";

import type { BaseApiConfig } from "./api-config";
import type { SdkgenHttpServer } from "./http-server";

const swaggerUiAssetPath = getSwaggerUiAssetPath();

function objectFromEntries<T>(entries: Array<[string, T]>) {
  return Object.assign({}, ...Array.from(entries, ([k, v]) => ({ [k]: v }))) as Record<string, T>;
}

function typeToSchema(definitions: Record<string, JSONSchema | undefined>, type: Type): JSONSchema & object {
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
      additionalProperties: false,
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
      format: "byte" as never,
      type: "string",
    };
  } else if (type instanceof IntPrimitiveType) {
    return {
      format: "int32" as never,
      type: "integer",
    };
  } else if (type instanceof UIntPrimitiveType) {
    return {
      format: "int32" as never,
      minimum: 0,
      type: "integer",
    };
  } else if (type instanceof MoneyPrimitiveType) {
    return {
      format: "int64" as never,
      type: "integer",
    };
  } else if (type instanceof FloatPrimitiveType) {
    return {
      type: "number",
    };
  } else if (type instanceof EmailPrimitiveType) {
    return {
      type: "string",
    };
  } else if (type instanceof BigIntPrimitiveType) {
    return {
      type: "string",
    };
  } else if (type instanceof DecimalPrimitiveType) {
    return {
      type: "string",
    };
  } else if (type instanceof JsonPrimitiveType) {
    return {};
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

    return { $ref: `#/components/schemas/${type.name}` };
  }

  throw new Error(`Unhandled type ${type.constructor.name}`);
}

function getSwaggerJson<ExtraContextT>(apiConfig: BaseApiConfig<ExtraContextT>) {
  const schemas: Record<string, JSONSchema | undefined> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paths: Record<string, any> = {};

  for (const op of apiConfig.ast.operations) {
    const throwAnnotations = op.annotations.filter(ann => ann instanceof ThrowsAnnotation) as ThrowsAnnotation[];
    let possibleErrors = throwAnnotations.map(ann => apiConfig.ast.errors.find(err => err.name === ann.error)).filter(x => x) as ErrorNode[];

    if (possibleErrors.length === 0) {
      possibleErrors = apiConfig.ast.errors;
    }

    const errorsByStatus = new Map<number, ErrorNode[]>();

    for (const error of possibleErrors) {
      const statusAnnotation = error.annotations.find(ann => ann instanceof StatusCodeAnnotation) as StatusCodeAnnotation | undefined;
      const statusCode = statusAnnotation ? statusAnnotation.statusCode : error.name === "Fatal" ? 500 : 400;

      const errorList = errorsByStatus.get(statusCode) ?? [];

      errorList.push(error);
      errorsByStatus.set(statusCode, errorList);
    }

    const errorResponses = Object.fromEntries(
      [...errorsByStatus.entries()].map(([status, errors]) => [
        status,
        {
          description: errors
            .map(error => error.name)
            .sort((a, b) => a.localeCompare(b))
            .join("<br>"),
          content: {
            "application/json": {
              schema: {
                anyOf: errors.map(error => ({
                  properties: {
                    message: {
                      type: "string",
                    },
                    type: {
                      enum: [error.name],
                      type: "string",
                    },
                    ...(error.dataType instanceof VoidPrimitiveType
                      ? {}
                      : {
                          data: typeToSchema(schemas, error.dataType),
                        }),
                  },
                  required: ["type", "message", ...(error.dataType instanceof VoidPrimitiveType ? [] : ["data"])],
                  type: "object",
                  additionalProperties: false,
                })),
              },
            },
          },
        },
      ]),
    );

    for (const ann of op.annotations) {
      if (ann instanceof RestAnnotation) {
        if (!paths[ann.path]) {
          paths[ann.path] = {};
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        paths[ann.path][ann.method.toLowerCase()] = {
          operationId: op.name,
          parameters: [
            ...ann.pathVariables.map(name => ({
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              arg: op.args.find(arg => arg.name === name)!,
              location: "path",
              name,
            })),
            ...ann.queryVariables.map(name => ({
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              arg: op.args.find(arg => arg.name === name)!,
              location: "query",
              name,
            })),
            ...[...ann.headers.entries()].map(([header, name]) => ({
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
            schema: typeToSchema(schemas, arg.type),
          })),
          requestBody: ann.bodyVariable
            ? {
                content: {
                  ...(() => {
                    const bodyType = op.args.find(arg => arg.name === ann.bodyVariable)?.type;

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
                      bodyType instanceof EmailPrimitiveType ||
                      bodyType instanceof HtmlPrimitiveType ||
                      bodyType instanceof UuidPrimitiveType ||
                      bodyType instanceof HexPrimitiveType ||
                      bodyType instanceof BytesPrimitiveType ||
                      bodyType instanceof Base64PrimitiveType
                      ? {
                          [bodyType instanceof HtmlPrimitiveType ? "text/html" : "text/plain"]: {
                            schema: typeToSchema(schemas, bodyType),
                          },
                        }
                      : {};
                  })(),
                  "application/json": {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    schema: typeToSchema(schemas, op.args.find(arg => arg.name === ann.bodyVariable)!.type),
                  },
                },
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
                    description: "",
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
                          op.returnType instanceof EmailPrimitiveType ||
                          op.returnType instanceof UuidPrimitiveType ||
                          op.returnType instanceof HexPrimitiveType ||
                          op.returnType instanceof BytesPrimitiveType ||
                          op.returnType instanceof Base64PrimitiveType
                          ? {
                              "text/plain": {
                                schema: typeToSchema(schemas, op.returnType),
                              },
                            }
                          : {};
                      })(),
                      "application/json": {
                        schema: typeToSchema(schemas, op.returnType),
                      },
                    },
                  },
                }),
            ...errorResponses,
          },
          summary:
            op.annotations
              .filter(x => x instanceof DescriptionAnnotation)
              .map(x => (x as DescriptionAnnotation).text)
              .join(" ") || undefined,
          tags: [ann.path.split("/")[1]],
        };
      }
    }
  }

  const securitySchemes = {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
    },
  };

  const security = [
    {
      bearerAuth: [],
    },
  ];

  return {
    openapi: "3.0.0",
    info: {
      title: "",
      version: "",
    },
    paths,
    components: {
      schemas,
      securitySchemes,
    },
    security,
  };
}

export function setupSwagger<ExtraContextT>(server: SdkgenHttpServer<ExtraContextT>): void {
  server.addHttpHandler("GET", "/swagger", (req, res) => {
    if (!server.introspection) {
      res.statusCode = 404;
      res.end();
      return;
    }

    res.setHeader("content-type", "text/html");
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

                    .topbar {
                        display: none !important;
                    }
                </style>
            </head>

            <body>
                <div id="swagger-ui"></div>
                <script src="swagger/swagger-ui-bundle.js"> </script>
                <script src="swagger/swagger-ui-standalone-preset.js"> </script>
                <script>
                window.onload = function() {
                    window.ui = SwaggerUIBundle({
                        spec: {
                          ...${JSON.stringify(getSwaggerJson(server.apiConfig))},
                          servers: [{ url: location.origin + location.pathname.replace(/\\/swagger$/, "") }]
                        },
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

  server.addHttpHandler("GET", /^\/swagger.*/u, (req, res) => {
    if (!server.introspection) {
      res.statusCode = 404;
      res.end();
      return;
    }

    if (req.url) {
      req.url = req.url.replace(/\/swagger/u, "");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    staticFilesHandler(req, res, {
      cleanUrls: false,
      directoryListing: false,
      etag: true,
      public: swaggerUiAssetPath,
    }).catch(e => {
      console.error(e);
      res.statusCode = 500;
      res.write(`${e}`);
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
      res.write(JSON.stringify(getSwaggerJson(server.apiConfig)));
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
    }

    res.end();
  });
}
