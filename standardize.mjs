import fs from 'fs';
import https from 'https';

const API = 'https://www.docmathdz.dev/api/mcp?key=uwebuibPURBVEBKu8493rhf3bqvpv';
const MAPPING = JSON.parse(fs.readFileSync('D:/doctorate-topics-platform/mapping.json', 'utf8'));

function mcpCall(toolName, args) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: args }
    });
    const url = new URL(API);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 60000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) { resolve({ error: parsed.error.message }); return; }
          const inner = JSON.parse(parsed.result.content[0].text);
          resolve(inner);
        } catch (e) { resolve({ error: e.message }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

async function main() {
  // Phase 1: Collect all slugs per mapping key
  console.log('=== Phase 1: Collect slugs ===');
  const toUpdate = [];
  for (const [oldName, newName] of Object.entries(MAPPING)) {
    if (oldName === newName) continue;
    const result = await mcpCall('list_exams', { university: oldName, limit: 500, offset: 0 });
    if (result.error) {
      console.log(`  ERROR querying '${oldName}': ${result.error}`);
      continue;
    }
    console.log(`  '${oldName}' => '${newName}': ${result.exams.length} exams`);
    for (const e of result.exams) {
      toUpdate.push({ slug: e.slug, old: oldName, new: newName });
    }
  }
  console.log(`\nTotal to update: ${toUpdate.length}`);

  // Phase 2: Apply updates
  console.log('\n=== Phase 2: Apply updates ===');
  let updated = 0, errors = 0;
  for (let i = 0; i < toUpdate.length; i++) {
    const item = toUpdate[i];
    const r = await mcpCall('update_exam', { topic: item.slug, university: item.new });
    if (r.error) {
      console.log(`  ERR ${item.slug}: ${r.error}`);
      errors++;
    } else {
      updated++;
    }
    if ((i + 1) % 10 === 0) {
      console.log(`  [${i+1}/${toUpdate.length}] upd=${updated} err=${errors}`);
    }
  }
  console.log(`\n[${toUpdate.length}/${toUpdate.length}] upd=${updated} err=${errors}`);

  // Phase 3: Verify
  console.log('\n=== Phase 3: Verify ===');
  const unis = await mcpCall('list_universities', {});
  if (Array.isArray(unis)) {
    console.log(`Unique universities: ${unis.length}`);
    unis.forEach((u, i) => console.log(`  ${i+1}. ${u.name}`));
  } else {
    console.log('Result:', JSON.stringify(unis));
  }
}

main().catch(e => console.error(e));
