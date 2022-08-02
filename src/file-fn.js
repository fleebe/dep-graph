import path from "path";
import fs from "fs";


export const getBaseDir = (dir) => {
  if (dir.indexOf("..") !== -1)
    throw new Error("Cannot handle .. in the path name");
  dir = dir.replaceAll("\\", '/').replace(".", '').trim();
  (dir.startsWith("/")) ? dir = dir.slice(1) : dir;
  (dir.endsWith("/")) ? dir = dir.slice(0, dir.length - 1) : dir;
  return "./" + dir;
}


const findInMap = (map, val) => {
  for (let [k, v] of map) {
    if (k === val) {
      return true;
    }
  }
  return false;
}


export function addToMapArray(map, key, arrVal) {
  if (!findInMap(map, key)) {
    map.set(key, [arrVal]);
  } else {
    let v = map.get(key);
    if (v.indexOf(arrVal) === -1) {
      v.push(arrVal);
      map.set(key, v);
    }
  }
}

/**
 * 
 * @param {*} dest a file name 
 * @param {*} src a file name
 * @returns a file name
 */
export function normalizePath(dest, src) {
  if (dest.indexOf("..") !== -1) { // up dirs in the importSrc
    const fname = getFilename(dest);
    dest = path.dirname(dest);
    src = path.dirname(src);
    const count = (dest.split("..").length - 1); // count how many up dirs
    const dirs = src.split("/"); // get directories for the src without the filename
    dest = dirs.slice(0, -count).join("/") + "/" + fname; // remove up dirs and rejoin to create a path
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


export const getImportList = function (dirPath) {
  fs.lstat(dirPath, (err, stats) => {
    if (err) throw err;
    if (!stats.isDirectory()) {
      throw dirPath + " must be a directory";
    }
  });
  const root = getBaseDir(dirPath) + '/';

  let moduleList = getAllFiles(dirPath, []);

  for (let i = 0; i < moduleList.length; i++) {
    moduleList[i] = getBaseDir(path.dirname(moduleList[i])) + "/" + getFilename(moduleList[i]);
    moduleList[i] = moduleList[i].replace(root, "./");
  }
  return moduleList;

}



