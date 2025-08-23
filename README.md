# Order Manager

## Contexto Funcional

Este projeto implementa um sistema de gerenciamento de pedidos para uma plataforma de e-commerce, focando no processamento robusto e assíncrono de eventos em tempo real. A solução foi desenhada para lidar com um alto volume de eventos, otimizando as operações por meio da combinação de uma fila de mensagens com processamento em lote.

O cenário funcional principal é o **pipeline de atendimento de um pedido**. Quando um cliente finaliza uma compra, um evento de "pedido criado" é gerado. A partir daí, uma série de etapas desacopladas ocorrem de forma assíncrona, como o processamento do pagamento, a reserva de estoque e o envio de notificações. O resultado esperado é que o pedido progrida por diferentes estágios (pendente, pagamento pendente, estoque pendente, pronto, enviado, entregue ou cancelado) de forma confiável e resiliente.

**Justificativa para o uso de RabbitMQ e Processamento em Lote:**

- **RabbitMQ (Mensageria Assíncrona)**: O uso de RabbitMQ é justificado pela necessidade de desacoplar os diferentes serviços que participam do ciclo de vida de um pedido (pagamentos, estoque, notificações, etc.). Isso aumenta a resiliência do sistema; por exemplo, se o serviço de e-mails estiver temporariamente indisponível, as outras operações, como pagamento e reserva de estoque, podem continuar. Além disso, melhora a experiência do usuário, que recebe uma resposta imediata de "pedido recebido" enquanto o processamento pesado ocorre em segundo plano.
- **Processamento em Lote**: O processamento em lote é utilizado para tarefas agendadas e de grande volume que não precisam ser executadas em tempo real. Neste projeto, ele é implementado para a **geração de relatórios de pedidos**. Um processo agendado (`@Cron('*/3 * * * * * ')` no arquivo `src/backoffice/backoffice.service.ts`) dispara a criação de relatórios agregados sobre o status dos pedidos, otimizando o uso de recursos ao não sobrecarregar o banco de dados com consultas analíticas complexas durante o horário de pico.

## Arquitetura e Design

### Arquitetura da Solução

A solução é baseada em uma arquitetura de microsserviços orientada a eventos, utilizando o NestJS como framework principal. Os componentes da arquitetura são:

- **API Gateway (Backoffice)**: Um ponto de entrada (`backoffice.controller.ts`) que expõe um endpoint HTTP para receber novas requisições de pedidos e as publica na fila do RabbitMQ.
- **RabbitMQ**: Atua como o "message broker", gerenciando as filas e a distribuição de mensagens (eventos) entre os serviços.
- **Serviços (Módulos NestJS)**:
  - `Orders`: O serviço central que orquestra o ciclo de vida do pedido. Ele consome eventos de outros serviços (como pagamento e estoque) e atualiza o estado do pedido no banco de dados.
  - `Payment`: Responsável por simular o processamento e a confirmação de pagamentos.
  - `Stock`: Responsável por simular a reserva e confirmação de estoque.
- **MongoDB**: O banco de dados NoSQL utilizado para persistir o estado dos pedidos e os relatórios.

### Design Patterns Utilizados

- **State Machine (Máquina de Estados)**: O ciclo de vida de um pedido é modelado como uma máquina de estados finitos. Cada pedido transita por diferentes status (`pending`, `pending-payment`, `pending-stock`, `ready`, `canceled`, etc.) de forma bem definida, com base nos eventos recebidos. Isso garante que um pedido só possa passar para um novo estado se a transição for válida, aumentando a consistência e a previsibilidade do sistema. A implementação pode ser vista no `orders.service.ts`, onde o status de um pedido é verificado antes de cada transição.

- **Envelope Wrapper**: Todas as mensagens trocadas via RabbitMQ são encapsuladas em um "envelope" (`EventData` em `src/util/EventData.ts`). Este envelope adiciona metadados essenciais à mensagem de negócio (o `payload`), como um `eventId` único para idempotência, `currentTry` para controle de retentativas e informações de `backoff` (delay e número máximo de tentativas). Isso padroniza a comunicação entre serviços e facilita a implementação de lógicas de resiliência.

- **Idempotência**: Em um sistema de mensageria que garante a entrega "pelo menos uma vez", uma mensagem pode ser entregue mais de uma vez. Para evitar processamento duplicado (como cobrar um cliente duas vezes), os consumidores são idempotentes. A implementação (`validateOrderIdempotency` em `orders.service.ts`) utiliza o `eventId` do envelope para verificar se um evento já foi processado antes de executar a lógica de negócio, garantindo que a mesma operação não seja realizada múltiplas vezes.

### Decisões de Design e Trade-offs

- **MongoDB para Persistência**: A escolha do MongoDB foi motivada por sua flexibilidade de schema e seu modelo de documento, que se alinha bem com o conceito de um "pedido" como um agregado de negócio. A decisão de embutir (`embedding`) os dados do cliente, itens e histórico de status dentro de um único documento de pedido foi um trade-off consciente. Embora aumente a duplicação de dados, essa abordagem otimiza drasticamente as operações de leitura, eliminando a necessidade de `joins` complexos, e garante a atomicidade das escritas em um único documento.

- **Retry com Atraso e Backoff Exponencial**: A estratégia de retry implementada não é imediata. Quando um processamento falha (ex: confirmação de pagamento), a mensagem é reenviada para a fila com um atraso (`x-delay`) que aumenta exponencialmente a cada tentativa (`Math.pow(5, retryEvent.currentTry) * 1000`). Isso dá tempo para que serviços externos instáveis se recuperem e evita sobrecarregar um sistema já debilitado com novas tentativas imediatas. A configuração do RabbitMQ para suportar mensagens atrasadas é feita no `rabbitmq.Dockerfile`.

