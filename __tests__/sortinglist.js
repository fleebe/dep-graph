
const list = [{
  "src": "./ast.js",
  "importSrc": "acorn",
  "import": "parse"
},
  {
    "src": "./ast.js",
    "importSrc": "./utils/file-fn.js",
    "import": "normalizePath"
  }, 
  {
  "src": "./ast.js",
  "importSrc": "acorn-walk",
  "import": "simple"
},
{
  "src": "./ast.js",
  "importSrc": "./utils/map-fn.js",
  "import": "addToMapArray"
} ];

//let obj = Array.from(JSON.parse(list));
const mod = "./ast.js";

const b = list.sort((a, b) => { return (a.importSrc > b.importSrc) ? 1 : -1; });
b.map(x => console.log(x.importSrc));

for (const dep of list
  .filter(v => { return v.src === mod })
  .sort((a, b) => { return (a.importSrc < b.importSrc) ? 1 : -1; })) {
  console.log(dep.importSrc);

}