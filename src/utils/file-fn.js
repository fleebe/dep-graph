import path from "path";
import fs from "fs";

/**
 * converts the directory passed into a standard value
 * @param {*} symbol a directory
 * @returns dir prefixed with ./
 */
export const getBaseDir = (symbol) => {
  if (symbol.indexOf("..") !== -1)
    throw new Error("Cannot handle .. in the path name");
  symbol = symbol.replaceAll("\\", '/').replace(".", '').trim();
  (symbol.startsWith("/")) ? symbol = symbol.slice(1) : symbol;
  (symbol.endsWith("/")) ? symbol = symbol.slice(0, symbol.length - 1) : symbol;
  return symbol;
}

/**
 * 
 * @param {*} dest a file name 
 * @param {*} src a file name
 * @returns a file name
 */
export function normalizePath(dest, src) {
  if (dest.indexOf("..") !== -1) { // up dirs in the importSrc
    //  const fname = getFilename(dest);
    const d = dest.split("/");
    const s = path.dirname(src).split("/");
    const count = (dest.split("..").length - 1); // count how many up dirs
    let res = s.slice(0, -count).join("/") + "/" + d.slice(count).join("/"); // remove up dirs and rejoin to create a path
    if (res.startsWith("/")) res = "./" + res.substring(1, res.length);
    return res;
  }
  return dest;
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

export function getDirectoriesRecursive(srcpath) {
  return [srcpath, ...flatten(getDirectories(srcpath).map(getDirectoriesRecursive))];
}

/**
 * Creates a map with key=directory(package) value=array of files(modules) in directory
 * @param {*} symbol the directory or file to create the dependency graphs from
 * @param {*} stat the stats of the symbol to determine if a file or directory was called. 
 * @returns 1. Map of directories with files
 *  2. the root directory
 */


export function getModuleMap(symbol, stats) {
  let map = new Map();
  let root = "";


  if (stats.isFile()) {
    root = "./" + getBaseDir(path.dirname(symbol));
    map.set(root, new Array(symbol.replace(root, ".")));
  } else if (stats.isDirectory()) {
    // array of directories
    root = getBaseDir(symbol);

    const dirArr = getDirectoriesRecursive(root)
      .map(e => {
        return e.replaceAll('\\', "/");
      });

    dirArr.forEach(e => {
      const k = (e.startsWith(root + "/")) ? e.replace(root, ".") : e.replace(root, "./");
      // sets map to the key=file values are the functions returned by getFiles
      map.set(k,
        getFiles(e).map(f => f.replace(root, ".")));
    });
  }


  return [map, root];

}
