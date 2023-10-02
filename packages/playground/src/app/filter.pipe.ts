import { PipeTransform, Pipe } from "@angular/core";

@Pipe({ name: "appFilter" })
export class FilterPipe implements PipeTransform {
  /**
   * Pipe filters the list of elements based on the search text provided
   *
   * @param items list of elements to search in
   * @param searchText search string
   * @returns list of elements filtered by search text or []
   */
  transform(items: any[] | null, searchText: string): any[] {
    if (!items) {
      return [];
    }

    if (!searchText) {
      return items;
    }

    const search = searchText.toLocaleLowerCase();

    return items.filter(it => {
      return JSON.stringify(it).toLocaleLowerCase().includes(search);
    });
  }
}
