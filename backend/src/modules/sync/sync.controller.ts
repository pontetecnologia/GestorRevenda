// sync.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Sincronização')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings/intelidata')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('sync')
  @Roles('ADMIN')
  sync() { return this.syncService.syncContracts(); }
}
