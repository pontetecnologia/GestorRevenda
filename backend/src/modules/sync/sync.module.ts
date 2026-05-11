import { Module, forwardRef } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SettingsModule } from '../settings/settings.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [
    SettingsModule,
    forwardRef(() => ContractsModule),
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
