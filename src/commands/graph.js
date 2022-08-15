import path from "path";
import { cleanPath } from "../utils/file-fn.js";

/**
 * Creates a graphviz .dot file of package dependencies called package.dot in the output directory. 
 * @param {*} moduleMap map of modules (directories) with array of files as value
 * @param {*} dependencyList array dependencies src is the file it was found and importSrc 
 *  is where the imported function comes from. so the src depends on the importSrc
 */
export function createPackageGraph(moduleMap, dependencyList) {
  let result = digraph();
  /*
  // map of packages key=directory value=is an array of files/modules.  
    let packageMap = new Map();  
    for (const fname of moduleMap) {
      addToMapArray(packageMap, path.dirname(fname), getFilename(fname));
    }
  */
  // add packages to the graph
  result += createPackageNodes(moduleMap);
  // create the depedencies for the packageMap
  let depArr = [];
  for (const dep of dependencyList) {
    let src = path.dirname(dep.src);
    let dest = path.dirname(dep.importSrc);
    (src === ".") ? src = "./" : src;
    (dest === ".") ? dest = "./" : dest;
    // node_module dependency mostly do not have a path so not mapped in the package
    if (dep.importSrc.indexOf("/") === -1) {
      continue;
    }
    // all package dependencies start with a . so skip if does not start with .
    if (!dep.importSrc.startsWith(".")) {
      continue;
    }
    // relationship between the src and dest packages
    //   let ln = '"' + dep.src + '"->"' + dep.importSrc + '"\n';
    let ln = '"' + src + '"->"' + dest + '"\n';

    // add dependency to graph and array if it does not already exist
    if (depArr.indexOf(ln) === -1) {
      depArr.push(ln);
      result += ln;
    }
  }
  result += '}\n';
  return result;

}

/**
 * nodes that are in the importMap can have mulitple imported functions. 
 * Some will also exist in the moduleLMap. So only need to create  the imported nodes as
 *  module nodes have already been created from the exported functions.
 * this excludes those that are in the moduleMap
* loop through to add the the imported functions.
 * 
 * @param {*} importMap 
 * @returns 
 */
function createPackageNodes(importMap) {
  let ln = "";
  let result = "";
  for (const imp of importMap.keys()) {
    ln = '"' + imp + '" [label="{' + imp + '|' + '\n';
    for (var mod of importMap.get(imp)) {
      mod = cleanPath(mod.replace(imp, "."));
      ln += '\t' + mod + '\\l\n';
    }
    result += ln + '}"];\n\n';
  }
  return result;
}

/**
 *  create the graph file for packages or directories for all the modules.
 *  create the graph file
 *  write  to the output dir
 * @param {*} moduleMap list of files to graph
* @param {*} exportList list of files and exported functions
* [ { "name": "./ast.js", "exported": "processAST", "type": "FunctionDeclaration" } ]
 * @param {*} dependencyList list of imports and functions for the file. 
 * array dependencies src is the file it was found and importSrc 
 *  is where the imported function comes from. so the src depends on the importSrc
* [ { "src": "./cmd-test.js", "importSrc": "commander","import": "Command"} ]
* @param {*} importMap map of imports key=module/file value=an array of functions.
* @return string for the dependencies.dot file
 */
export function createGraph(dependencyList, exportList, moduleMap, importMap) {
  let result = digraph();
  let ln;
  let modList = [];

  //add modules to graph for each directory
  moduleMap.forEach((arr) => {
    // for each file in directory
    arr.forEach((mod) => {
      modList.push(mod);

      ln = `"${mod}" [label="{ ${mod} | \n`;
      /**
      * exported functions
      * to only create the node once select the exportedList which has the same name as the module and 
      * loop through to add the the exported functions.
      */
      for (const exported of exportList.filter(v => { return v.name === mod })) {
        ln += `\t ${exported.exported} \\l\n`;
      }
      ln += "|";

      let newImp = "";
      /**
       * adds the imported functions of the module to the graph
       * sorted to only add once
       */
      for (const dep of dependencyList
        .filter(v => { return v.src === mod })
        .sort((a, b) => { return (a.importSrc > b.importSrc) ? 1 : -1; })) {
        if (newImp !== dep.importSrc) {
          ln += `\t\t${dep.importSrc}\\l`;
          newImp = dep.importSrc;
        }
        ln += `\t\t${dep.import}\\r\n`;
      }

      result += `${ln}}"];\n\n`;
    });
  });

  // add import modules to the graph if not already added from the moduleMap
  result += createNodes(importMap, modList);


  /** create the dependencies between the nodes. Multiple dependencies exist for each function.
   * if dependency already exists then do not create again.
   */
  /*
  let depArr = [];
  for (const dep of dependencyList) {
    ln = '"' + dep.src + '"->"' + dep.importSrc + '"\n';
    // add dependency to the array
    if (depArr.indexOf(ln) === -1) {
      depArr.push(ln);
      result += ln;
    }
  }
*/
  result += '}\n';
  return result;
}

