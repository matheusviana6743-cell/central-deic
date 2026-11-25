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

export function clearGuild(guild) { return transaction(() => { for (const q of ['DELETE FROM entries WHERE record IN (SELECT id FROM records WHERE guild=?)','DELETE FROM case_members WHERE record IN (SELECT id FROM records WHERE guild=?)','DELETE FROM case_status WHERE record IN (SELECT id FROM records WHERE guild=?)','DELETE FROM records WHERE guild=?','DELETE FROM rooms WHERE guild=?','DELETE FROM panels WHERE guild=?','DELETE FROM wanted_draft WHERE guild=?','DELETE FROM archive WHERE guild=?','DELETE FROM academy_progress WHERE guild=?','DELETE FROM community_checkins WHERE guild=?','DELETE FROM community_ranking WHERE guild=?','DELETE FROM rp_form_images WHERE guild=?','DELETE FROM rp_forms WHERE guild=?','DELETE FROM rp_form_sections WHERE guild=?']) db.prepare(q).run(guild); }); }

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

db.exec('CREATE TABLE IF NOT EXISTS case_status (record INTEGER PRIMARY KEY, status TEXT NOT NULL)');
export const caseStatus = id => db.prepare('SELECT status FROM case_status WHERE record=?').get(id)?.status;
export const myCases = (guild,user,page) => db.prepare("SELECT * FROM records WHERE guild=? AND kind='case' AND (author=? OR EXISTS (SELECT 1 FROM case_members WHERE record=records.id AND member=?)) ORDER BY closed,id DESC LIMIT 11 OFFSET ?").all(guild,user,user,page*10);
export function changeStatus(guild,id,actor,status) {
  return transaction(() => {
    const entry=get(guild,id);
    if(!entry || entry.kind!=='case' || entry.closed || caseStatus(id)===status) return false;
    db.prepare('INSERT OR REPLACE INTO case_status VALUES (?,?)').run(id,status);
    db.prepare('INSERT INTO entries(record,actor,kind,body) VALUES (?,?,?,?)').run(id,actor,'Status da mesa',status);
    return true;
  });
}

db.exec('CREATE TABLE IF NOT EXISTS wanted_draft (id INTEGER PRIMARY KEY, guild TEXT, actor TEXT, title TEXT, body TEXT, stamp INTEGER DEFAULT (unixepoch()))');
export function draftWanted(guild,actor,title,body){
  db.prepare('DELETE FROM wanted_draft WHERE stamp < unixepoch()-86400 OR (guild=? AND actor=?)').run(guild,actor);
  return Number(db.prepare('INSERT INTO wanted_draft(guild,actor,title,body) VALUES(?,?,?,?)').run(guild,actor,title,body).lastInsertRowid);
}
export const discardWanted = (guild,actor,id) => db.prepare('DELETE FROM wanted_draft WHERE guild=? AND actor=? AND id=?').run(guild,actor,id);
export function publishWanted(guild,actor,id){
  return transaction(()=>{
    const draft=db.prepare('SELECT * FROM wanted_draft WHERE guild=? AND actor=? AND id=? AND stamp>=unixepoch()-86400').get(guild,actor,id);
    if(!draft || search(guild,'wanted',draft.title.split(' | ')[0],0).some(record=>!record.closed)) return null;
    const record=Number(db.prepare('INSERT INTO records(guild,kind,title,author) VALUES(?,?,?,?)').run(guild,'wanted',draft.title,actor).lastInsertRowid);
    db.prepare('INSERT INTO entries(record,actor,kind,body) VALUES(?,?,?,?)').run(record,actor,'Abertura',draft.body);
    discardWanted(guild,actor,id);
    return record;
  });
}

