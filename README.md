# Description

A cli program to generate a html report of application javascript files.
Dependencies .dot graph files are also produce for use with [Graphviz](https://graphviz.org/).

It can process a file or a directory. For a directory it processes recursively.

It handles .js and .jsx files only. In the future it will handle typescript (.ts) files.

From root directory where this file is.

1. install for testing<br>
  `npm install -g .`
2. uninstall<br>
  `npm uninstall -g dep-graph`
3. when installed<br>
  `dep-graph -j -o ./dep-out ./src/server`
4. run from the command line using node<br>
 `node . -j ./src`
5. get help<br>
`node . --help`
6. test (not really working.<br>
`yarn test`
7. Create a svg file from a .dot file. Assumes you have graphviz installed<br>
 `dot -Tsvg srcPackage.dot -o srcPackage.svg`

## Options

|     |     |     |
|----- | --- | --- |
|-V | --version |output the version number
|-j |--json    |produce .json object files used  (see files produced).
|-o |--output \<dir\> | directory that the outputs are sent to. (default: "./out")
|-h |--help |display help for command

## Definitions

Package - a directory containing files.

Module -  a file in a directory.

# Plans

If you try it out and it does not work drop me an email. It is my first pass so I'm happy to try and improve it if you have some suggestions. Make a pull request or engage in the discussion. *Money or work would be gratefully accepted as I am not working at the moment.*

Some ideas I have for future work include. Let me know any favourites.

- Enable it to parse typescript (ts) and (tsx) files into the graph
- Produce a summary table of module usage counts. (done)
- Develop and maintain tests
- add graphs to the html report
- Create hyperlinks (done in html report)
- Add JSDocs links.
- Make the graph production more configurable
- Any useful user suggestion.
- Fix bugs and errors
- Add in types and parameters for exported functions (done for most)
- normalise .js and non .js imports that are referencing the same package. (done)
- parse (jsx) files (done)

## Other Projects

Some other ideas I have for future projects. These would change source.

- Generate JSDoc for functions.
- Convert js files to typescript.

# Files Produced

Files are prefixed with the <directory | filename> that was the base for the dependency graph and outputted to the output directory. e.g

`dep-graph -j -o ./dep-out ./src/server`

will produce the following files in the dep-out directory.

- serverPackage.dot
- serverRelations.dot
- serverDependencyList.json
- serverExportList.json
- serverErrors.json
- serverModuleArray.json
- serverModuleArray.html

Examples of the files exist in ./\_\_tests__/out-eg directory

## Graphviz files

Title is the root directory that was passed as the argument to the cli.

### Package.dot

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

\<Directory> - *Depends on* -> \<Directory> where the directories contain the files with the dependencies.

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

\<Module> - *Depend on* -> \<Module> | <Directory> if the directory is outside the root.

### Relations Graph Example

<br>
<img src="./__tests__/out-eg/srcRelations.svg" alt="
Example srcRelations.dot" style="height: 600px; width : 600px">

# html Report Example

<a href="file:///./__tests__/out-eg/srcModuleArray.html">```./__tests__/out-eg/srcModuleArray.html```</a>

# Json Files

The -j option produces .json files in the output directory which contain the following structures.

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
<tr><td>ModuleArray.json </td><td> An array modules
<table>
<tr><td>dir</td><td> the directory/package containing the file/module</td></tr>
<tr><td>file</td><td>the module</td></tr>
<tr><td>dependsOnCnt</td><td>the number of modules that the file depends on including node_modules.</td></tr>
<tr><td>usedByCnt</td><td> the number of modules that the file is used by.</td></tr>
<tr><td>exportCnt</td><td> the number exported from the file.</td></tr>
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
