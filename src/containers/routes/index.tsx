import * as React from "react";
import { Router, Redirect } from "react-router";
import { Route, Switch } from "react-router-dom";
import loadable, { Options } from "@loadable/component";
import { syncHistoryWithStore } from "mobx-react-router";
import { rootStore } from "stores";
import { createBrowserHistory } from "history";
const history = syncHistoryWithStore(createBrowserHistory(), rootStore.routerStore);

import { MainWrapper } from "containers/mainWrapper";
import Login from "pages/login";
import { observer } from "mobx-react-lite";
import Rootstore from "stores";
import { Loading } from "components/loading";
import { ExternalWrapper } from "containers/externalWrapper";

const asyncOptions: Options<any> = {
	fallback: <Loading />,
};

const NotFound = loadable(() => import("pages/notfound"), asyncOptions);
const Home = loadable(() => import("pages/home"), asyncOptions);
const Jury = loadable(() => import("pages/jury"), asyncOptions);
const Classes = loadable(() => import("pages/classes"), asyncOptions);
const Projects = loadable(() => import("pages/projects"), asyncOptions);
const Registrations = loadable(() => import("pages/registrations"), asyncOptions);
const ClasslessStudents = loadable(() => import("pages/classlessStudents"), asyncOptions);
const Schedule = loadable(() => import("pages/schedule"), asyncOptions);
const Reports = loadable(() => import("pages/projects/report"), asyncOptions);
const StudentsProjects = loadable(() => import("pages/studentsProjects"), asyncOptions);
const AdvisorReports = loadable(
	() => import("pages/studentsProjects/advisorReports"),
	asyncOptions,
);
const StudentReports = loadable(
	() => import("pages/studentsProjects/studentReports"),
	asyncOptions,
);

const classesStudents = loadable(() => import("pages/classesStudents"), asyncOptions);

const MySubmissions = loadable(() => import("pages/studentsProjects/mySubmissions"), asyncOptions);
const SharedLinks = loadable(() => import("pages/studentsProjects/sharedLinks"), asyncOptions);
const reportStudentByAdvisor = loadable(
	() => import("pages/projects/studentsReports"),
	asyncOptions,
);

export const Routes = observer(() => {
	const { authStore } = React.useContext(Rootstore);

	if (!authStore.user)
		return (
			<Router history={history}>
				<ExternalWrapper>
					<Switch>
						<Route path="/login/" component={Login} />
						<Route path="/projects/" component={Projects} />
						<Redirect to="/login" />
					</Switch>
				</ExternalWrapper>
			</Router>
		);

	return (
		<Router history={history}>
			<MainWrapper>
				<Switch>
					<Route path="/" exact component={Home} />
					<Route path="/jury" exact component={Jury} />
					<Route path="/classes/" component={Classes} />
					<Route path="/projects/" component={Projects} />
					<Route path="/registrations/" component={Registrations} />
					<Route path="/classlessStudents" component={ClasslessStudents} />
					<Route path="/schedule" component={Schedule} />
					<Route path="/reports/:projectId" component={Reports} />
					<Route path="/studentsProjects" component={StudentsProjects} />
					<Route path="/sharedLinks" component={SharedLinks} />
					<Route path="/mySubmissions" component={MySubmissions} />
					<Route path="/advisorReports" component={AdvisorReports} />
					<Route path="/studentReports" component={StudentReports} />
					<Route path="/studentReportsByAdvisor" component={reportStudentByAdvisor} />
					<Route path="/classesTeacher" component={classesStudents} />
					<Route component={NotFound} />
				</Switch>
			</MainWrapper>
		</Router>
	);
});
