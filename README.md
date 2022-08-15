# Description

A cli program to generate dependency .dot files for use with [Graphviz](https://graphviz.org/).

It can process a file or a directory. For a directory it processes recursively.

It handles .js and .jsx files only. In the future it will handle typescript (.ts) files.

From root directory where this file is.

1. install for testing<br>
  `npm install -g .`
2. uninstall<br>
  `npm uninstall -g dep-graph`
3. when installed<br>
  `dep-graph -g -j -o ./dep-out ./src/server`
4. run from the command line using node<br>
 `node . -g -j ./src`
5. get help<br>
`node . --help`
6. test (not really working.<br>
`yarn test`
7. Create a svg file from a .dot file. Assumes you have graphviz installed<br>
 `dot -Tsvg srcPackage.dot -o srcPackage.svg`

## Options

If only -g option is used it assumes the json files exist. If they do not exist it will fail.

|     |     |     |
|----- | --- | --- |
|-V | --version |output the version number
|-g |--graph|produces package and dependencies  .dot files that graphviz <br>can use to generate a graph of the dependencies to <br>output directory (see files produced).
|-j |--json    |produce .json object files used  (see files produced).
|-o |--output \<dir\> | directory that the outputs are sent to. (default: "./out")
|-h |--help |display help for command

# Plans

If you try it out and it does not work drop me an email. It is my first pass so I'm happy to try and improve it if you have some suggestions. Make a pull request if you want to change it yourself. Some ideas I have for future work include. Let me know any favourites. *Money or work would be gratefully accepted as I am not working at the moment.*

- Enable it to parse typescript (ts) and (tsx) files into the graph
- Produce a summary table of module usage counts.
- Develop and maintain tests
- Create hyperlinks
- Add JSDocs links.
- Make the graph production more configurable
- Any useful user suggestion.
- Fix bugs and errors
- Add in types and parameters for exported functions
- See what happens for node modules.
- normalise .js and non .js imports that are referencing the same package. (done)
- parse (jsx) files (done)

## Other Projects

Some other ideas I have for future projects. These would change source.

- Generate JSDoc for functions.
- Convert js files to typescript.

# Files Produced

Files are prefixed with the <directory | filename> that was the base for the dependency graph and outputted to the output directory. e.g

`dep-graph -g -j -o ./dep-out ./src/server`

will produce the following files in the dep-out directory.

- serverPackage.dot
- serverDependencies.dot
- serverRelations.dot
- serverDependencyList.json
- serverExportList.json
- serverImportMap.json
- serverModuleArray.json
- serverErrors.json

Examples of the files exist in ./\_\_tests__/out-eg directory

# Graphviz files

The -g option produces .dot files in the output directory which contain the following structures.

A * indicates it is the default export/import.

## Dependencies.dot

<br>
<table>
<tr>
<th>Description</th>
<th>Format</th></tr>
<tr>
<td>The graphviz file used to produce a graph of module dependencies</td>
<td>

----

- module name

----

- exported functions list

----

- imported modules list (left justified)
- imported functions list for the module (right justified)

----

</td></tr>
</table>

### Exported Function List

This contains the name and code describing the type of export declaration.

<table>
<tr><th>Code</th><th>Description</th></tr>
<tr><td>-cl</td><td>ClassDeclaration</td></tr>
<tr><td>-ce</td><td>CallExpression</td></tr>
<tr><td>-fn</td><td>FunctionDeclaration</td></tr>
<tr><td>-vr</td><td>VariableDeclaration</td></tr>
<tr><td>-id</td><td>Identifier</td></tr>
<tr><td>-pr</td><td>ObjectExpression - property</td></tr>
<tr><td>-af</td><td>ArrowFunctionExpression</td></tr>
<tr><td>-cd</td><td>ConditionalExpression</td></tr>
<tr><td></td><td></td></tr>
</table>

### Dependency Graph example

<img src="./__tests__/out-eg/srcDependencies.svg" alt="
Example srcDependencies.dot" style="height: 500px; width : 600px">

## Package.dot

<br>
<table>
<table>
<tr><th>Description</th>
<th>Format</th></tr>

<tr>
<td>The graphviz file used to produce a graph of package dependencies.</td>
<td>

----

- directory or package name

----

- file/module in the directory

----
</tr>
</table>

**Relation**

\<Module> - *Depends on* -> \<Module>

### Package Graph Example

<img src="./__tests__/out-eg/srcPackage.svg" alt="
Example srcPackage.dot" style="height: 300px; width : 600px">

## Relations.dot

<br>
<table>
<table>
<tr><th>Description</th>
<th>Format</th></tr>

<tr>
<td>The graphviz file used to produce a graph of relations between files. Includes node_moducle relationship where depended on in a module. </td>
<td>

----

- module name
- Depends On : *Number of modules*
- Used By : *Number of modules*

----

- list of modules that it depends on.

----

- list of modules that are used by the module.

----

</tr>
</table>

**Relation**

\<Module> - *Depend on* -> \<Module>

### Relations Graph Example

<img src="./__tests__/out-eg/srcRelations.svg" alt="
Example srcRelations.dot" style="height: 600px; width : 600px">

# Json Files

The -j option produces .json files in the output directory which contain the following structures.

Package - a directory containing files.

Module -  a file in a directory.

----

<table>
<tr><td> DependencyList.json </td>
<td>An array of dependencies containing the
<table>
<tr><td> src </td><td> the file containing the import</td></tr>
<tr><td>importSrc</td><td> where the import is from </td></tr>
<tr><td> import </td><td> the imported function.</td></tr>
</table>
</td></tr>
<tr><td>ExportList.json </td>
<td>An array of exports containing the
<table>
<tr><td>name</td><td>the file the export is in</td></tr>
<tr><td>exported</td><td>what is exported</td></tr>
<tr><td>type</td><td>type of export|</td></tr>
</table>
<tr><td>ImportMap.json </td><td> A map of imports
<table>
<tr><td>key</td><td>the import name</td></tr>
<tr><td>values</td><td>an array of functions that are exported.</td></tr>
</table>
<tr><td>ModuleArray.json </td><td> An array modules
<table>
<tr><td>dir</td><td> the directory/package containing the file/module</td></tr>
<tr><td>file</td><td>the module</td></tr>
<tr><td>dependsOnCnt</td><td>the number of modules that the file depends on including node_modules.</td></tr>
<tr><td>usedByCnt</td><td> the number of modules that the file is used by.</td></tr>
</table>
</td></tr>
<tr><td>Error.json</td><td> The AST parse fails for some syntax or the file is not a .js file. This will result in this file.
<table>
<tr><td>file</td><td>the file being processes that causes the error. </td></tr>
<tr><td>err</td><td>the error generated</td></tr>
<tr><td>msg</td><td>the error message or warning that the file was not processable file</td></tr>
<tr><td>src</td><td>the name of the module in dep-graph generating the error.</td></tr>
</table>
</table>

## Json Examples

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

### ModuleArray

```json
[
  {
    "dir": "./",
    "file": "./ast.js",
    "dependsOnCnt": 0,
    "usedByCnt": 0
  },
  {
    "dir": "./",
    "file": "./dep-graph.js",
    "dependsOnCnt": 0,
    "usedByCnt": 0
  }
]
```

### Errors

```json

[
  {
    "file": "./src/components/forms/index.js",
    "err": {
      "pos": 7,
      "loc": {
        "line": 1,
        "column": 7
      },
      "raisedAt": 18
    },
    "msg": "Unexpected token (1:7)",
    "src": "C:\\Code\\dep-graph\\src\\ast.js"
  }
]  

```
