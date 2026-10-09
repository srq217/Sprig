import { readFileSync, existsSync } from 'node:fs';
const html=readFileSync('public/index.html','utf8');
if(!existsSync('public/favicon.svg'))throw Error('Missing favicon.');
if(!html.includes("fetch('/api/game'"))throw Error('Missing game API connection.');
new Function(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
console.log('VocabLab static site and multiplayer client validated.');
