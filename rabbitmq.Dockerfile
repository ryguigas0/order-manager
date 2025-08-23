FROM rabbitmq:4.1.3-management-alpine

RUN apk update && apk add --no-cache wget && \
    wget https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v4.1.0/rabbitmq_delayed_message_exchange-4.1.0.ez \
         -P /opt/rabbitmq/plugins

RUN rabbitmq-plugins --offline enable rabbitmq_delayed_message_exchange
