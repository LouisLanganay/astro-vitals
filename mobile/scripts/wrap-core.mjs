import { readFileSync, writeFileSync } from 'node:fs';

const [input, output] = process.argv.slice(2);
const source = readFileSync(input, 'utf8');
const header = "import * as env from 'env';";
if (!source.includes(header)) throw new Error('The wasm2js output has an unknown import form.');
const imports = source.match(/env\.\w+/g) ?? [];
const known = new Set(['env.setTempRet0']);
for (const name of imports) {
  if (!known.has(name)) throw new Error(`The wasm2js output imports ${name}.`);
}
const body = source.replace(header, 'var env = { setTempRet0: function () {} };');
writeFileSync(output, body);
