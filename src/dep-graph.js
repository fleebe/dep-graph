import { Command } from 'commander';
import fs from "fs";
import path from "path";
import { processAST } from './ast.js';
import { createGraph, createPackageGraph } from './commands/graph.js';
import { jsonOut, jsonIn } from './commands/json.js';
import { getFilename, getModuleMap } from "./utils/file-fn.js";
import { fileURLToPath } from 'url';

// https://cheatcode.co/tutorials/how-to-build-a-command-line-interface-cli-using-node-js
// https://openbase.com/js/commander

export function runProgram() {

  const program = new Command();

  const getVersion = () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJSONPath = path.resolve(__dirname, "../package.json")
    const content = fs.readFileSync(packageJSONPath, { encoding: "utf8" })
    const config = JSON.parse(content)
    return config.version
  }

  program.name("dep-graph")
    .version(getVersion())
    .description(`A cli to generate documentation for dependencies of a javascript file | directory.`)
    .option("-g --graph", "produce package and dependencies .dot files that graphviz can use to generate a graph of the dependencies to output directory.")
    .option("-j --json", "produce .json object files of the dependencies to output directory.")
    .option("-o --output <dir>", "directory that the outputs are sent to.", "./out")
    .argument("<file | directory>");

  program.action((symbol, options) => {
    fs.lstat(symbol, (err, stat) => {
      if (err) {
        console.error(err); //Handle error
        return;
      }

      validateOptions(options);

      // a list of modules or files  from dir in the form  .dir/file.js list recursively walks the start directory
      let [moduleMap, srcDir] = getModuleMap(symbol, stat);

      // prefix for the output files
      let lastDir;
      if (stat.isDirectory()) {
        lastDir = getLastDir(srcDir);
      } else { // is a file
        lastDir = getFilename(symbol);
        lastDir = lastDir.split(".")[0];
      }

      let dependencyList = [];
      // list of functions exported from modules/files
      let exportList = [];
      let importMap = new Map();
      let errors = [];

      // get the export list and dependency of each module/file
      // only do this if the -j option is set otherwise read from the output directory
      if (options.json) {
        // a list of modules or files  from dir in the form  .dir/file.js list recursively walks the start directory
          [dependencyList, exportList, importMap, errors] = processAST(moduleMap, srcDir);
          if (errors.length > 0) {
            fs.writeFileSync(path.join(options.output, lastDir + "Errors.json"), JSON.stringify(errors, null, 2), "utf8");
          }
          jsonOut(options.output, moduleMap, exportList, dependencyList, importMap, lastDir);
      } else {
        // read from output directory
        moduleMap = jsonIn(path.join(options.output, lastDir + "ModuleMap.json"));
        exportList = Array.from(jsonIn(path.join(options.output, lastDir + "ExportList.json")));
        dependencyList = Array.from(jsonIn(path.join(options.output, lastDir + "DependencyList.json")));
        importMap = jsonIn(path.join(options.output, lastDir + "ImportMap.json"));
      }

      // create the graph file for packages or directories for all the modules. -g option
      if (options.graph) {
        let result = createPackageGraph(moduleMap, dependencyList);
        const packFile = lastDir + "Package.dot";
        fs.writeFileSync(path.join(options.output, packFile), result, "utf8");

        result = createGraph(dependencyList, exportList, moduleMap, importMap);
        const depFile = lastDir + "Dependencies.dot";
        fs.writeFileSync(path.join(options.output, depFile), result, "utf8");
      }

    })
  });

  program.parse(process.argv);
}

function getLastDir(srcDir) {
  let lastDir = srcDir.split("/").slice(-1).join("");
  (lastDir.startsWith(".")) ? lastDir = lastDir.slice(1) : lastDir;
  (lastDir.startsWith("/")) ? lastDir = lastDir.slice(1) : lastDir;
  (lastDir.startsWith("\\")) ? lastDir = lastDir.slice(1) : lastDir;
  return lastDir;
}

//-------------------------------------


function validateOptions(options) {
  if (!options.json && !options.graph) {
    console.error("Neither output format was specified.");
  }

  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output);
    console.log("created output directory ", options.output);
  }
}


