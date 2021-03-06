import type { AstRoot } from "../ast";
import { ErrorNode, VoidPrimitiveType } from "../ast";
import { CheckMultipleDeclarationVisitor } from "./01_check_multiple_declaration";
import { MatchTypeDefinitionsVisitor } from "./02_match_type_definitions";
import { CheckNoRecursiveTypesVisitor } from "./03_check_no_recursive_types";
import { CheckDontReturnSecretVisitor } from "./04_check_dont_return_secret";
import { CheckNamingForGettersReturningBoolVisitor } from "./05_check_naming_for_getters_returning_bool";
import { NormalizeUnionsVisitor } from "./06_normalize_unions";
import { GiveComplexTypeNamesVisitor } from "./07_give_complex_type_names";
import { CheckEmptyStructOrEnumVisitor } from "./08_check_empty_struct_or_enum";
import { CollectComplexTypesVisitor } from "./09_collect_complex_types";
import { ApplyStructSpreadsVisitor } from "./10_apply_struct_spreads";
import { ValidateAnnotationsVisitor } from "./11_validate_annotations";

export function analyse(root: AstRoot): void {
  if (!root.errors.some(error => error.name === "Fatal")) {
    root.errors.push(new ErrorNode("Fatal", new VoidPrimitiveType()));
  }

  new CheckMultipleDeclarationVisitor(root).process();
  new MatchTypeDefinitionsVisitor(root).process();
  new CheckNoRecursiveTypesVisitor(root).process();
  new CheckDontReturnSecretVisitor(root).process();
  new CheckNamingForGettersReturningBoolVisitor(root).process();
  new NormalizeUnionsVisitor(root).process();
  new GiveComplexTypeNamesVisitor(root).process();
  new CheckEmptyStructOrEnumVisitor(root).process();
  new CollectComplexTypesVisitor(root).process();
  new ApplyStructSpreadsVisitor(root).process();
  new ValidateAnnotationsVisitor(root).process();
}
