import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Contratos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private contractsService: ContractsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('idStatus') idStatus?: string,
    @Query('idStatuses') idStatuses?: string,
    @Query('tipoContrato') tipoContrato?: string,
    @Query('serverId') serverId?: string,
    @Query('onlyMigrated') onlyMigrated?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // idStatuses vem como "1,3,5" separado por vírgula
    const parsedStatuses = idStatuses
      ? idStatuses.split(',').map(Number).filter(Boolean)
      : undefined;

    return this.contractsService.findAll({
      search,
      idStatus: idStatus ? parseInt(idStatus) : undefined,
      idStatuses: parsedStatuses,
      tipoContrato,
      serverId,
      onlyMigrated: onlyMigrated === 'true',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.contractsService.findById(id);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.contractsService.getHistory(id);
  }

  @Put(':id/financial')
  @Roles('MANAGER', 'ADMIN')
  updateFinancial(
    @Param('id') id: string,
    @Body() dto: any,
    @Request() req,
  ) {
    return this.contractsService.updateFinancial(id, dto, req.user.id);
  }

  @Post(':id/migration')
  @Roles('MANAGER', 'ADMIN')
  createMigration(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.contractsService.createMigration(
      { ...dto, oldContractId: dto.oldContractId || id },
      req.user.id,
    );
  }

  @Post(':id/access-log')
  @HttpCode(201)
  logAccess(@Param('id') id: string, @Request() req, @Body() body: any) {
    const ip = req.headers?.['x-forwarded-for'] || req.ip || '';
    const userAgent = req.headers?.['user-agent'] || '';
    return this.contractsService.logAccess(id, req.user.id, ip, userAgent);
  }

  @Post(':id/link-server')
  @Roles('MANAGER', 'ADMIN')
  linkServer(@Param('id') id: string, @Body('serverId') serverId: string) {
    return this.contractsService.linkServer(id, serverId);
  }

  @Post(':id/unlink-server')
  @Roles('MANAGER', 'ADMIN')
  unlinkServer(@Param('id') id: string, @Body('serverId') serverId: string) {
    return this.contractsService.unlinkServer(id, serverId);
  }

  @Post(':id/bloquear')
  @Roles('SUPPORT', 'MANAGER', 'ADMIN')
  bloquear(@Param('id') id: string, @Request() req) {
    return this.contractsService.bloquearContrato(id, req.user.id);
  }

  @Post(':id/desbloquear')
  @Roles('SUPPORT', 'MANAGER', 'ADMIN')
  desbloquear(@Param('id') id: string, @Request() req) {
    return this.contractsService.desbloquearContrato(id, req.user.id);
  }

  @Get(':id/access-data')
  getAccessData(@Param('id') id: string) {
    return this.contractsService.getAccessData(id);
  }

  @Post(':id/access-data')
  @Roles('MANAGER', 'ADMIN')
  createAccessData(@Param('id') id: string, @Body() data: any) {
    return this.contractsService.createAccessData(id, data);
  }

  @Put(':id/access-data/:dataId')
  @Roles('MANAGER', 'ADMIN')
  updateAccessData(@Param('dataId') dataId: string, @Body() data: any) {
    return this.contractsService.updateAccessData(dataId, data);
  }

  @Delete(':id/access-data/:dataId')
  @Roles('MANAGER', 'ADMIN')
  deleteAccessData(@Param('dataId') dataId: string) {
    return this.contractsService.deleteAccessData(dataId);
  }
}
