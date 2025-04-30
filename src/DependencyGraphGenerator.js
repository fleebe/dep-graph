/**
 * @fileoverview Dependency Graph Generator
 * @description Core module for analyzing JavaScript code and generating dependency graphs,
 * class diagrams, and documentation. This module handles the processing of JavaScript files,
 * analyzes their imports/exports, and generates various visualization outputs.
 * @module DependencyGraphGenerator
 * @requires fs
 * @requires path
 * @requires child_process
 * @requires ./ast/ASTProcessor
 * @requires ./commands/graph
 * @requires ./commands/html
 * @requires ./commands/json
 * @requires ./utils/file-utils
 */

import fs from "fs";
import path from "path";
import ProcessAST from './ast/ASTProcessor.js';
import { createExportGraph, createRelationsGraph, createPackageGraph, createClassDiagram } from './commands/graph.js';
import { HtmlGenerator } from './generators/HtmlGenerator.js';
import { jsonOut } from './commands/json.js';
import { getModuleArray, safeWriteFile } from "./utils/file-utils.js";
import { spawn } from 'child_process';
import { getRelativePathParts, getDirectoriesRecursive, getFiles } from './utils/file-utils.js';
import { DiagramsGenerator } from './generators/DiagramsGenerator.js';

/**
 * @class DependencyGraphGenerator
 * @description Main class for analyzing JavaScript code and generating dependency graphs,
 * class diagrams, and documentation. This class handles file processing,
 * AST generation, and generating various output formats including DOT files for Graphviz,
 * HTML documentation, and optional JSDoc output.
 * 
 * @property {string} baseLoc - Base location (file or directory) to analyze
 * @property {Object} options - CLI options for controlling output formats
 * @property {string} outputDir - Absolute path to output directory
 */
export class DependencyGraphGenerator {

  /**
   * Creates a new DependencyGraphGenerator instance
   * @param {string} baseLoc - Base location (file or directory) to analyze
   * @param {Object} options - CLI options for controlling output formats
   * @param {boolean} [options.json] - Whether to output JSON files
   * @param {boolean} [options.graph] - Whether to generate package dependency graphs
   * @param {boolean} [options.class] - Whether to generate class diagrams
   * @param {boolean} [options.jsdoc] - Whether to generate JSDoc documentation
   * @param {string} [options.output="./docs"] - Output directory for documentation
   * @param {string} [options.jsdocConfig] - Path to JSDoc configuration file
   */
  constructor(baseLoc, options) {
    this.baseLoc = this.validateOptions(options, baseLoc);
    this.options = options;
    let outputDir = this.options.output;
    if (!path.isAbsolute(outputDir)) {
      outputDir = path.resolve(process.cwd(), outputDir);
      console.log(`Converted to absolute path: ${outputDir}`);
    }
    this.outputDir = outputDir;
  }

