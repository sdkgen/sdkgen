# REST

Em muitos casos queremos expor uma API para externos integrarem e nestes casos o formato REST é um padrão universalmente entendido e aceito, com boas ferramentas em todas as plataformas e linguagens. No sdkgen é possível utilizar a annotation `@rest` para criar endpoints vinculados a suas funções.

Para criar uma função REST, inicie criando uma função normal do sdkgen, utilize quaisquer argumentos, tipo de retorno e nome que fizer sentido no seu caso de uso. Por exemplo:

```
fn getPostsByUser(userId: uuid, since: datetime?, until: datetime?): Post[]
```

Então adicione a annotation `@rest`. Ela deve definir obrigatoriamente um método e uma path, podendo incluir detalhamento adicional para os headers e body. Neste caso:

```
@rest GET /users/{userId}/posts?{since}&{until}
fn getPostsByUser(userId: uuid, since: datetime?, until: datetime?): Post[]
```

Uma vez que exista ao menos 1 endpoint REST na sua aplicação, um Swagger UI será criado automaticamente com a descrição do endpoint e documentação através de `@description` e `@arg`. Para entender mais sobre como configurar este comportamento, leia a página sobre um [Servidor em Node.js](../targets/servidor-nodejs.md).

Caso queira que sua função esteja disponível exclusivamente como REST utilize `@hidden`.

## Anatomia do `@rest`

```
@rest MÉTODO /caminho/do/recurso/com/{arg1}/e/{arg2}?{argNaQuery1}&{argNaQuery2} [header Nome: {header}] [body {argBody}]
```

Cada um dos elementos acima serão explicados nas próximas sessões.

## Método

Os seguintes métodos HTTP são suportados: `GET`, `POST`, `PUT`, `DELETE` e `PATCH`. Alguns exemplos:

```
@rest GET /status
fn getStatus(): bool

@rest DELETE /product/{id}
fn deleteProduct(id: uuid)

@rest POST /product [body {newProduct}]
fn createProduct(newProduct: Product): Product
```

## Caminho

Logo após o método o segundo elemento obrigatório do `@rest` é o caminho (ou "endpoint"). Este caminho deve começar com uma "/" e utilizar caracteres permitidos em uma URL. Neste caminho podem ser incluídos alguns segmentos dinâmicos vinculados aos argumentos da função, como `/product/{id}` onde `id` é um argumento. O caminho pode incluir múltiplos destes argumentos.

Para um argumento poder ser utilizado dentro de um caminho ele deve ter um dos seguintes tipos: `bool`, `int`, `uint`, `bigint`, `float`, `string`, `date`, `datetime`, `money`, `cpf`, `cnpj`, `uuid`, `hex`, `base64` ou ser um enum. Note que o tipo não pode ser nulável.

Por exemplo:

```
@rest GET /stores/{storeId}/products/{id}
fn getProduct(storeId: uint, id: uint): Product?
```

Neste caso uma chamada por `GET /stores/3/products/47` será similar a chamar `getProduct(2, 47)`.

Argumentos também podem ser recebidos como parte da _query_. A _query_ é a parte da URL que vem depois do `?`, por exemplo: `GET /orders?state=open`. Para estes argumentos especifique confirme o exemplo abaixo:

```
@rest GET /stores/{storeId}/orders?{state}&{date}
fn getOrders(storeId: uint, state: State?, date: date?): Order[]
```

Neste caso a ordem dos argumentos não será levada em consideração e os tipos aceitos são os mesmos que podem aparecer no caminho, com a exceção de que eles podem ser nuláveis. Neste caso é comum (mas não obrigatório) que os argumentos sejam de fato nuláveis.

## Headers

Em uma API REST pode ser necessário receber argumentos através de headers, especialmente em caso de autenticação. Para receber um header escreva conforme o seguinte exemplo:

```
@rest GET /me [header Authorization: {token}]
fn getCurrentUser(token: base64): User
```

