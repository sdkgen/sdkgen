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
type RequestStatus = "notFetched" | "fetching" | "error" | "sucess" | "timeout";

export const RequestCard = Card;

const mock = [
	{
		id: "e1f787da-2d66-4f92-904f-4c452e1484f7",
		name: "Boteco Tchê",
		image: null,
		postPaidLimit: 100000,
		maleCouvert: {
			value: 0,
			name: "Couvert Masculino",
			category: "Couvert",
		},
		femaleCouvert: {
			value: 0,
			name: "Couvert Feminino",
			category: "Couvert",
		},
		bars: [
			{
				id: "78055659-e582-4185-8994-f71a9c2e2eff",
				name: "Bar Principal",
				image: null,
				storageId: "7027b1c1-90d1-47e0-bb80-5b135e748013",
				storageName: null,
				internalIp: null,
			},
			{
				id: "82dd2a37-2d27-43ec-8e48-04aa883d028d",
				name: "Bar Cozinha",
				image: null,
				storageId: "7027b1c1-90d1-47e0-bb80-5b135e748013",
				storageName: null,
				internalIp: null,
			},
			{
				id: "14363965-9a2e-416a-9dc5-6ee53f22a32e",
				name: "Copos ",
				image: null,
				storageId: "7027b1c1-90d1-47e0-bb80-5b135e748013",
				storageName: null,
				internalIp: null,
			},
		],
		tip: 0.1,
		zigTagProduct: null,
		sellVisualizationFormat: "Grid",
		fiscalPrinters: [],
		localServerIp: null,
	},
];

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

	const Content = componentSwitch<TabKeys>(activeTab, {
		arguments: (
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
		),
		response: (
			<div className={s.responseWrapper}>
				<ReactJson src={mock} name={false} />
			</div>
		),
		extra: <h1>extra time</h1>,
		default: <h1>default time</h1>,
	});

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
			<div className={s.content}>{Content}</div>
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
