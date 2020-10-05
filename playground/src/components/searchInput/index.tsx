import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import s from "./searchInput.scss";

interface Props {
	onChange: (value: string) => void;
}

export function SearchInput(props: Props) {
	return (
		<div className={s.search}>
			<input
				type="text"
				className={s.searchTerm}
				placeholder="What are you looking for?"
				onChange={ev => props.onChange(ev.target.value)}
			/>
			<button type="submit" className={s.searchButton}>
				<FontAwesomeIcon
					icon={faSearch}
					size="xs"
				/>
			</button>
		</div>
	);
}
