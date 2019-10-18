import * as React from "react";
import s from "./requestCard.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faChevronDown,
	faChevronUp,
	faLink,
	faPlay,
	faPause,
	faRedo,
	faCircle,
} from "@fortawesome/free-solid-svg-icons";
import MonacoEditor from "react-monaco-editor";
import classNames from "classnames";
import { componentSwitch } from "helpers/componentSwitch";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import ReactJson from "react-json-view";
import { requestModel, RequestStatus } from "helpers/requestModel";
import { observer } from "mobx-react-lite";

interface CardProps {
	model: requestModel;
}

export const RequestCard = observer(Card);
function Card(props: CardProps) {
	const [open, setOpen] = React.useState<boolean>(false);
	const [activeTab, setActiveTab] = React.useState<TabKeys>("arguments");
	const [jsonArgs, setJsonArgs] = React.useState<any>(props.model.args);
	const { name, response, args, status } = props.model;

	const colors: Record<RequestStatus, string> = {
		notFetched: s.blue,
		fetching: s.orange,
		error: s.red,
		sucess: s.green,
		// timeout: s.purple,
	};
	console.log("CARD RENDER", name);
	const accentColorClass = colors[status];

	if (!open)
		return (
			<div className={s.closedCard} onClick={() => setOpen(true)}>
				<div className={s.callName}>
					<div>{name}</div>
					<FontAwesomeIcon size="xs" icon={faLink} className={s.hrefIcon} />
				</div>
				<div>
					{status !== "notFetched" ? (
						<FontAwesomeIcon
							size="xs"
							icon={faCircle}
							className={classNames(s.statusCircle, accentColorClass)}
						/>
					) : null}
					<FontAwesomeIcon size="xs" icon={faChevronDown} className={s.icon} />
				</div>
			</div>
		);

	const Content = componentSwitch<TabKeys>(activeTab, {
		arguments: (
			<MonacoEditor
				height="250"
				language="json"
				theme="vs-light"
				defaultValue={JSON.stringify(args, null, 2)}
				options={{
					minimap: {
						enabled: false,
						showSlider: "mouseover",
						renderCharacters: false,
					},
				}}
				onChange={v => {
					try {
						setJsonArgs(JSON.parse(v));
					} catch (err) {
						console.log("JS-1", err);
					}
				}}
				// editorDidMount={::this.editorDidMount}
			/>
		),
		response: (
			<div className={s.responseWrapper}>
				<ReactJson src={response !== undefined ? response : {}} name={false} />
			</div>
		),
		extra: (
			<div className={s.responseWrapper}>
				<p>
					Did you know this is a <b>work in progress?</b>
				</p>
				<p>... well, now you know.</p>
			</div>
		),
		default: (
			<div className={s.responseWrapper}>
				<p>
					Did you know this is a <b>work in progress?</b>
				</p>
				<p>... well, now you know.</p>
			</div>
		),
	});

	return (
		<div className={s.openCard}>
			<div className={s.header} onClick={() => setOpen(false)}>
				<div className={s.callName}>
					<div>{name}</div>
					<FontAwesomeIcon size="xs" icon={faLink} className={s.hrefIcon} />
				</div>
				<FontAwesomeIcon size="xs" icon={faChevronUp} className={s.icon} />
			</div>
			<Tabs activeTab={activeTab} onChangeTab={setActiveTab} />
			<div className={s.content}>{Content}</div>
			<Bottom
				status={status}
				onClick={_status => {
					props.model.call(jsonArgs, () => setActiveTab("response"));
				}}
			/>
		</div>
	);
}

type TabKeys = "arguments" | "response" | "extra";
interface TabsProps {
	activeTab: TabKeys;
	onChangeTab: (tab: TabKeys) => void;
}
interface TabInfo {
	label: string;
	key: TabKeys;
}
function Tabs(props: TabsProps) {
	const tabs: TabInfo[] = [
		{ key: "arguments", label: "Arguments" },
		{ key: "response", label: "Response" },
		{ key: "extra", label: "Extra Information" },
	];

	const tabCells = tabs.map(t => (
		<div
			key={t.key}
			className={classNames(s.tab, t.key === props.activeTab && s.active)}
			onClick={() => props.onChangeTab(t.key)}
			role="button"
		>
			{t.label}
		</div>
	));

	return <div className={s.subHeader}>{tabCells}</div>;
}

interface BottomProps {
	onClick: (status: RequestStatus) => void;
	status: RequestStatus;
}
function Bottom(props: BottomProps) {
	const icons: Record<RequestStatus, IconProp> = {
		notFetched: faPlay,
		fetching: faPause,
		error: faRedo,
		sucess: faRedo,
		// timeout: faRedo,
	};
	const labels: Record<RequestStatus, string> = {
		notFetched: "Make Request",
		fetching: "Fetching",
		error: "Error, Retry?",
		sucess: "Sucess, Retry?",
		// timeout: "Time out, Retry?",
	};
	const colors: Record<RequestStatus, string> = {
		notFetched: s.blue,
		fetching: s.orange,
		error: s.red,
		sucess: s.green,
		// timeout: s.purple,
	};
	const selectedIcon = icons[props.status];
	const selectedLabel = labels[props.status];
	const classModifier = colors[props.status];

	return (
		<div
			className={classNames(s.bottom, classModifier)}
			onClick={() => props.onClick(props.status)}
			role="button"
		>
			<div className={s.label}>{selectedLabel}</div>
			<FontAwesomeIcon size="xs" icon={selectedIcon} className={s.icon} />
		</div>
	);
}
