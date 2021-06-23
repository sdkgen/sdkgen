import type { AstRoot } from "../ast";
import { ErrorNode, VoidPrimitiveType } from "../ast";
import { CheckMultipleDeclarationVisitor } from "./01_check_multiple_declaration";
import { MatchTypeDefinitionsVisitor } from "./02_match_type_definitions";
import { CheckDontReturnSecretVisitor } from "./03_check_dont_return_secret";
import { CheckNamingForGettersReturningBoolVisitor } from "./04_check_naming_for_getters_returning_bool";
import { GiveStructAndEnumNamesVisitor } from "./05_give_struct_and_enum_names";
import { CheckEmptyStructOrEnumVisitor } from "./06_check_empty_struct_or_enum";
import { CollectStructAndEnumTypesVisitor } from "./07_collect_struct_and_enum_types";
import { ApplyStructSpreadsVisitor } from "./08_apply_struct_spreads";
import { ValidateAnnotationsVisitor } from "./09_validate_annotations";

export function analyse(root: AstRoot): void {
  if (!root.errors.some(error => error.name === "Fatal")) {
    root.errors.push(new ErrorNode("Fatal", new VoidPrimitiveType()));
  }

  new CheckMultipleDeclarationVisitor(root).process();
  new MatchTypeDefinitionsVisitor(root).process();
  new CheckDontReturnSecretVisitor(root).process();
  new CheckNamingForGettersReturningBoolVisitor(root).process();
  new GiveStructAndEnumNamesVisitor(root).process();
  new CheckEmptyStructOrEnumVisitor(root).process();
  new CollectStructAndEnumTypesVisitor(root).process();
  new ApplyStructSpreadsVisitor(root).process();
  new ValidateAnnotationsVisitor(root).process();
}
