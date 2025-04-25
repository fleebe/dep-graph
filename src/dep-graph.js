import { Command } from 'commander';
import fs from "fs";
import path from "path";
import { processAST } from './ast.js';
import { createGraph, createRelationsGraph, createPackageGraph } from './commands/graph.js';
import { createModuleHtml } from './commands/html.js';
import { jsonOut, jsonIn } from './commands/json.js';
import { getFilename, getModuleArray, cleanPath } from "./utils/file-utils.js";
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

/**
 * https://cheatcode.co/tutorials/how-to-build-a-command-line-interface-cli-using-node-js
 * https://openbase.com/js/commander
 *
 * @export
 */

/**
 * gets the version from package.json
 * 
 */
const getVersion = () => {
  // sets the filename global to this file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageJSONPath = path.resolve(__dirname, "../package.json")
  const content = fs.readFileSync(packageJSONPath, { encoding: "utf8" })
  const config = JSON.parse(content)
  return config.version
}

/**
 * Creates and configures the CLI program
 * 
 * @returns {Command} The configured Commander program
 */
function setupProgram() {
  const program = new Command();

  program.name("dep-graph")
    .version(getVersion())
    .description(`A CLI to generate documentation for dependencies of a JavaScript file or directory.`)
    .option("-j --json", "produce .json object files of the dependencies to output directory.")
    .option("-g --graph", "produce package and dependencies .dot files that graphviz can use to generate a graph of the dependencies to output directory.")
    .option("-o --output <dir>", "directory that the outputs are sent to.", "./docs")
    .option("-d --jsdoc", "generate JSDoc documentation in the output directory.")
    .option("--jsdoc-config <file>", "path to JSDoc configuration file.", "./jsdoc.json")
    .argument("<file | directory>", "JavaScript file or directory to analyze");

  return program;
}

export function runProgram() {
  // Get version and setup program configuration
  const program = setupProgram();

  program.action((symbol, options) => {
    processFileOrDirectory(symbol, options);
  });

  program.parse(process.argv);
}

/**
 * Process a file or directory to analyze dependencies
 * 
 * @param {string} symbol - File or directory path to analyze
 * @param {object} options - CLI options
 */
function processFileOrDirectory(symbol, options) {
  fs.lstat(symbol, (err, stat) => {
    if (err) {
      console.error(`Error accessing ${symbol}: ${err.message}`);
      return;
    }

    try {
      validateOptions(options);
      
      // Get module information
      let [srcDir, moduleArray] = getModuleArray(symbol, stat);
      srcDir = "./" + cleanPath(srcDir);
      
      // Determine output file prefix
      const lastDir = stat.isDirectory() 
        ? getLastDir(srcDir) 
        : getFilename(symbol).split(".")[0];

      const output = path.join(options.output, lastDir);
      
      // Ensure output directory exists
      fs.mkdirSync(output, { recursive: true });
      
      // Process and output results
      const [dependencyList, exportList, errors] = processAST(moduleArray, srcDir, output);
      
      // Generate and write output files
      generateOutputFiles(output, moduleArray, dependencyList, exportList);
      
      // Handle JSON outputs if requested
      if (options.json) {
        generateJsonOutput(output, moduleArray, dependencyList, exportList, errors);
      }

      // create the graph file for packages or directories for all the modules. -g option
      if (options.graph) {
 //       const moduleArray = jsonIn(output + "ModuleArray.json");
 //       const exportList = Array.from(jsonIn(output + "ExportList.json"));
 //       const dependencyList = Array.from(jsonIn(output + "DependencyList.json"));
        const importMap = jsonIn(output + "ImportMap.json");
        const pkgGraph = createPackageGraph(moduleArray, dependencyList);
        safeWriteFile(path.join(output, "Package.dot", pkgGraph, "utf8"));
        const depGraph = createGraph(dependencyList, exportList, moduleArray, importMap);
        safeWriteFile(path.join(output, "Dependencies.dot", depGraph, "utf8"));
        const relGraph = createRelationsGraph(dependencyList, moduleArray);
        safeWriteFile(path.join(output, "Relations.dot", relGraph, "utf8"));
      }
      
      // Run JSDoc if requested
      if (options.jsdoc) {
        generateJSDoc(symbol, output, options.jsdocConfig);
      }
    } catch (error) {
      console.error(`Error processing ${symbol}: ${error.message}`);
    }
  });
}