  /**
   * Process a file or directory to analyze dependencies and generate outputs
   * @returns {void}
   * @throws {Error} When there's an issue processing the files
   */
  generate() {
    try {
      // symbol will be full path to the file or directory
      // Get file/directory stats
      const stat = fs.statSync(this.baseLoc);

      // Get module information
      const [moduleArray] = getModuleArray(stat);

      // Process and output results
      // eslint-disable-next-line no-unused-vars
      const [dependencyList, exportList, usedList, errors, classList] = ProcessAST(moduleArray, this.baseLoc);

      if (this.options.json) {
        if (errors.length > 0) {
          jsonOut(this.outputDir, "Errors", errors);
        }

        jsonOut(this.outputDir, "ExportList", exportList);
        jsonOut(this.outputDir, "DependencyList", dependencyList);
        jsonOut(this.outputDir, "ModuleArray", moduleArray);
        jsonOut(this.outputDir, "ClassList", classList);
        jsonOut(this.outputDir, "UsedList", usedList);
      }

      // Generate and write output files
      // Generate Package.dot
      const pgkGraph = createPackageGraph(moduleArray, dependencyList);
      safeWriteFile(this.outputDir, "Package.dot", pgkGraph);
      // Generate Package.svg using command-line Graphviz
      this.generateSvgFromDot(path.join(this.outputDir, "Package.dot"), path.join(this.outputDir, "Package.svg"));
      this.createDirGraph("Relations",  moduleArray, dependencyList)

      // Add class diagram generation if option is specified
      if (this.options.class) {
        this.createDirGraph("ClassDiagram",  moduleArray, dependencyList, classList)
      }

      // create the graph file for packages or directories for all the modules. -g option
      if (this.options.graph) {
        this.createDirGraph("ExportGraph", moduleArray, dependencyList, exportList)
      }

      // Run JSDoc if requested
      if (this.options.jsdoc) {
        this.generateJSDoc(this.baseLoc, this.options.output, this.options.jsdocConfig);
      }

      // Generate HTML output
      const htmlGenerator = new HtmlGenerator();
      const modHtml = htmlGenerator.createModuleHtml(this.outputDir, moduleArray, dependencyList, exportList);
      safeWriteFile(this.outputDir, "ModuleArray.html", modHtml);

      const diagramsGenerator = new DiagramsGenerator();
      const diagHtml =  diagramsGenerator.createDiagramsHtml(this.outputDir, moduleArray);
      safeWriteFile(this.outputDir, "Diagram.html", diagHtml);


    } catch (error) {
      console.error(`Error processing ${this.baseLoc}: ${error.message}`);
    }
  }

  /**
   * Creates a map with key=directory(package) value=array of files(modules) in directory
   * @param {Object} stats - The stats of the symbol to determine if a file or directory was called
   * @returns {Array} Array containing:
   *   1. Array of module objects with directory, file, and metrics information
   *   2. Array of directories
   */
  getModuleArray(stats) {
    let arr = [];
    let root = path.dirname(this.baseLoc).replaceAll("\\", "/");

    let dirArr = [];
    if (stats.isFile()) {
      arr.push({
        dir: root, file: path.getFilename(this.baseLoc),
        dependsOnCnt: 0, usedByCnt: 0, exportCnt: 0
      });
      dirArr.push(root);
    } else if (stats.isDirectory()) {
      // array of directories
      const dirArr = getDirectoriesRecursive(this.baseLoc)

      dirArr.forEach(e => {
        const fileList = getFiles(e);
        fileList.forEach(file => {
          const { directory, filename } = getRelativePathParts(file, this.baseLoc); // get the directory and filename
          arr.push(
            {
              dir: directory, file: filename,
              dependsOnCnt: 0, usedByCnt: 0, exportCnt: 0
            })
        });
      });
    }

    return [arr, dirArr];

  }

  /**
   * Generate JSDoc documentation for the provided source
   * @param {string} source - Source file or directory to document
   * @param {string} output - Output directory for JSDoc documentation
   * @param {string} configFile - Path to JSDoc configuration file (optional)
   * @returns {void}
   */
  generateJSDoc(source, output, configFile) {
    if (configFile) {
      // Read the config file
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

      // Set the source to the absolute path
      config.source.include = [path.resolve(source)];

      // Set the destination to absolute path
      const jsdocOutput = path.resolve(this.outputDir, 'jsdoc');
      // Ensure the destination directory exists
      fs.mkdirSync(jsdocOutput, { recursive: true });
      // Set the destination
      config.opts.destination = jsdocOutput;

      // Write the modified config to a temp file
      const tempConfigPath = path.join(this.outputDir, 'temp-jsdoc-config.json');
      fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));

