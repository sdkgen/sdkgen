import * as React from "react";

export function componentSwitch<Options>(
	choice: Options,
	//@ts-ignore
	components: Record<Options | "default", React.ReactNode | undefined>,
): React.ReactNode {

	const hasDefault = components.default !== undefined;
	const hasChoice = components[choice] !== undefined;

	if (hasChoice) {
		return components[choice];
	} else if (hasDefault) {
		return components.default;
	} else {
		return null;
	}
}
