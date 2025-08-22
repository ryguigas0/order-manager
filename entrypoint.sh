#!/bin/sh

# Aguarda o MongoDB iniciar
echo "Aguardando o MongoDB..."
until mongo --host mongo --eval "print('MongoDB pronto.')"; do
  sleep 1
done

# Configuração do MongoDB
echo "Configurando o MongoDB..."
mongo --host mongo <<EOF
use order_manager
db.createCollection('orders')
db.createCollection('reports')

use infra
db.createCollection('dlq')
EOF
echo "MongoDB configurado."

# Aguarda o RabbitMQ iniciar e o painel de gerenciamento estar disponível
echo "Aguardando o RabbitMQ..."
until curl -s -o /dev/null -w "%{http_code}" http://${RMQ_USER}:${RMQ_PASS}@rabbitmq:15672/api/overview | grep -q 200; do
  sleep 2
done
echo "RabbitMQ pronto."

# Configuração do RabbitMQ usando a API HTTP
echo "Configurando o RabbitMQ..."
curl -i -u ${RMQ_USER}:${RMQ_PASS} -H "content-type:application/json" \
    -XPUT http://rabbitmq:15672/api/exchanges/%2f/orders \
    -d'{"type":"topic","durable":true}'

curl -i -u ${RMQ_USER}:${RMQ_PASS} -H "content-type:application/json" \
    -XPUT http://rabbitmq:15672/api/exchanges/%2f/dead-letters \
    -d'{"type":"topic","durable":true}'

echo "RabbitMQ configurado. Iniciando a aplicação..."

# Inicia a aplicação
exec npm run start:prod
