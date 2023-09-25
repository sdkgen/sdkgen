import { Injectable } from "@angular/core";
import { SdkgenError, SdkgenErrorWithData, SdkgenHttpClient } from "@sdkgen/browser-runtime";
import {
  AstJson,
  Field,
  Type,
  AstRoot,
  ArrayType,
  Base64PrimitiveType,
  BigIntPrimitiveType,
  BoolPrimitiveType,
  BytesPrimitiveType,
  CnpjPrimitiveType,
  CpfPrimitiveType,
  DatePrimitiveType,
  DateTimePrimitiveType,
  EmailPrimitiveType,
  FloatPrimitiveType,
  HexPrimitiveType,
  HtmlPrimitiveType,
  IntPrimitiveType,
  JsonPrimitiveType,
  MoneyPrimitiveType,
  OptionalType,
  StringPrimitiveType,
  StructType,
  TypeReference,
  UIntPrimitiveType,
  UrlPrimitiveType,
  UuidPrimitiveType,
  VoidPrimitiveType,
  XmlPrimitiveType,
  EnumType,
  DecimalPrimitiveType,
} from "@sdkgen/parser";
import { BehaviorSubject } from "rxjs";

import { DeepReadonly } from "../../../parser/src/utils";

export interface SdkgenState {
  astRoot: AstRoot;
  astJson: AstJson;
  url: string;
}

@Injectable({ providedIn: "root" })
export class SdkgenService {
  public state$ = new BehaviorSubject<SdkgenState | null>(null);

  public buildJsonObject(args: Field[], visited = new Set<string>()) {
    const getTypeValue = (type: Type): any => {
      switch (type.constructor) {
        case StringPrimitiveType:
          return ``;

        case IntPrimitiveType:
        case UIntPrimitiveType:
        case FloatPrimitiveType:
        case BigIntPrimitiveType:
        case MoneyPrimitiveType:
          return 0;

        case DecimalPrimitiveType:
          return "0.00";

        case DatePrimitiveType:
          return new Date().toJSON().substring(0, 10);

        case DateTimePrimitiveType:
          return new Date().toJSON().substring(0, 23);

        case BoolPrimitiveType:
          return Math.random() > 0.5;

        case VoidPrimitiveType:
          return null;

        case CpfPrimitiveType:
          return "000.000.001-91";

        case CnpjPrimitiveType:
          return "00.000.001/0001-91";

        case EmailPrimitiveType:
          return "joao@acme.com";

        case UrlPrimitiveType:
          return "https://www.google.com/";

        case UuidPrimitiveType:
          return "00000000-0000-0000-0000-000000000000";

        case HexPrimitiveType:
          return new Array(32)
            .fill(0)
            .map(() => "0123456789abcdef"[Math.floor(Math.random() * 16)])
            .join("");

        case HtmlPrimitiveType:
          return "<h1>Hello world!</h1>";

        case BytesPrimitiveType:
        case Base64PrimitiveType:
          return "0a=";

        case XmlPrimitiveType:
          return "<xml></xml>";

        case JsonPrimitiveType:
          return {};

        case StructType:
          return visited.has(type.name)
            ? {}
            : this.buildJsonObject((type as StructType).fields, new Set([...visited, type.name]));

        case OptionalType:
          return null;

        case TypeReference:
          return getTypeValue((type as TypeReference).type);

        case ArrayType:
          return [
            getTypeValue((type as ArrayType).base),
            getTypeValue((type as ArrayType).base),
            getTypeValue((type as ArrayType).base),
          ];

        case EnumType:
          return (type as EnumType).values[0].value;

        default:
          return null;
      }
    };

    return args.reduce<any>((cur, arg) => {
      cur[arg.name] = getTypeValue(arg.type);
      return cur;
    }, {});
  }

  public getTypeScriptCode(fn: string, argsObject: any) {
    return `await client.${fn}(${JSON.stringify(argsObject, null, 2)});\n`;
  }

