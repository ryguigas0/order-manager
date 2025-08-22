import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

/**
 * Gera as opções de configuração para a conexão com o MongoDB.
 * @param configService Uma instância do ConfigService para ler as variáveis de ambiente.
 * @returns Um objeto de configuração MongooseModuleOptions.
 */
export const getMongooseOptions = (
  configService: ConfigService,
): MongooseModuleOptions => {
  // Lê as variáveis de ambiente do MongoDB
  const user = configService.get<string>('MONGO_USER');
  const pass = configService.get<string>('MONGO_PASS');
  const host = configService.get<string>('MONGO_HOST');
  const port = configService.get<number>('MONGO_PORT');
  const db = configService.get<string>('MONGO_DB');
  const authSource = configService.get<string>('MONGO_AUTH_SOURCE');

  const uri = `mongodb://${user}:${pass}@${host}:${port}/${db}`;

  return {
    uri,
    authSource,
  };
};
