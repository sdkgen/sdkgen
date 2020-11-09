# CLI

## Instalando

Para uma instalação global utilize:

```sh
npm i -g @sdkgen/cli
```

Para instalar dentro do seu projeto Node corrente, utilize:

```sh
npm i --save-dev @sdkgen/cli
```

Neste caso você precisa chamar como `npx sdkgen` em vez de `sdkgen`.

## Gerando código

O uso primário da CLI é gerar código fonte dos targets, seja de servidor ou de cliente. Para isso utilize a seguinte estrutura de comando:

```
sdkgen <source file> -o <output file> -t <target name>
```

Onde `<source file>` é o seu arquivo `.sdkgen`, por exemplo `src/api.sdkgen`. `<output file>` é o arquivo de destino, por exemplo `api.dart`. Por fim o `<target name>` se refere ao slug do target a ser utilizado, por exemplo `flutter`. Compondo este exemplo:

```sh
sdkgen src/api.sdkgen -o api.dart -t flutter
```

Estes são os target possíveis:

| Slug                  | Descrição                              |
| --------------------- | -------------------------------------- |
| csharp_server         | Servidor .NET Core, em C#              |
| flutter               | Cliente para Flutter, em Dart          |
| kotlin_android        | Cliente para Android nativo, em Kotlin |
| typescript_interfaces | Apenas tipos da API, em TypeScript     |
| typescript_nodeclient | Cliente para Node.js, em TypeScript    |
| typescript_nodeserver | Servidor Node.js, em TypeScript        |
| typescript_web        | Cliente para uso na Web, em TypeScript |

## Checagem de compatibilidade

É frequente precisar realizar alterações em uma API existente, seja adicionando novas funções, novos campos, ou removendo itens. Nestes casos é sempre preciso ter cuidado para não introduzir uma "Breaking Change", ou seja: uma alteração que seja inesperada pelos clientes existentes. Alguns exemplos de alterações que podem causar problemas:

- Remover ou renomear uma função;
- Adicionar um argumento não nulável;
- Adicionar um novo valor possível em um enum que é retornado por uma função;
- Mudar um argumento de `string` para `uuid`.

E alterações que podem serem feitas sem risco:

- Adicionar um novo campo em um objeto que é retornado por uma função;
- Mudar a ordem dos argumentos de uma função;
- Adicionar novas funções;
- Mudar um argumento de `uuid` para `string`.

Estas regras podem rapidamente ficar complexas e são difíceis de checar por quem está escrevendo uma alteração em uma API existente. Por conta disso o sdkgen vem com uma ferramenta para checar compatibilidade entre alterações. Para isso utilize o seguinte comando:

```
sdkgen compatibility <old source file> <new source file>
```

Por exemplo:

```
sdkgen compatibility api_antiga.sdkgen api_nova.sdkgen
```

Caso existam quebras de compatibilidade estas serão reportadas.
