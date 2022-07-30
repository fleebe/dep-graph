// #!/usr/bin/env node
// cli from "commander";
//const { Command } = require('commander');
//const program = new Command();

import { Command } from 'commander';
import fs from "fs";
import { processAST } from './ast.js';
import path from "path";
import { createGraph } from './commands/graph.js';
import { exit, hasUncaughtExceptionCaptureCallback } from 'process';
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
    let moduleList = [];

    let dir = path.dirname(symbol);
    // TODO: the dir passed in is the same module as ./ for an import in that dir if it is a directory
    // if a file then the dir as above is the same module as ./ for an import
    
    if (stats.isFile()) {
      console.log("** file ", dir, "** ", symbol);

    } else if (stats.isDirectory()) {
      console.log("**dir ", dir, "** ", symbol);
      dir = symbol;
    }
   
    if (stats.isFile()) {
      [dependencyList, exportList, moduleList] = processAST(symbol);
    } else if (stats.isDirectory()) {
      const arrayOfFiles = fs.readdirSync(symbol);
      for (let i = 0; i < arrayOfFiles.length; i++) {
        [dependencyList, exportList, moduleList] = processAST(path.join(symbol, arrayOfFiles[i]));
      }
    } else {
      console.error("Neither a file or directory specified."); //Handle error
      return;
    }

    if (options.debug) {
      console.log("-----------------------------modules-----------------------------");
      console.log(moduleList);
      console.log("-----------------------------exports-----------------------------");
      console.log(exportList);
      console.log("-----------------------------imports-----------------------------");
      console.log(dependencyList);
    }

    if (options.json) {
      fs.writeFileSync(path.join(options.output, "moduleList.json"), JSON.stringify(moduleList, null, 2), "utf8");
      fs.writeFileSync(path.join(options.output, "exportList.json"), JSON.stringify(exportList, null, 2), "utf8");
      fs.writeFileSync(path.join(options.output, "dependencyList.json"), JSON.stringify(dependencyList, null, 2), "utf8");
    }

    if (options.graph) {
      fs.writeFileSync(path.join(options.output, "dependencyList.dot"), createGraph(dependencyList, exportList, moduleList), "utf8");
    }
  })
});

program.parse(process.argv);

