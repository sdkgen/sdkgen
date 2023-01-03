import type { AstRoot } from "../ast.js";
import { ErrorNode, VoidPrimitiveType } from "../ast.js";
import { CheckMultipleDeclarationVisitor } from "./01_check_multiple_declaration.js";
import { GiveStructAndEnumNamesTransformer } from "./02_give_struct_and_enum_names.js";
import { MatchTypeDefinitionsVisitor } from "./03_match_type_definitions.js";
import { CheckDontReturnSecretVisitor } from "./04_check_dont_return_secret.js";
import { ExpandSpreadsVisitor } from "./05_expand_spreads.js";
import { CheckEmptyStructOrEnumVisitor } from "./06_check_empty_struct_or_enum.js";
import { ValidateRecursiveTypes } from "./07_validate_recursive_types.js";
import { CollectStructAndEnumTypesVisitor } from "./08_collect_struct_and_enum_types.js";
import { ValidateAnnotationsVisitor } from "./09_validate_annotations.js";
import { CheckDuplicatedMembersOnEnumVisitor } from "./10_check_duplicate_members_on_enum.js";

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
