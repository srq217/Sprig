import { newRoom, view, mutate } from './game.mjs';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function createHandler(getDb){return async request=>{
try{
 if(request.method!=='POST')return reply({error:'Use POST.'},405);
 const origin=request.headers.get('origin');
 if(origin&&new URL(origin).origin!==new URL(request.url).origin)return reply({error:'Invalid origin.'},403);
 if(Number(request.headers.get('content-length')||0)>4096)return reply({error:'Request too large.'},413);
 const raw=await request.text();if(raw.length>4096)return reply({error:'Request too large.'},413);
 let b;try{b=JSON.parse(raw)}catch{return reply({error:'Invalid request.'},400)}
 if(!b||typeof b!=='object')return reply({error:'Invalid request.'},400);
 const db=getDb();
 if(b.action==='create'){
 const r=newRoom(typeof b.name==='string'?b.name:'Teacher');const now=Date.now();
 // Bounded housekeeping; rooms expire six hours after creation.
 await db.sql`DELETE FROM vocab_rooms WHERE pin IN (SELECT pin FROM vocab_rooms WHERE expires < ${now} LIMIT 100)`;
 for(let i=0;i<8;i++){
 const pin=String(100000+Math.floor(Math.random()*900000));
 const rows=await db.sql`INSERT INTO vocab_rooms (pin,data,version,expires) VALUES (${pin},${JSON.stringify(r)},0,${now+21600000}) ON CONFLICT (pin) DO NOTHING RETURNING pin`;
 if(rows.length)return reply({pin,token:r.hostToken,room:view(r,r.hostToken,now),now});
 }
 return reply({error:'Please try creating the room again.'},503);
 }
 if(typeof b.pin!=='string'||!/^\d{6}$/.test(b.pin))return reply({error:'Enter a six-digit PIN.'},400);
 for(let retry=0;retry<64;retry++){
 const rows=await db.sql`SELECT data,version FROM vocab_rooms WHERE pin=${b.pin} AND expires>${Date.now()}`;
 if(!rows.length)return reply({error:'Room not found or expired. Check the PIN with your host.'},404);
 const row=rows[0];const r=JSON.parse(row.data);r.revision=row.version;const now=Date.now();
 if(b.action==='state')return reply({room:view(r,b.token,now),now});
 const result=mutate(r,b,now);r.revision=row.version+1;
 const saved=await db.sql`UPDATE vocab_rooms SET data=${JSON.stringify(r)},version=version+1 WHERE pin=${b.pin} AND version=${row.version} RETURNING pin`;
 if(saved.length){if(b.action==='leave')return reply({left:true,now});return reply({...result,pin:b.pin,room:view(r,result.token||b.token,now),now})}
 }
 return reply({error:'The room is busy. Please try again.'},409);
}catch(error){
 const message=error instanceof Error?error.message:'Unexpected error.';
 if(/database|postgres|connection|relation|NETLIFY_DB|ECONN|timeout|fetch failed|SQL/i.test(message)){
 console.error('Classroom database error:',error);
 return reply({error:'Classroom games are unavailable. The host should check Netlify Database setup and deploy logs.'},503);
 }
 return reply({error:message},/session has ended/.test(message)?401:400);
}
}}
