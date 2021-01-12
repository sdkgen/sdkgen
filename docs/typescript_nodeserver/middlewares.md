# Middlewares

Um middleware é uma função registrada que intermedeia todas as chamadas. O conjunto de middlewares funciona como uma pilha em que o último middleware registrado é o primeiro a receber a requisição. Este pode manipular o `ctx` livremente e deve retornar uma resposta ou lançar um erro. O middleware pode opcionalmente chamar uma ou mais vezes o próximo middleware através da função `next` recebida como argumento. A maioria dos middlewares irá chamar `next` exatamente uma vez, mas isso não é uma regra.

O retorno de `next` pode também ser manipulado antes de ser retornado. No fim da pilha o último middleware recebe uma função `next` que é a própria implementação da execução da chamada em questão, localizada no `api.fn`. Caso o nome da função em `ctx.request.name` tenha sido alterado, este será chamado.

```typescript
api.use(async (ctx, next) => {
  // Faça qualquer coisa com o `ctx` aqui.
  // O nome da função é `ctx.request.name` e os argumentos `ctx.request.args`.
  const reply = await next();
  // Faça qualquer coisa com a resposta aqui.
  return reply;
});
```

Você pode, por exemplo:

- Salvar os dados da requisição e resposta em um log;
- Medir estatísticas das requisições;
- Controlar rate limit;
- Bloquear ou redirecionar chamadas a depender da função e dos argumentos;
- Implementar cache;
- Implementar re-tentativa a depender de algum erro específico (chamando `next` mais de uma vez);
- Modificar o erro retornado (`try`/`catch` em volta do `next`).
