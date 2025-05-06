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
import { HtmlGenerator } from './generators/HtmlGenerator.js';
import { jsonOut } from './utils/json.js';
import { safeWriteFile } from "./utils/file-utils.js";
import { spawn } from 'child_process';
import { getRelativePathParts, getDirectoriesRecursive, getFiles, getFilename } from './utils/file-utils.js';
import { DiagramsGenerator } from './generators/DiagramsGenerator.js';
import { ExportGraph } from './graphs/ExportGraph.js';
import { RelationsGraph } from './graphs/RelationsGraph.js';
import { ClassDiagram } from './graphs/ClassDiagram.js';
import { PackageGraph } from './graphs/PackageGraph.js';
import { NodeModulesGraph } from './graphs/NodeModulesGraph.js';


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
  baseLoc = '';
  #options = {};
  outputDir = '';
  diagramHTML = 'diagrams.html';
  indexHTML = 'index.html'

  /**
   * Creates a new DependencyGraphGenerator instance
   * @param {string} baseLoc - Base location (file or directory) to analyze
   * @param {Object} options - CLI options for controlling output formats
   * @param {boolean} [options.json] - Whether to output JSON files
   * @param {boolean} [options.graph] - Whether to generate package dependency graphs
   * @param {boolean} [options.class] - Whether to generate class diagrams
   * @param {boolean} [options.jsdoc] - Whether to generate JSDoc documentation
   * @param {string} [options.output="./docs"] - Output directory for documentation relative to the baseLoc
   * @param {string} [options.jsdocConfig] - Path to JSDoc configuration file
   */
  constructor(baseLoc, options) {
    if (!path.isAbsolute(baseLoc)) {
      baseLoc = path.resolve(process.cwd(), baseLoc);
    }
    this.baseLoc = baseLoc;

    console.log(`Base location: ${this.baseLoc}`);
    this.#options = options;
    let outputDir = options.output;
    if (!path.isAbsolute(outputDir)) {
      outputDir = path.resolve(this.baseLoc, outputDir);
    }
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    console.log(`Output directory: ${outputDir}`);

    this.outputDir = outputDir;
  }

  /**
   * Process a file or directory to analyze dependencies and generate outputs
   * @returns {void}
   * @throws {Error} When there's an issue processing the files
   */
  async generate() {
    try {
      // symbol will be full path to the file or directory
      // Get file/directory stats
      const stat = fs.statSync(this.baseLoc);

      // Get module information
      const [moduleArray] = this.#getModuleArray(stat);
      console.log(`Processing ${moduleArray.length} modules...`);
      // Process and output results
      // eslint-disable-next-line no-unused-vars
      const [dependencyList, exportList, usedList, errors, classList] = ProcessAST(moduleArray, this.baseLoc);

      if (this.#options.json) {
        console.log("Writing JSON files...");
        if (errors.length > 0) {
          jsonOut(this.outputDir, "Errors", errors);
        }

        jsonOut(this.outputDir, "ExportList", exportList);
        jsonOut(this.outputDir, "DependencyList", dependencyList);
        jsonOut(this.outputDir, "ModuleArray", moduleArray);
        jsonOut(this.outputDir, "ClassList", classList);
        jsonOut(this.outputDir, "UsedList", usedList);
      }

      // Array to hold promises for SVG generation
      const svgPromises = [];

      // Generate and write output files
      // Generate Package.dot
      console.log("Generating package graph...");
      const packageGraph = new PackageGraph(moduleArray, dependencyList);
      const pgkGraph = packageGraph.generate();
      safeWriteFile(this.outputDir, "Package.dot", pgkGraph);
      svgPromises.push(this.#generateSvgFromDot(path.join(this.outputDir, "Package.dot"), path.join(this.outputDir, "Package.svg")));

      console.log("Generating relations graph...");
      const relationsGraph = new RelationsGraph(dependencyList, moduleArray);
      const relGraph = relationsGraph.generate();
      safeWriteFile(this.outputDir, "Relations.dot", relGraph);
      svgPromises.push(this.#generateSvgFromDot(path.join(this.outputDir, "Relations.dot"), path.join(this.outputDir, "Relations.svg")));

      console.log("Generating node modules graph...");
      const nodeModulesGraph = new NodeModulesGraph(dependencyList);
      const nmGraph = nodeModulesGraph.generate();
      safeWriteFile(this.outputDir, "NodeModules.dot", nmGraph);
      svgPromises.push(this.#generateSvgFromDot(path.join(this.outputDir, "NodeModules.dot"), path.join(this.outputDir, "NodeModules.svg")));


      const dirArray = [...new Set(moduleArray.map(module => module.dir))];

      // Add class diagram generation if option is specified
      if (this.#options.class) {
        console.log("Generating class diagram...");
        const classDiagram = new ClassDiagram(dependencyList, classList);
        this.#createClassDirGraph("ClassDiagram", dirArray, classDiagram, svgPromises);
      }

      // create the graph file for packages or directories for all the modules. -g option
      if (this.#options.graph) {
        console.log("Generating export graph...");
        const exportGraph = new ExportGraph(dependencyList, exportList, moduleArray);
        this.#createExportDirGraph("ExportGraph", dirArray, exportGraph, svgPromises)
      }

      // Run JSDoc if requested
      if (this.#options.jsdoc) {
        let actualConfigFile = this.#options.jsdocConfig
        if (!actualConfigFile) {
          actualConfigFile = this.#createTempJsdocConfig()
        }
        this.#generateJSDoc(actualConfigFile);
      }

      // Wait for all SVG generation processes to complete
      console.log(`Waiting for ${svgPromises.length} SVG generation processes...`);
      try {
        await Promise.all(svgPromises);
        console.log("All SVG generation processes finished.");
      } catch (error) {
        console.error("Error during SVG generation:", error);
      }

      // Generate HTML output
      console.log("Generating HTML documentation...");
      const htmlGenerator = new HtmlGenerator(this.diagramHTML);
      const modHtml = htmlGenerator.createModuleHtml(this.outputDir, moduleArray, dependencyList, exportList);
      safeWriteFile(this.outputDir, this.indexHTML, modHtml);

      console.log("Generating diagrams ...");
      const diagramsGenerator = new DiagramsGenerator(this.indexHTML);
      const diagHtml = diagramsGenerator.createDiagramsHtml(this.outputDir, dirArray);
      safeWriteFile(this.outputDir, this.diagramHTML, diagHtml);


    } catch (error) {
      console.error(`Error processing ${this.baseLoc}: ${error}`);
    }
  }

  /**
   * Creates a map with key=directory(package) value=array of files(modules) in directory
   * @param {Object} stats - The stats of the symbol to determine if a file or directory was called
   * @returns {Array} Array containing:
   *   1. Array of module objects with directory, file, and metrics information
   *   2. Array of directories
   */
  #getModuleArray(stats) {
    let arr = [];
    let root = path.dirname(this.baseLoc).replaceAll("\\", "/");

    let dirArr = [];
    if (stats.isFile()) {
      arr.push({
        dir: root, file: getFilename(this.baseLoc),
        dependsOnCnt: 0, usedByCnt: 0, exportCnt: 0
      });
      dirArr.push(root);
    } else if (stats.isDirectory()) {
      // array of directories
      const dirArr = getDirectoriesRecursive(this.baseLoc, this.#options.ignore || []);

      dirArr.forEach(e => {
        const fileList = getFiles(e);
        fileList
          .filter(file => (!path.basename(file).startsWith('.')))
          .forEach(file => {
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
  #generateJSDoc(config) {
    // Pass the config file to JSDoc
    const args = ['--configure', config];
    //    this.#showJsdocPath();

    // Using shell: true can help resolve .cmd files and PATH issues on Windows
    const jsdocProcess = spawn('jsdoc', args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      // On Windows, shell should be true to correctly execute .cmd files like jsdoc.cmd
      shell: process.platform === 'win32' ? true : false
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

  #showJsdocPath() {
    // Log the PATH environment variable for debugging
    const currentPath = process.env.PATH || process.env.Path;
    if (currentPath) {
      //      console.log("Full PATH environment variable as seen by Node.js:");
      //      console.log(currentPath);
      const pathSegments = currentPath.split(path.delimiter);
      const npmPaths = pathSegments.filter(segment => segment.toLowerCase().includes('npm'));
      if (npmPaths.length > 0) {
        console.log("\nNPM related paths found in PATH:");
        npmPaths.forEach(npmPath => console.log(npmPath));
      } else {
        console.log("\nNo NPM related paths found in PATH.");
      }
    } else {
      console.log("PATH environment variable not found.");
    }
  }

  #createTempJsdocConfig() {
    // If no config file is provided, create a basic one
    const basicConfig = {
      source: {
        include: [path.resolve(this.outputDir)],
        exclude: ["node_modules"]
      },
      sourceType: "module",
      opts: {
        destination: path.resolve(this.outputDir, 'jsdocs'),
        recurse: true,
        sourcemap: false
      },
      plugins: ["plugins/markdown"]
    };

    const jsdocOutput = path.resolve(this.outputDir, 'jsdocs');
    fs.mkdirSync(jsdocOutput, { recursive: true });

    const tempConfigPath = path.join(this.outputDir, 'temp-jsdoc-config.json');
    fs.writeFileSync(tempConfigPath, JSON.stringify(basicConfig, null, 2));
    return tempConfigPath;
  }

  /**
   * Creates graph files for a specific graph type and all directories
   * @param {ExportGraph} exportGraph - The graph generator instance
   * @param {Promise[]} svgPromises - Array to collect SVG generation promises
   * @returns {void}
   */
  #createExportDirGraph(graphName, dirArray, exportGraph, svgPromises) {

    dirArray.forEach(dir => {
      const graph = exportGraph.generate(dir);
      const fileDir = path.join(this.outputDir, dir);
      // Ensure the directory exists before writing files
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      safeWriteFile(fileDir, `${graphName}.dot`, graph);

      svgPromises.push(this.#generateSvgFromDot(path.join(fileDir, `${graphName}.dot`), path.join(fileDir, `${graphName}.svg`)));
    })
  }

  /**
     * Creates graph files for a specific graph type and all directories
     * @param {Array} dirArray - Array of directory names
     * @param {ClassDiagram} classDiagram - The class diagram generator instance
     * @param {Promise[]} svgPromises - Array to collect SVG generation promises
     * @returns {void}
     */
  #createClassDirGraph(graphName, dirArray, classDiagram, svgPromises) {

    dirArray.forEach(dir => {
      const graph = classDiagram.generate(dir);
      const fileDir = path.join(this.outputDir, dir);
      // Ensure the directory exists before writing files
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      safeWriteFile(fileDir, `${graphName}.dot`, graph);

      svgPromises.push(this.#generateSvgFromDot(path.join(fileDir, `${graphName}.dot`), path.join(fileDir, `${graphName}.svg`)));
    })
  }


  /**
   * Generate SVG file from DOT file using Graphviz CLI
   * @param {string} dotFilePath - Path to the DOT file
   * @param {string} svgFilePath - Path where the SVG should be saved
  * @returns {Promise<void>} A promise that resolves when the SVG is generated or rejects on error.
   * @throws {Error} When Graphviz encounters an error
   */
  #generateSvgFromDot(dotFilePath, svgFilePath) {
    return new Promise((resolve, reject) => {
      try {
        // Check if dot file exists
        if (!fs.existsSync(dotFilePath)) {
          // console.warn(`Skipping SVG generation: DOT file not found at ${dotFilePath}`);
          resolve(); // Resolve immediately if no dot file exists
          return;
        }
        // Check if SVG file exists and delete it to ensure regeneration
        if (fs.existsSync(svgFilePath)) {
          fs.unlinkSync(svgFilePath);
        }

        const graphvizProcess = spawn('dot', ['-Tsvg', dotFilePath, '-o', svgFilePath]);

        graphvizProcess.on('error', (err) => {
          if (err.code === 'ENOENT') { // Use err.code for spawn errors
            console.error(`Error: Graphviz 'dot' command not found. Please ensure Graphviz is installed and in your system's PATH.`);
            reject(new Error(`Graphviz 'dot' command not found.`));
          } else {
            console.error(`Error spawning Graphviz: ${err.message}`);
            reject(err);
          }
        });

        graphvizProcess.on('close', (code) => {
          if (code === 0) {
            // console.log(`SVG file successfully generated: ${svgFilePath}`);
            resolve();
          } else {
            console.error(`Graphviz process for ${dotFilePath} exited with code ${code}`);
            reject(new Error(`Graphviz process exited with code ${code} for ${dotFilePath}`));
          }
        });
      } catch (error) {
        console.error(`Error setting up SVG generation for ${dotFilePath}: ${error.message}`);
        reject(error);
      }
    });
  }
}