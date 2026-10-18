import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

// Read-only reconciliation of the existing API and Excel export with scenarios
// already inspected in the Power BI service. Run against local or production.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'web/package.json'));
const ExcelJS = require('exceljs');
const fin = JSON.parse(readFileSync(path.join(root, 'data/financials.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(path.join(root, 'powerbi/manifest.json'), 'utf8'));
for (const [file, checksum] of Object.entries(manifest.files)) {
  assert.equal(createHash('sha256').update(readFileSync(path.join(root, file))).digest('hex'), checksum, `Changed Power BI source/export: ${file}. Rebuild and verify the report before updating its manifest.`);
}
const base = process.argv[2] || 'http://localhost:3011';
const observed = { KO: [12.03, 13.11], PEP: [12.69, 14.30], MSFT: [126.58, 135.01], ORCL: [16.28, 17.63] };

for (const [symbol, company] of Object.entries(fin.companies)) {
  for (const [index, [dg, dm]] of [[0, [0, 0]], [1, [.05, .01]]]) {
    const growth = company.growth + dg;
    const margin = company.operating_margin + dm;
    const response = await fetch(`${base}/api/scenario`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, growth, margin }),
    });
    assert.equal(response.status, 200);
    const scenario = await response.json();
    assert.equal(Number((scenario.scenario_operating_income / 1e9).toFixed(2)), observed[symbol][index]);
    assert.ok(Math.abs(scenario.growth_effect + scenario.margin_effect - scenario.total_change) < .001);
    const file = await fetch(`${base}/api/workbook?${new URLSearchParams({ symbol, growth: String(growth), margin: String(margin) })}`);
    assert.equal(file.status, 200);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()));
    const sheet = workbook.getWorksheet('Scenario');
    assert.equal(sheet.getCell('B4').value, company.period_end);
    assert.equal(sheet.getCell('B26').value.hyperlink, company.filing_url);
    assert.equal(sheet.getCell('B28').value, fin.as_of);
    const evaluate = (address) => {
      const value = sheet.getCell(address).value;
      if (typeof value === 'number') return value;
      assert.ok(value && typeof value.formula === 'string', `Expected formula at ${address}`);
      const expression = value.formula.replace(/\b[A-Z]+[0-9]+\b/g, (ref) => `(${evaluate(ref)})`);
      assert.match(expression, /^[0-9.eE+\-*/()\s]+$/);
      return vm.runInNewContext(expression, Object.create(null), { timeout: 100 });
    };
    assert.ok(Math.abs(evaluate('B18') - scenario.scenario_operating_income) < .001);
    assert.ok(Math.abs(evaluate('B20') - scenario.growth_effect) < .001);
    assert.ok(Math.abs(evaluate('B21') - scenario.margin_effect) < .001);
    assert.ok(Math.abs(evaluate('B23')) < .001);
    console.log(`${symbol}: Power BI ${observed[symbol][index]}B reconciles with API and Excel formulas (growth +${dg * 100}pp, margin +${dm * 100}pp).`);
  }
}
for (const file of ['fpa-report.pdf', 'fpa-report.pbix', 'report-1.png', 'report-2.png', 'report-3.png']) {
  const response = await fetch(`${base}/powerbi/${file}`);
  assert.equal(response.status, 200, `Missing ${file}`);
  const body = Buffer.from(await response.arrayBuffer());
  assert.ok(body.length > 1000, `Empty artifact ${file}`);
  assert.equal(createHash('sha256').update(body).digest('hex'), manifest.files[`web/public/powerbi/${file}`], `Published ${file} differs from the verified export`);
  if (file.endsWith('.pdf')) assert.equal(body.subarray(0, 4).toString(), '%PDF');
  if (file.endsWith('.pbix')) assert.equal(body.subarray(0, 2).toString(), 'PK');
}
console.log('All Power BI report downloads and previews are accessible.');
