import * as React from "react";
import { Section } from "components/section";
import { RequestCard } from "components/requestCard";
import { SearchInput } from "components/searchInput";
import { observer } from "mobx-react-lite";
import RootStore from "stores";
import { useDebounce } from "use-debounce";
import s from "./home.scss";
import { requestModel } from "helpers/requestModel";

function Home() {
  const { requestsStore } = React.useContext(RootStore);
  const [searchString, setSearchString] = React.useState<string>("");
  const [searchStringDebounced] = useDebounce(searchString, 500);

  const { api } = requestsStore;

  const filterBySearch = (value: [string, requestModel], _index: number, _array: [string, requestModel][]): boolean => {
    const [fnName] = value;
    return fnName.toLocaleLowerCase().includes(searchStringDebounced.toLocaleLowerCase());
  };

  const filterBookmarked = (value: [string, requestModel], _index: number, _array: [string, requestModel][]): boolean => {
    const [, model] = value;
    return model.bookmarked;
  };

  const renderCard = (value: [string, requestModel], _index: number, _array: [string, requestModel][]): JSX.Element => {
    const [fnName, model] = value;
    return <RequestCard key={fnName} model={model} />;
  };

  const BookmarkedCards = Object.entries(api).filter(filterBySearch).filter(filterBookmarked).map(renderCard);

  const AllCards = Object.entries(api).filter(filterBySearch).map(renderCard);

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
