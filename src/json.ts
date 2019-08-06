import { ArrayType, AstRoot, EnumType, Field, FunctionOperation, Operation, OptionalType, Options, StructType, Type, TypeDefinition, TypeReference } from "./ast";
import { analyse } from "./semantic/analyser";
import { primitiveToAstClass } from "./utils";

interface TypeTable {
    [name: string]: TypeDescription
}

interface FunctionTable {
    [name: string]: {
        args: {
            [arg: string]: TypeDescription
        },
        ret: TypeDescription
    }
}

export type TypeDescription = string | string[] | { [name: string]: TypeDescription }

export interface AstJson {
    typeTable: TypeTable
    functionTable: FunctionTable
}

export function astToJson(ast: AstRoot) {
    const typeTable: TypeTable = {};

    for (const { name, fields } of ast.structTypes) {
        const obj: any = typeTable[name] = {};
        for (const field of fields) {
            obj[field.name] = field.type.name;
        }
    }

    for (const { name, values } of ast.enumTypes) {
        typeTable[name] = values;
    }

    const functionTable: FunctionTable = {};

    for (const op of ast.operations) {
        const args: any = {};
        for (const arg of op.args) {
            args[arg.name] = arg.type.name
        }
        functionTable[op.prettyName] = {
            args,
            ret: op.returnType.name
        }
    }

    return {
        typeTable,
        functionTable
    };
}

export function jsonToAst(json: AstJson) {
    const operations: Operation[] = [];
    const typeDefinition: TypeDefinition[] = [];
    const errors: string[] = [];
    const options = new Options;

    function processType(description: TypeDescription): Type {
        if (typeof description === "string") {
            const primitiveClass = primitiveToAstClass.get(description);
            if (primitiveClass) {
                return new primitiveClass;
            } else if (description.endsWith("?")) {
                return new OptionalType(processType(description.slice(0, description.length - 1)));
            } else if (description.endsWith("[]")) {
                return new ArrayType(processType(description.slice(0, description.length - 2)));
            } else {
                return new TypeReference(description);
            }
        } else if (Array.isArray(description)) {
            return new EnumType(description);
        } else {
            const fields = Object.keys(description).map(fieldName =>
                new Field(fieldName, processType(description[fieldName]))
            );
            return new StructType(fields, []);
        }
    }

    for (const typeName in json.typeTable) {
        const type = processType(json.typeTable[typeName]);
        if (typeName === "ErrorType" && type instanceof EnumType) {
            errors.push(...type.values);
            continue;
        }
        typeDefinition.push(new TypeDefinition(typeName, type));
    }

    for (const functionName in json.functionTable) {
        if (functionName === "ping")
            continue;
        const func = json.functionTable[functionName];
        const args = Object.keys(func.args).map(argName =>
            new Field(argName, processType(func.args[argName]))
        );

        operations.push(new FunctionOperation(functionName, args, processType(func.ret)));
    }

    const ast = new AstRoot(typeDefinition, operations, options, errors);
    analyse(ast);
    return ast;
}
