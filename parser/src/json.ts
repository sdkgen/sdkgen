import {
    ArrayType,
    AstRoot,
    DescriptionAnnotation,
    EnumType,
    EnumValue,
    Field,
    FunctionOperation,
    Operation,
    OptionalType,
    RestAnnotation,
    StructType,
    ThrowsAnnotation,
    Type,
    TypeDefinition,
    TypeReference,
} from "./ast";
import { analyse } from "./semantic/analyser";
import { primitiveToAstClass } from "./utils";

interface TypeTable {
    [name: string]: TypeDescription;
}

interface FunctionTable {
    [name: string]: {
        args: {
            [arg: string]: TypeDescription;
        };
        ret: TypeDescription;
    };
}

export type TypeDescription = string | string[] | { [name: string]: TypeDescription };

interface AnnotationJson {
    type: string;
    value: any;
}

export interface AstJson {
    typeTable: TypeTable;
    functionTable: FunctionTable;
    errors: string[];
    annotations: { [target: string]: AnnotationJson[] };
}

export function astToJson(ast: AstRoot): AstJson {
    const annotations: { [target: string]: AnnotationJson[] } = {};
    const typeTable: TypeTable = {};

    for (const { name, fields } of ast.structTypes) {
        const obj: any = (typeTable[name] = {});
        for (const field of fields) {
            obj[field.name] = field.type.name;
        }
    }

    for (const { name, values } of ast.enumTypes) {
        typeTable[name] = values.map(v => v.value);
    }

    const functionTable: FunctionTable = {};

    for (const op of ast.operations) {
        const args: any = {};
        for (const arg of op.args) {
            args[arg.name] = arg.type.name;
            for (const ann of arg.annotations) {
                if (ann instanceof DescriptionAnnotation) {
                    const target = `fn.${op.prettyName}.${arg.name}`;
                    const list = (annotations[target] = annotations[target] || []);
                    list.push({ type: "description", value: ann.text });
                }
            }
        }
        functionTable[op.prettyName] = {
            args,
            ret: op.returnType.name,
        };
        for (const ann of op.annotations) {
            const target = `fn.${op.prettyName}`;
            const list = (annotations[target] = annotations[target] || []);
            if (ann instanceof DescriptionAnnotation) {
                list.push({ type: "description", value: ann.text });
            }
            if (ann instanceof ThrowsAnnotation) {
                list.push({ type: "throws", value: ann.error });
            }
            if (ann instanceof RestAnnotation) {
                list.push({
                    type: "rest",
                    value: {
                        method: ann.method,
                        path: ann.path,
                        pathVariables: ann.pathVariables,
                        queryVariables: ann.queryVariables,
                        headers: [...ann.headers.entries()],
                        bodyVariable: ann.bodyVariable,
                    },
                });
            }
        }
    }

    const errors = ast.errors;

    return {
        typeTable,
        functionTable,
        errors,
        annotations,
    };
}

export function jsonToAst(json: AstJson) {
    const operations: Operation[] = [];
    const typeDefinition: TypeDefinition[] = [];
    const errors: string[] = json.errors || [];

    function processType(description: TypeDescription): Type {
        if (typeof description === "string") {
            const primitiveClass = primitiveToAstClass.get(description);
            if (primitiveClass) {
                return new primitiveClass();
            } else if (description.endsWith("?")) {
                return new OptionalType(processType(description.slice(0, description.length - 1)));
            } else if (description.endsWith("[]")) {
                return new ArrayType(processType(description.slice(0, description.length - 2)));
            } else {
                return new TypeReference(description);
            }
        } else if (Array.isArray(description)) {
            return new EnumType(description.map(v => new EnumValue(v)));
        } else {
            const fields = Object.keys(description).map(fieldName => new Field(fieldName, processType(description[fieldName])));
            return new StructType(fields, []);
        }
    }

    for (const typeName in json.typeTable) {
        const type = processType(json.typeTable[typeName]);
        if (typeName === "ErrorType" && type instanceof EnumType) {
            errors.push(...type.values.map(v => v.value));
            continue;
        }
        typeDefinition.push(new TypeDefinition(typeName, type));
    }

    for (const functionName in json.functionTable) {
        const func = json.functionTable[functionName];
        const args = Object.keys(func.args).map(argName => {
            const field = new Field(argName, processType(func.args[argName]));
            const target = `fn.${functionName}.${argName}`;
            for (const annotationJson of json.annotations[target] || []) {
                if (annotationJson.type === "description") {
                    field.annotations.push(new DescriptionAnnotation(annotationJson.value));
                }
            }
            return field;
        });

        const op = new FunctionOperation(functionName, args, processType(func.ret));
        const target = `fn.${functionName}`;
        for (const annotationJson of json.annotations[target] || []) {
            if (annotationJson.type === "description") {
                op.annotations.push(new DescriptionAnnotation(annotationJson.value));
            } else if (annotationJson.type === "throws") {
                op.annotations.push(new ThrowsAnnotation(annotationJson.value));
            } else if (annotationJson.type === "rest") {
                const { method, path, pathVariables, queryVariables, headers, bodyVariable } = annotationJson.value;
                op.annotations.push(new RestAnnotation(method, path, pathVariables, queryVariables, new Map(headers), bodyVariable));
            }
        }

        operations.push(op);
    }

    const ast = new AstRoot(typeDefinition, operations, [...new Set(errors)]);
    analyse(ast);
    return ast;
}
