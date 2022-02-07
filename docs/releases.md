# Releases

## 2.0.0 (2022-02-07)

Chegamos aqui com o sdkgen 2.0.0, após quase 1 ano de desenvolvimento. Vem trazendo muitas melhorias e novidades, com poucas mudanças que podem impactar projetos. A expectativa é que a atualização possa ser aplicada na maioria dos projetos sem nenhuma mudança de código. É sempre recomendado que o servidor atualize primeiro, antes dos clientes. Vamos ao que temos de novidades:

**Suporte ao Flutter 2 (sound null safety e Flutter Web)**

O Flutter 2 foi lançado junto ao Dart 1.12 e trouxeram o suporte opcional a tipos nuláveis, uma evolução significativa. Uma boa parte do ecossistema já fez a migração e o sdkgen agora está construído da mesma maneira. Tanto o código gerado em Dart quanto o pacote `sdkgen_runtime` utilizam tipos nuláveis. Em complemento, Flutter Web é suportado, assim como o Flutter para Android e iOS, oferecendo as mesmas funcionalidades.

Um detalhe que facilita o uso nesta versão é que anteriormente o SDK tinha que ser inicializado dentro de um widget passando acesso ao `BuildContext`. Isso não é mais necessário e pode ser utilizado em qualquer lugar da aplicação, independente da UI.

**Cliente nativo em iOS (experimental)**

Um novo cliente nativo para iOS foi adicionado, junto ao gerador de código em Swift. Ele pode ser utilizado com o target `swift_ios` ou `rxswift_ios` no gerador. Nesta versão esse target já é funcional e suporta todos os recursos, no entanto ainda não foi testado o suficiente em produção. Em caso de problemas, por favor reporte. Com teste suficiente acontecendo, poderemos marcar como estável em uma das próximas versões.

**Servidor em F# (experimental)**

O suporte original para rodar sdkgen em .NET foi construído com base no .NET Core utilizando C#. Toda essa base foi reconstruída para dar espaço a uma nova versão em F#, muito mais moderna e possibilitando ser utilizada tanto em projetos F# quanto em C#. A implementação de métodos é fácil e direta, assim como acontece em Node.js, mantendo a mesma simplicidade. Atualmente os recursos base do sdkgen são suportados, mas alguns opcionais não são suportados por este target, como suporte a REST e a compatibilidade com versões legadas. Está sendo lançado como experimental pois ainda não foi testado o suficiente em produção. A expectativa é lançar como versão estável e completa no futuro próximo.

**Novo Playground**

O sdkgen possui um playgroud embutido desde a versão 1.0.0, possibilitando inspecionar uma API, conhecer as funções disponíveis e invocar elas com dados para testar. Agora estamos incluindo um novo playground, com suporte a:

- Explorar as funções existentes, junto com a documentação do que fazem e os tipos que recebem ou retornam.
- Ver como a função deve ser chamada nas linguagens suportadas pelo sdkgen.
- Chamar as funções, escrevendo os argumentos que deseja passar.
- Gerar e baixar o código gerado em todos os targets suportados sem precisar instalar nada.
- Utilizar o editor avançado, em que é possível escrever lógica em JavaScript chamando uma ou mais funções para executar diretamente em seu navegador.

O novo playground pode ser utilizado inclusive com API's que ainda não foram atualizadas para o sdkgen 2.0.0.

Acesse em: [https://sdkgen.github.io/playground/](https://sdkgen.github.io/playground/) ou na rota `/playground` da sua API. É necessário que `introspection` esteja habilitado.

**União de Tipos (experimental)**

Em muitos casos é necessário que uma propriedade possa receber mais de um tipo de dado a depender da situação, por exemplo quando uma lista de eventos é retornada. Até então não havia uma boa forma de representar esses casos, mas agora o sdkgen suporta agregar dados adicionais no enum. Um exemplo de como isso pode ser utilizado:

```
type Event enum {
  info(msg: string)
  transaction(id: uuid, value: money, date: datetime, description: string)
  refund(id: uuid)
  ping
}

fn getEvents(): Event[]
```

Neste exemplo um `Event` pode ser qualquer um dos 4 tipos possíveis, a depender de qual seja, ele virá acompanhado de alguns dados adicionais. Com isso é possível expressar cenários muito mais complexos de API's, sem precisar fazer rodeios.

Atualmente esse modelo funciona em Node.js e na Web com TypeScript, mas ainda não está habilitado nos demais targets, por conta disso está marcado como experimental. Esperamos passar a fornecer em todas as linguagens no futuro.

**Tipos Recursivos**

Outro caso difícil de expressar é quando tipos precisam ser arbitrariamente recursivos. Por exemplo, observe o caso de comentários em uma postagem, sendo que um comentário pode ter outros comentários dentro. Agora é possível declarar assim:

```
type Post {
  body: string
  authorId: uuid
  comments: Comment[]
}

type Comment {
  body: string
  authorId: uuid
  comments: Comment[]
}
```

Neste caso comentários podem conter comentários quantas vezes for necessário, usando um array vazio para representar um comentário que não tem outros comentários dentro. Tipos recursivos podem ser utilizados junto a união de tipos também.

Esperamos com isso aumentar a expressividade da descrição da API, representando cenários reais e evitando que o tipo `json` precise ser utilizado.

**Outras alterações**

Todos os recursos marcados como depreciados nas versões anteriores foram removidos. Se eram utilizados no seu projeto, precisará atualizar.

Além disso foram aplicada várias correções e melhorias internas, deixando o projeto mais estável como um todo.

**Agradecimentos**

As contribuições de 13 pessoas tornaram esse lançamento possível: [@ahardmann](https://github.com/ahardmann), [@danielpsantiago](https://github.com/danielpsantiago), [@daniloapr](https://github.com/daniloapr), [@davidcpires](https://github.com/davidcpires), [@dgadelha](https://github.com/dgadelha), [@elcioabrahao](https://github.com/elcioabrahao), [@hofstede-matheus](https://github.com/hofstede-matheus), [@josecleiton](https://github.com/josecleiton), [@joshuapassos](https://github.com/joshuapassos), [@lbguilherme](https://github.com/lbguilherme), [@manoellribeiro](https://github.com/manoellribeiro), [@vhfmag](https://github.com/vhfmag), e [@Yansb](https://github.com/Yansb)

## 1.6.2 (2021-10-27)

- Correção do swagger, regressão causado na versão 1.5.0.
- Suporte ao tipo `bigint` no Playground e no Swagger.

## 1.6.0 / 1.6.1 (2021-09-29)

- Atualização de dependências.
- Suporte ao .NET 6.0.
- Agora é possivel o cliente enviar parâmetros extras em requisições ([#378])](https://github.com/sdkgen/sdkgen/pull/378)).
- Novo hook no browser-client para intercepção de erros ([#428])](https://github.com/sdkgen/sdkgen/pull/428)).
- Torna os HTTP Headers case insensitive.
- Remove console.error que estava aparecendo no runtime ([#556])](https://github.com/sdkgen/sdkgen/pull/556)).

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
