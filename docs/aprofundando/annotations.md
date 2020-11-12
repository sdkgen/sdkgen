# Annotations

Além dos tipos e funções descritas no arquivo ".sdkgen", existem algumas anotações que você pode fazer sobre estes itens para indicar significado adicional. Cada uma tem características diferentes e contextos diferentes em que podem ser aplicadas. Abaixo segue uma descrição detalhada de cada uma.

## `@description`

A anotação `@description` pode aparecer antes de funções, de tipos ou de campos. Ela tem o objetivo de adicionar uma documentação sobre o item em questão, que aparecerá no playground e em alguns targets gerados. Utilize para explicar o que uma função faz ou o significado de um campo. Alguns exemplos:

```
@description Detalhes de um usuário.
type User {
  @description Identificador único.
  id: uuid

  @description Nome de apresentação, escolhido pelo próprio usuário.
  name: string

  @description E-mail já validado do usuário.
  email: string?
}

@description Obtém o usuário atual. Caso não tenha feito login, retornará null.
fn getUser(): User?
```

Essa descrição pode também ser multilinha através da adição de um caractere `\` ao final da linha. Mas repare que não é permitido duplicar anotações description no mesmo item.

```
@description Retorna o próximo pedido disponível para execução. Essa função \
pode ser chamada em paralelo por múltiplos clientes. Caso não haja um pedido \
aguardando, a execução irá pausar no servidor até que ou um pedido fique \
disponível ou 2 minutos tenham se passado. Caso tenham passado 2 minutos sem \
um pedido o retorno será `null` e você deve chamar novamente.
fn getNextOrder(): Order?
```

## `@arg`

Similar ao `@description`, o `@arg` é uma forma de documentar o significado de argumentos de funções. `@arg` deve ser imediatamente seguido do nome do argumento e sua descrição, podendo envolver múltiplas linhas. Por exemplo:

```
@description Buscar pedidos feitos pelo usuário através do ID.
@arg id Identificador único do pedido.
@arg includeCanceled Caso deseje incluir pedidos que já foram cancelados \
marcar como `true`, caso contrário utilize `false`.
fn getOrder(id: uuid, includeCanceled: bool): Order
```

## `@throws`

É natural que funções possam lançar erros. No sdkgen você deve definir quais erros existem (`error NotFound`, por exemplo) e por padrão qualquer função pode lançar qualquer erro. Este é um padrão simples, mas faz com que as funções sejam pouco previsíveis para os clientes que estão chamando. Por isso é recomendado que a anotação `@throws` seja utilizada nas funções para marcar quais erros ela pode lançar durante a execução. Essa anotação pode ser incluída múltiplas vezes para especificar erros diferentes. Por exemplo:

```
error NotFound
error Forbidden
error NoFunds

@throws NotFound
@throws Forbidden
fn getUser(id: uuid)
```

Neste exemplo a função `getUser` pode lançar o erro `NotFound` ou o erro `Forbidden`. Note que além desses dois, todas as funções podem lançar o erro `Fatal`, quando o comportamento sai do esperado. Erros do tipo `Fatal` devem sempre ser considerados como bugs do backend. Caso a função tente lançar algum dos erros não mapeados, este será convertido em `Fatal` para o cliente.

## `@hidden`

Por padrão todas as funções podem ser chamadas no playground e são parte dos targets de clientes gerados. Caso uma função precise existir, mas não deva ser chamada normalmente, a anotação `@hidden` pode ser aplicada. As funções ocultas não existirão no playground ou nos target gerados, sendo útil para depreciar funções antigas ou para marcar funções para serem utilizadas exclusivamente como [REST](./rest.md). Repare que funções marcadas como `@hidden` ainda existem e ainda podem ser chamadas, especialmente por targets antigos. Não use para efeitos de segurança. Exemplo:

```
@hidden
fn getUser(): User

fn getUserV2(): UserV2
```

## `@rest`

Ver [REST](./rest.md).
