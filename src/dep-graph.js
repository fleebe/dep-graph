// #!/usr/bin/env node
// cli from "commander";
//const { Command } = require('commander');
//const program = new Command();

import { Command } from 'commander';
import fs from "fs";
import { processAST } from './ast.js';
import path from "path";
import { createGraph } from './commands/graph.js';
import { getImportList, getBaseDir, getFilename } from "./file-fn.js";


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
      console.error("Neither output format was specified."); //Handle error
    }

    if (!fs.existsSync(options.output)) {
      fs.mkdirSync(options.output);
      console.log("created output directory ", options.output); //Handle error
    }

    let dependencyList = [];
    let exportList = [];
    let moduleList = [];  // a list of modules moving from dir in the form  .dir/file.js
    let dir;  // the directory that is the base in the form ./dir/dir2
    const sdir = "./";

    // symbol is what was based from the command line.
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

    let importSet = new Set();
    let item;
    for (let i = 0; i < dependencyList.length; i++) {
      item = {
        module: dependencyList[i].importSrc,
        import: dependencyList[i].import
      };
      if (!importSet.has(item)) {
        importSet.add(item);
      }
//      if (importList.indexOf(item) === -1) {
//        importList.push(item);
//      }
    }

    const importList = Array.from(importSet);
    

    if (options.debug) {
      console.log("-----------------------------modules-----------------------------");
      console.log(moduleList);
      console.log("-----------------------------exports-----------------------------");
      console.log(exportList);
      console.log("-----------------------------dependencies------------------------");
      console.log(dependencyList);
      console.log("-----------------------------imports-----------------------------");
      console.log(importList);
    }

    if (options.json) {
      fs.writeFileSync(path.join(options.output, "moduleList.json"), JSON.stringify(moduleList, null, 2), "utf8");
      fs.writeFileSync(path.join(options.output, "exportList.json"), JSON.stringify(exportList, null, 2), "utf8");
      fs.writeFileSync(path.join(options.output, "dependencyList.json"), JSON.stringify(dependencyList, null, 2), "utf8");
      fs.writeFileSync(path.join(options.output, "importList.json"), JSON.stringify(importList, null, 2), "utf8");
    }

    if (options.graph) {
      fs.writeFileSync(path.join(options.output, "dependencyList.dot"), createGraph(dependencyList, exportList, moduleList), "utf8");
    }
  })
});

program.parse(process.argv);
