# Barbearia Demonstração

Site responsivo com marcações online, horários calculados a partir dos serviços escolhidos, prevenção de conflitos na base de dados PostgreSQL e notificações por e-mail para a barbearia e para o cliente.

## Antes de aceitar marcações reais

O site usa dados fictícios. Substitui o nome, contactos, morada, serviços, preços, duração dos serviços e horário em `server.js` e `public/index.html`. Configura também uma política de privacidade adequada ao responsável real pelos dados. O serviço de marcações não aceita pedidos até a base de dados e o e-mail estarem configurados.

## Preparar o serviço

1. Instala Node.js 20 ou superior e cria uma base de dados PostgreSQL acessível pela internet.
2. Copia `.env.example` para `.env`.
3. Preenche `DATABASE_URL` com a ligação PostgreSQL.
4. Cria uma conta num serviço de envio de e-mail compatível com a API Resend, verifica o domínio do remetente e preenche `RESEND_API_KEY`, `EMAIL_FROM` e `OWNER_EMAIL`. Não publiques a chave da API no site nem a coloques em `public/`.
5. Instala as dependências com `npm install` e inicia com `npm run dev`.
6. Abre `http://localhost:3000` para rever o site. O servidor cria a tabela de marcações ao iniciar.
7. Para marcações online públicas, publica o serviço Node.js num alojamento com HTTPS e configura as variáveis de ambiente nesse alojamento. Usa uma base PostgreSQL persistente; não uses um ficheiro local temporário como base de dados.

## O que o fluxo faz

- Mostra datas até 60 dias no futuro, no fuso horário de Lisboa.
- Abre de terça a sábado, das 09:00 às 19:00; estes valores são exemplos e devem ser alterados para os horários reais.
- Calcula a disponibilidade com base na duração de cada serviço e nas marcações existentes.
- Reserva o horário dentro de uma transação com bloqueio por dia, impedindo marcações simultâneas sobrepostas.
- Envia um aviso para a barbearia e uma confirmação para o cliente através da API de e-mail.
- Se o envio de e-mail falhar depois de guardar a marcação, a marcação continua registada e o ecrã informa que o e-mail está pendente; o erro fica registado no servidor.

## Configuração do negócio

- Serviços, preços e durações: array `services` no início de `server.js`.
- Dias e horas de abertura: `openDays`, `openMinute` e `closeMinute` em `server.js`.
- Nome, morada e contactos de demonstração: endpoint `/api/config` em `server.js`.
- Fotografias, textos e aviso de demonstração: `public/index.html`.

Este projeto inclui uma base funcional, mas não está publicado na internet. Só passa a receber marcações dos clientes quando a base de dados, o serviço de e-mail e o alojamento estiverem configurados com as contas reais da barbearia.
