import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';

/**
 * Root application controller
 * Health check and basic info endpoints
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check endpoint
   * GET /api/v1/health
   */
  @Public()
  @Get('health')
  healthCheck(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * API info endpoint
   * GET /api/v1
   */
  @Public()
  @Get()
  getInfo(): { name: string; version: string; description: string } {
    return this.appService.getApiInfo();
  }
}
