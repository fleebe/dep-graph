import fs from "fs";


export function createGraph(dependencyList, exportList, moduleList) {
  let result = "digraph {\n";
  result += "node [shape=record];\n";
  let ln;

  for (const mod of moduleList) {
    ln = '"' + mod + '" [label="{' + mod + '|';
    for (const exported of exportList.filter(v => { return v.name === mod })) {
      ln += exported.exported + '\\l';
    }
    result += ln + '}"];\n';
    
    // not in the module list because they are node_modules and not in the source directory
    for (const imp of dependencyList.filter(v => { return v.importSrc !== mod })) {
      ln = '"' + imp + '" [label="{' + mod + '|';
      
    }
      
  }
  result += '}\n';
  return result;
}
/*

         for (const x of dependencyList.filter(v1 => { return v1.importSrc === dependency.importSrc })) {
            ln = '"' + x.importSrc + '" [label="{' + x.ImportSrc +
              '|' + x.import + '\\l';
            result += ln;
          }
          result += ln + '} "];\n';
        }
    


digraph {
 node [shape=record];

  "fs" [label="{fs|readFileSync}"];
  "acorn" [label="{acorn|parse}"];

  "src\\ast.js"->"fs"
  "src\\ast.js"->"acorn"
  "src\\ast.js"->"acorn-walk"
}
*/