/**
 * Generate JSDoc documentation for the provided source
 * 
 * @param {string} source - Source file or directory to document
 * @param {string} outputDir - Directory to output JSDoc documentation
 * @param {string} configFile - Path to JSDoc configuration file (optional)
 */
function generateJSDoc(source, outputDir, configFile) {
  const jsdocOutput = path.join(outputDir, 'jsdoc');
  fs.mkdirSync(jsdocOutput, { recursive: true });
  
  console.log(`Generating JSDoc documentation in ${jsdocOutput}...`);
  
  // Build JSDoc command arguments
  const args = [
    '--destination', jsdocOutput, 
    source
  ];
  
  // Use config file if provided
  if (configFile) {
    if (!fs.existsSync(configFile)) {
      console.error(`JSDoc config file not found: ${configFile}`);
      return;
    }
    args.unshift('--configure', configFile);
  }
  
  // Run JSDoc command
  const jsdocProcess = spawn('jsdoc', args, { stdio: 'inherit' });
  
  jsdocProcess.on('error', (err) => {
    if (err.code === 'ENOENT') {
      console.error(`Error: JSDoc command not found. Please ensure JSDoc is installed globally (npm install -g jsdoc) or as a dependency in your project.`);
    } else {
      console.error(`Error running JSDoc: ${err.message}`);
    }
  });

  jsdocProcess.on('close', (code) => {
    if (code === 0) {
      console.log(`JSDoc documentation successfully generated in ${jsdocOutput}`);
    } else {
      console.error(`JSDoc process exited with code ${code}`);
    }
  });
}

/**
 * Generate standard output files (HTML and DOT)
 * ModuleArray.html, Package.dot, Relations.dot
 */
function generateOutputFiles(output, moduleArray, dependencyList, exportList) {
  let result = createModuleHtml(moduleArray, dependencyList, exportList);
  safeWriteFile(path.join(output, "ModuleArray.html"), result);
  
  result = createPackageGraph(moduleArray, dependencyList);
  safeWriteFile(path.join(output, "Package.dot"), result);
  
  result = createRelationsGraph(dependencyList, moduleArray);
  safeWriteFile(path.join(output, "Relations.dot"), result);
}

/**
 * Generate JSON output files if requested
 * ExportList.json, DependencyList.json, ModuleArray.json 
 */
function generateJsonOutput(output, moduleArray, dependencyList, exportList, errors) {
  if (errors.length > 0) {
    jsonOut(output, "Errors", errors);
  }
  jsonOut(output, "ExportList", exportList);
  jsonOut(output, "DependencyList", dependencyList);
  jsonOut(output, "ModuleArray", moduleArray);
}

/**
 * Helper function for safe file writing
 * 
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to write
 * @param {string} [encoding="utf8"] - File encoding
 */
function safeWriteFile(filePath, content, encoding = "utf8") {
  try {
    fs.writeFileSync(filePath, content, encoding);
  } catch (error) {
    console.error(`Error writing file ${filePath}: ${error.message}`);
  }
}

/**
 * finds the last name in the path
 * @param {*} srcDir 
 * @returns last name in the path
 */
function getLastDir(srcDir) {
  let lastDir = srcDir.split("/").slice(-1).join("");
  (lastDir.startsWith(".")) ? lastDir = lastDir.slice(1) : lastDir;
  (lastDir.startsWith("/")) ? lastDir = lastDir.slice(1) : lastDir;
  (lastDir.startsWith("\\")) ? lastDir = lastDir.slice(1) : lastDir;
  return lastDir;
}

/**
 * validates the options passed
 * @param {*} options 
 */
function validateOptions(options) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output, { recursive: true });
    console.log("Created output directory:", options.output);
    return;
  }

  // Since graph option is commented out in the program definition,
  // we shouldn't check for it in validation
  if (options.json === undefined) {
    console.warn("No output format was specified. Using default outputs only.");
  }
}