Os tipos permitidos são os mesmos listados para o caminho, podendo ser opcionais: `bool`, `int`, `uint`, `bigint`, `float`, `string`, `date`, `datetime`, `money`, `cpf`, `cnpj`, `uuid`, `hex`, `base64` ou ser um enum. Múltiplos headers podem ser especificados.

## Body

Geralmente os métodos `POST`, `PUT` e `PATCH` esperam que um body seja enviado na requisição, embora um body possa ser enviado em qualquer método. No sdkgen você pode encaminhar este body para um dos argumentos da função:

```
type NewProduct {
  name: string
}

type Product {
  id: uuid
  ...NewProduct
}

@rest POST /products [body {newProduct}]
fn createProduct(newProduct: NewProduct): Product
```

Apenas um argumento pode ser o body da requisição REST.

Se o `Content-Type` tiver sido passado como `application/json`, então o body será lido conforme as regras de codificação e decodificação padrões do sdkgen. Caso contrário o comportamento é levemente diferente a depender do tipo do argumento:

| Tipo                                                                            | Comportamento                                                                         |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| qualquer nulável                                                                | O argumento será considerado `null` caso o body esteja em branco.                     |
| `bool`                                                                          | É esperado que o body seja literalmente `true` ou `false`.                            |
| `int`, `uint`, `bigint` ou `float`                                              | O body seve conter apenas o número, sem aspas.                                        |
| `string`, `date`, `datetime`, `money`, `cpf`, `cnpj`, `uuid`, `hex` ou `base64` | O conteúdo do body será interpretado diretamente. Não deve estar entre aspas.         |
| `xml`, `bytes` ou `html`                                                        | Similar ao caso acima. O conteúdo do body será passado tal como está.                 |
| `json`                                                                          | Um objeto JSON arbitrário será esperado.                                              |
| qualquer enum                                                                   | O body deverá ser um dos valores possíveis do enum, sem aspas.                        |
| qualquer tipo composto                                                          | O body será lido conforme as regras de codificação e decodificação padrões do sdkgen. |

## Retorno

A sua função pode retornar qualquer um dos tipos suportados pelo sdkgen. No entanto o comportamento exato irá variar a depender do tipo.

### Código de Status HTTP

| Situação                                                      | Código de Status          |
| ------------------------------------------------------------- | ------------------------- |
| Sucesso, mas com retorno null ou sem retorno e com método GET | 404 Not Found             |
| Sucesso, mas com retorno null ou sem retorno e outros métodos | 204 No Content            |
| Sucesso, com qualquer outro tipo de retorno                   | 200 Ok                    |
| Erro lançado dentro da função                                 | 400 Bad Request           |
| Erro não especificado durante o processamento da requisição   | 500 Internal Server Error |

### Codificação do corpo da resposta

Se a requisição tiver passado o header `Accept` como `application/json`, então o body será gerado conforme as regras de codificação e decodificação padrões do sdkgen. Caso contrário o comportamento será dependente do tipo de retorno.

| Tipo                                                                                                                      | Comportamento                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bool`, `int`, `uint`, `float`, `string`, `date`, `datetime`, `money`, `bigint`, `cpf`, `cnpj`, `uuid`, `hex` ou `base64` | Valor será posto diretamente no body, sem aspas adicionais. O `Content-Type` será `text/plain`.                                                                                                                         |
| `html`                                                                                                                    | Valor será posto diretamente no body, sem aspas adicionais. O `Content-Type` será `text/html`.                                                                                                                          |
| `bytes`                                                                                                                   | Os bytes serão entregues diretamente, ideal para oferecer download de arquivos. O `Content-Type` será detectado dinamicamente a depender do conteúdo. Caso não seja possível detectar, será `application/octet-stream`. |
| outros tipos                                                                                                              | O body será gerado conforme as regras de codificação e decodificação padrões do sdkgen.                                                                                                                                 |
