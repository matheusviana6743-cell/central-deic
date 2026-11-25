import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const file = process.env.DEIC_DATABASE || 'data/travessia.sqlite';
if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
const db = new DatabaseSync(file);
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS records(id INTEGER PRIMARY KEY, guild TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, author TEXT NOT NULL, closed INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS entries(id INTEGER PRIMARY KEY, record INTEGER NOT NULL, actor TEXT NOT NULL, kind TEXT NOT NULL, body TEXT NOT NULL, stamp INTEGER DEFAULT (unixepoch()));
CREATE TABLE IF NOT EXISTS rooms(guild TEXT, channel TEXT PRIMARY KEY, record INTEGER, kind TEXT);
CREATE TABLE IF NOT EXISTS panels(guild TEXT, channel TEXT, message TEXT, PRIMARY KEY(guild,channel));
CREATE INDEX IF NOT EXISTS entries_record ON entries(record,id);`);
function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function create(guild, kind, title, actor, body) {
  return transaction(() => {
    const id = Number(db.prepare('INSERT INTO records(guild,kind,title,author) VALUES(?,?,?,?)').run(guild,kind,title,actor).lastInsertRowid);
    db.prepare('INSERT INTO entries(record,actor,kind,body) VALUES(?,?,?,?)').run(id,actor,'Abertura',body);
    return id;
  });
}
export const get = (guild,id) => db.prepare('SELECT * FROM records WHERE guild=? AND id=?').get(guild,id);
export function add(guild,id,actor,kind,body) {
  return transaction(() => {
    const record = get(guild,id);
    if (!record || record.closed) throw new Error('Registro encerrado ou indisponível.');
    db.prepare('INSERT INTO entries(record,actor,kind,body) VALUES(?,?,?,?)').run(id,actor,kind,body);
    if (kind === 'Encerramento') db.prepare('UPDATE records SET closed=1 WHERE id=?').run(id);
  });
}
export const history = (id,page) => db.prepare('SELECT * FROM entries WHERE record=? ORDER BY id DESC LIMIT 4 OFFSET ?').all(id,page*3);
export const search = (guild,kind,term,page) => kind==='wanted' && term ? db.prepare("SELECT * FROM records WHERE guild=? AND kind=? AND substr(title,1,instr(title,' | ')-1)=? ORDER BY closed,id DESC LIMIT 11 OFFSET ?").all(guild,kind,term,page*10) : db.prepare(`SELECT * FROM records r WHERE guild=? AND kind=? AND (instr(lower(title),lower(?)) OR CAST(id AS TEXT)=? OR EXISTS(SELECT 1 FROM entries e WHERE e.record=r.id AND instr(lower(e.body),lower(?)))) ORDER BY id DESC LIMIT 11 OFFSET ?`).all(guild,kind,term,term,term,page*10);
export const totals = guild => db.prepare('SELECT kind,closed,count(*) n FROM records WHERE guild=? GROUP BY kind,closed').all(guild);
export const production = guild => db.prepare(`SELECT actor,e.kind,count(*) n FROM entries e JOIN records r ON r.id=e.record WHERE guild=? AND stamp>=unixepoch()-604800 GROUP BY actor,e.kind ORDER BY n DESC,actor LIMIT 20`).all(guild);
export const saveRoom = (guild,channel,record,kind) => db.prepare('INSERT INTO rooms VALUES(?,?,?,?)').run(guild,channel,record,kind);
export const roomList = (guild,record) => db.prepare('SELECT * FROM rooms WHERE guild=? AND record=?').all(guild,record);
export const forgetRoom = channel => db.prepare('DELETE FROM rooms WHERE channel=?').run(channel);
export const panelId = (guild,channel) => db.prepare('SELECT message FROM panels WHERE guild=? AND channel=?').get(guild,channel)?.message;
export const savePanel = (guild,channel,message) => db.prepare('INSERT OR REPLACE INTO panels VALUES(?,?,?)').run(guild,channel,message);

db.exec('CREATE TABLE IF NOT EXISTS archive(guild TEXT, channel TEXT, snapshot TEXT, PRIMARY KEY(guild,channel))');
export const archiveRows = guild => db.prepare('SELECT * FROM archive WHERE guild=?').all(guild);
export const rememberChannel = (guild,channel,snapshot) => db.prepare('INSERT OR IGNORE INTO archive VALUES(?,?,?)').run(guild,channel,snapshot);
export const forgetArchive = (guild,channel) => db.prepare('DELETE FROM archive WHERE guild=? AND channel=?').run(guild,channel);
export function handoff(guild,id,actor,expected,next) {
  return transaction(()=>{
    const result=db.prepare('UPDATE records SET author=? WHERE guild=? AND id=? AND author=? AND closed=0').run(next,guild,id,expected);
    if(!result.changes) throw new Error('O responsável ou o status mudou.');
    db.prepare('INSERT INTO entries(record,actor,kind,body) VALUES(?,?,?,?)').run(id,actor,'Passagem de caso','De <@'+expected+'> para <@'+next+'>.');
  });
}

export function clearGuild(guild) { return transaction(() => { for (const q of ['DELETE FROM entries WHERE record IN (SELECT id FROM records WHERE guild=?)','DELETE FROM case_members WHERE record IN (SELECT id FROM records WHERE guild=?)','DELETE FROM records WHERE guild=?','DELETE FROM rooms WHERE guild=?','DELETE FROM panels WHERE guild=?','DELETE FROM archive WHERE guild=?']) db.prepare(q).run(guild); }); }

export const timeline = id => db.prepare('SELECT * FROM entries WHERE record=? ORDER BY id').iterate(id);
export function reopen(guild, id, actor, reason) {
  return transaction(() => {
    const result = db.prepare("UPDATE records SET closed=0 WHERE guild=? AND id=? AND kind='case' AND closed=1").run(guild,id);
    if (!result.changes) return false;
    db.prepare('INSERT INTO entries(record,actor,kind,body) VALUES(?,?,?,?)').run(id,actor,'Reabertura',reason);
    return true;
  });
}

db.exec('CREATE TABLE IF NOT EXISTS case_members (record INTEGER NOT NULL, member TEXT NOT NULL, PRIMARY KEY(record,member))');
export const caseMembers = id => db.prepare('SELECT member FROM case_members WHERE record=? ORDER BY member').all(id);
export function changeCaseMember(guild,id,actor,member,include) {
  return transaction(() => {
    const record=get(guild,id);
    if(!record || record.kind!=='case' || record.closed) return false;
    const sql=include?'INSERT OR IGNORE INTO case_members VALUES (?,?)':'DELETE FROM case_members WHERE record=? AND member=?';
    if(!db.prepare(sql).run(id,member).changes) return false;
    db.prepare('INSERT INTO entries(record,actor,kind,body) VALUES(?,?,?,?)').run(id,actor,include?'Integrante adicionado':'Integrante removido','<@'+member+'>');
    return true;
  });
}

export const activeWanted = guild => db.prepare("SELECT r.id,r.title,e.body FROM records r JOIN entries e ON e.id=(SELECT min(id) FROM entries WHERE record=r.id) WHERE r.guild=? AND r.kind='wanted' AND r.closed=0 ORDER BY r.id DESC LIMIT 501").all(guild);
