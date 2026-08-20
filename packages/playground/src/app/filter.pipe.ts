import { PipeTransform, Pipe } from "@angular/core";

export interface SearchableItem {
  /**
   * Text with every value this item should be searchable by, already passed through
   * {@link normalizeSearchText}. It is compared as-is on every keystroke, so normalizing it
   * once when the item is built keeps that path free of per-item string work.
   */
  searchIndex: string;
}

/**
 * Normalizes text for searching: strips diacritics and lowercases, so that
 * "descricao" matches "descrição".
 *
 * Lowercasing is deliberately locale-independent. Under a Turkish locale `toLocaleLowerCase`
 * maps "I" to the dotless "ı", so a user typing "identity" would stop matching "getIdentity".
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

@Pipe({ name: "appFilter" })
export class FilterPipe implements PipeTransform {
  /**
   * Pipe filters the list of elements based on the search text provided
   *
   * @param items list of elements to search in, each one carrying its own normalized `searchIndex`
   * @param searchText search string, whose terms must all be present in the item
   * @returns list of elements filtered by search text or []
   */
  transform<T extends SearchableItem>(items: T[] | null, searchText: string): T[] {
    if (!items) {
      return [];
    }

    const terms = normalizeSearchText(searchText).split(/\s+/u).filter(Boolean);

    if (terms.length === 0) {
      return items;
    }

    return items.filter(it => terms.every(term => it.searchIndex.includes(term)));
  }
}
