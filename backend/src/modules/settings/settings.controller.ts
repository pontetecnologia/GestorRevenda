// settings.controller.ts
import { Controller, Get, Put, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Configurações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @Roles('MANAGER', 'ADMIN')
  getAll() { return this.settingsService.getAllSettings(); }

  @Put('intelidata')
  @Roles('ADMIN')
  updateIntelidata(@Body() body: { baseUrl: string; token?: string }) {
    return this.settingsService.updateIntelidata(body.baseUrl, body.token);
  }

  @Put('uniplus')
  @Roles('ADMIN')
  updateUniplus(@Body() body: { baseUrl: string; tenant: string; token?: string }) {
    return this.settingsService.updateUniplus(body.baseUrl, body.tenant, body.token);
  }

  @Post('intelidata/test')
  @Roles('ADMIN')
  testIntelidata() { return this.settingsService.testIntelidataConnection(); }

  @Get('goals')
  @Roles('MANAGER', 'ADMIN')
  getGoals(@Query('year') year?: string, @Query('month') month?: string) {
    return this.settingsService.getGoals(
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
    );
  }

  @Put('goals')
  @Roles('MANAGER', 'ADMIN')
  updateGoals(@Body() body: any) { return this.settingsService.updateGoals(body); }

  @Get('sync-logs')
  @Roles('MANAGER', 'ADMIN')
  getSyncLogs() { return this.settingsService.getSyncLogs(); }
}
