# Descrevendo uma API

API's do sdkgen são descritas em um arquivo `.sdkgen`. O objetivo desta descrição é firmar um contrato claro entre o que um front-end pode solicitar e receber e quais requisições o back-end deve tratar. Todos os dados transferidos pela API precisam respeitar este contrato rigorosamente. No fim, também funciona como documentação.

## Tipos primitivos

O sdkgen possui alguns tipos primitivos, com diferentes regras e características.

| Tipo       | Descrição                                                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `string`   | Um texto livre, potencialmente de múltiplas linhas, codificado como UTF-8.                                                                                                                                                                                    |
| `int`      | Um número inteiro de 32 bits, no intervalo de -2147483648 até 2147483647.                                                                                                                                                                                     |
| `uint`     | Um número inteiro não negativo, no intervalo de 0 até 4294967295.                                                                                                                                                                                             |
| `bigint`   | Um número inteiro sem limite de precisão. Na maioria das plataformas este tipo é mais custoso.                                                                                                                                                                |
| `float`    | Um número de ponto flutuante de 64 bits, similar ao `double` do C.                                                                                                                                                                                            |
| `money`    | Um número inteiro com precisão extendida, mas performático. Está no intervalo de -9007199254740991 a 9007199254740991. Útil para operações financeiras                                                                                                        |
| `bool`     | Ou `true` ou `false`.                                                                                                                                                                                                                                         |
| `json`     | Um valor JSON qualquer, incluindo objetos, arrays, strings, números e boleanos, em qualquer profundidade. Note que embora `null` possa aparecer dentro de um objeto ou array, o valor deste campo não pode ser `null` diretamente. Para isso utilize `json?`. |
| `date`     | Representa conceitualmente uma data do calendário Gregoriano. Essa mesma data pode representar diferentes momento no tempo a depender da timezone. Para especificar um ponto no tempo utilize `datetime`.                                                     |
| `datetime` | Representa um instante no tempo com precisão de milisegundos. Este instante será sempre traduzido para a time zone local do recebedor da mensagem.                                                                                                            |
| `bytes`    | Uma sequencia arbitrária de bytes de qualquer comprimento. Pode ser utilizado para tráfego de dados binários.                                                                                                                                                 |
| `base64`   | Similar a uma `string`, mas necessariamente com uma codificação Base 64 válida.                                                                                                                                                                               |
| `url`      | Similar a uma `string`, mas contendo uma URL válida.                                                                                                                                                                                                          |
| `hex`      | Similar a uma `string`, mas contendo uma quantidade par de caracteres hexadecimais, útil para representar bytes.                                                                                                                                              |
| `uuid`     | Similar a uma `string`, mas contendo um UUID válido.                                                                                                                                                                                                          |
| `email`    | Similar a uma `string`, mas contendo um email válido.                                                                                                                                                                                                         |
| `xml`      | Similar a uma `string`, mas contendo um XML válido.                                                                                                                                                                                                           |
| `html`     | Similar a uma `string`, mas contendo um HTML válido.                                                                                                                                                                                                          |
| `cpf`      | Similar a uma `string`, mas contendo um CPF válido.                                                                                                                                                                                                           |
| `cnpj`     | Similar a uma `string`, mas contendo um CNPJ válido.                                                                                                                                                                                                          |

## Modificadores de tipo

O sdkgen possui dois modificadores que podem ser sufixados em qualquer tipo: `?` e `[]`.

Todos os tipos são por padrão requeridos, com `null` não sendo um valor válido para nenhum deles. Um tipo pode se tornar nulável ao ser sufixado com `?`. Nesse caso ele retêm o seu comportamento original com a adição de que `null` se torna um valor aceitável. Por exemplo: `string?` aceita qualquer texto livre ou `null`.

O modificador `[]` pode ser adicionado ao final de qualquer tipo para criar uma lista deste tipo (um _array_, na maioria das linguagens). Estas listas podem ter zero ou mais repetições deste tipo. Por exemplo: `cpf[]` denota uma lista de CPF's válidos.

Esses dois modificadores podem ser combinados e repetidos livremente. Alguns exemplos: `int[]?` significa ou `null` ou uma lista de `int`'s. `string[][]` significa uma lista de listas de `string`'s. `bool?[]` significa uma lista de ou `true` ou `false` ou `null`.

## Tipos compostos

Objetos compostos podem ser construídos, similar a classes, interfaces ou estruturas em outras linguagens. A sintaxe vem na forma de uma sequência de campos entre chaves, onde cada campo possui um nome e um tipo. Por exemplo:

```
{
  name: string
  age: uint
}
```

Os campos podem vir em qualquer ordem desde de que não haja repetição. Qualquer tipo é válido em um campo, incluindo optionais, listas ou outros objetos. Por exemplo:

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

## Enum

Em adição aos tipos anteriores um `enum` representa um conjunto limitado de possibilidades de valores. Por padrão os