// Community participation is opt-in for leaderboard visibility. No message or voice tracking.
db.exec(`
CREATE TABLE IF NOT EXISTS academy_progress (guild TEXT NOT NULL, member TEXT NOT NULL, lesson TEXT NOT NULL, completed INTEGER NOT NULL, PRIMARY KEY(guild,member,lesson));
CREATE TABLE IF NOT EXISTS community_checkins (guild TEXT NOT NULL, member TEXT NOT NULL, day TEXT NOT NULL, stamp INTEGER NOT NULL, PRIMARY KEY(guild,member,day));
CREATE TABLE IF NOT EXISTS community_ranking (guild TEXT NOT NULL, member TEXT NOT NULL, PRIMARY KEY(guild,member));
CREATE INDEX IF NOT EXISTS academy_progress_week ON academy_progress(guild,completed);
CREATE INDEX IF NOT EXISTS community_checkins_week ON community_checkins(guild,stamp);
`);
export function completeLesson(guild,member,lesson,stamp=Math.floor(Date.now()/1000)) {
  return Boolean(db.prepare('INSERT OR IGNORE INTO academy_progress VALUES(?,?,?,?)').run(guild,member,lesson,stamp).changes);
}
export function localDay(stamp) {
  return new Date((stamp-10800)*1000).toISOString().slice(0,10);
}
export function weekStart(stamp) {
  const local = new Date((stamp-10800)*1000);
  local.setUTCHours(0,0,0,0);
  local.setUTCDate(local.getUTCDate()-(local.getUTCDay()+6)%7);
  return Math.floor(local.getTime()/1000)+10800;
}
export function communityCheckin(guild,member,stamp=Math.floor(Date.now()/1000)) {
  return Boolean(db.prepare('INSERT OR IGNORE INTO community_checkins VALUES(?,?,?,?)').run(guild,member,localDay(stamp),stamp).changes);
}
export function rankingVisibility(guild,member,visible) {
  if (visible) db.prepare('INSERT OR IGNORE INTO community_ranking VALUES(?,?)').run(guild,member);
  else db.prepare('DELETE FROM community_ranking WHERE guild=? AND member=?').run(guild,member);
}
export function communityProfile(guild,member,stamp=Math.floor(Date.now()/1000)) {
  const start=weekStart(stamp);
  return {
    lessons: db.prepare('SELECT lesson FROM academy_progress WHERE guild=? AND member=? ORDER BY lesson').all(guild,member).map(row=>row.lesson),
    checkins: db.prepare('SELECT count(*) n FROM community_checkins WHERE guild=? AND member=? AND stamp>=? AND stamp<=?').get(guild,member,start,stamp).n,
    weeklyLessons: db.prepare('SELECT count(*) n FROM academy_progress WHERE guild=? AND member=? AND completed>=? AND completed<=?').get(guild,member,start,stamp).n,
    visible: Boolean(db.prepare('SELECT 1 FROM community_ranking WHERE guild=? AND member=?').get(guild,member)),
  };
}
export function communityRanking(guild,stamp=Math.floor(Date.now()/1000)) {
  const start=weekStart(stamp);
  return db.prepare(`
    WITH points AS (
      SELECT member, count(*) n FROM community_checkins WHERE guild=? AND stamp>=? AND stamp<=? GROUP BY member
      UNION ALL
      SELECT member, count(*) n FROM academy_progress WHERE guild=? AND completed>=? AND completed<=? GROUP BY member
    )
    SELECT p.member, SUM(p.n) points FROM points p JOIN community_ranking r ON p.member=r.member AND r.guild=?
    GROUP BY p.member ORDER BY points DESC, p.member ASC LIMIT 10
  `).all(guild,start,stamp,guild,start,stamp,guild);
}

export const mesaRooms = guild => db.prepare("SELECT rooms.channel,rooms.record FROM rooms JOIN records ON records.id=rooms.record AND records.guild=rooms.guild WHERE rooms.guild=? AND rooms.kind='legacy-mesa' AND records.kind='case' ORDER BY records.id DESC").all(guild);

