import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { SuperMenusController } from './super-menus.controller';
import { SuperMenusService } from './super-menus.service';
import { SuperRolesController } from './super-roles.controller';
import { SuperRolesService } from './super-roles.service';
import { SuperTenantsController } from './super-tenants.controller';
import { SuperTenantsService } from './super-tenants.service';
import { SuperUsersController } from './super-users.controller';
import { SuperUsersService } from './super-users.service';
import { SuperMaterialTypesController } from './super-material-types.controller';
import { SuperMaterialTypesService } from './super-material-types.service';
import { SuperOverviewController } from './super-overview.controller';
import { SuperOverviewService } from './super-overview.service';

@Module({
  imports: [IdentityModule],
  controllers: [
    SuperTenantsController,
    SuperUsersController,
    SuperMenusController,
    SuperRolesController,
    SuperMaterialTypesController,
    SuperOverviewController
  ],
  providers: [
    SuperTenantsService,
    SuperUsersService,
    SuperMenusService,
    SuperRolesService,
    SuperMaterialTypesService,
    SuperOverviewService
  ]
})
export class SuperAdminModule {}
