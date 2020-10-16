import { safeLocalStorage } from "./safeLocalStorage";

const BOOKMARK_LOCALSTORAGE_KEY = "bookmarked_endpoints";

export function getLocalStorageBookmarks(): string[] {
  const content = safeLocalStorage.getItem(BOOKMARK_LOCALSTORAGE_KEY);

  if (content) {
    return JSON.parse(content);
  }

  return [];
}

export function setLocalStorageBookmarks(names: string[]): void {
  safeLocalStorage.setItem(BOOKMARK_LOCALSTORAGE_KEY, JSON.stringify(names));
}

export function persistEndpointBookmarkStatus(name: string, status: boolean): void {
  const currentBookmaked = getLocalStorageBookmarks();

  if (status) {
    // Bookmark
    setLocalStorageBookmarks([...currentBookmaked, name]);
  } else {
    // Unbookmark
    setLocalStorageBookmarks(currentBookmaked.filter(n => n !== name));
  }
}
