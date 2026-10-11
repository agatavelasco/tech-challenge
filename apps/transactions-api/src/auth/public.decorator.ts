import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Libera a rota da autenticação. Tudo que não estiver marcado exige token. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
