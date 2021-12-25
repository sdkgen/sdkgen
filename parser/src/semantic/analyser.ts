import type { AstRoot } from "../ast";
import { ErrorNode, VoidPrimitiveType } from "../ast";
import { CheckMultipleDeclarationVisitor } from "./01_check_multiple_declaration";
import { MatchTypeDefinitionsVisitor } from "./02_match_type_definitions";
import { CheckDontReturnSecretVisitor } from "./03_check_dont_return_secret";
import { ExpandSpreadsVisitor } from "./04_expand_spreads";
import { CheckEmptyStructOrEnumVisitor } from "./05_check_empty_struct_or_enum";
import { GiveStructAndEnumNamesVisitor } from "./06_give_struct_and_enum_names";
import { CollectStructAndEnumTypesVisitor } from "./07_collect_struct_and_enum_types";
import { ValidateAnnotationsVisitor } from "./08_validate_annotations";
import { ValidateRecursiveTypes } from "./09_validate_recursive_types";

export function analyse(root: AstRoot): void {
  if (!root.errors.some(error => error.name === "Fatal")) {
    root.errors.push(new ErrorNode("Fatal", new VoidPrimitiveType()));
  }

  new CheckMultipleDeclarationVisitor(root).process();
  new MatchTypeDefinitionsVisitor(root).process();
  new CheckDontReturnSecretVisitor(root).process();
  new ExpandSpreadsVisitor(root).process();
  new CheckEmptyStructOrEnumVisitor(root).process();
  new GiveStructAndEnumNamesVisitor(root).process();
  new CollectStructAndEnumTypesVisitor(root).process();
  new ValidateAnnotationsVisitor(root).process();
  new ValidateRecursiveTypes(root).process();
}
