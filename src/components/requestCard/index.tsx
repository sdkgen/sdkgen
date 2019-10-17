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
import { IconProp } from "@fortawesome/fontawesome-svg-core";

type RequestStatus = "notFetched" | "fetching" | "error" | "sucess" | "timeout";

export const RequestCard = Card;

function Card() {
	const [open, setOpen] = React.useState<boolean>(false);
	const [activeTab, setActiveTab] = React.useState<TabKeys>("arguments");
	const [requestStatus, setRequestStatus] = React.useState<RequestStatus>("notFetched");

	const colors: Record<RequestStatus, string> = {
		notFetched: s.blue,
		fetching: s.orange,
		error: s.red,
		sucess: s.green,
		timeout: s.purple,
	};
	const accentColorClass = colors[requestStatus];

	if (!open)
		return (
			<div className={s.closedCard} onClick={() => setOpen(true)}>
				<div className={s.callName}>
					<div>getEmployeesByName</div>
					<FontAwesomeIcon size="xs" icon={faLink} className={s.hrefIcon} />
				</div>
				<div>
					{requestStatus !== "notFetched" ? (
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

	return (
		<div className={s.openCard}>
			<div className={s.header} onClick={() => setOpen(false)}>
				<div className={s.callName}>
					<div>getEmployeesByName</div>
					<FontAwesomeIcon size="xs" icon={faLink} className={s.hrefIcon} />
				</div>
				<FontAwesomeIcon size="xs" icon={faChevronUp} className={s.icon} />
			</div>
			<Tabs activeTab={activeTab} onChangeTab={setActiveTab} />
			<div className={s.content}>
				<MonacoEditor
					// width="800"
					height="250"
					language="json"
					theme="vs-light"
					value={JSON.stringify({ to: "/", label: "Endpoints" }, null, 2)}
					options={{
						minimap: {
							enabled: false,
							showSlider: "mouseover",
							renderCharacters: false,
						},
					}}
					// onChange={::this.onChange}
					// editorDidMount={::this.editorDidMount}
				/>
			</div>
			<Bottom
				status={requestStatus}
				onClick={() => {
					const a: Record<RequestStatus, RequestStatus> = {
						notFetched: "fetching",
						fetching: "error",
						error: "sucess",
						sucess: "timeout",
						timeout: "notFetched",
					};
					setRequestStatus(a[requestStatus]);
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
	onClick: () => void;
	status: RequestStatus;
}
function Bottom(props: BottomProps) {
	const icons: Record<RequestStatus, IconProp> = {
		notFetched: faPlay,
		fetching: faPause,
		error: faRedo,
		sucess: faRedo,
		timeout: faRedo,
	};
	const labels: Record<RequestStatus, string> = {
		notFetched: "Make Request",
		fetching: "Fetching",
		error: "Error, Retry?",
		sucess: "Sucess, Retry?",
		timeout: "Time out, Retry?",
	};
	const colors: Record<RequestStatus, string> = {
		notFetched: s.blue,
		fetching: s.orange,
		error: s.red,
		sucess: s.green,
		timeout: s.purple,
	};
	const selectedIcon = icons[props.status];
	const selectedLabel = labels[props.status];
	const classModifier = colors[props.status];

	return (
		<div className={classNames(s.bottom, classModifier)} onClick={props.onClick}>
			<div className={s.label}>{selectedLabel}</div>
			<FontAwesomeIcon size="xs" icon={selectedIcon} className={s.icon} />
		</div>
	);
}
