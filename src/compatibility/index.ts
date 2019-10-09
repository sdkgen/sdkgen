import { ArrayType, AstRoot, Base64PrimitiveType, BytesPrimitiveType, CepPrimitiveType, CnpjPrimitiveType, CpfPrimitiveType, DatePrimitiveType, DateTimePrimitiveType, EmailPrimitiveType, EnumType, FloatPrimitiveType, HexPrimitiveType, IntPrimitiveType, MoneyPrimitiveType, OptionalType, PhonePrimitiveType, SafeHtmlPrimitiveType, StringPrimitiveType, StructType, Type, TypeReference, UIntPrimitiveType, UrlPrimitiveType, UuidPrimitiveType, XmlPrimitiveType } from "../ast";

// 1 -> Old version
// 2 -> New version

function checkClientToServer(path: string, issues: string[], t1: Type, t2: Type) {
    if (t1 instanceof TypeReference) {
        checkClientToServer(path, issues, t1.type, t2);
        return;
    }

    if (t2 instanceof TypeReference) {
        checkClientToServer(path, issues, t1, t2.type);
        return;
    }

    if (!(t1 instanceof OptionalType) && t2 instanceof OptionalType) {
        checkClientToServer(path, issues, t1, t2.base);
        return;
    }

    if (t1 instanceof OptionalType && t2 instanceof OptionalType) {
        checkClientToServer(path, issues, t1.base, t2.base);
        return;
    }

    if (t1 instanceof OptionalType && !(t2 instanceof OptionalType)) {
        issues.push(`${path} was optional, but now it isn't. If the client sends a null, it will be invalid. Add the optional annotation back.`);
        checkClientToServer(path, issues, t1.base, t2);
        return;
    }

    if (t1 instanceof ArrayType && t2 instanceof ArrayType) {
        checkClientToServer(path, issues, t1.base, t2.base);
        return;
    }

    if (t1 instanceof StructType && t2 instanceof StructType) {
        for (const field2 of t2.fields) {
            const field1 = t1.fields.find(field1 => field1.name === field2.name);
            if (!field1) {
                if (field2.type instanceof OptionalType) {
                    continue;
                } else {
                    issues.push(`${path}.${field2.name} didn't exist before and isn't optional. Make it optional.`);
                    continue;
                }
            }
            checkClientToServer(`${path}.${field1.name}`, issues, field1.type, field2.type);
        }
        return;
    }

    if (
        (t1 instanceof UIntPrimitiveType && t2 instanceof IntPrimitiveType) ||
        (t1 instanceof IntPrimitiveType && t2 instanceof FloatPrimitiveType) ||
        (t1 instanceof MoneyPrimitiveType && t2 instanceof IntPrimitiveType) ||
        (t1 instanceof MoneyPrimitiveType && t2 instanceof UIntPrimitiveType) ||
        (t1 instanceof UuidPrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof XmlPrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof SafeHtmlPrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof DatePrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof DateTimePrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof CpfPrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof CnpjPrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof HexPrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof Base64PrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof BytesPrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof BytesPrimitiveType && t2 instanceof Base64PrimitiveType) ||
        (t1 instanceof UrlPrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof CepPrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof PhonePrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof EmailPrimitiveType && t2 instanceof StringPrimitiveType) ||
        (t1 instanceof EnumType && t2 instanceof StringPrimitiveType)
    ) {
        return;
    }

    if (t1 instanceof EnumType && t2 instanceof EnumType) {
        for (const value of t1.values) {
            if (!t2.values.map(v => v.value).includes(value.value)) {
                issues.push(`The enum at ${path} used to accept the value "${value}" that doesn't exist now. Clients that send it will fail.`);
            }
        }
        return;
    }

    if (t1.constructor.name === t2.constructor.name) {
        return;
    }

    issues.push(`${path} was ${t1.name} and now it is ${t2.name}. They are not compatible.`);
}

