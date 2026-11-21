import Database from 'better-sqlite3';

export class ServerDatabase {
  readonly db: Database.Database;

  constructor(filename = ':memory:') {
    this.db = new Database(filename);
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        registerId TEXT,
        avatarColor TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        registerId TEXT NOT NULL,
        currency TEXT NOT NULL,
        openedAt TEXT NOT NULL,
        openingBalanceMinor INTEGER NOT NULL,
        status TEXT NOT NULL,
        closedAt TEXT,
        countedBalanceMinor INTEGER,
        expectedBalanceMinor INTEGER,
        varianceMinor INTEGER,
        varianceNote TEXT,
        closedByUserId TEXT,
        denominationBreakdown TEXT,
        syncStatus TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS movements (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        direction TEXT NOT NULL,
        amountMinor INTEGER NOT NULL,
        currency TEXT NOT NULL,
        description TEXT NOT NULL,
        occurredAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        reference TEXT,
        counterparty TEXT,
        counterpartyRegisterId TEXT,
        reversalOf TEXT,
        reversedBy TEXT,
        reversalReason TEXT,
        syncStatus TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_log (
        recordId TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        operation TEXT NOT NULL,
        result TEXT NOT NULL,
        reason TEXT,
        deviceId TEXT NOT NULL,
        userId TEXT,
        receivedAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const insertUser = this.db.prepare('INSERT OR IGNORE INTO users (id, name, role, registerId, avatarColor) VALUES (?, ?, ?, ?, ?)');
    const demoUsers = [
      ['user-cashier-ana', 'Ana', 'cashier', 'reg-01', '#2563eb'],
      ['user-supervisor-luis', 'Luis', 'supervisor', 'reg-01', '#16a34a'],
      ['user-accountant-marta', 'Marta', 'accountant', null, '#9333ea'],
    ] as const;
    for (const user of demoUsers) insertUser.run(...user);
  }

  close(): void {
    this.db.close();
  }
}
