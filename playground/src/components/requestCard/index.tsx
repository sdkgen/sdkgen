import * as React from "react";
import s from "./requestCard.scss";
import { requestModel } from "helpers/requestModel";
import { observer } from "mobx-react-lite";
import Tabs, { TabKeys } from "./tabs";
import Bottom from "./bottom";
import Content from "./content";
import Header from "./header";

interface CardProps {
	model: requestModel;
}

export const RequestCard = observer(Card);
function Card(props: CardProps) {
	const [open, setOpen] = React.useState<boolean>(false);
	const [activeTab, setActiveTab] = React.useState<TabKeys>("arguments");
	const [jsonArgs, setJsonArgs] = React.useState<any>(props.model.args);
	const { args, status } = props.model;

	if (!open)
		return (
			<div className={s.closedCard} onClick={() => setOpen(true)}>
				<Header open={false} model={props.model} />
			</div>
		);

	return (
		<div className={s.openCard}>
			<Header open closeCard={() => setOpen(false)} model={props.model} />
			<Tabs activeTab={activeTab} onChangeTab={setActiveTab} />
			<Content
				activeTab={activeTab}
				args={args}
				setJsonArgs={setJsonArgs}
				model={props.model}
			/>
			<Bottom
				status={status}
				onClick={_status => {
					props.model.reset();
					props.model.call(jsonArgs, newStatus =>
						newStatus === "sucess" ? setActiveTab("response") : setActiveTab("error"),
					);
				}}
			/>
		</div>
	);
}
