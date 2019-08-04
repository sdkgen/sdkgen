import { AstRoot, EnumType, Field, FunctionOperation, StringPrimitiveType, TypeDefinition, VoidPrimitiveType } from "../ast";
import { CheckMultipleDeclarationVisitor } from "./1_check_multiple_declaration";
import { MatchTypeDefinitionsVisitor } from "./2_match_type_definitions";
import { CheckNoRecursiveTypesVisitor } from "./3_check_no_recursive_types";
import { CheckDontReturnSecretVisitor } from "./4_check_dont_return_secret";
import { CheckNamingForGettersReturningBoolVisitor } from "./5_check_naming_for_getters_returning_bool";
import { GiveStructAndEnumNamesVisitor } from "./6_give_struct_and_enum_names";
import { CheckEmptyStructOrEnumVisitor } from "./7_check_empty_struct_or_enum";
import { CollectStructAndEnumTypesVisitor } from "./8_collect_struct_and_enum_types";
import { ApplyStructSpreadsVisitor } from "./9_apply_struct_spreads";

export class SemanticError extends Error {}

export function analyse(root: AstRoot) {
    root.errors.push("Fatal");
    root.errors.push("Connection");

    const errorTypesEnum = new EnumType(root.errors);
    const errorTypesEnumDef = new TypeDefinition("ErrorType", errorTypesEnum);
    root.typeDefinitions.push(errorTypesEnumDef);

    const pingOp = new FunctionOperation("ping", [], new StringPrimitiveType);
    root.operations.push(pingOp);

    new CheckMultipleDeclarationVisitor(root).process();
    new MatchTypeDefinitionsVisitor(root).process();
    new CheckNoRecursiveTypesVisitor(root).process();
    new CheckDontReturnSecretVisitor(root).process();
    new CheckNamingForGettersReturningBoolVisitor(root).process();
    new GiveStructAndEnumNamesVisitor(root).process();
    new CheckEmptyStructOrEnumVisitor(root).process();
    new CollectStructAndEnumTypesVisitor(root).process();
    new ApplyStructSpreadsVisitor(root).process();
}
