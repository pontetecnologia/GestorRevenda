// reports.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Relatórios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('saas')
  getSaas(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getSaasIndicators(startDate, endDate);
  }

  @Get('abc')
  getAbc() { return this.reportsService.getAbcCurve(); }

  @Get('profitability')
  getProfitability(@Query('orderBy') orderBy?: string) {
    return this.reportsService.getProfitability(orderBy);
  }

  @Get('cancellations')
  getCancellations(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getCancellations(startDate, endDate);
  }

  @Get('general')
  getGeneral() { return this.reportsService.getGeneral(); }
}
