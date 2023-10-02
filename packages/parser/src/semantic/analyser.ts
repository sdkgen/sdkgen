import { CheckMultipleDeclarationVisitor } from "./01_check_multiple_declaration";
import { GiveStructAndEnumNamesTransformer } from "./02_give_struct_and_enum_names";
import { MatchTypeDefinitionsVisitor } from "./03_match_type_definitions";
import { CheckDontReturnSecretVisitor } from "./04_check_dont_return_secret";
import { ExpandSpreadsVisitor } from "./05_expand_spreads";
import { CheckEmptyStructOrEnumVisitor } from "./06_check_empty_struct_or_enum";
import { ValidateRecursiveTypes } from "./07_validate_recursive_types";
import { CollectStructAndEnumTypesVisitor } from "./08_collect_struct_and_enum_types";
import { ValidateAnnotationsVisitor } from "./09_validate_annotations";
import { CheckDuplicatedMembersOnEnumVisitor } from "./10_check_duplicate_members_on_enum";
import type { AstRoot } from "../ast";
import { ErrorNode, VoidPrimitiveType } from "../ast";

export function analyse(root: AstRoot): void {
  if (!root.errors.some(error => error.name === "Fatal")) {
    root.errors.push(new ErrorNode("Fatal", new VoidPrimitiveType()));
  }

  new CheckMultipleDeclarationVisitor(root).process();
  new GiveStructAndEnumNamesTransformer(root).process();
  new MatchTypeDefinitionsVisitor(root).process();
  new CheckDontReturnSecretVisitor(root).process();
  new ExpandSpreadsVisitor(root).process();
  new CheckEmptyStructOrEnumVisitor(root).process();
  new ValidateRecursiveTypes(root).process();
  new CollectStructAndEnumTypesVisitor(root).process();
  new ValidateAnnotationsVisitor(root).process();
  new CheckDuplicatedMembersOnEnumVisitor(root).process();
}
