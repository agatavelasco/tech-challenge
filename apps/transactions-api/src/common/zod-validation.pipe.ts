import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';

/**
 * Valida com os schemas do pacote `contracts`, o mesmo que o dashboard usa no
 * formulário. Erros saem por campo para a interface marcar o input certo.
 */
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
        // Schemas de valor único (ex.: o id na URL) não têm campos: o erro vem em formErrors.
        message: formErrors[0] ?? 'Dados inválidos',
        errors: fieldErrors,
      });
    }
    return result.data;
  }
}
