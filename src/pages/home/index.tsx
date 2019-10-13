import * as React from "react";
import { observer } from "mobx-react-lite";
import s from "./home.scss";

function Home() {
	return (
		<div className={s.demo}>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
			<h1>Hello.</h1>
		</div>
	);
}

export default observer(Home);