- **Dead Letter Queue (DLQ)**: Mensagens que falham consistentemente mesmo após todas as tentativas de retry são enviadas para uma DLQ. A configuração (`rmq-client.config.ts`) define o `x-dead-letter-exchange` para capturar essas mensagens. Um serviço no módulo `backoffice` consome da DLQ e persiste as mensagens falhas no MongoDB para análise posterior, garantindo que nenhuma informação crítica seja perdida.

## Resiliência e Escalabilidade

### Resiliência a Falhas

A solução é projetada para ser resiliente a falhas de várias maneiras:

- **Desacoplamento de Serviços**: Graças ao RabbitMQ, a falha de um serviço (por exemplo, o serviço de estoque) não derruba todo o sistema. As mensagens simplesmente permanecerão na fila até que o serviço se recupere e possa processá-las.
- **Retries para Erros Transitórios**: O mecanismo de retry com backoff exponencial permite que o sistema se recupere automaticamente de falhas temporárias, como problemas de conexão de rede ou timeouts de API.
- **Dead Letter Queue (DLQ)**: Para erros persistentes, a DLQ evita que mensagens "envenenadas" travem o sistema em um loop infinito. Elas são isoladas para análise humana, garantindo que os dados não sejam perdidos.
- **Persistência de Mensagens e Filas**: As filas e mensagens no RabbitMQ são configuradas como duráveis e persistentes, respectivamente (`durable: true`, `persistent: true`). Isso garante que, mesmo em caso de reinicialização do broker do RabbitMQ, as mensagens não processadas não sejam perdidas.

### Escalabilidade

- **Escalabilidade Horizontal de Consumidores**: Como os serviços são desacoplados, é possível escalar cada componente de forma independente. Se o processamento de pagamentos se tornar um gargalo, podemos simplesmente adicionar mais instâncias do serviço de `Payment` para consumir mensagens da mesma fila em paralelo, aumentando a vazão.
- **Sharding no MongoDB**: Para um volume de dados muito alto, o MongoDB pode ser escalado horizontalmente através de sharding, distribuindo a carga de dados e consultas entre múltiplos servidores.
- **Clusterização do RabbitMQ**: O próprio RabbitMQ pode ser configurado em um cluster para alta disponibilidade e para distribuir a carga de mensagens entre vários nós.

### Encaixe em uma Arquitetura de Microserviços

Este projeto representa um componente dentro de uma arquitetura de microserviços mais ampla. Em um cenário de produção, teríamos outros microserviços independentes, como:

- **Serviço de Catálogo**: Gerenciaria os produtos.
- **Serviço de Clientes**: Gerenciaria os dados dos usuários.
- **Serviço de Notificações**: Responsável por enviar e-mails, SMS, etc.

O `Order Manager` se comunicaria com esses outros serviços através de eventos no RabbitMQ. Por exemplo, quando um pedido estivesse com status "pronto", ele poderia publicar um evento `order.ready_for_shipping`, que seria consumido por um serviço de Logística para iniciar o processo de entrega. Essa abordagem permite que cada serviço evolua de forma independente e promove uma arquitetura flexível e de fácil manutenção.

## Instruções de Execução

### Pré-requisitos

- Docker
- Docker Compose

### Configuração e Execução

1.  **Clonar o repositório:**

    ```bash
    git clone https://github.com/ryguigas0/order-manager.git
    cd order-manager
    ```

2.  **Configurar Variáveis de Ambiente:**
    Copie o arquivo `.env.example` para um novo arquivo chamado `.env`.

    ```bash
    cp .env.example .env
    ```

    As configurações padrão devem funcionar para um ambiente local com Docker.

3.  **Construir e Iniciar os Containers:**
    Use o Docker Compose para construir as imagens e iniciar todos os serviços (a aplicação Node.js, RabbitMQ e MongoDB).

    ```bash
    docker-compose up --build
    ```

    A aplicação estará disponível em `http://localhost:3000`.

### Testando a Aplicação

- **Criar um Pedido:**
  Use o endpoint do backoffice para enviar um novo pedido para a fila.

  ```bash
  curl --location --request POST 'http://localhost:3000/backoffice/orders' \
  --header 'Content-Type: application/json' \
  --data '{
      "customerId": 12345,
      "customer": {
          "name": "John Doe",
          "email": "johndoe@email.com",
          "address": {
              "billing": "123 Main St, Anytown, USA",
              "delivery": "456 Oak Ave, Sometown, USA"
          }
      },
      "items": [
          {
              "itemId": 54321,
              "itemName": "Laptop Pro",
              "unitPrice": 1500.00,
              "quantity": 1
          },
          {
              "itemId": 98765,
              "itemName": "Wireless Mouse",
              "unitPrice": 75.50,
              "quantity": 1
          }
      ],
      "totalAmount": 1575.50,
      "paymentMethod": "pix"
  }'
  ```

* **Listar Pedidos Prontos:**
  Para ver os pedidos que completaram o fluxo e estão prontos para envio.

  ```bash
  curl 'http://localhost:3000/orders/ready'
  ```

* **Listar Relatórios Gerados:**
  Para ver os relatórios de status de pedidos que são gerados periodicamente.

  ```bash
  curl 'http://localhost:3000/orders/reports'
  ```