  public buildKotlinString(args: Field[], i = 0) {
    const getTypeValue = (type: Type): any => {
      switch (type.constructor) {
        case StringPrimitiveType:
          return `""`;

        case IntPrimitiveType:
        case UIntPrimitiveType:
        case FloatPrimitiveType:
        case BigIntPrimitiveType:
        case MoneyPrimitiveType:
          return 0;

        case DecimalPrimitiveType:
          return 'BigDecimal("0.00")';

        case DatePrimitiveType:
        case DateTimePrimitiveType:
          return `Calendar.getInstance()`;

        case BoolPrimitiveType:
          return Math.random() > 0.5 ? "true" : "false";

        case VoidPrimitiveType:
          return `null`;

        case CpfPrimitiveType:
          return `"000.000.001-91"`;

        case CnpjPrimitiveType:
          return `"00.000.001/0001-91"`;

        case EmailPrimitiveType:
          return `"joao@acme.com"`;

        case UrlPrimitiveType:
          return `"https://www.google.com/"`;

        case UuidPrimitiveType:
          return `"00000000-0000-0000-0000-000000000000"`;

        case HexPrimitiveType:
          return `"${new Array(32)
            .fill(0)
            .map(() => "0123456789abcdef"[Math.floor(Math.random() * 16)])
            .join("")}"`;

        case HtmlPrimitiveType:
          return `"<h1>Hello world!</h1>"`;

        case BytesPrimitiveType:
        case Base64PrimitiveType:
          return `"0a="`;

        case XmlPrimitiveType:
          return `"<xml></xml>"`;

        case JsonPrimitiveType:
          return `json {}`;

        case StructType:
          return `${type.name}(\n${this.buildKotlinString((type as StructType).fields, i + 1)}\n${"  ".repeat(i + 1)})`;

        case OptionalType:
          return `null`;

        case TypeReference:
          return getTypeValue((type as TypeReference).type);

        case ArrayType:
          /* eslint-disable */
          i++;
          const typeStr = getTypeValue((type as ArrayType).base);
          i--;
          return `arrayOf(\n${"  ".repeat(i + 2)}${typeStr},\n${"  ".repeat(i + 2)}${typeStr}\n${"  ".repeat(i + 1)})`;
        /* eslint-enable */

        case EnumType:
          return `"${(type as EnumType).values[0].value}"`;

        default:
          return `<>()`;
      }
    };

    return args
      .map(arg => {
        return `${"  ".repeat(i + 1)}${getTypeValue(arg.type)}`;
      })
      .join(",\n");
  }

  public getKotlinCode(fn: string, args: Field[]) {
    if (args.length === 0) {
      return `client.${fn}().await();`;
    }

    return `client.${fn}(\n${this.buildKotlinString(args)}\n).await();`;
  }

  public getDartCode(_fn: string, _argsObject: any) {
    return `print("todo");`;
  }

  public getSwiftCode(_fn: string, _argsObject: any) {
    return `print("todo");`;
  }

  public getSdkgenClient(url: string, ast: DeepReadonly<AstJson>) {
    const errorFns = ast.errors.reduce<
      Record<
        string,
        | (new (message: string, data: any) => SdkgenErrorWithData<any>)
        | (new (message: string) => SdkgenError)
        | undefined
      >
    >((acc, cur) => {
      function errorClass(type: string, base: typeof SdkgenError | typeof SdkgenErrorWithData) {
        return eval(`(
          (sup) => class ${type} extends sup {
            type = "${type}";
            message = "";
            ${base === SdkgenErrorWithData ? "data = null;" : ""}

            constructor(message${base === SdkgenErrorWithData ? ", data" : ""}) {
              super(message${base === SdkgenErrorWithData ? ", data" : ""});
              this.message = message;
              ${base === SdkgenErrorWithData ? "this.data = data;" : ""}
              this.toString = () => this.type + ": " + this.message;
            }
          }
        )`)(base);
      }

      if (typeof cur === "string") {
        acc[cur] = errorClass(cur, SdkgenError);
      } else {
        acc[cur[0]] = errorClass(cur[0], SdkgenErrorWithData);
      }

      return acc;
    }, {});

    const clientInstance = new SdkgenHttpClient(url, ast, errorFns);

    return new Proxy(clientInstance, {
      get: (target, name) => {
        if (["baseUrl", "extra", "successHook", "errorHook", "makeRequest"].includes(name.toString())) {
          return clientInstance[name.toString() as keyof SdkgenHttpClient];
        }

        return async (args: any) => clientInstance.makeRequest(name.toString(), args);
      },
    });
  }
}
