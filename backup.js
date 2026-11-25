import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
const db = new DatabaseSync(process.env.DEIC_DATABASE || 'data/travessia.sqlite', { readOnly:true });
mkdirSync('backups',{recursive:true});
const target='backups/travessia-'+new Date().toISOString().replaceAll(':','-')+'.sqlite';
try { await backup(db,target); console.log('Backup criado em '+target); } finally { db.close(); }
