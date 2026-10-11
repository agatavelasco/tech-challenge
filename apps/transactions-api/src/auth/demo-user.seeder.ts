import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PasswordHasher } from './password-hasher.js';
import { UsersRepository } from './users.repository.js';

/**
 * Cria o usuário de demonstração definido no ambiente, para quem clona o projeto
 * conseguir entrar sem cadastro. Sem as variáveis, não faz nada.
 */
@Injectable()
export class DemoUserSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoUserSeeder.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const { DEMO_USER_EMAIL: email, DEMO_USER_PASSWORD: password } = this.config;
    if (!email || !password) return;

    const created = await this.users.createIfMissing(email, await this.hasher.hash(password));
    if (created) this.logger.log(`Usuário de demonstração ${email} criado`);
  }
}
