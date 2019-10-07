import * as React from "react";
import { observer } from "mobx-react-lite";
import { Result, Icon } from "antd";

function Home() {
	return (
		<div>
			<h2>Home</h2>
			<Result
				icon={<Icon type="smile" theme="twoTone" />}
				title="Seja bem-vindo(a)!"
				status="success"
			/>
			,
		</div>
	);
}

export default observer(Home);
