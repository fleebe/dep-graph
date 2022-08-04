import { readFileSync } from "fs";
import { parse as acparse } from "acorn";
import { simple } from "acorn-walk";
import { normalizePath } from "./utils/file-fn.js";
import addToMapArray from "./utils/map-fn.js";


function getExtension(filename) {
  var i = filename.lastIndexOf('.');
  return (i < 0) ? '' : filename.substring(i);
}

/**
 * processes gets the ast for all the modules and creates the dependeciesList, exportList and importMap
 * @param {*} moduleMap 
 * @param {*} root 
 * @returns 
 */
export function processAST(moduleMap, root) {

  // list of dependencies between modules including the functions
  let dependencyList = [];
  // list of functions exported from modules/files
  let exportList = [];

  root = "./" + root;
  // get the export list and dependency of each module/file
  moduleMap.forEach((arr, k) => {
    arr.forEach(e => {
      const f = e.replace(".", root);
      const ext = getExtension(f).toLowerCase();
      if (ext === ".js") {
        try {
          const ast = parseAST(f);
          const exp = parseExports(ast, e);
          const deps = parseImports(ast, e);
          exportList.push(...exp);
          dependencyList.push(...deps);
        } catch (err) {
          console.log("------------------");
          console.log("file=", f, " module=", e);
          console.log(err);
          console.log("------------------");

        }
      } else {
        console.log("Can only parse javascript files at the moment. file=", f);
      }
    });
  });
  // map of imports key=module/file value=an array of functions.
  let importMap = getImportMap(dependencyList);
  return [dependencyList, exportList, importMap];
}


function getImportMap(dependencyList) {
  let importMap = new Map();
  for (let dep of dependencyList) {
    addToMapArray(importMap, dep.importSrc, dep.import);
  }
  return importMap;
}

/**
 *
 * @param {*} symbol the file to get the ast from
  * @returns ast object struture for parsing
 */
function parseAST(symbol) {
  const result = readFileSync(symbol, 'utf-8');
  //      console.log(`Retrieving file ast information for ${symbol}`);
  //const ast = parse(result, { sourceType: "module" });


  return acparse(result, { ecmaVersion: 2020, sourceType: "module" });
}

function parseImports(ast, symbol) {
  let dependencies = [];
  simple(ast, {
    ImportDeclaration(node) {
      //          let im: ImportDeclaration;
      //          im = node as ImportDeclaration;
      // console.log(`Found a import: ${node.source.value} type : ${typeof im.specifiers}  length : ${im.specifiers.length}`);
      for (var i = 0; i < node.specifiers.length; i++) {
        const name = node.specifiers[i].type === "ImportSpecifier" ? node.specifiers[i].imported.name : node.specifiers[i].local.name;
        //            console.log(name);
        let dest = node.source.value;
        let src = symbol;
        if (dest.indexOf("..") !== -1) { // up dirs in the importSrc
          dest = normalizePath(dest, src); // + getFilename(node.source.value);
        }

        dependencies.push({
          src: src,
          importSrc: dest,
          import: name
        });
      }
    }
  });
  return dependencies;

}

function parseExports(ast, symbol) {
  let exportList = [];
  simple(ast, {
    ExportNamedDeclaration(node) {
      exportDeclaration(node);
    }
  });

  simple(ast, {
    ExportDefaultDeclaration(node) {
      exportDeclaration(node);
    }
  });


  return exportList;


  function exportDeclaration(node) {
    try {
      if (node.source) {
        console.log(`TODO: Found a source export: ${node.source.value}`);
      } else if (node.declaration) {
        const declarationList = node.declaration?.declarations;
        if (declarationList) {
          for (var i = 0; i < declarationList.length; i++) {
            exportList.push({
              name: symbol,
              exported: declarationList[i].id.name,
              type: node.declaration.type
            });
          }
        } else if (node.declaration?.id) {
          exportList.push({
            name: symbol,
            exported: node.declaration.id.name,
            type: node.declaration.type
          });
        } else {
          console.log(`TODO: Export parse failed`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
}


  //      var visitor = new Visitor();
  //      visitor.visitNode(ast);
/*
      for (let token of tokenizer(result, { ecmaVersion: 2020, sourceType: "module" })) {
        // iterate over the tokens
      }
 
*/

