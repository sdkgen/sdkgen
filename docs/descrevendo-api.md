# Descrevendo uma API

API's do sdkgen são descritas em um arquivo `.sdkgen`. O objetivo desta descrição é firmar um contrato claro entre o que um front-end pode solicitar e receber e quais requisições o back-end deve tratar. Todos os dados transferidos pela API precisam respeitar este contrato rigorosamente. No fim, também funciona como documentação.

## Tipos

O primeiro passo para o entendimento de uma descrição de API do sdkgen é compreender a gramática de tipos.

### Tipos primitivos

O sdkgen possui alguns tipos primitivos, com diferentes regras e características.

| Tipo       | Descrição                                                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string`   | Um texto livre, potencialmente de múltiplas linhas, codificado como UTF-8.                                                                                                                                                                                    |
| `int`      | Um número inteiro de 32 bits, no intervalo de -2147483648 até 2147483647.                                                                                                                                                                                     |
| `uint`     | Um número inteiro não negativo, no intervalo de 0 até 4294967295.                                                                                                                                                                                             |
| `bigint`   | Um número inteiro sem limite de precisão. Na maioria das plataformas este tipo é mais custoso.                                                                                                                                                                |
| `float`    | Um número de ponto flutuante de 64 bits, similar ao `double` do C.                                                                                                                                                                                            |
| `money`    | Um número inteiro com precisão estendida, mas performático. Está no intervalo de -9007199254740991 a 9007199254740991. Útil para operações financeiras                                                                                                        |
| `bool`     | Ou `true` ou `false`.                                                                                                                                                                                                                                         |
| `json`     | Um valor JSON qualquer, incluindo objetos, arrays, strings, números e boleanos, em qualquer profundidade. Note que embora `null` possa aparecer dentro de um objeto ou array, o valor deste campo não pode ser `null` diretamente. Para isso utilize `json?`. |
| `date`     | Representa conceitualmente uma data do calendário Gregoriano. Essa mesma data pode representar diferentes momento no tempo a depender da timezone. Para especificar um ponto no tempo utilize `datetime`.                                                     |
| `datetime` | Representa um instante no tempo com precisão de milissegundos. Este instante será sempre traduzido para o fuso horário local do recebedor da mensagem.                                                                                                        |
| `bytes`    | Uma sequência arbitrária de bytes de qualquer comprimento. Pode ser utilizado para tráfego de dados binários.                                                                                                                                                 |
| `base64`   | Similar a uma `string`, mas necessariamente com uma codificação Base 64 válida.                                                                                                                                                                               |
| `url`      | Similar a uma `string`, mas contendo uma URL válida.                                                                                                                                                                                                          |
| `hex`      | Similar a uma `string`, mas contendo uma quantidade par de caracteres hexadecimais, útil para representar bytes.                                                                                                                                              |
| `uuid`     | Similar a uma `string`, mas contendo um UUID válido.                                                                                                                                                                                                          |
| `email`    | Similar a uma `string`, mas contendo um e-mail válido.                                                                                                                                                                                                        |
| `xml`      | Similar a uma `string`, mas contendo um XML válido.                                                                                                                                                                                                           |
| `html`     | Similar a uma `string`, mas contendo um HTML válido.                                                                                                                                                                                                          |
| `cpf`      | Similar a uma `string`, mas contendo um CPF válido.                                                                                                                                                                                                           |
| `cnpj`     | Similar a uma `string`, mas contendo um CNPJ válido.                                                                                                                                                                                                          |

### Modificadores de tipo

O sdkgen possui dois modificadores que podem ser sufixados em qualquer tipo: `?` e `[]`.

Todos os tipos são por padrão requeridos, com `null` não sendo um valor válido para nenhum deles. Um tipo pode se tornar nulável ao ser sufixado com `?`. Nesse caso ele retêm o seu comportamento original com a adição de que `null` se torna um valor aceitável. Por exemplo: `string?` aceita qualquer texto livre ou `null`.

O modificador `[]` pode ser adicionado ao final de qualquer tipo para criar uma lista deste tipo (um _array_, na maioria das linguagens). Estas listas podem ter zero ou mais repetições deste tipo. Por exemplo: `cpf[]` denota uma lista de CPF's válidos.

Esses dois modificadores podem ser combinados e repetidos livremente. Alguns exemplos: `int[]?` significa ou `null` ou uma lista de `int`'s. `string[][]` significa uma lista de listas de `string`'s. `bool?[]` significa uma lista de ou `true` ou `false` ou `null`.

### Tipos compostos

Objetos compostos podem ser construídos, similar a classes, interfaces ou estruturas em outras linguagens. A sintaxe vem na forma de uma sequência de campos entre chaves, onde cada campo possui um nome e um tipo. Por exemplo:

```
{
  name: string
  age: uint
}
```

Os campos podem vir em qualquer ordem desde de que não haja repetição. Qualquer tipo é válido em um campo, incluindo opcionais, listas ou outros objetos. Por exemplo:

```
{
  id: uuid
  name: string
  avatar: url?
  friends: {
    id: uuid
    name: string
  }[]
}
```

### Enum

Em adição aos tipos anteriores um `enum` representa um conjunto limitado de possibilidades de valores, similar as enumerações em outras linguagens. A sintaxe inicia com a palavra chave `enum`, seguida por uma sequência de palavras entre chaves, separadas por espaços ou quebras de linha. Por exemplo:

```
enum {
  sent
  received
  failed
}
```

Ou:

```
enum { small medium large }
```

Enums podem aparecer em qualquer posição que um tipo pode, inclusive sendo opcional, lista ou parte de um tipo composto. Por exemplo:

```
{
  name: string
  skills: enum {
    javascript
    csharp
    go
  }[]
}
```

## Estrutura de um arquivo `.sdkgen`.

Em um arquivo `.sdkgen` você pode definir funções, tipos nomeados e erros.

### Tipos nomeados

Tipos nomeados podem ser criados com a sintaxe `type NomeDoTipo Tipo`. Por exemplo:

```
type PersonName string
```

Embora qualquer um dos tipos descritos acima possa aparece na definição de um tipo nomeado, esta construção é muito mais comum com tipos compostos e enums. Por exemplo:

```
type Person {
  name: string
  age: uint
}
```

Uma vez que um tipo nomeado tenha sido definido, o nome do tipo pode ser utilizado em qualquer lugar que receba um tipo. Por exemplo:

```
type UserType enum {
  guest
  fullUser
  admin
}

