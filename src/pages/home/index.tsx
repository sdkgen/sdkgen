import * as React from "react";
import { observer } from "mobx-react-lite";
import s from "./home.scss";
import { SearchInput } from "components/searchInput";
import { RequestCard } from "components/requestCard";
import { useDebounce } from "use-debounce";
import RootStore from "stores";

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
