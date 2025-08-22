#!/bin/sh

# Inicia o servidor RabbitMQ em background
docker-entrypoint.sh rabbitmq-server &

# Aguarda o RabbitMQ estar totalmente operacional
echo "Aguardando o RabbitMQ iniciar..."
until rabbitmqctl status; do
  sleep 2
done
echo "RabbitMQ iniciado."

# Declara as exchanges necessárias usando as variáveis de ambiente
echo "Criando exchanges..."
rabbitmqadmin -u "${RABBITMQ_DEFAULT_USER}" -p "${RABBITMQ_DEFAULT_PASS}" declare exchange name=orders type=topic
rabbitmqadmin -u "${RABBITMQ_DEFAULT_USER}" -p "${RABBITMQ_DEFAULT_PASS}" declare exchange name=dead-letters type=topic
echo "Exchanges criadas."

# Traz o processo do servidor para o primeiro plano para manter o contêiner em execução
fg
