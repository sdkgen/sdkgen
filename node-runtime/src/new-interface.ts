/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { inspect } from "util";

import type { AstJson } from "@sdkgen/parser";

import type { Middleware } from "./api-config.js";
import { BaseApiConfig } from "./api-config.js";
import type { Context } from "./context.js";
import { decode, encode } from "./encode-decode.js";
import { SdkgenHttpServer } from "./http-server.js";
import type { DefaultExtraContext } from "./index.js";
import { apiTestWrapper } from "./test-wrapper.js";
import type { DeepReadonly } from "./utils.js";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const Uuid: unique symbol = Symbol("Uuid");
// eslint-disable-next-line @typescript-eslint/naming-convention
export const Int: unique symbol = Symbol("Int");
// eslint-disable-next-line @typescript-eslint/naming-convention
export const UInt: unique symbol = Symbol("UInt");

class ApiConfig<ExtraContextT = unknown> extends BaseApiConfig<ExtraContextT> {
  constructor(
    public astJson: DeepReadonly<AstJson>,
    public fn: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [name: string]: ((ctx: Context & ExtraContextT, args: any) => Promise<any>) | undefined;
    },
    public readonly middlewares: Array<Middleware<ExtraContextT>>,
  ) {
    super();
  }
}

export interface SdkgenConfig<ExtraContextT> {
  port?: number;
  endpoints: Record<string, SdkgenEndpoint<any, any>>;
  middlewares?: Array<Middleware<ExtraContextT>>;
  extraContext: ExtraContextT;
}

class CustomTypeBaseClass {
  static readonly mark: unique symbol = Symbol();
  static readonly fields: Record<string, TypeSpec> = {};
}

type CustomTypeRegistry = Map<string, typeof CustomTypeBaseClass>;

function getSdkgenType(type: TypeSpec, registry: CustomTypeRegistry): string {
  let normalizedType: any;

  if (
    type === String ||
    type === Uuid ||
    type === Number ||
    type === Boolean ||
    type === BigInt ||
    type === Int ||
    type === UInt ||
    type === undefined
  ) {
    normalizedType = { type };
  } else if (type instanceof Function && (type as typeof CustomTypeBaseClass).mark === CustomTypeBaseClass.mark) {
    normalizedType = { type };
  } else if (Array.isArray(type)) {
    normalizedType = { type: Array, of: type[0] };
  } else {
    normalizedType = type;
  }

  if (normalizedType.nullable === true) {
    delete normalizedType.nullable;
    return `${getSdkgenType(normalizedType, registry)}?`;
  }

  if (normalizedType.type === String) {
    return "string";
  } else if (normalizedType.type === Number) {
    return "float";
  } else if (normalizedType.type === Int) {
    return "int";
  } else if (normalizedType.type === UInt) {
    return "uint";
  } else if (normalizedType.type === Uuid) {
    return "uuid";
  } else if (normalizedType.type === Boolean) {
    return "bool";
  } else if (normalizedType.type === BigInt) {
    return "bigint";
  } else if (normalizedType.type === undefined) {
    return "void";
  } else if (normalizedType.type === Array) {
    return `${getSdkgenType(normalizedType.of, registry)}[]`;
  } else if (normalizedType.type instanceof Function && (normalizedType.type as typeof CustomTypeBaseClass).mark === CustomTypeBaseClass.mark) {
    for (let counter = 1; ; ++counter) {
      const name = counter === 1 ? `${normalizedType.type.name}` : `${normalizedType.type.name}${counter}`;
      const existing = registry.get(name);

      if (existing === normalizedType.type) {
        return name;
      } else if (existing) {
        continue;
      }

      registry.set(name, normalizedType.type);
      return name;
    }
  }

  throw new Error(`Unhandled sdkgen type: ${inspect(normalizedType)}`);
}

function getTypeTableFromRegistry(registry: CustomTypeRegistry) {
  const typeTable: AstJson["typeTable"] = {};

  let newNamesFound = true;

  while (newNamesFound) {
    newNamesFound = false;

    for (const [name, type] of registry) {
      if (name in typeTable) {
        continue;
      }

      newNamesFound = true;

      typeTable[name] = Object.fromEntries(
        Object.entries(type.fields).map(([fieldName, fieldType]) => [fieldName, getSdkgenType(fieldType, registry)]),
      );
    }
  }

  return typeTable;
}

function createApiConfig<ExtraContextT>(config: SdkgenConfig<ExtraContextT>) {
  const astJson: AstJson = {
    functionTable: {},
    typeTable: {},
    errors: [],
    annotations: {},
  };

  const handlers: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [name: string]: (ctx: Context & ExtraContextT, args: any) => Promise<any>;
  } = {};

  const registry = new Map<string, typeof CustomTypeBaseClass>();

  for (const [name, endpoint] of Object.entries(config.endpoints)) {
    astJson.functionTable[name] = {
      args: Object.fromEntries(Object.entries(endpoint.options.args ?? {}).map(([arg, type]) => [arg, getSdkgenType(type, registry)])),
      ret: getSdkgenType(endpoint.options.return, registry),
    };
    handlers[name] = endpoint.handler;
  }

  astJson.typeTable = getTypeTableFromRegistry(registry);

  return new ApiConfig<ExtraContextT>(astJson, handlers, config.middlewares ?? []);
}

export async function startSdkgenServer<ExtraContextT>(config: SdkgenConfig<ExtraContextT>) {
  const api = createApiConfig(config);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  const server = new SdkgenHttpServer<ExtraContextT>(api, config.extraContext as any);

  await server.listen(config.port ?? 80);
}

