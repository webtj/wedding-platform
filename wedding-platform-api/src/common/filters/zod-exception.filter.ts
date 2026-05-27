import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const messages = exception.issues.map((i) => `${i.path.join('.')}: ${i.message}`);

    response.status(400).json({
      statusCode: 400,
      message: messages.join('; '),
      error: 'Validation Error'
    });
  }
}