      // Use the temp config
      configFile = tempConfigPath;
    }

    // Pass ONLY the config file to JSDoc, not the source path
    const args = ['--configure', configFile];

    console.log(`Running JSDoc with args: ${args.join(' ')}`);
    const jsdocProcess = spawn('jsdoc', args, {
      stdio: ['inherit', 'pipe', 'pipe']
    });

    jsdocProcess.stdout.on('data', (data) => {
      console.log(`JSDoc: ${data}`);
    });

    jsdocProcess.stderr.on('data', (data) => {
      console.error(`JSDoc Error: ${data}`);
    });

    jsdocProcess.on('error', (err) => {
      if (err.code === 'ENOENT') {
        console.error(`Error: JSDoc command not found. Please ensure JSDoc is installed globally (npm install -g jsdoc) or as a dependency in your project.`);
      } else {
        console.error(`Error running JSDoc: ${err.message}`);
      }
    });

    jsdocProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`JSDoc documentation successfully generated in ${path.resolve(this.outputDir, 'jsdoc')}`);
      } else {
        console.error(`JSDoc process exited with code ${code}`);
      }
    });
  }

  /**
   * Creates graph files for a specific graph type and all directories
   * @param {string} graphName - Name of the graph to create (Relations, ClassDiagram, ExportGraph)
   * @param {Array} moduleArray - Array of modules with their information
   * @param {Array} dependencyList - List of dependencies between modules
   * @param {Array} classList - List of classes (default empty array)
   * @param {Array} exportList - List of exported elements (default empty array)
   * @returns {void}
   */
  createDirGraph(graphName, moduleArray, dependencyList, classList = [], exportList = []) {
    const dirArray = [...new Set(moduleArray.map(module => module.dir))];

    dirArray.forEach(dir => {
      let graph = null;
      switch (graphName) {
        case "Relations":
          graph = createRelationsGraph(dependencyList, moduleArray);
          break;
        case "ClassDiagram":
          graph = createClassDiagram(dependencyList, classList);
          break;
        case "ExportGraph":
          graph = createExportGraph(dependencyList, exportList, moduleArray);
          break;

        default:
          graph = []
      }
      if (graph) {
        const fileDir = path.join(this.outputDir, dir);
        // Ensure the directory exists before writing files
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        safeWriteFile(fileDir, `${graphName}.dot`, graph);
        this.generateSvgFromDot(path.join(fileDir, `${graphName}.dot`), path.join(fileDir, `${graphName}.svg`));
      }

    })
  }

  /**
   * Generate SVG file from DOT file using Graphviz CLI
   * @param {string} dotFilePath - Path to the DOT file
   * @param {string} svgFilePath - Path where the SVG should be saved
   * @returns {void}
   * @throws {Error} When Graphviz encounters an error
   */
  generateSvgFromDot(dotFilePath, svgFilePath) {
    console.log(`Generating SVG from ${dotFilePath}...`);

    try {
      const graphvizProcess = spawn('dot', ['-Tsvg', dotFilePath, '-o', svgFilePath]);

      graphvizProcess.on('error', (err) => {
        if (err.code === 'ENOENT') {
          console.error('Error: Graphviz dot command not found. Please ensure Graphviz is installed on your system.');
        } else {
          console.error(`Error running Graphviz: ${err.message}`);
        }
      });

      graphvizProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`SVG file successfully generated: ${svgFilePath}`);
        } else {
          console.error(`Graphviz process exited with code ${code}`);
        }
      });
    } catch (error) {
      console.error(`Error generating SVG: ${error.message}`);
    }
  }

  /**
   * Validates the CLI options and input path
   * @param {object} options - CLI options including output directory and generation flags
   * @param {string} symbol - Path to analyze (file or directory)
   * @returns {string} Validated absolute path to the symbol
   * @throws {Error} When path is invalid or doesn't exist
   */
  validateOptions(options, symbol) {
    // Validate path is absolute (full path)
    if (!path.isAbsolute(symbol)) {
      // Instead of throwing an error, let's convert to absolute path
      symbol = path.resolve(process.cwd(), symbol);
      console.log(`Converted to absolute path: ${symbol}`);
    }

    // Verify the path exists
    if (!fs.existsSync(symbol)) {
      throw new Error(`Path does not exist: ${symbol}`);
    }

    // Create output directory if it doesn't exist
    if (!fs.existsSync(options.output)) {
      fs.mkdirSync(options.output, { recursive: true });
      console.log("Created output directory:", options.output);
      return symbol;
    }

    // Since graph option is commented out in the program definition,
    // we shouldn't check for it in validation
    if (options.json === undefined) {
      console.warn("No output format was specified. Using default outputs only.");
    }
    return symbol;
  }
}