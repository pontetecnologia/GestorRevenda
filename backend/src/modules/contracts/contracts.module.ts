import { Module, forwardRef } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [forwardRef(() => SyncModule)],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