type User {
  id: uuid
  type: UserType
  name: string
}
```

Dessa maneira tipos podem ser combinados e utilizados múltiplas vezes sem repetição. Um mesmo nome pode ser declarado mais de uma vez, desde que todas as declarações sejam idênticas. A ordem das declarações não tem importância (a declaração do tipo pode aparecer depois do seu uso). Tipos, no entanto, não podem ser recursivos.

### Funções

A descrição das funções é provavelmente a parte mais importante da sua API. Toda função possui um nome, uma lista de argumentos e opcionalmente um tipo de retorno. Todas as funções descritas estarão expostas para serem chamadas por seus usuários, cabendo à implementação de sua API o trabalho de autenticar e autorizar acessos. Cada função deve possuir um nome claro que indique seu funcionamento, geralmente iniciando com um verbo.

Exemplo da sintaxe:

```
fn addNumbers(first: int, second: int): int
```

Argumentos podem vir em qualquer quantidade e todos os tipos devem ser obrigatoriamente especificados. Caso um argumento seja opcional, utilize o modificador de tipo opcional `?` ao fim do tipo. O retorno da função pode ou não ser especificado. Caso não seja, a função não retornará nenhum valor.

Todas as funções descritas serão expostas nos códigos gerados pelo sdkgen para cliente ou para servidor, na forma de funções que retornam `Promise`, `Future` ou equivalente. O nome de cada função deve ser único, não havendo suporte a sobrecarga de funções (ou seja, não é possível diferenciar duas funções apenas pelo tipo de seus argumentos).

### Erros

Toda API possui erros mapeados, seja por conta de um argumento passado incorretamente, por um recurso solicitado não existir ou por uma falha de um serviço externo, por exemplo. É importante que esses erros possíveis sejam também descritos para que um cliente não seja surpreendido. No sdkgen você pode declarar errors com a notação `error NomeDoErro`. Por exemplo:

```
error InvalidArgument
error NotFound
```

A implementação do servidor poderá lançar esses erros ao longo da execução e estes serão transmitidos ao cliente junto a uma mensagem de texto livre, de forma que o cliente possa tratar.

Toda API sdkgen possui um erro implícito de nome `Fatal`. Qualquer erro que seja lançado no servidor que não seja um dos erros descritos no contrato da API será convertido em um erro de tipo `Fatal` antes de ser encaminhado ao cliente. Idealmente uma API nunca deve deixar escapar um erro `Fatal`.

### Importando outros arquivos

Conforme uma API se torna maior e mais complexa passa a ser interessante dividir em múltiplos arquivos. Para isso a palavra chave `import` pode ser utilizada. Por exemplo:

```
import "../user"
```

O significado desta linha é buscar um arquivo chamado `../user.sdkgen` a partir da pasta atual. O `..` neste caso significa "a pasta acima da pasta atual". Qualquer caminho relativo ao arquivo atual pode ser passado e a extensão do arquivo ( `.sdkgen`) não deve ser mencionada. O comportamento é diretamente equivalente a copiar o conteúdo do arquivo e colar dentro do arquivo atual, na posição do import. Cuidado para não incluir o mesmo arquivo mais de uma vez.

## Composição de tipos

Tipos podem ser criados a partir de outros tipos já existentes. Atualmente o sdkgen suporta apenas um operador neste sentido, o spread.

### Spreads

Ao expressar um tipo composto (estrutura com um ou mais campos), você pode copiar os campos de outro tipo já existente no local. Para isso utilize `...NomeDoTipo` dentro da definição de uma estrutura, junto com os demais campos. Por exemplo:

```
type BasicUser {
  id: uuid
  name: string
}

type User {
  email: string
  ...BasicUser
  friends: BasicUser[]
}
```

Neste exemplo o tipo `User` terá 4 campos: `email`, `id`, `name` e `friends`. O operador `...` fará papel de copiar os campos de `BasicUser` para `User`. É exatamente equivalente a escrever:

```
type BasicUser {
  id: uuid
  name: string
}

type User {
  email: string
  id: uuid
  name: string
  friends: BasicUser[]
}
```

Um tipo pode conter múltiplos spreads. Caso um campo exista tanto no tipo atual quanto vindo do spread, o campo vindo do spread será utilizado. Caso um mesmo campo apareça em mais de um spread, o último na ordem em que foi escrito apareça. Note que isso significa que um spread sempre substitui o campo do tipo, em caso de conflito. Exemplo:

```
type A { foo: int }
type B { foo: string }
type C { bar: int }

type Test1 {
  ...B
  ...A
}

type Test2 {
  ...C
  bar: string
}
```

Neste exemplo `Test1` terá um campo `foo` de tipo `int`, já que `...A` aparece por último. `Test2`, por sua vez, terá um campo `bar` de tipo `int`, já que spreads sempre tem prioridade a campos locais.

## Exemplo final

```
error NotFound

type User {
  id: uuid
  avatar: url?
  name: string
  type: enum {
    guest
    fullUser
    admin
  }
}

fn getUser(id: uuid): User
```
