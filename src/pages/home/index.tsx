import * as React from "react";
import { observer } from "mobx-react-lite";
import s from "./home.scss";
import { SearchInput } from "components/searchInput";

function Home() {
	return (
		<div className={s.content}>
			<div className={s.inputWrapper}>
				<SearchInput />
			</div>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
		</div>
	);
}

export default observer(Home);
