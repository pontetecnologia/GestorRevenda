// servers.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ServersService } from './servers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Servidores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('servers')
export class ServersController {
  constructor(private serversService: ServersService) {}

  @Get()
  findAll() { return this.serversService.findAll(); }

  @Get('summary')
  getSummary() { return this.serversService.getSummary(); }

  @Get(':id')
  findById(@Param('id') id: string) { return this.serversService.findById(id); }

  @Post()
  @Roles('MANAGER', 'ADMIN')
  create(@Body() data: any) { return this.serversService.create(data); }

  @Put(':id')
  @Roles('MANAGER', 'ADMIN')
  update(@Param('id') id: string, @Body() data: any) { return this.serversService.update(id, data); }

  @Delete(':id')
  @Roles('ADMIN')
  delete(@Param('id') id: string) { return this.serversService.delete(id); }
}
