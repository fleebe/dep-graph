import fs from "fs";


export function createGraph(dependencyList, exportList, moduleList) {
  result = "digraph {";
  result += "node [shape=record];";

  for(const mod of moduleList) {
    for (const exported of exportList.filter(ex => { return ex === mod})) {
      result += '"', exported.name, '" [label={"', exported.name,
        '|', exported.exported, '}"];';
  }
/*
  for (var i = 0; i < exportList.length; i++) {
    result += '"', dependencyList[i].importSrc, '" [label={"', dependencyList[i].importSrc,
      '|', dependencyList[i].import, '}"];';
    result += dependencyList[i].src, "->", dependencyList[i].importSrc, ";";
  }

  for (var i = 0; i < dependencyList.length; i++) {
    result += '"', dependencyList[i].importSrc, '" [label={"', dependencyList[i].importSrc, 
        '|', dependencyList[i].import, '}"];';
    result += dependencyList[i].src, "->", dependencyList[i].importSrc, ";";
  }
*/
  }
  result += "}";
  return result;
}
/*
digraph {
 node [shape=record];

  "fs" [label="{fs|readFileSync}"];
  "acorn" [label="{acorn|parse}"];

  "src\\ast.js"->"fs"
  "src\\ast.js"->"acorn"
  "src\\ast.js"->"acorn-walk"
}
*/