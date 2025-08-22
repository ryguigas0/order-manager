// src/config/rmq-client.config.ts
import { ConfigService } from '@nestjs/config';
import { RmqOptions, Transport } from '@nestjs/microservices';

/**
 * Gera as opções de configuração para um cliente RabbitMQ.
 * @param queue O nome da fila para a qual se conectar.
 * @param configService Uma instância do ConfigService para ler as variáveis de ambiente.
 * @returns Um objeto de configuração RmqOptions.
 */
export const getRmqOptions = (
  queue: string,
  configService: ConfigService,
): RmqOptions => {
  // Lê as credenciais do RabbitMQ do .env
  const user = configService.get<string>('RMQ_USER');
  const pass = configService.get<string>('RMQ_PASS');
  const host = configService.get<string>('RMQ_HOST');
  const port = configService.get<string>('RMQ_PORT');

  return {
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${user}:${pass}@${host}:${port}`],
      queue: queue, // O nome da fila é dinâmico
      exchange: 'orders',
      exchangeType: 'topic',
      wildcards: true,
      persistent: true,
      queueOptions: {
        durable: true,
        messageTtl: 5000,
        arguments: {
          'x-dead-letter-exchange': 'orders',
          'x-dead-letter-routing-key': 'dlq',
        },
      },
    },
  };
};