function checkServerToClient(path: string, issues: string[], t1: Type, t2: Type) {
    if (t1 instanceof TypeReference) {
        checkServerToClient(path, issues, t1.type, t2);
        return;
    }

    if (t2 instanceof TypeReference) {
        checkServerToClient(path, issues, t1, t2.type);
        return;
    }

    if (t1 instanceof OptionalType && !(t2 instanceof OptionalType)) {
        checkServerToClient(path, issues, t1.base, t2);
        return;
    }

    if (t1 instanceof OptionalType && t2 instanceof OptionalType) {
        checkServerToClient(path, issues, t1.base, t2.base);
        return;
    }

    if (!(t1 instanceof OptionalType) && t2 instanceof OptionalType) {
        issues.push(`${path} wasn't optional, but now it is. If the client receives a null, it will crash. Remove the optional annotation.`);
        checkServerToClient(path, issues, t1, t2.base);
        return;
    }

    if (t1 instanceof ArrayType && t2 instanceof ArrayType) {
        checkServerToClient(path, issues, t1.base, t2.base);
        return;
    }

    if (t1 instanceof StructType && t2 instanceof StructType) {
        for (const field1 of t1.fields) {
            const field2 = t2.fields.find(field2 => field2.name === field1.name);
            if (!field2) {
                if (field1.type instanceof OptionalType) {
                    continue;
                } else {
                    issues.push(`${path}.${field1.name} used to exist with type ${field1.type.name}, but it's now missing. Add it back.`);
                    continue;
                }
            }
            checkServerToClient(`${path}.${field1.name}`, issues, field1.type, field2.type);
        }
        return;
    }

    if (
        (t1 instanceof IntPrimitiveType && t2 instanceof UIntPrimitiveType) ||
        (t1 instanceof FloatPrimitiveType && t2 instanceof IntPrimitiveType) ||
        (t1 instanceof IntPrimitiveType && t2 instanceof MoneyPrimitiveType) ||
        (t1 instanceof UIntPrimitiveType && t2 instanceof MoneyPrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof UuidPrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof XmlPrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof SafeHtmlPrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof DatePrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof DateTimePrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof CpfPrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof CnpjPrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof HexPrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof Base64PrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof BytesPrimitiveType) ||
        (t1 instanceof Base64PrimitiveType && t2 instanceof BytesPrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof UrlPrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof CepPrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof PhonePrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof EmailPrimitiveType) ||
        (t1 instanceof StringPrimitiveType && t2 instanceof EnumType)
    ) {
        return;
    }

    if (t1 instanceof EnumType && t2 instanceof EnumType) {
        for (const value of t2.values) {
            if (!t1.values.map(v => v.value).includes(value.value)) {
                issues.push(`The enum at ${path} now has the value "${value}" that didn't exist before. Client will crash if it receives it`);
            }
        }
        return;
    }

    if (t1.constructor.name === t2.constructor.name) {
        return;
    }

    issues.push(`${path} was ${t1.name} and now it is ${t2.name}. They are not compatible.`);
}

export function compatibilityIssues(ast1: AstRoot, ast2: AstRoot) {
    const issues: string[] = [];

    for (const op1 of ast1.operations) {
        const op2 = ast2.operations.find(op2 => op2.prettyName === op1.prettyName);
        if (!op2) {
            issues.push(`function ${op1.prettyName} used to exist, but it's now missing. Add it back.`);
            continue;
        }
        checkServerToClient(`${op1.prettyName}.ret`, issues, op1.returnType, op2.returnType);
        for (const arg2 of op2.args) {
            const arg1 = op1.args.find(arg1 => arg1.name === arg2.name);
            if (!arg1) {
                if (arg2.type instanceof OptionalType) {
                    continue;
                } else {
                    issues.push(`${op1.prettyName}.args.${arg2.name} didn't exist before and isn't optional. Make it optional.`);
                    continue;
                }
            }
            checkClientToServer(`${op1.prettyName}.args.${arg1.name}`, issues, arg1.type, arg2.type);
        }
    }

    return issues;
}
