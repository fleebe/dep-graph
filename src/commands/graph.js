import fs from "fs";
import path from "path";
import { getFilename, addToMapArray} from "../file-fn.js";

/**
 * Creates a graphviz .dot file of package dependencies called package.dot in the output directory. 
 * @param {*} moduleMap map of modules (directories) with array of files as value
 * @param {*} dependencyList array dependencies src is the file it was found and importSrc 
 *  is where the imported function comes from. so the src depends on the importSrc
 * @param {*} dir output directory
 */
export function createPackageGraph(moduleMap, dependencyList, dir) {
  let result = digraph();

  let packageMap = new Map();  // map of packages key=directory and value is an array of files.
  for (const fname of moduleMap) {
    addToMapArray(packageMap, path.dirname(fname), getFilename(fname));
  }

  result += createNodes(packageMap, []);

  let depArr = [];
  for (const dep of dependencyList) {
    let src = path.dirname(dep.src);
    let dest = path.dirname(dep.importSrc);
    if (dep.importSrc.indexOf("/") === -1) {
      // node_module dependency so not mapped in the package
      continue;
    }
    let ln = '"' + src + '"->"' + dest + '"\n'; // relationship between the src and dest packages
    if (depArr.indexOf(ln) === -1) { // only create a single dependency
      depArr.push(ln);
      result += ln;
    }
  }
  result += '}\n';

  fs.writeFileSync(path.join(dir, "package.dot"), result, "utf8");
}



/** nodes that are in the importMap can have mulitple imported functions. Some will also exist in the moduleList.
* so to only create only the imported nodes as module nodes have already been created above exclude those that are 
* in the moduleList
* loop through to add the the imported functions.
*/
function createNodes(importMap, moduleList) {
  let ln = "";
  let result = "";
  for (const imp of importMap.keys()) {
    if (moduleList.indexOf(imp) === -1) {
      ln = '"' + imp + '" [label="{' + imp + '|' + '\n';
      for (const v of importMap.get(imp)) {
        ln += '\t' + v + '\\l\n';
      }
      result += ln + '}"];\n\n';
    }
  }
  return result;
}

export function createGraph(dependencyList, exportList, moduleList, importMap) {
  let result = digraph();
  let ln;

/** nodes that are in the moduleList can have mulitple exported records in exportedList one for each exported function
* so to only create the node once select the exportedList which has the same name as the module and 
* loop through to add the the exported functions.
*/
  for (const mod of moduleList) {
    ln = '"' + mod + '" [label="{' + mod + '|' + '\n';
    for (const exported of exportList.filter(v => { return v.name === mod })) {
      ln += '\t' + exported.exported + "\\l\n";
    }
    result += ln + '}"];\n\n';
  }

  result += createNodes(importMap, moduleList);

  
/** create the dependencies between the nodes. Multiple dependencies exist for each function.
 * if dependency already exists then do not create again.
 */
  let depArr = [];
  for (const dep of dependencyList) {
    ln = '"' + dep.src + '"->"' + dep.importSrc + '"\n';
    if (depArr.indexOf(ln) === -1) {
      depArr.push(ln);
      result += ln;
    }
  }

  result += '}\n';
  return result;
}

function digraph() {
  let result = "digraph {\n";
  result += "node [shape=record];\n";
  return result;
}

/**
 * 
 * @param {*} fname name of the file
 * @returns the directory of the file. if it is '.' returns ./
 */
const getDir = (fname) => {
  let dir = path.dirname(fname);
  (dir === ".") ? dir = "./" : dir;
  return dir;
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