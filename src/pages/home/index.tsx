import * as React from "react";
import { observer } from "mobx-react-lite";
import { SearchInput } from "components/searchInput";

function Home() {
	return (
		<div>
			<h2>Home</h2>
			<SearchInput />
		</div>
	);
}

export default observer(Home);
