import { safeLocalStorage } from './safeLocalStorage';

const BOOKMARK_LOCALSTORAGE_KEY = "bookmarked_endpoints";

export function persistEndpointBookmarkStatus(name: string, status: boolean) {
	const currentBookmaked = getLocalStorageBookmarks();
	if (status) {
		// bookmark
		setLocalStorageBookmarks([...currentBookmaked, name]);
	} else {
		// unbookmark
		setLocalStorageBookmarks(currentBookmaked.filter(n => n !== name));
	}
}

export function getLocalStorageBookmarks(): string[] {
	const content = safeLocalStorage.getItem(BOOKMARK_LOCALSTORAGE_KEY);
	if (content) {
		return JSON.parse(content);
	} else {
		return [];
	}
}

export function setLocalStorageBookmarks(names: string[]) {
	safeLocalStorage.setItem(BOOKMARK_LOCALSTORAGE_KEY, JSON.stringify(names));
}
