import type { AstRoot } from "../ast";
import { ErrorNode, VoidPrimitiveType } from "../ast";
import { CheckMultipleDeclarationVisitor } from "./01_check_multiple_declaration";
import { MatchTypeDefinitionsVisitor } from "./02_match_type_definitions";
import { CheckDontReturnSecretVisitor } from "./03_check_dont_return_secret";
import { GiveStructAndEnumNamesVisitor } from "./04_give_struct_and_enum_names";
import { CheckEmptyStructOrEnumVisitor } from "./05_check_empty_struct_or_enum";
import { CollectStructAndEnumTypesVisitor } from "./06_collect_struct_and_enum_types";
import { ApplyStructSpreadsVisitor } from "./07_apply_struct_spreads";
import { ValidateAnnotationsVisitor } from "./08_validate_annotations";
import { ValidateRecursiveTypes } from "./09_validate_recursive_types";

export function analyse(root: AstRoot): void {
  if (!root.errors.some(error => error.name === "Fatal")) {
    root.errors.push(new ErrorNode("Fatal", new VoidPrimitiveType()));
  }

  new CheckMultipleDeclarationVisitor(root).process();
  new MatchTypeDefinitionsVisitor(root).process();
  new CheckDontReturnSecretVisitor(root).process();
  new GiveStructAndEnumNamesVisitor(root).process();
  new CheckEmptyStructOrEnumVisitor(root).process();
  new CollectStructAndEnumTypesVisitor(root).process();
  new ApplyStructSpreadsVisitor(root).process();
  new ValidateAnnotationsVisitor(root).process();
  new ValidateRecursiveTypes(root).process();
}
