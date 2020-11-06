import { AstRoot } from "../ast";
import { CheckMultipleDeclarationVisitor } from "./01_check_multiple_declaration";
import { MatchTypeDefinitionsVisitor } from "./02_match_type_definitions";
import { CheckNoRecursiveTypesVisitor } from "./03_check_no_recursive_types";
import { CheckDontReturnSecretVisitor } from "./04_check_dont_return_secret";
import { CheckNamingForGettersReturningBoolVisitor } from "./05_check_naming_for_getters_returning_bool";
import { GiveStructAndEnumNamesVisitor } from "./06_give_struct_and_enum_names";
import { CheckEmptyStructOrEnumVisitor } from "./07_check_empty_struct_or_enum";
import { CollectStructAndEnumTypesVisitor } from "./08_collect_struct_and_enum_types";
import { ApplyStructSpreadsVisitor } from "./09_apply_struct_spreads";
import { ValidateAnnotationsVisitor } from "./10_validate_annotations";

export class SemanticError extends Error {}

export function analyse(root: AstRoot): void {
  root.errors.push("Fatal");
  root.errors = [...new Set(root.errors)];

  new CheckMultipleDeclarationVisitor(root).process();
  new MatchTypeDefinitionsVisitor(root).process();
  new CheckNoRecursiveTypesVisitor(root).process();
  new CheckDontReturnSecretVisitor(root).process();
  new CheckNamingForGettersReturningBoolVisitor(root).process();
  new GiveStructAndEnumNamesVisitor(root).process();
  new CheckEmptyStructOrEnumVisitor(root).process();
  new CollectStructAndEnumTypesVisitor(root).process();
  new ApplyStructSpreadsVisitor(root).process();
  new ValidateAnnotationsVisitor(root).process();
}
