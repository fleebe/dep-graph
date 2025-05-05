import path from "path";
import fs from "fs";
import { EXT_LIST } from "./globals.js";

/**
 * @module utils/file-utils
 * @description File Utilities Module 
 * Provides file system operations and path normalization functions
 */

export function moduleName(mod) {
  return cleanPath(path.join(mod.dir, mod.file).replaceAll("\\", "/"));
}

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
 * @returns directory prefixed with ./
 */
/*
function getBaseDir(symbol) {
  if (symbol.indexOf("..") !== -1) {
    symbol = resolveRelativePath(symbol, process.cwd());
    // get the absolute path of the current working directory
    console.log(symbol);
    //console.log(fs.realpathSync('./'));
//    console.log(process.cwd());    
//    console.log(path.parse(symbol));
//    console.log(path.resolve(symbol));  
//    throw new Error("Cannot handle .. in the path name");
  } else {
  // make into standard path and remove leading .
    symbol = symbol.replaceAll("\\", '/').replace(".", '').trim();
  }
  // remove leading and trailing '/'
  (symbol.startsWith("/")) ? symbol = symbol.slice(1) : symbol;
  (symbol.endsWith("/")) ? symbol = symbol.slice(0, symbol.length - 1) : symbol;
  return symbol;
}
*/
/*
function resolveRelativePath(targetPath, currentDir) {
  // Split paths into segments
  const targetSegments = targetPath.replaceAll("\\", '/').split('/').filter(s => s !== '');
  const currentSegments = currentDir.replace(/\\/g, '/').split('/').filter(s => s !== '');

  // Handle "../" in target path
  let resultSegments = [...currentSegments];
  for (const segment of targetSegments) {
    if (segment === '..') {
      resultSegments.pop();
    } else {
      resultSegments.push(segment);
    }
  }

  // Remove drive letter if present (e.g., "C:")
//  if (resultSegments[0] && resultSegments[0].includes(':')) {
//    resultSegments = resultSegments.slice(1);
//  }
  return resultSegments.join('/')
  // Construct final path
  // return './' + resultSegments.join('/');
}
*/

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
 * 
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
function cleanPath(root) {
  if (root.startsWith("."))
    root = root.substring(1, root.length);
  if (root.startsWith("/"))
    root = root.substring(1, root.length);
  if (root.startsWith("\\"))
    root = root.substring(1, root.length);
  return root;
}

export function cleanDirPath(root) {
  root = path.dirname(root); // remove the file name from the path
  return cleanPath(root);
}


export function getFilename(fullPath) {
  return path.basename(fullPath);
}

/**
 * Flattens an array of arrays into a single array
 * @param {Array[]} lists - Array of arrays to flatten
 * @returns {Array} - Flattened array
 */
function flatten(lists) {
  return lists.reduce((a, b) => a.concat(b), []);
}

/**
 * Gets all directories in a given path, excluding hidden and ignored directories
 * @param {string} srcpath - Source path to scan for directories
 * @param {string[]} ignoredDirs - List of directory names to ignore
 * @returns {string[]} - Array of directory paths
 */
function getDirectories(srcpath, ignoredDirs = []) {
  try {
    return fs.readdirSync(srcpath)
      .filter(file => {
        // Skip directories that start with a dot
        if (file.startsWith('.')) return false;

        // Skip directories that are in the ignoredDirs list
        if (ignoredDirs.includes(file)) return false;

        return true;
      })
      .map(file => path.join(srcpath, file))
      .filter(filepath => {
        try {
          return fs.statSync(filepath).isDirectory();
        } catch (error) {
          console.warn(`Could not check if ${filepath} is a directory: ${error.message}`);
          return false;
        }
      });
  } catch (error) {
    console.error(`Error reading directory ${srcpath}: ${error.message}`);
    return [];
  }
}

/**
 * Gets all JavaScript files in a given path
 * @param {string} srcpath - Source path to scan for files
 * @returns {string[]} - Array of file paths
 */
export function getFiles(srcpath) {
  try {
    return fs.readdirSync(srcpath)
      // Filter by extension first to avoid unnecessary stat operations
      .filter(file => hasExtension(file, EXT_LIST))
      .map(file => path.join(srcpath, file))
      .filter(filepath => {
        try {
          return fs.statSync(filepath).isFile();
        } catch (error) {
          console.warn(`Could not check if ${filepath} is a file: ${error.message}`);
          return false;
        }
      })
      .map(f => f.replaceAll('\\', "/"));
  } catch (error) {
    console.error(`Error reading directory ${srcpath}: ${error.message}`);
    return [];
  }
}

export function getDirectoriesRecursive(srcpath, ignoredDirs = []) {
  // Make a copy of the directories returned by getDirectories, passing along ignoredDirs
  const directories = getDirectories(srcpath, ignoredDirs);

  // Recursively process each directory, continuing to pass ignoredDirs
  const subdirectories = directories.map(dir => getDirectoriesRecursive(dir, ignoredDirs));

  // Return the current directory plus all subdirectories
  return [srcpath, ...flatten(subdirectories)];
}

/**
 * Gets all files recursively from a directory
 * @param {string} srcpath - Source path to scan for files
 * @param {string[]} ignoredDirs - List of directory names to ignore
 * @returns {string[]} - Array of file paths
 */
export function getFilesRecursive(srcpath, ignoredDirs = []) {
  // Get all directories recursively
  const allDirs = getDirectoriesRecursive(srcpath, ignoredDirs);

  // Get files from each directory
  const filesArrays = allDirs.map(dir => getFiles(dir));

  // Flatten the array of arrays
  return flatten(filesArrays);
}

/**
 * Extracts the directory beyond the symbol path and the filename from a file path
 * @param {string} file - The complete file path
 * @param {string} symbol - The base path to compare against
 * @returns {Object} Object containing the directory beyond symbol and the filename
 */
export function getRelativePathParts(file, symbol) {
  // Normalize paths to use consistent separators
  const normalizedFile = file.replaceAll("\\", "/");
  const normalizedSymbol = symbol.replaceAll("\\", "/");

  // Get the directory beyond the symbol
  let relativePath = "";
  if (normalizedFile.startsWith(normalizedSymbol)) {
    relativePath = normalizedFile.substring(normalizedSymbol.length);
    // Remove leading slash if present
    if (relativePath.startsWith("/")) {
      relativePath = relativePath.substring(1);
    }
  }

  // Get the directory and filename
  const filename = getFilename(normalizedFile);
  const directory = relativePath.substring(0, relativePath.length - filename.length - 1);

  return {
    directory,
    filename
  };
}

/**
 * Helper function for safe file writing
 * If the file already exists, it will be deleted before writing
 * 
 * @param {string} dirPath - Path to the file
 * @param {string} fileName - name of the file
 * @param {string} content - Content to write
 */
export function safeWriteFile(dirPath, fileName, content) {
  const filePath = path.join(dirPath, fileName);
  try {
    // Check if file exists and delete it
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (content) fs.writeFileSync(filePath, content, "utf8");
  } catch (error) {
    console.error(`Error writing file ${filePath}: ${error.message}`);
  }
}

/**
 * Module exports
 */
export default {
  removeExtension,
  normalizePath,
  cleanDirPath,
  getFilename
};


