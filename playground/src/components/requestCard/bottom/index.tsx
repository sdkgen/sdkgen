import { faPause, faPlay, faRedo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import { RequestStatus } from "helpers/requestModel";
import * as React from "react";
import s from "./bottom.scss";

interface BottomProps {
	onClick: (status: RequestStatus) => void;
	status: RequestStatus;
}
export default function Bottom(props: BottomProps) {
	const icons: Record<
		RequestStatus,
		any // bad library types
	> = {
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
		sucess: "Success, Retry?",
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
