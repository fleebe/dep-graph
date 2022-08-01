import path from "path";
import fs from "fs";


export const getBaseDir = (dir) => {
  dir = dir.replaceAll("\\", '/').replace(".", '').trim();
  (dir.startsWith("/")) ? dir = dir.slice(1) : dir;
  (dir.endsWith("/")) ? dir = dir.slice(0, dir.length - 1) : dir;
  return "./" + dir;
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



