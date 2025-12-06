import { Module } from '@nestjs/common';
import { UploadsController } from './uploads/uploads.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
