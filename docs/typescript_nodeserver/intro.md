# Introdução

> **Target:** `typescript_nodeserver` <br/> **Maturidade:** Estável

Para criar um servidor em Node.js você deve criar um projeto em TypeScript e instalar o pacote npm [`@sdkgen/node-runtime`](https://www.npmjs.com/package/@sdkgen/node-runtime). Instale também o [`@sdkgen/cli`](https://www.npmjs.com/package/@sdkgen/cli) para ter acesso aos comandos de terminal para gerar código. Descreva a sua API em arquivos `.sdkgen`. A sugestão é criar um arquivo `api.sdkgen` contendo as definições ou importando os demais arquivos que contém essas definições de tipos e funções.

Adicione este script ao seu package.json:

```json
{
  "scripts": {
    "sdkgen": "sdkgen src/api.sdkgen -o src/api.ts -t typescript_nodeserver"
  }
}
```

Com isso você poderá executar `npm run sdkgen` para gerar novamente o arquivo `src/api.ts` a partir do `src/api.sdkgen`.

## Estrutura do arquivo gerado

O arquivo `api.ts` gerado pelo sdkgen é um módulo que importa `@sdkgen/node-runtime` (por isso precisa estar instalado) e exporta alguns tipos/objetos:

- Cada um dos enums e tipos compostos são definidos e exportados. Os tipos compostos são representados como interfaces e os enums como união de strings literais dos seus valores possíveis.
- Para cada um dos erros definidos na descrição é criada uma classe estendida a partir de `Error` para que você possa utilizar com `throw`.
- Uma classe `ApiConfig` com a qual você pode criar uma instância da configuração da API (descrito em mais detalhes abaixo).
- Uma constante nomeada `api`, que é uma instância de `ApiConfig`.

## Uso do sdkgen com um servidor HTTP existente ou Cloud Functions

O sdkgen expõe o método `handleRequest` na sua instância do `SdkgenHttpServer`, abrindo a possibilidade de utilizar o sdkgen com um servidor HTTP existente, como o [Express](https://expressjs.com/) ou, ainda, com uma [Cloud Function](https://cloud.google.com/functions/).

```typescript
import { SdkgenHttpServer } from "@sdkgen/node-runtime";
import { createServer } from "http";
import { api } from "./api";

const sdkgenServer = new SdkgenHttpServer(api, {});

// Primeira possibilidade: uso com um servidor HTTP existente:
const httpServer = createServer();
httpServer.on("request", sdkgenServer.handleRequest);
httpServer.listen(8080);

// Segunda possibilidade: uso com uma Cloud Function:
exports.api = sdkgenServer.handleRequest; // Aqui, será criada uma Cloud Function com o nome "api", que funciona normalmente como uma API em sdkgen.
```
