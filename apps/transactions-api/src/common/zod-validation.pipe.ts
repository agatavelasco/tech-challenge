import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';

export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform<
  unknown,
  z.infer<TSchema>
> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const { formErrors, fieldErrors } = z.flattenError(result.error);
      throw new BadRequestException({
        statusCode: 400,
        message: formErrors[0] ?? 'Dados inválidos',
        errors: fieldErrors,
      });
    }
    return result.data;
  }
}
