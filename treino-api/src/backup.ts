import { Body, ConflictException, Controller, Get, Header, Headers, HttpCode, Injectable, Post, ServiceUnavailableException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Pool } from 'pg';

type Backup = { schemaVersion: 1; programs: unknown[]; sessions: unknown[] };
type Row = { revision: number; saved_at: Date; snapshot: Backup };

@Injectable()
export class BackupStore {
  private pool?: Pool;
  private get db() {
    if (!process.env.DATABASE_URL) throw new ServiceUnavailableException('Banco não configurado.');
    return this.pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000 });
  }

  async read(owner: string) {
    const result = await this.db.query<Row>(
      'SELECT revision, saved_at, snapshot FROM owner_backup WHERE owner = $1', [owner],
    );
    const row = result.rows[0];
    return row ? { revision: row.revision, savedAt: row.saved_at, snapshot: row.snapshot } : { revision: 0, savedAt: null, snapshot: null };
  }

  async save(owner: string, expected: number, snapshot: Backup) {
    const result = expected === 0
      ? await this.db.query<Row>(
        'INSERT INTO owner_backup (owner, revision, snapshot) VALUES ($1, 1, $2) ON CONFLICT DO NOTHING RETURNING revision, saved_at',
        [owner, snapshot],
      )
      : await this.db.query<Row>(
        'UPDATE owner_backup SET revision = revision + 1, saved_at = now(), snapshot = $3 WHERE owner = $1 AND revision = $2 RETURNING revision, saved_at',
        [owner, expected, snapshot],
      );
    if (!result.rows[0]) throw new ConflictException('O backup remoto mudou. Consulte a versão mais recente.');
    return { revision: result.rows[0].revision, savedAt: result.rows[0].saved_at };
  }
}

@Controller('backup')
export class BackupController {
  constructor(private readonly store: BackupStore) {}

  private authorize(header?: string) {
    const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
    const hash = process.env.OWNER_BACKUP_KEY_SHA256;
    if (!owner || !hash || !/^[a-f0-9]{64}$/i.test(hash)) throw new ServiceUnavailableException('Acesso remoto não configurado.');
    const key = header?.startsWith('Bearer ') ? header.slice(7) : '';
    if (key.length < 32 || key.length > 256 ||
        !timingSafeEqual(createHash('sha256').update(key).digest(), Buffer.from(hash, 'hex'))) {
      throw new UnauthorizedException('Chave de acesso inválida.');
    }
    return owner;
  }

  @Get()
  @Header('Cache-Control', 'private, no-store')
  read(@Headers('authorization') header?: string) {
    return this.store.read(this.authorize(header));
  }

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  save(@Body() body: unknown, @Headers('authorization') header?: string) {
    const owner = this.authorize(header);
    const data = body as { revision?: number; snapshot?: Backup } | null;
    if (!data || typeof data.revision !== 'number' || !Number.isSafeInteger(data.revision) || data.revision < 0 ||
      data.snapshot?.schemaVersion !== 1 || !Array.isArray(data.snapshot.programs) || !Array.isArray(data.snapshot.sessions)) {
      throw new BadRequestException('Formato de backup inválido.');
    }
    return this.store.save(owner, data.revision, data.snapshot);
  }
}
