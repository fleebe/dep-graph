import path from "path";
import fs from "fs";

/**
 * converts the directory passed into a standard value
 * @param {*} dir 
 * @returns dir prefixed with ./
 */
export const getBaseDir = (dir) => {
  if (dir.indexOf("..") !== -1)
    throw new Error("Cannot handle .. in the path name");
  dir = dir.replaceAll("\\", '/').replace(".", '').trim();
  (dir.startsWith("/")) ? dir = dir.slice(1) : dir;
  (dir.endsWith("/")) ? dir = dir.slice(0, dir.length - 1) : dir;
  return dir;
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
    return s.slice(0, -count).join("/") + "/" + d.slice(count).join("/"); // remove up dirs and rejoin to create a path
  }
  return dest;
}

export function getFilename(fullPath) {
  return fullPath.replace(/^.*[\\\/]/, '');
}

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

function flatten(lists) {
  return lists.reduce((a, b) => a.concat(b), []);
}

function getDirectories(srcpath) {
  return fs.readdirSync(srcpath)
    .map(file => path.join(srcpath, file))
    .filter(path => fs.statSync(path).isDirectory());
}

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
 * Creates a map with key=directory(package) value=files(modules) in directory
 * @param {*} symbol the directory that is started from
 * @returns 
 */
export function getModuleMap(symbol) {
  const root = getBaseDir(symbol);

  const dirArr = getDirectoriesRecursive(root)
    .map(e => {
     return e.replaceAll('\\', "/");
  });

  let map = new Map();
  dirArr.forEach(e => {
    const k = (e.startsWith(root + "/")) ? e.replace(root, ".") : e.replace(root, "./");
    map.set(k, 
      getFiles(e).map(f => f.replace(root, ".")));
  });

  return [map, root];

}



