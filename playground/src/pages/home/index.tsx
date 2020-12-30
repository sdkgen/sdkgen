import { RequestCard } from "components/requestCard";
import { SearchInput } from "components/searchInput";
import { Section } from "components/section";
import type { requestModel } from "helpers/requestModel";
import { observer } from "mobx-react";
import * as React from "react";
import RootStore from "stores";
import { useDebounce } from "use-debounce";

import s from "./home.scss";

function Home() {
  const { requestsStore } = React.useContext(RootStore);
  const [searchString, setSearchString] = React.useState<string>("");
  const [searchStringDebounced] = useDebounce(searchString, 500);

  const { api } = requestsStore;

  function filterBySearch(value: [string, requestModel]): boolean {
    const [fnName] = value;

    return fnName.toLocaleLowerCase().includes(searchStringDebounced.toLocaleLowerCase());
  }

  function filterBookmarked(value: [string, requestModel]): boolean {
    const [, model] = value;

    return model.bookmarked;
  }

  function renderCard(value: [string, requestModel]): JSX.Element {
    const [fnName, model] = value;

    return <RequestCard key={fnName} model={model} />;
  }

  const list = Object.entries(api).filter(filterBySearch);

  const BookmarkedCards = list.filter(filterBookmarked).map(renderCard);

  const AllCards = list.map(renderCard);

  const hasBookmarks = BookmarkedCards.length > 0;

  return (
    <div className={s.content}>
      <div className={s.inputWrapper}>
        <SearchInput onChange={setSearchString} />
      </div>
      {hasBookmarks ? (
        <>
          <Section title="Bookmarked endpoints" featured>
            {BookmarkedCards}
          </Section>
          <Section title="All endpoints">{AllCards}</Section>
        </>
      ) : (
        AllCards
      )}
    </div>
  );
}

export default observer(Home);
