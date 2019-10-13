import * as React from "react";
import { observer } from "mobx-react-lite";
import s from "./home.scss";
import { SearchInput } from "components/searchInput";
import { RequestCard } from "components/requestCard";
function Home() {
	return (
		<div className={s.content}>
			<div className={s.inputWrapper}>
				<SearchInput />
			</div>
			<RequestCard />
			<RequestCard />
			<RequestCard />
			<RequestCard />
			<RequestCard />
			<RequestCard />
			<RequestCard />
			<RequestCard />
			<RequestCard />
			<RequestCard />
			<RequestCard />
			<RequestCard />
		</div>
	);
}

export default observer(Home);
