import path from "path";
import fs from "fs";

/**
 * Class responsible for generating HTML pages for SVG diagrams
 */
export class DiagramsGenerator {
  /**
   * Constructor for DiagramsGenerator
   */
  constructor() {
    // Any initialization can go here
  }

  /**
   * Creates a separate HTML page for SVG diagrams
   * @param {string} outDir - root directory where files are found
   * @param {Array} moduleArray - Array of module objects with metadata
   * @returns {string} - HTML document for diagrams as a string
   */
  createDiagramsHtml(outDir, moduleArray) {
    let result = "<html><head><title>Module Diagrams</title><style>";
    result += "body { font-family: Arial, sans-serif; margin: 20px; }";
    result += ".svg-container { max-width: 100%; overflow: auto; margin: 20px 0; border: 1px solid #ddd; padding: 10px; }";
    result += "h1, h2, h3 { color: #333; }";
    result += "a.back-link { display: inline-block; margin: 10px 0; text-decoration: none; color: #0066cc; }";
    result += "a.back-link:hover { text-decoration: underline; }";
    result += "</style></head><body>\n";

    result += `<h1>${outDir} - Module Diagrams</h1>\n`;
    result += `<a class="back-link" href="index.html">&larr; Back to Module Analysis</a>\n`;


    result += this.generateSvgSection("Package Dependency Graph", "Package.svg");
    result += this.generateSvgSection("Module Relations Graph", "Relations.svg");

    // Add the SVG visualizations using the helper function
    const dirArray = [...new Set(moduleArray.map(module => module.dir))];

    dirArray.forEach(dir => {
      const hdrTxt = (dir != '') ? `<h2 align="center">${dir}</h2>\n` : `<h2 align="center">base</h2>\n`;
      result += hdrTxt

      // Export graph (only if it exists)
      let outPath = path.join(outDir, dir, "ExportGraph.svg");
      if (fs.existsSync(outPath)) {
        const exportSvgPath = path.join(dir, "ExportGraph.svg");
        const exportGraphName = path.join(dir, "Exported Functions Graph");
        result += this.generateSvgSection(exportGraphName, exportSvgPath);
      }

      // Class diagram (only if it exists)
      outPath = path.join(outDir, dir, "ClassDiagram.svg");
      if (fs.existsSync(outPath)) {
        const classSvgPath = path.join(dir, "ClassDiagram.svg");
        const classGraphName = path.join(dir, "Class Diagram");
        result += this.generateSvgSection(classGraphName, classSvgPath);
      }
    });

    result += `<a class="back-link" href="index.html">&larr; Back to Module Analysis</a>\n`;
    result += "</body></html>";
    return result;
  }

  /**
   * Generates an SVG visualization section with proper HTML container
   * 
   * @param {string} title - Title for the section
   * @param {string} svgFileName - Name of the SVG file to embed
   * @param {string} [linkText] - Optional alternative text for the link (defaults to title)
   * @returns {string} - HTML for the SVG section
   */
  generateSvgSection(title, svgFileName, linkText = null) {
    if (!linkText) {
      linkText = `View ${title}`;
    }
     try {
      const fs = require('fs');
      if (!fs.existsSync(`./docs/${svgFileName}`)) {
        return ""
      }
    } catch (error) {
      // Silently ignore if file check fails - will happen in browser context
    }

//    let result = `<h2>${title}</h2>\n`;
    let result = "";
    result += `<div class="svg-container">\n`;
    result += `<object data="${svgFileName}" type="image/svg+xml" width="100%" height="600px">`;
    result += `Your browser does not support SVG - <a href="${svgFileName}">${linkText}</a>`;
    result += `</object>\n`;
    result += `</div>\n`;

    return result;
  }
}
