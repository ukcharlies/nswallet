import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo(): { name: string; version: string; description: string } {
    return {
      name: 'NSWallet API',
      version: '1.0.0',
      description: 'Secure wallet system with banking-grade security',
    };
  }
}
