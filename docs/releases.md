# Releases

## 1.5.5 (2021-02-22)

**Correções:**
- Correção no carregamento do `/playground` por conta de regressão causada pela versão 1.5.4 ([#184](https://github.com/sdkgen/sdkgen/pull/184)).

## 1.5.4 (2021-02-19)

**Correções:**
- Correção no recebimento de objetos retornados pela API no browser-runtime ([#181](https://github.com/sdkgen/sdkgen/pull/181)).
- Correção no tratamento de rotas REST para que caso mais de uma rota encaixe com uma requisição, aquela que contém a maior quantidade de caracteres que não fazem parte dos argumentos seja escolhida ([#179](https://github.com/sdkgen/sdkgen/pull/179)).
- Mudança no tratamento de rotas REST de forma que argumentos do tipo `string` dentra da path não possam mais conter o caracter `/` ([#179](https://github.com/sdkgen/sdkgen/pull/179)).
- Validação de datas no browser-runtime e node-runtime de forma que uma data inválida não seja aceita ([#180](https://github.com/sdkgen/sdkgen/pull/180)).
- Atualização de dependências.

## 1.5.3 (2021-02-10)

**Correção:**
- Ajustado o tipo `TypeDescription` utilizado para tipagem dos clientes em Node e Web com respeito ao enums.

Esta release não inclui nenhuma alteração no comportamento durante execução.

## 1.5.2 (2021-02-09)

**Correção:**
- O tipo de retorno das funções `encode` e `decode` do `@sdkgen/node-runtime` estava sendo incorretamente inferido quando o tipo possuia um enum. Essa tipagem foi corrigida.

Esta release não inclui nenhuma alteração no comportamento durante execução.

## 1.5.1 (2021-01-26)

Nenhuma alteração.

## 1.5.0 (2021-01-26)

**Middlewares**

Agora é possível adicionar múltiplos middlewares na configuração de uma API, possibilitando tomar ações a depender dos argumentos ou do retorno.

```typescript
api.use(async (ctx, next) => {
  // Faça qualquer coisa com o `ctx` aqui.
  // O nome da função é `ctx.request.name` e os argumentos `ctx.request.args`.
  const reply = await next();
  // Faça qualquer coisa com a resposta aqui.
  return reply;
});
```

Os hooks anteriores de `onRequestStart` e `onRequestEnd` continuam funcionando, mas estão agora depreciados.

Você pode, por exemplo:

- Salvar os dados da requisição e resposta em um log;
- Medir estatísticas das requisições;
- Controlar rate limit;
- Bloquear ou redirecionar chamadas a depender da função e dos argumentos;
- Implementar cache;
- Implementar re-tentativa a depender de algum erro específico (chamando `next` mais de uma vez);
- Modificar o erro retornado (`try`/`catch` em volta do `next`).

Ver [#161](https://github.com/sdkgen/sdkgen/pull/161).

**Outras mudanças**

- Suporte ao Node.js 15 ([#115](https://github.com/sdkgen/sdkgen/pull/115)).
- Configuração do eslint renovada e tipagem mais forte em todos os pacotes TypeScript ([#166](https://github.com/sdkgen/sdkgen/pull/166)).
- Licença do projeto modificada para MIT ([#167](https://github.com/sdkgen/sdkgen/pull/167)).
- Atualização de dependências.

## 1.4.4 (2021-01-26)

**Correções**

- Correção no runtime do Flutter ao lançar erros do tipo `SdkgenErrorWithData` ([#175](https://github.com/sdkgen/sdkgen/pull/175)).

## 1.4.3 (2021-01-18)

**Correções**

- Gerador de código do Flutter com erros que contém dados (`SdkgenErrorWithData`) agora produzem código válido ([#171](https://github.com/sdkgen/sdkgen/pull/171)).
- Gerador de código do Android agora utiliza `SupervisorJob` ([#168](https://github.com/sdkgen/sdkgen/pull/168)).

## 1.4.2 (2020-12-21)

**Correções**

- `SdkgenErrorWithData` não será mais importado pelo código gerado sem necessidade, evitando problemas com linter ([#141](https://github.com/sdkgen/sdkgen/pull/141)).
- Correção na uso do `WebpackManifestPlugin` no playground.
- Correção no syntax highlighting no Visual Studio Code para `error` ([#152](https://github.com/sdkgen/sdkgen/pull/152)).
- Correção no processamento do tipo `money` no Flutter ([#153](https://github.com/sdkgen/sdkgen/pull/153)).
- Código duplicado removido ([#155](https://github.com/sdkgen/sdkgen/pull/155)).
- Correção ao gerar classes de erro no Flutter ([#160](https://github.com/sdkgen/sdkgen/pull/160)).
- Correção no processamento do tipo `json` no Flutter ([#159](https://github.com/sdkgen/sdkgen/pull/159)).
- Atualização de dependências.

## 1.4.1 (2020-11-30)

**Correções**

- Correção de regressão na versão 1.4.0 em que o browser-runtime não retornava o conteúdo da resposta em caso de sucesso.
- Suporte ao tipo primitivo `email` no Swagger gerado para funções `@rest` ([#140](https://github.com/sdkgen/sdkgen/pull/140)).
- Correção de exemplo na documentação ([#137](https://github.com/sdkgen/sdkgen/pull/137)).

## 1.4.0 (2020-11-19)

**Documentação! ([#120](https://github.com/sdkgen/sdkgen/pull/120))**

Temos agora uma documentação nova e escrita em português para o sdkgen. Ainda será foco das próximas releases para garantir que contenha toda a informação necessária para utilizar a manipular o sdkgen. Contribuições serão sempre bem-vindas.

Confira em: https://sdkgen.github.io

**Dados adicionais em erros ([#133](https://github.com/sdkgen/sdkgen/pull/133))**

No sdkgen sempre foi possível definir tipos de erro:

```
error InvalidArgument
```

Agora é possível incluir dados adicionais (de qualquer tipo) junto com um erro:

```
error InvalidArgument {
  argumentName: string
  reason: string
}
```

E o erro pode ser lançado como:

```
throw new InvalidArgument("Argumento inválido!", { argumentName: "amount", reason: "Deve ser positivo" });
```

Qualquer tipo pode ser utilizado, como por exemplo:

```
error NoFunds uint?
```

**Outras mudanças**

- Lançamento de erros no Node.js deve ser feito através de `throw new SomeError("message")` em vez do `api.err.SomeError("message")`. A forma anterior ainda está disponível, mas produzirá um warning. ([#122](https://github.com/sdkgen/sdkgen/pull/122))
- CLI está mais amigável com `--help` melhorado, inclusive no modo de checagem de compatibilidade `sdkgen compatibility --help`. ([#131](https://github.com/sdkgen/sdkgen/pull/131))
- Suporte ao tipo `xml` no retorno de chamadas REST. ([#132](https://github.com/sdkgen/sdkgen/pull/132))
- .NET 5.0 incluído no CI. ([#135](https://github.com/sdkgen/sdkgen/pull/135))
- Atualização de dependências.

**Correções**

- Informações do dispositivo Android e iOS agora são corretamente reportadas no Flutter. ([#126](https://github.com/sdkgen/sdkgen/pull/126))
- Coloração de sintaxe corrigida para `@description` e `@arg` com múltiplas linhas no VSCode. ([#128](https://github.com/sdkgen/sdkgen/pull/128))
- Correção no código de status HTTP em requisições REST em caso de erro Fatal. ([#130](https://github.com/sdkgen/sdkgen/pull/130))
- Correção no envio do tipo `bytes` como argumento de uma função no Android. ([#134](https://github.com/sdkgen/sdkgen/pull/134))
