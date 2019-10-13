import * as React from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import s from "./searchInput.scss";

export function SearchInput() {
	return (
		<div className={s.search}>
			<input type="text" className={s.searchTerm} placeholder="What are you looking for?" />
			<button type="submit" className={s.searchButton}>
				<FontAwesomeIcon icon={faSearch} size="xs" />
			</button>
		</div>
	);
}
