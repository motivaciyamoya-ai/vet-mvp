import { Global, Module } from '@nestjs/common';
import { SecurityPoliciesService } from './security-policies.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [SecurityPoliciesService],
  exports: [SecurityPoliciesService],
})
export class SecurityModule {}
