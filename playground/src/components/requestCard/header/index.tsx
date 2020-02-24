import { faChevronDown, faChevronUp, faCircle, faLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import { requestModel, RequestStatus } from "helpers/requestModel";
import * as React from "react";
import s from "./header.scss";

interface HeaderProps {
	open?: boolean;
	model: requestModel;
	closeCard?: () => void;
}

export default function Header(props: HeaderProps) {
	const { open, closeCard, model } = props;

	const colors: Record<RequestStatus, string> = {
		notFetched: s.blue,
		fetching: s.orange,
		error: s.red,
		sucess: s.green,
		// timeout: s.purple,
	};
	const accentColorClass = colors[model.status];

	if (!open)
		return (
			<>
				<div className={s.callName}>
					<div>{model.name}</div>
					<FontAwesomeIcon
						size="xs"
						//@ts-ignore
						icon={faLink}
						className={s.hrefIcon}
					/>
				</div>
				<div>
					{model.status !== "notFetched" ? (
						<FontAwesomeIcon
							size="xs"
							//@ts-ignore
							icon={faCircle}
							className={classNames(s.statusCircle, accentColorClass)}
						/>
					) : null}
					<FontAwesomeIcon
						size="xs"
						//@ts-ignore
						icon={faChevronDown}
						className={s.icon}
					/>
				</div>
			</>
		);

	return (
		<div className={s.header} onClick={closeCard}>
			<div className={s.callName}>
				<div>{model.name}</div>
				<FontAwesomeIcon
					size="xs"
					//@ts-ignore
					icon={faLink}
					className={s.hrefIcon}
				/>
			</div>
			<FontAwesomeIcon
				size="xs"
				//@ts-ignore
				icon={faChevronUp}
				className={s.icon}
			/>
		</div>
	);
}
