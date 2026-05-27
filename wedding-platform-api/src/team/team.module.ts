import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [IdentityModule],
  controllers: [TeamController, RolesController],
  providers: [TeamService, RolesService],
  exports: [TeamService, RolesService]
})
export class TeamModule {}
