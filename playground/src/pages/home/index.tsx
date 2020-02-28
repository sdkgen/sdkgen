import { RequestCard } from "components/requestCard";
import { SearchInput } from "components/searchInput";
import { observer } from "mobx-react-lite";
import * as React from "react";
import RootStore from "stores";
import { useDebounce } from "use-debounce";
import s from "./home.scss";

function Home() {
	const { requestsStore } = React.useContext(RootStore);
	const [searchString, setSearchString] = React.useState<string>("");
	const [searchStringDebounced] = useDebounce(searchString, 500);

	const { api } = requestsStore;
	const Cards = Object.entries(api)
		.filter(([fnName, _]) =>
			fnName.toLocaleLowerCase().includes(searchStringDebounced.toLocaleLowerCase()),
		)
		.map(([fnName, FnModel]) => {
			return <RequestCard key={fnName} model={FnModel} />;
		});

	return (
		<div className={s.content}>
			<div className={s.inputWrapper}>
				<SearchInput onChange={setSearchString} />
			</div>
			{Cards}
		</div>
	);
}

export default observer(Home);
