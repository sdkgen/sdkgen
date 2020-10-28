# Primeiro projeto (em Node.js)

## Servidor

Vamos criar nosso primeiro projeto utilizando o sdkgen! Antes de qualquer coisa vamos inicializar nosso projeto e instalar dependências:

```sh
npm init -y
npm i --save-dev typescript @sdkgen/cli
npm i @sdkgen/node-runtime
npx tsc --init -t esnext
```

O próximo passo será criar um arquivo de descrição da API. Nele você irá escrever todos os tipos customizados e as funções de sua API. Vamos nomear de `api.sdkgen`:

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

> Se você usa o Visual Studio Code, esta pode ser uma boa hora para instalar a extensão do sdkgen para sintaxe: [**Ver no Marketplace.**](https://marketplace.visualstudio.com/items?itemName=cubos.sdkgen)

A partir deste arquivo de descrição devemos gerar um arquivo de código TypeScript parece ser a base da nossa aplicação chamado `api.ts`. Esse arquivo deve ser gerado novamente sempre que o `api.sdkgen` for modificado:

```sh
npx sdkgen api.sdkgen -o api.ts -t typescript_nodeserver
```

O arquivo gerado é legível, mas não deve ser alterado por você, visto que as alterações serão perdidas na próxima vez que for gerado novamente. Agora você pode escrever o arquivo principal da sua aplicação, vamos chamar de `index.ts`:

```typescript
import { SdkgenHttpServer } from "@sdkgen/node-runtime";
import { api } from "./api";

api.fn.getPost = async (ctx, { id }) => {
  return {
    id,
    title: "Primeira postagem",
    author: {
      name: "John Doe",
    },
    body: "Lorem ipsum",
    createdAt: new Date(),
  };
};

const server = new SdkgenHttpServer(api, {});
server.listen(8000);
```

Neste exemplo temos a importação do runtime específico de node e do arquivo gerado, em seguida a implementação das funções e por fim a criação do servidor HTTP. Por ser TypeScript, tudo está apropriadamente tipado e é checado pelo transpilador.

Ao fim, construa e execute a aplicação:

```sh
npx tsc
node index.js
```

Com a aplicação rodando você pode abrir o playground no seu browser em: http://localhost:8000/playground. Experimente chamar a função lá.

Para projetos pequenos essa estrutura é suficiente, mas em outros casos é interessante estruturar o projeto de forma a comportar uma API mais complexa, dividindo em múltiplos controllers, separando responsabilidades e facilitando injeção de dependências.

## Cliente
