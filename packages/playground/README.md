# Sdkgen Playground

## Getting Started

To run a development server, run the command `npm start`. The app will be available on [`http://localhost:4200/`](http://localhost:4200/) and will automatically reload when changes are made.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Components

The sdkgen Playground is split in a few components:

- `app.component` is where the base interface lives. It is the entry point of the application and holds the top bar (`tab-nav.component`) and the main content (varies per tab).
- `console.component` is the component that holds the console, used to show logs and XHR requests from editors.
- `tab-nav.component` is the top bar. It is responsible for switching between sdkgen APIs.
- `simple-call.component` is the component that holds the editor for what we call "simple calls", the calls where users don't write code, just the arguments and click the Run button.
- `tab-editor.component` is the advanced editor component. Here, the user can write code containing function calls to a sdkgen API and run it.
- `type-details.component` is the component that holds the details of a type. It receives a type through Material Dialog's DATA interface and shows information about it (e.g. its properties).
- `tab-home.component` is the home tab. It is the default tab and shows the list of sdkgen functions and their documentation.

## Other files

- `filter.pipe` is the pipe that filters the list of sdkgen functions.
- `responsive.service` is the service that observes the screen width and lets the app know if it is in mobile or desktop mode.
- `sdkgen.docs` holds the documentation for sdkgen's primitive types.
- `sdkgen.service` contains code generation methods.
- `utils/code-execution.ts` is the runtime code needed by advanced editor component to integrate the code being ran with our interface.

## Code style and further help

This code respects [Cubos' ESLint rules](https://git.cubos.io/cubos/eslint). You can find the overriden rules in the `.eslintrc.json` file.

For further help, check out:

- [Angular Documentation](https://angular.io/docs)
- [Angular Material Documentation](https://material.angular.io/components/categories)
- [sdkgen Documentation](https://sdkgen.github.io/)
