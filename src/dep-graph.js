// #!/usr/bin/env node
// cli from "commander";
//const { Command } = require('commander');
//const program = new Command();

import { Command } from 'commander';
import fs from "fs";
import { processAST } from './ast.js';
import path from "path";
import { createGraph, createPackageGraph } from './commands/graph.js';
import { getImportList, getBaseDir, getFilename, addToMapArray } from "./file-fn.js";


//import { getVersion } from "./json-package.cjs";
//const pack = require('./json-package');
//import pkg from './json-package.cjs';
//const { getVersion } = pkg;

// https://cheatcode.co/tutorials/how-to-build-a-command-line-interface-cli-using-node-js
// https://openbase.com/js/commander

//const version = getVersion();
const version = "1.0.0";
const program = new Command();
program.name("dep-graph")
  .version(version)
  .description(`A cli to generate documentation for dependencies of a javascript file | directory.`)
  .option("-g --graph", "produce a .dot file that graphviz can use to generate a graph of the dependencies to output directory.")
  .option("-j --json", "produce .json object files of the dependencies to output directory.")
  .option("-d --debug", "produce debug messages to console.", false)
  .option("-o --output <dir>", "directory that the outputs are sent to.", "./out")
  .argument("<file | directory>");

program.action((symbol, options) => {
  fs.lstat(symbol, (err, stats) => {
    if (err) {
      console.error(err); //Handle error
      return;
    }

    if (!options.json && !options.graph) {
      console.error("Neither output format was specified."); 
    }

    if (!fs.existsSync(options.output)) {
      fs.mkdirSync(options.output);
      console.log("created output directory ", options.output); 
    }

    let dependencyList = []; // list of dependencies between modules including the functions
    let exportList = []; // list of functions exported from modules
    let moduleList = [];  // a list of modules from dir in the form  .dir/file.js
    let dir;  // the directory that is the base in the form ./dir/dir2
    const sdir = "./";

    // symbol is what was used in the command line.
    if (stats.isFile()) {
      dir = getBaseDir(path.dirname(symbol));
      moduleList.push(sdir + getFilename(symbol));
    } else if (stats.isDirectory()) {
      dir = getBaseDir(symbol);
      moduleList = getImportList(symbol);
    } else {
      console.error("Neither a file or directory specified."); //Handle error
      return;
    }

    for (let i = 0; i < moduleList.length; i++) {
      if (!fs.existsSync(moduleList[i])) {
        [dependencyList, exportList] = processAST(moduleList[i], dir);
      }
    }
 
    let importMap = new Map();  // map of imports key=module value is an array of functions.
    for (let dep of dependencyList) {
      addToMapArray(importMap, dep.importSrc, dep.import);
    }

    // create the graph file for packages or all the modules.
    if (options.graph) {
      createPackageGraph(moduleList, dependencyList, options.output);
    }

    /*
    let importSet = new Set(importArray);
    let uniqueArray = Array.from(importSet);
    uniqueArray.forEach((_e, i) => {
      uniqueArray[i] = JSON.parse(uniqueArray[i]);
    });
*/
// output the data structures to the screen.
    if (options.debug) {
      console.log("-----------------------------modules-----------------------------");
      console.log(moduleList);
      console.log("-----------------------------exports-----------------------------");
      console.log(exportList);
      console.log("-----------------------------dependencies------------------------");
      console.log(dependencyList);
      console.log("-----------------------------imports-----------------------------");
      console.log(importMap);
    }
// save data structures to json files. Cannot stringify a Map so need to convert it to an object.

    if (options.json) {
      fs.writeFileSync(path.join(options.output, "moduleList.json"), JSON.stringify(moduleList, null, 2), "utf8");
      fs.writeFileSync(path.join(options.output, "exportList.json"), JSON.stringify(exportList, null, 2), "utf8");
      fs.writeFileSync(path.join(options.output, "dependencyList.json"), JSON.stringify(dependencyList, null, 2), "utf8");
      fs.writeFileSync(path.join(options.output, "importMap.json"), JSON.stringify(importMap, null, 2), "utf8");
      let obj = strMapToObj(importMap);
      fs.writeFileSync(path.join(options.output, "importList.json"), JSON.stringify(obj, null, 2), "utf8");
    }
// create the graph file
    if (options.graph) {
      fs.writeFileSync(path.join(options.output, "dependencyList.dot"), createGraph(dependencyList, exportList, moduleList, importMap), "utf8");
    }
  })
});

program.parse(process.argv);

// https://2ality.com/2015/08/es6-map-json.html
function strMapToObj(strMap) {
  let obj = Object.create(null);
  for (let [k, v] of strMap) {
    // We don’t escape the key '__proto__'
    // which can cause problems on older engines
    obj[k] = v;
  }
  return obj;
}
// https://2ality.com/2015/08/es6-map-json.html
function objToStrMap(obj) {
  let strMap = new Map();
  for (let k of Object.keys(obj)) {
    strMap.set(k, obj[k]);
  }
  return strMap;
}