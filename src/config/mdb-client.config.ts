import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getMongooseOptions = (
  configService: ConfigService,
): MongooseModuleOptions => {
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
