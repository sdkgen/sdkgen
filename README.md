# sdkgen

[![test status badge](https://github.com/sdkgen/sdkgen/workflows/test/badge.svg?branch=main)](https://github.com/sdkgen/sdkgen/actions)
[![telegram badge](https://img.shields.io/badge/telegram-sdkgen-179CDE)](https://t.me/sdkgen)

# Getting Started

## Installing sdkgen

First of all you need Node.js 16 or newer on your machine. We recommend using the latest LTS version, check for it here: https://nodejs.org/en/download/.

Install the global CLI:

```
npm i -g @sdkgen/cli
```

## Creating an API description

Create an `api.sdkgen` to describe your API. For example:

```
type Post {
  id: uuid
  title: string
  body: string
  createdAt: datetime
  author: {
    name: string
  }
}

fn getPost(id: uuid): Post?
```

You can then generate the TypeScript source for this description with `sdkgen api.sdkgen -o api.ts -t typescript_nodeserver`.

## Creating base project

Let's start a new project with TypeScript:

```
npm init -y
npm i --save-dev typescript
npm i @sdkgen/node-runtime
npx tsc --init -t esnext
```

Then create a `main.ts` file:

```typescript
// Import sdkgen's runtime and the generated file
import { SdkgenHttpServer } from "@sdkgen/node-runtime";
import { api } from "./api";

// Every endpoint described must receive some implementation
api.fn.getPost = async (ctx, { id }) => {
  return {
    id,
    title: "Getting Started",
    author: {
      name: "John Doe"
    },
    body: "Lorem ipsum",
    createdAt: new Date(),
  };
};

// Start a HTTP server for the API
const server = new SdkgenHttpServer(api);
server.listen(8000);
```

## Run the project

Build and run it:

```
npx tsc
node main.js
```
