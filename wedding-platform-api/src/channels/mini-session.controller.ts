import { Body, Controller, Post } from '@nestjs/common';
import { miniSessionSchema } from '@wedding/shared';
import { MiniSessionService } from './mini-session.service';

@Controller('channels/mini')
export class MiniSessionController {
  constructor(private readonly miniSessionService: MiniSessionService) {}

  @Post('session')
  exchange(@Body() body: unknown) { return this.miniSessionService.exchange(miniSessionSchema.parse(body)); }
}
