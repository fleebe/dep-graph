import path from "path";
import fs from "fs";
import {EXT_LIST} from "./globals.js";

/**
 * gets the extension of the file
 * @param {*} filename 
 * @returns the extension
 */
function getExtension(filename) {
  const i = filename.lastIndexOf('.');
  return (i < 0) ? '' : filename.substring(i);
}

export const hasExtension = ((filename, arr) => {
  const ext = getExtension(filename).toLowerCase();
  return (arr.indexOf(ext) !== -1);
});

export const removeExtension = ((filename) => {
  const ext = getExtension(filename);
  if (ext === '') return filename;
  return filename.slice(0, -ext.length);
});


/**
 * converts the directory passed into a standard value
 * @param {*} symbol a directory
 * @returns dir prefixed with ./
 */
const getBaseDir = (symbol) => {
  if (symbol.indexOf("..") !== -1)
    throw new Error("Cannot handle .. in the path name");
  symbol = symbol.replaceAll("\\", '/').replace(".", '').trim();
  (symbol.startsWith("/")) ? symbol = symbol.slice(1) : symbol;
  (symbol.endsWith("/")) ? symbol = symbol.slice(0, symbol.length - 1) : symbol;
  return symbol;
}

/**
 * finds the relative path of the import in relation to the file the import is in.
 * @param {*} dest the import file
 * @param {*} src the file that the import is in
 * @param {*} root location of the directory being processed
* @returns the import file with its relative path to the src
 */
export function normalizePath(dest, src, root) {
  if (!dest.startsWith(".")) return dest; // node module as does not start with "."
  let srcDir = path.dirname(src);
  if (srcDir === ".") return dest;  // current dir so no need to replace
  let relFile = "./" + path.normalize(path.join(srcDir, dest)).replaceAll("\\", "/");  
  const validSrc = validateImportFile(relFile, root);

 /*
  if (res.indexOf("..") !== -1) { // up dirs in the importSrc
    //  const fname = getFilename(dest);
    const d = dest.split("/");
    const s = path.dirname(src).split("/");
    const count = (dest.split("..").length - 1); // count how many up dirs
    res = s.slice(0, -count).join("/") + "/" + d.slice(count).join("/"); // remove up dirs and rejoin to create a path
    if (res.startsWith("/")) res = "./" + res.substring(1, res.length);
  }
  */
  return validSrc;
}

/**
 *
  root passed so that relative files can be checked to see if the are real files
  if endsWith permitted files check file exists
  if not add each of the permitted suffixes and check if exists
  if is a directory then use the index file in the directory with the permitted suffixes
 * @param {*} relFile relative file path
 * @param {*} root location of the directory being processed
 * @returns 
 */
function validateImportFile(relFile, root) {
  let srcFile = relFile.replace(".", root);
  // not a file already
  if (!hasExtension(srcFile, EXT_LIST)) {
    for (const ext of EXT_LIST) {
      if (fs.existsSync(srcFile + ext)) {
        srcFile = srcFile + ext;
        break;
      }
    }
    // then directory and src file is an index
    if (!hasExtension(srcFile, EXT_LIST)) {
      for (const ext of EXT_LIST) {
        const indFile = path.join(srcFile, "index" + ext);
        if (fs.existsSync(indFile)) {
          srcFile = "./" + indFile.replaceAll("\\", "/");
          break;
        }
      }
    }
  }
  return srcFile.replace(root, ".");
}


/**
 * 
 * @param {*} root 
 * @returns path without any leading directory delimiters
 */
export function cleanPath(root) {
  if (root.startsWith("."))
    root = root.substring(1, root.length);
  if (root.startsWith("/"))
    root = root.substring(1, root.length);
  if (root.startsWith("\\"))
    root = root.substring(1, root.length);
  return root;
}

export function getFilename(fullPath) {
  return fullPath.replace(/^.*[\\/]/, '');
}
/*
const getAllFiles = function (dirPath, arrayOfFiles) {
  let files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || []

  files.forEach(function (file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file))
    }
  })

  return arrayOfFiles
}
*/
function flatten(lists) {
  return lists.reduce((a, b) => a.concat(b), []);
}

function getDirectories(srcpath) {
  return fs.readdirSync(srcpath)
    .map(file => path.join(srcpath, file))
    .filter(path => fs.statSync(path).isDirectory());
}

/**
 * @return array of files in the directory
 */
function getFiles(srcpath) {
  return fs.readdirSync(srcpath)
    .map(file => path.join(srcpath, file))
    .filter(path => fs.statSync(path).isFile())
    .map(f => f.replaceAll('\\', "/"));
}

function getDirectoriesRecursive(srcpath) {
  return [srcpath, ...flatten(getDirectories(srcpath).map(getDirectoriesRecursive))];
}

/**
 * Creates a map with key=directory(package) value=array of files(modules) in directory
 * @param {*} symbol the directory or file to create the dependency graphs from
 * @param {*} stat the stats of the symbol to determine if a file or directory was called. 
 * @returns 1. Map of directories with files
 *  2. the root directory that the list starts from
 */
export function getModuleArray(symbol, stats) {
  let root = "";
  let arr = [];

  if (stats.isFile()) {
    root = "./" + getBaseDir(path.dirname(symbol));
    arr.push({
      dir: root, file: symbol.replace(root, "."),
      dependsOnCnt: 0, usedByCnt: 0, exportCnt: 0
    });
  } else if (stats.isDirectory()) {
    // array of directories
    root = getBaseDir(symbol);

    const dirArr = getDirectoriesRecursive(root)
      .map(e => {
        return e.replaceAll('\\', "/");
      });

    dirArr.forEach(e => {
      const dir = (e.startsWith(root + "/")) ? e.replace(root, ".") : e.replace(root, "./");
      // sets map to the key=file values are the functions returned by getFiles
      const fileList = getFiles(e).map(f => { return f.replace(root, ".") });
      fileList.forEach(file => {
        if (hasExtension(file, EXT_LIST)) {
          arr.push(
            { dir: dir, file: file, dependsOnCnt: 0, usedByCnt: 0, exportCnt: 0 });
        }
      });
    });
  }


  return [root, arr];

}


