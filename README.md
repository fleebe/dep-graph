# Description

A cli program to generate dependency .dot files for use with [Graphviz](https://graphviz.org/).

It can process a file or a directory. For a directory it processes recursively.

From root directory where this file is.

1. install for testing
  `npm install -g .`
2. uninstall
  `npm uninstall -g dep-graph`
3. when installed
  `dep-graph -g -j -o ./dep-out ./src/server`
4. run from the command line using node
 `node . -g -j ./src`
5. get help
`node . --help`
6. test (not really working)
 `yarn test`

## Options

If only -g option is used it assumes the json files. If they do not exist it will fail.

|     |     |     |
|----- | --- | --- |
|-V | --version |  output the version number
|-g |--graph   |produces package and dependencies  .dot files that graphviz can use to generate a graph of the dependencies to output directory (see files produced).
|-j |--json    |produce .json object files used to output directory (see files produced).
|-o |--output \<dir\> | directory that the outputs are sent to. (default: "./out")
|-h |--help |         display help for command

# Files Produced

Files are prefixed with the \<directory | filename> that was the base for the dependency graph and outputed to the output directory. e.g

`dep-graph -g -j -o ./dep-out ./src/server`

will produce the following files in the dep-out directory.

- serverPackage.dot
- serverDependencies.dot
- serverDependencyList.json
- serverExportList.json
- serverImportMap.json
- serverModuleMap.json

## json files

The -j option produces .json files in the output directory which contain the following structures.

Package - a directory containing files.

Module -  a file in a directory.

<br>

|    |     |     |
| --- | --- | --- |
|  DependencyList.json   |A list of dependencies containing the <br>- src (the file containing the import)<br> - the importSrc (where the import is from) <br> - the imported function. |     |  
|  ExportList.json   |A list of exports containing the <br> - name (the file the export is in) <br> - exported function <br> - type of export     |     |
|  ImportMap.json   | A map keyed by the import name and and a value of an array of functions that are exported.    |     |
|  ModuleMap.json | A map keyed by the name of the package and a value of an array of imports from the package.

## Graphviz files

The -g option produces .dot files in the output directory which contain the following structures.

A * indicates it is the default export/import.

The graph is formatted

- module name

-------------

- exported functions list

-------------

- imported modules list (left justified)

- imported functions list (right justified)

<br>

|    |     |     |
| --- | --- | --- |
|  Dependencies.dot   | The graphviz file used to produce a graph of module dependencies  |     |
|  Package.dot   | The graphviz file used to produce a graph of package dependencies.     |     |

## Examples

### DependencyList

```json
[ 
  {
    "src": "./ast.js",
    "importSrc": "fs",
    "import": "writeFileSync"
  },
  {
    "src": "./ast.js",
    "importSrc": "fs",
    "import": "readFileSync"
  } 
]
  ```

### ExportList

```json
[
  {
    "name": "./ast.js",
    "exported": "processAST",
    "type": "FunctionDeclaration"
  },
  {
    "name": "./ast.js",
    "exported": "getImportMap",
    "type": "FunctionDeclaration"
  }
]
  ```  

### ImportMap

```json
{
  "fs": [
    "writeFileSync",
    "readFileSync",
    "fstat",
    "*fs"
  ],
  "acorn": [
    "parse"
  ],
  "./utils/file-fn.js": [
    "normalizePath",
    "getModuleMap"
  ]
}
  ```  

### ModuleMap

```json
{
  "./": [
    "./ast.js",
    "./dep-graph.js"
  ],
  "./commands": [
    "./commands/graph.js",
    "./commands/json.js"
  ],
  "./utils": [
    "./utils/file-fn.js",
    "./utils/map-fn.js"
  ]
}
  ```  
