import type { ModelAnotations } from "helpers/requestModel";
import * as React from "react";

import s from "./annotations.scss";

interface Props {
  annotations: ModelAnotations;
}

export function Annotations(props: Props): JSX.Element {
  const { args, func } = props.annotations;

  const isEmpty = func.length === 0 && Object.keys(args).length === 0;

  const emptyMessage = <div className={s.empty}>There are no annotations on this function.</div>;

  const funcAnnotations = func.map((a, index) => (
    <div className={s.annotation} key={`func-${index}`}>
      <div className={s.type}>{a.type}:</div>
      <div className={s.value}>{JSON.stringify(a.value)}</div>
    </div>
  ));

  const funcSection =
    funcAnnotations.length === 0 ? null : (
      <div className={s.section}>
        <div className={s.title}>Function</div>
        <div className={s.content}>{funcAnnotations}</div>
      </div>
    );

  const argsAnnotations = Object.keys(args).reduce((acc, argName) => {
    const annotations = args[argName];

    const groupedAnnotations = annotations.map((a, index) => (
      <div className={s.annotation} key={`arg-${argName}-${index}`}>
        <div className={s.type}>{a.type}:</div>
        <div className={s.value}>{JSON.stringify(a.value)}</div>
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
    argsAnnotations.length === 0 ? null : (
      <div className={s.section}>
        <div className={s.title}>Arguments</div>
        <div className={s.content}>{argsAnnotations}</div>
      </div>
    );

  return isEmpty ? (
    emptyMessage
  ) : (
    <div>
      {funcSection}
      {argsSection}
    </div>
  );
}
