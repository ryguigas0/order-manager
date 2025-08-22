import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getVersion(): string {
    return this.configService.get<string>('VERSION', '0.0.0');
  }
}
