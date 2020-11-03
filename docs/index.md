# Conhecendo o sdkgen

O **sdkgen** é uma ferramenta voltada para desenhar e implementar API's ricas recursos, mas com o mínimo de esforço para o desenvolvedor. O fluxo de trabalho envolve descrever os endpoints e tipos da API em uma linguagem também chamada "sdkgen". Com essas descrições é possível gerar código para utilizar como servidor ou como cliente desta API, ambos os lados provendo garantias fortes de corretude dos dados trafegados.

## Recursos

- Linguagem de descrição do contrato da API com tipagem forte.
- Bibliotecas para uso no servidor, facilitando a implementação da API. Atualmente disponível em Node.js e .NET Core.
- Bibliotecas para uso no cliente, facilitando o consumo da API, com suporte à Web, Android nativo, Node.js e Flutter.
- Um playground interativo para explorar e realizar chamadas.
- Criação de endpoints em formato padrão REST, incluindo Swagger automático com 1 linha.

## Características

O principal foco do sdkgen está na simplicidade de uso e de entendimento, tentando sempre não causar surpresas e lidar com o maior número possível de detalhes por conta própria. Dito isso, o sdkgen se limita a ser um protocolo de transporte (assim como gRPC, REST ou GraphQL são), não interferindo na arquitetura do seu projeto.

A linguagem do sdkgen permite descrever o contrato da sua API, por exemplo:

```
type User {
    id: uuid
    email: string
    name: string
}

fn login(email: string, password: string): User
fn logout()
fn me(): User
```

Alguns tipos primitivos já estão inclusos (como `string` e `uuid`), mas você pode definir tipos adicionais como `User` acima. Há suporte para listas e opcionais também. Por fim funções são definidas recebendo valores como argumentos e opcionalmente retornando dados. A descrição segue o formato de RPC (Remote Procedure Call) em que os clientes da API chamam essas funções, recebendo as respostas de forma assíncrona. No servidor o corpo dessas funções deve ser implementado. Todos os dados trafegados são validados nas duas pontas para garantir corretude.
