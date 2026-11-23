# Aliança em Cristo

Crie um sistema web administrativo para a igreja MARC — Ministério Aliança Renascendo em Cristo. O sistema deve funcionar bem no celular e no computador, em português do Brasil, com visual limpo e navegação simples.

Quero uma primeira versão funcional, pronta para testar. Trabalhe no mesmo projeto do começo ao fim. Use uma única aplicação e o Supabase para autenticação e banco de dados. Se já houver um projeto aberto, aproveite o que existe. Prossiga com as decisões abaixo sem pedir confirmações intermediárias.

1. ACESSO E PAINEL

- Login por e-mail e senha para usuários autorizados, sem cadastro público.

- Dois perfis: administrador, com acesso completo, e secretaria, com acesso a membros, visitantes e aniversários.

- O painel deve mostrar o total de membros ativos, os visitantes cadastrados no mês e os aniversários próximos. Exiba o resumo financeiro somente para o administrador.

- Proteja as permissões também no banco de dados, com RLS no Supabase. A secretaria não pode consultar dados financeiros nem a lista de dizimistas. Nunca coloque a chave service_role no navegador.

2. CADASTRO DE MEMBROS

- Campos: nome completo, telefone ou WhatsApp, data de nascimento, data de ingresso, situação (ativo ou inativo) e observações opcionais.

- Permita cadastrar, editar, pesquisar por nome ou telefone e inativar membros. Preserve o histórico financeiro dos membros inativados.

- Inclua no cadastro uma opção “É dizimista?”, visível e editável apenas pelo administrador. Os dados desse campo também devem ficar protegidos no banco.

3. ANIVERSÁRIOS

- Mostre no painel quem faz aniversário hoje e nos próximos 7 dias, usando o fuso America/Sao_Paulo.

- Crie uma tela para consultar os aniversariantes por mês.

- Ao lado de cada aniversariante, coloque um botão para abrir o WhatsApp com uma mensagem de parabéns preenchida. O usuário deve revisar e apertar “Enviar” no WhatsApp. Não use integração paga nem envio automático.

4. CADASTRO DE VISITANTES

- Campos: nome completo, número de telefone ou WhatsApp com DDD, data da visita e observações opcionais. Nome, telefone e data são obrigatórios.

- Permita cadastrar, editar e buscar por nome ou telefone.

- Inclua um botão para abrir o WhatsApp com uma mensagem de boas-vindas preenchida.

- Permita converter um visitante em membro, reaproveitando os dados e mantendo o registro da visita. Evite duplicar o membro se a conversão for repetida.

5. DIZIMISTAS E FINANCEIRO

- Crie uma tela “Dizimistas” com pesquisa por nome e histórico de dízimos de cada pessoa. Use o mesmo cadastro de membros para evitar cadastrar a pessoa duas vezes.

- Registre entradas de dízimo e oferta. Campos: tipo, valor, data, forma de pagamento (Pix, dinheiro, transferência ou outro) e observação opcional.

- No dízimo, permita vincular um membro ou registrar como anônimo. Registre ofertas sem identificação do doador.

- Permita consultar e corrigir lançamentos. Para cancelar um lançamento, peça confirmação, preserve o registro e retire seu valor dos totais.

- Filtre os lançamentos por mês, ano e tipo. Mostre os totais de dízimos, ofertas e entradas do período. Permita exportar os resultados filtrados em CSV.

- Use valores com precisão de centavos e exiba datas e moeda no formato brasileiro.

6. LIMITE DA ENTREGA

- Faça somente as telas e funções acima. Deixe de fora site público, aplicativo de loja, pagamentos online, despesas, gráficos elaborados e alertas automáticos.

- Todos os formulários, botões e filtros devem funcionar com dados reais do banco. Use nomes fictícios nos testes.

- Entregue o SQL do Supabase, incluindo as políticas de acesso. Se você não puder executar a configuração no Supabase, diga exatamente o que preciso colar ou configurar e onde.

- Valide os fluxos principais: cadastrar membro e visitante, listar aniversários, converter visitante, lançar dízimo e oferta, conferir os totais e verificar que a secretaria não acessa o financeiro.

- Se estiver em um ambiente com acesso a arquivos, implemente diretamente no projeto e não cole o código inteiro no chat. Ao terminar, informe em até 10 linhas o que ficou pronto, o que foi testado e os passos para conectar o Supabase, criar o primeiro administrador e publicar.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9e783814-9f7e-56ef-b37c-c7a9ca88f2e1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
