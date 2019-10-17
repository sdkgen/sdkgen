import * as React from "react";
import { observer } from "mobx-react-lite";
import s from "./home.scss";
import { SearchInput } from "components/searchInput";
import { RequestCard } from "components/requestCard";
import RootStore from "stores";

function Home() {
	const { requestsStore } = React.useContext(RootStore);
	const { api } = requestsStore;
	const Cards = Object.entries(api).map(([fnName, FnModel]) => {
		return <RequestCard key={fnName} model={FnModel} />;
	});

	return (
		<div className={s.content}>
			<div className={s.inputWrapper}>
				<SearchInput />
			</div>
			{Cards}
		</div>
	);
}

export default observer(Home);
