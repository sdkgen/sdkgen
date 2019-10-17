import * as React from "react";

export function componentSwitch<Options>(
	choice: Options,
	//@ts-ignore
	components: Record<Options | "default", React.ReactNode | undefined>,
): React.ReactNode {
	//@ts-ignore

	const hasDefault = components.default !== undefined;
	//@ts-ignore
	const hasChoice = components[choice] !== undefined;

	if (hasChoice) {
		//@ts-ignore
		return components[choice];
	} else if (hasDefault) {
		return components.default;
	} else {
		return null;
	}
}
