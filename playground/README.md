# @sdkgen/playground

The default web playground for sdkgen APIs, allowing easy interaction with deployed or local servers.

# How to use

Just open a web browser on https://yourApiEndpoint.com/playground

# Features

- list all possbible endpoints
- search endpoints
- make requests
- set a custom device id
- copy retuned values to clipboard
- display endpoint annotations


# Development 

## Install dependecies 
```
npm i 
```

## Running locally
```
npm run dev
```
a local version of the playground will be avaliable on http://localhost:4545/playground/ 

by default the playground will make requests to http://localhost:8000/, it's recomended to run an local sdkgen server alongside the playground dev server, here is an example of [very simple sdkgen server](https://github.com/kevinoliveira/sdkgen-helloworld) that you can use to develop.
 

## Checking for type errors
```
npm run check
```

## Runing tests
run all tests
```
npm run test
```
run all tests watching for file changes
```
npm run test:w
```
run a test file watching for file changes
```
npm run test:w playground/example.test.tsx
```

## Linting
```
npm run lint
```

## Building
```
npm run build
```