/**
 * nodes that are in the importMap can have mulitple imported functions. 
 * Some will also exist in the moduleLMap. So only need to create  the imported nodes as
 *  module nodes have already been created from the exported functions.
 * this excludes those that are in the moduleMap
* loop through to add the the imported functions.
 * 
 * @param {*} importMap 
 * @param {*} moduleMap 
 * @returns 
 */
function createNodes(importMap, moduleMap) {
  let ln = "";
  let result = "";
  for (const imp of importMap.keys()) {
    if (moduleMap.indexOf(imp) === -1) {
      ln = '"' + imp + '" [label="{' + imp + '|' + '\n';
      for (const fn of importMap.get(imp)) {
        ln += '\t' + fn + '\\l\n';
      }
      result += ln + '}"];\n\n';
    }
  }
  return result;
}

/**
 *  create the graph file for all the modules and what they depend on and where they are used.
 * the first section contains the name of the module 
 * a count of the modules that that it depends 
 * a count of the modules that it uses
 * @param {*} moduleMap list of files to graph
 * @param {*} dependencyList list of imports and functions for the file. 
 * array dependencies src is the file it was found and importSrc 
 *  is where the imported function comes from. so the src depends on the importSrc
* [ { "src": "./cmd-test.js", "importSrc": "commander","import": "Command"} ]
* @return the string that is written to the Relations.dot file.
 */
export function createGraphRelations(dependencyList, moduleMap) {
  let result = digraph();
  let modSet = new Set();
  let relLn = "";
  let newImp = "";

  //add modules to graph for each directory
  moduleMap.forEach((arr) => {
    // for each file in directory
    arr.forEach((mod) => {

      // modules that it depends on (2nd section)
      let fileLn = `"${mod}" [label="{ ${mod}\\n\n`;

      let depLn = "|\n";
      let depCnt = 0;
      newImp = "";
      /**
       * adds the imported modules to the graph and counts the number added
       * DependsOn if the mod is the src
       *  if it does not start with a . then it is a node_module
       * sorted to make the addition unique.
       * 2nd section Depends on
       */
      for (const dep of dependencyList
        .filter(v => { return v.src === mod; })
        .sort((a, b) => { return (a.importSrc > b.importSrc) ? 1 : -1; })) {
        if (newImp !== dep.importSrc) {
          newImp = dep.importSrc;
          // newImp is a node-module so add the mod to the set of mods that depend on node-modules
          if (newImp.startsWith(".") === false) {
            modSet.add(mod);
          } else {
            relLn += '"' + dep.src + '"->"' + newImp + '"\n';
          }
          depLn += `\t\t${newImp}\\l\n`;
          depCnt += 1;
        }
      }

      
      let usedLn = "|\n";
      let usedCnt = 0;
      newImp = "";
      /**
       * used by if the mod is a importSrc
       * sorted to make it unique
       * usedBy string
       * 3rd section used by
       */
      for (const dep of dependencyList
        .filter(v => { return v.importSrc === mod })
        .sort((a, b) => { return (a.src > b.src) ? 1 : -1; })) {
        if (newImp !== dep.src) {
          newImp = dep.src;
          usedLn += `\t\t${newImp}\\l\n`;
          usedCnt += 1;
        }
      }

      result += fileLn +
        "Depend On : " + depCnt + `\\l\n` +
        "Used By : " + usedCnt + `\\l\n` +
        depLn + usedLn +
        `}"];\n\n`;

    });
  });

  /**
   * add the node_modules
   */
  let nodeModsLn = `"node-modules" [label="{node-modules\\n | \n `;
  newImp = "";

  let nodeMods = dependencyList
    .filter(v => { return v.importSrc.startsWith(".") === false; })
    .sort((a, b) => { return a.importSrc.localeCompare(b.importSrc)});
  for (const dep of nodeMods) {
    if (newImp !== dep.importSrc) {
      newImp = dep.importSrc;
      nodeModsLn += `\t\t${newImp}\\l\n`;
    }
  }
  nodeModsLn += `}"];\n`;
/*
// Do not add the node_module link as most all will link to it.
  for (const item of modSet) {
    relLn += '"' + item + '"->"node-modules"\n';
  }
*/
  result += nodeModsLn + relLn + '}\n';
  return result;
}



function digraph() {
  let result = "digraph {\n";
  result += "node [shape=record];\n";
  return result;
}

/*
/*
 * 
 * @param {*} fname name of the file
 * @returns the directory of the file. if it is '.' returns ./
 
const getDir = (fname) => {
  let dir = path.dirname(fname);
  (dir === ".") ? dir = "./" : dir;
  return dir;
}


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