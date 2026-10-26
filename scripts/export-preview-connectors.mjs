import fs from 'node:fs';
const board=JSON.parse(fs.readFileSync(new URL('../dist/engineering/snowflake.json',import.meta.url)));
const origin=board.components.find(f=>f.ref==='D1').at;
const connectors=board.components.filter(f=>f.ref.startsWith('J')).map(f=>({
  ref:f.ref,side:f.side,x:f.at[0]-origin[0],y:f.at[1]-origin[1],rotation:f.at[2],
  pads:f.pads.map(p=>({number:p.number,x:p.at[0],y:p.at[1],size:p.size,drill:p.drill[0],shape:p.shape}))
}));
fs.writeFileSync(new URL('../dist/snowflake-connectors.js',import.meta.url),
  '// Generated from engineering/snowflake.json; origin is D1, units are mm.\nexport const CONNECTORS = '+JSON.stringify(connectors)+';\n');