db.exec(`CREATE TABLE IF NOT EXISTS rp_forms (
 id INTEGER PRIMARY KEY, guild TEXT NOT NULL, owner TEXT NOT NULL, kind TEXT NOT NULL,
 channel TEXT UNIQUE, payload TEXT NOT NULL DEFAULT '{}', state TEXT NOT NULL DEFAULT 'draft',
 published_channel TEXT, published_message TEXT, archived_channel TEXT, archived_message TEXT
);
CREATE INDEX IF NOT EXISTS rp_forms_guild ON rp_forms(guild,kind,state);
CREATE TABLE IF NOT EXISTS rp_form_sections(guild TEXT NOT NULL, kind TEXT NOT NULL, category TEXT NOT NULL, entry TEXT NOT NULL, published TEXT NOT NULL, archived TEXT NOT NULL, PRIMARY KEY(guild,kind));
`);
export const formSection=(guild,kind)=>db.prepare('SELECT * FROM rp_form_sections WHERE guild=? AND kind=?').get(guild,kind);
export const saveFormSection=(guild,kind,category,entry,published,archived)=>db.prepare('INSERT OR REPLACE INTO rp_form_sections VALUES(?,?,?,?,?,?)').run(guild,kind,category,entry,published,archived);
export const formGet=(guild,id)=>db.prepare('SELECT * FROM rp_forms WHERE guild=? AND id=?').get(guild,id);
export const formByChannel=(guild,channel)=>db.prepare('SELECT * FROM rp_forms WHERE guild=? AND channel=?').get(guild,channel);
export const formStart=(guild,owner,kind,channel)=>Number(db.prepare('INSERT INTO rp_forms(guild,owner,kind,channel) VALUES(?,?,?,?)').run(guild,owner,kind,channel).lastInsertRowid);
export const formSave=(guild,id,payload)=>Boolean(db.prepare("UPDATE rp_forms SET payload=? WHERE guild=? AND id=? AND state='draft'").run(JSON.stringify(payload),guild,id).changes);
export const formTransition=(guild,id,from,to)=>Boolean(db.prepare('UPDATE rp_forms SET state=? WHERE guild=? AND id=? AND state=?').run(to,guild,id,from).changes);
export const formPublish=(guild,id,channel,message)=>Boolean(db.prepare("UPDATE rp_forms SET state='published',published_channel=?,published_message=? WHERE guild=? AND id=? AND state='publishing'").run(channel,message,guild,id).changes);
export const formArchive=(guild,id,channel,message)=>Boolean(db.prepare("UPDATE rp_forms SET state='archived',archived_channel=?,archived_message=? WHERE guild=? AND id=? AND state='archiving'").run(channel,message,guild,id).changes);
export const formList=(guild,kind)=>db.prepare("SELECT * FROM rp_forms WHERE guild=? AND kind=? AND state='published' ORDER BY id DESC LIMIT 50").all(guild,kind);

db.exec(`CREATE TABLE IF NOT EXISTS rp_form_images(guild TEXT NOT NULL, record INTEGER NOT NULL, ext TEXT NOT NULL, bytes BLOB NOT NULL, PRIMARY KEY(guild,record));`);
export const formImage=(guild,id)=>db.prepare('SELECT ext,bytes FROM rp_form_images WHERE guild=? AND record=?').get(guild,id);
export function setFormImage(guild,id,ext,bytes){
 return transaction(()=>{
  const r=formGet(guild,id);
  if(!r||r.state!=='draft'||!['png','jpg','webp'].includes(ext)||!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>2097152)return false;
  const sum=db.prepare('SELECT coalesce(sum(length(bytes)),0) n FROM rp_form_images WHERE guild=? AND record<>?').get(guild,id).n;
  if(sum+bytes.length>52428800)return false;
  db.prepare('INSERT OR REPLACE INTO rp_form_images VALUES(?,?,?,?)').run(guild,id,ext,bytes);
  return true;
 });
}
export function removeFormImage(guild,id){
 return transaction(()=>{
  const r=formGet(guild,id);
  if(!r||!['draft','cancelled'].includes(r.state))return false;
  return Boolean(db.prepare('DELETE FROM rp_form_images WHERE guild=? AND record=?').run(guild,id).changes);
 });
}
export const existingFormDraft=(guild,owner,kind)=>db.prepare("SELECT * FROM rp_forms WHERE guild=? AND owner=? AND kind=? AND state='draft' ORDER BY id DESC LIMIT 1").get(guild,owner,kind);
export const listCharacterForms=guild=>db.prepare("SELECT id,payload FROM rp_forms WHERE guild=? AND kind='character' AND state='published' ORDER BY id DESC LIMIT 200").all(guild);
