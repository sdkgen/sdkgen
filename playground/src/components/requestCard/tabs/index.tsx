import classNames from "classnames";
import * as React from "react";
import s from "./tabs.scss";

export type TabKeys = "arguments" | "response" | "error" | "annotations";

interface TabsProps {
  activeTab: TabKeys;
  onChangeTab: (tab: TabKeys) => void;
}
interface TabInfo {
  label: string;
  key: TabKeys;
}
export default function Tabs(props: TabsProps): JSX.Element {
  const tabs: TabInfo[] = [
    { key: "arguments", label: "Arguments" },
    { key: "response", label: "Response" },
    { key: "error", label: "Error" },
    { key: "annotations", label: "Annotations" },
  ];

  const tabCells = tabs.map(t => (
    <div key={t.key} className={classNames(s.tab, t.key === props.activeTab && s.active)} onClick={() => props.onChangeTab(t.key)} role="button">
      {t.label}
    </div>
  ));

  return <div className={s.subHeader}>{tabCells}</div>;
}
