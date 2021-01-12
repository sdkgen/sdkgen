# Problemas comuns

## TypeError: Class constructor BaseApiConfig cannot be invoked without 'new'

O target para TypeScript em Node é previamente compilado e distribuído para ES2017, que já é suportado por todas as versões não depreciadas do Node. No entanto o TypeScript por padrão cria projetos para ES5, versão que somente é útil quando visando browsers antigos como o Internet Explorer. A correção mais simples é modificar o `tsconfig.json` do seu projeto para uma versão do JavaScript igual ou maior que ES2017.
