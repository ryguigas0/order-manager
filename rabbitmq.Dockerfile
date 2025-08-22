FROM rabbitmq:4.1.3-management-alpine as builder

RUN apk update && apk add --no-cache wget && \
    wget https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v4.1.0/rabbitmq_delayed_message_exchange-4.1.0.ez \
         -P /opt/rabbitmq/plugins

FROM rabbitmq:4.1.3-management-alpine

COPY --from=builder /opt/rabbitmq/plugins/rabbitmq_delayed_message_exchange-4.1.0.ez /opt/rabbitmq/plugins/

RUN rabbitmq-plugins enable rabbitmq_delayed_message_exchange

COPY rabbitmq-init.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/rabbitmq-init.sh

CMD ["rabbitmq-init.sh"]
