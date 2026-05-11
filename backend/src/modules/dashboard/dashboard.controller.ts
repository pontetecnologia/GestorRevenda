// dashboard.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  getSummary() { return this.dashboardService.getSummary(); }

  @Get('charts')
  getCharts(
    @Query('year') year?: string,
    @Query('yearNovos') yearNovos?: string,
  ) {
    return this.dashboardService.getCharts(
      year ? parseInt(year) : undefined,
      yearNovos ? parseInt(yearNovos) : undefined,
    );
  }
}
