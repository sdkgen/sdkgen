import * as React from "react";
import s from "./annotations.scss";
import { ModelAnotations } from "helpers/requestModel";
interface Props {
	annotations: ModelAnotations;
}

export function Annotations(props: Props) {
	const { args, func } = props.annotations;

	const isEmpty = func.length === 0 && Object.keys(args).length === 0;

	const emptyMessage = <div className={s.empty}>There are no annotations on this function.</div>;

	const funcAnnotations = func.map((a, index) => (
		<div className={s.annotation} key={`func-${index}`}>
			<div className={s.type}>{a.type}:</div>
			<div className={s.value}>{a.value}</div>
		</div>
	));

	const funcSection =
		funcAnnotations.length !== 0 ? (
			<div className={s.section}>
				<div className={s.title}>Function annotations</div>
				<div className={s.content}>{funcAnnotations}</div>
			</div>
		) : null;

	const argsAnnotations = Object.keys(args).reduce((acc, argName) => {
		const annotations = args[argName];

		const groupedAnnotations = annotations.map((a, index) => (
			<div className={s.annotation} key={`arg-${argName}-${index}`}>
				<div className={s.type}>{a.type}:</div>
				<div className={s.value}>{a.value}</div>
			</div>
		));

		return [
			...acc,
			<div className={s.argGroup} key={argName}>
				<div className={s.name}>{argName}</div>
				<div className={s.content}>{groupedAnnotations}</div>
			</div>,
		];
	}, []);

	const argsSection =
		argsAnnotations.length !== 0 ? (
			<div className={s.section}>
				<div className={s.title}>Arguments annotations</div>
				<div className={s.content}>{argsAnnotations}</div>
			</div>
		) : null;

	return isEmpty ? (
		emptyMessage
	) : (
		<div>
			{funcSection}
			{argsSection}
		</div>
	);
}
