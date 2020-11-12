# Comportamento de `date` e `datetime`

Como descrito na [sessão sobre tipos primitivos](../descrevendo-api.md), `date` e `datetime` possuem significados parecidos, mas fundamentalmente diferentes. Utilize `datetime` quando quiser se referir a um ponto no tempo ou `date` quando quiser se referir a uma data no calendário.

## Ponto no tempo: `datetime`

Um ponto instantâneo no tempo deve ser o mesmo instante para todos os observadores, independente de onde eles estão. Por conta disso o sdkgen sempre irá corrigir as variações de timezone dos `datetime`s trocados entre as duas partes. Dessa forma uma das partes pode falar sobre um instante no tempo em seu fuso horário local e o outro lado irá receber exatamente o mesmo instante, mas convertido no seu fuso horário próprio. Esse comportamento é conveniente ao trocar a informação da data de publicação de uma postagem, por exemplo.

Note que o "inicio do dia" e o "fim do dia" são momentos diferentes em fusos horários diferentes.

## Data no calendário: `date`

Um dia específico no calendário é o mesmo em todo o globo, embora represente um intervalo de tempo diferente em cada fuso horário. Datas serão passadas pelo sdkgen sem nenhuma alteração. Esse tipo é útil para se referir a um feriado, ou a um intervalo de datas em um relatório financeiro.

Como a maioria das linguagens não possui um tipo nativo para uma data, o mesmo tipo que `datetime` será utilizado. O tempo será recebido como se fosse o início do dia na sua timezone local. Lembre-se de tratar antes de utilizar. Por exemplo, caso esteja fazendo um filtro de datas, considere trocar a data final para "fim do dia" ou somar mais um dia, de forma que o intervalo seja inclusivo.