type CallableEndpoint<ExtraContextT, Endpoint extends SdkgenEndpoint<unknown, unknown>> = Endpoint extends SdkgenEndpoint<infer Args, infer Return>
  ? (ctx: Partial<Context & ExtraContextT>, args: Args) => Promise<Return>
  : never;

type CallableEndpoints<ExtraContextT, Endpoints extends Record<string, SdkgenEndpoint<unknown, unknown>>> = {
  [EndpointName in keyof Endpoints]: CallableEndpoint<ExtraContextT, Endpoints[EndpointName]>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSdkgenTestClient<ConfigT extends SdkgenConfig<any>>(config: ConfigT) {
  const api = createApiConfig(config);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return apiTestWrapper(api, config.extraContext).fn as unknown as CallableEndpoints<ConfigT["extraContext"], ConfigT["endpoints"]>;
}

export function createSdkgenType<Fields extends Record<string, TypeSpec>>(fields: Fields) {
  const customType = class extends CustomTypeBaseClass {
    static fields = fields;
  };

  return customType as unknown as { mark: typeof CustomTypeBaseClass["mark"]; fields: Fields } & (new () => CustomTypeBaseClass &
    GenerateTypingFromFields<Fields>);
}

export type TypeSpec =
  | typeof String
  | typeof Boolean
  | typeof Number
  | typeof Int
  | typeof UInt
  | typeof BigInt
  | typeof CustomTypeBaseClass
  | typeof Uuid
  | undefined
  | [TypeSpec]
  | ((
      | { type: typeof String; minLength?: number; maxLength?: number; pattern?: RegExp }
      | { type: typeof Boolean }
      | { type: typeof Number; min?: number; max?: number }
      | { type: typeof Int; min?: number; max?: number }
      | { type: typeof UInt; min?: number; max?: number }
      | { type: typeof BigInt; min?: bigint; max?: bigint }
      | { type: typeof CustomTypeBaseClass }
      | { type: typeof Uuid }
      | { type: undefined }
      | { type: [TypeSpec]; minLength?: number; maxLength?: number }
      | { type: typeof Array; of: TypeSpec; minLength?: number; maxLength?: number }
    ) & { nullable?: true });

interface ApiEndpointOptions {
  args?: Record<string, TypeSpec>;
  return?: TypeSpec;
}

export type GenerateTyping<Type> = Type extends { nullable: true }
  ? null | GenerateTyping<Omit<Type, "nullable">>
  : Type extends typeof String | { type: typeof String }
  ? string
  : Type extends typeof Boolean | { type: typeof Boolean }
  ? boolean
  : Type extends typeof Number | { type: typeof Number }
  ? number
  : Type extends typeof Int | { type: typeof Int }
  ? number
  : Type extends typeof UInt | { type: typeof UInt }
  ? number
  : Type extends typeof BigInt | { type: typeof BigInt }
  ? bigint
  : Type extends typeof Uuid | { type: typeof Uuid }
  ? string
  : Type extends [infer Inner]
  ? Array<GenerateTyping<Inner>>
  : Type extends { type: typeof Array; of: infer Inner }
  ? Array<GenerateTyping<Inner>>
  : Type extends { type: [infer Inner] }
  ? Array<GenerateTyping<Inner>>
  : Type extends typeof CustomTypeBaseClass
  ? InstanceType<Type>
  : Type extends { type: typeof CustomTypeBaseClass }
  ? InstanceType<Type["type"]>
  : undefined extends Type
  ? void
  : { $error: "❌ unrecognized type" };

export type GenerateTypingFromFields<Fields extends Record<string, TypeSpec>> = {
  [Field in keyof Fields]: GenerateTyping<Fields[Field]>;
};

class SdkgenEndpoint<Args, Return> {
  constructor(
    public readonly options: ApiEndpointOptions,
    public readonly handler: (ctx: InferContext<DefaultExtraContext>, args: Args) => Promise<Return>,
  ) {}
}

type InferContext<Obj> = Obj extends { ctx: unknown } ? Obj["ctx"] & Context : Context;

type GetEndpointArgs<Options extends ApiEndpointOptions> = Options extends { args: Record<string, TypeSpec> }
  ? GenerateTypingFromFields<Options["args"]>
  : {};

type GetEndpointReturn<Options extends ApiEndpointOptions> = GenerateTyping<Options["return"]>;

export function createSdkgenEndpoint<Options extends ApiEndpointOptions>(
  options: Options,
  handler: (ctx: InferContext<DefaultExtraContext>, args: GetEndpointArgs<Options>) => Promise<GetEndpointReturn<Options>>,
) {
  return new SdkgenEndpoint<GetEndpointArgs<Options>, GetEndpointReturn<Options>>(options, handler);
}

export type JsonArray = JsonValue[];

export type JsonObject = {
  [K in string]?: JsonValue;
};

export type JsonPrimitive = boolean | null | number | string;

export type JsonValue = JsonArray | JsonObject | JsonPrimitive;

export function encodeValue<Type extends TypeSpec>(type: Type, value: GenerateTyping<Type>): JsonValue {
  const registry = new Map<string, typeof CustomTypeBaseClass>();

  const legacyType = getSdkgenType(type, registry);
  const typeTable = getTypeTableFromRegistry(registry);

  return encode(typeTable, "", legacyType, value);
}

export function decodeValue<Type extends TypeSpec>(type: Type, value: JsonValue): GenerateTyping<Type> {
  const registry = new Map<string, typeof CustomTypeBaseClass>();

  const legacyType = getSdkgenType(type, registry);
  const typeTable = getTypeTableFromRegistry(registry);

  return decode(typeTable, "", legacyType, value) as GenerateTyping<Type>;
}
