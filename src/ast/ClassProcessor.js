import { moduleName } from "../utils/file-utils.js";
import estraverse from 'estraverse';
import { BaseProcessor } from "./BaseProcessor.js";

/**
 * @class ClassProcessor
 * @description Processes ASTs to extract class information
 */
export class ClassProcessor extends BaseProcessor {
  /**
   * Creates a new ClassProcessor
   * @param {string} baseLoc - Base location
   */
  constructor(baseLoc) {
    super(baseLoc);
    this.classList = [];
  }

  /**
   * Analyzes an AST to extract class declarations with their methods and properties
   * 
   * @param {Object} ast - The Abstract Syntax Tree of the file
   * @param {Object} mod - The module object
   * @returns {Array<Object>} - Array of class objects with their methods and properties
   */
  parseClasses(ast, mod) {
    const classes = [];
    const srcFile = moduleName(mod);

    estraverse.traverse(ast, {
      enter: (node) => {
        if (node.type === 'ClassDeclaration' || 
            (node.type === 'ClassExpression' && node.id)) {
          const className = node.id ? node.id.name : 'AnonymousClass';
          const classInfo = {
            name: className,
            filePath: srcFile,
            methods: [],
            properties: [],
            superClass: node.superClass ? this.extractSuperClassName(node.superClass) : null,
            isExported: false
          };

          // Process class body for methods and properties
          if (node.body && node.body.body) {
            for (const member of node.body.body) {
              if (member.type === 'MethodDefinition') {
                const methodInfo = this.extractMethodInfo(member);
                classInfo.methods.push(methodInfo);
              } else if (member.type === 'PropertyDefinition' || member.type === 'ClassProperty') {
                const propertyInfo = this.extractPropertyInfo(member);
                classInfo.properties.push(propertyInfo);
              }
            }
          }

          // Check if this class is exported
          const parentNode = this.getParentNode(ast, node);
          if (parentNode && 
              (parentNode.type === 'ExportNamedDeclaration' || 
               parentNode.type === 'ExportDefaultDeclaration')) {
            classInfo.isExported = true;
          }

          classes.push(classInfo);
        }
      }
    });

    return classes;
  }

  /**
   * Extracts the name of a superclass from a node
   * 
   * @param {Object} superClassNode - The superclass node from AST
   * @returns {string} - The name of the superclass
   */
  extractSuperClassName(superClassNode) {
    if (superClassNode.type === 'Identifier') {
      return superClassNode.name;
    } else if (superClassNode.type === 'MemberExpression') {
      // Handle cases like NameSpace.ClassName
      return this.extractMemberExpressionName(superClassNode);
    }
    return 'Unknown';
  }

  /**
   * Extracts a name from a member expression (e.g., a.b.c -> "a.b.c")
   * 
   * @param {Object} node - The member expression node
   * @returns {string} - The full path name
   */
  extractMemberExpressionName(node) {
    if (node.type === 'MemberExpression') {
      const objectName = this.extractMemberExpressionName(node.object);
      const propertyName = node.property.name || 'unknown';
      return `${objectName}.${propertyName}`;
    } else if (node.type === 'Identifier') {
      return node.name;
    }
    return 'unknown';
  }

  /**
   * Extracts method information from a method definition node
   * 
   * @param {Object} methodNode - The method definition node
   * @returns {Object} - Method information object
   */
  extractMethodInfo(methodNode) {
    const methodInfo = {
      name: this.getMethodName(methodNode),
      kind: methodNode.kind, // "constructor", "method", "get", or "set"
      isStatic: methodNode.static || false,
      isPrivate: methodNode.key && methodNode.key.type === 'PrivateIdentifier',
      parameters: []
    };

    // Extract parameters
    if (methodNode.value && methodNode.value.params) {
      methodInfo.parameters = this.formatFunctionParams(methodNode.value.params);
    }

    return methodInfo;
  }

  /**
   * Gets the name of a method from its node
   * 
   * @param {Object} methodNode - The method definition node
   * @returns {string} - The method name
   */
  getMethodName(methodNode) {
    if (!methodNode.key) return 'unknown';
    
    if (methodNode.key.type === 'Identifier') {
      return methodNode.key.name;
    } else if (methodNode.key.type === 'PrivateIdentifier') {
      return `#${methodNode.key.name}`;
    } else if (methodNode.key.type === 'Literal') {
      return String(methodNode.key.value);
    }
    
    return 'unknown';
  }

  /**
   * Extracts property information from a property definition node
   * 
   * @param {Object} propertyNode - The property definition node
   * @returns {Object} - Property information object
   */
  extractPropertyInfo(propertyNode) {
    const propertyInfo = {
      name: this.getPropertyName(propertyNode),
      isStatic: propertyNode.static || false,
      isPrivate: propertyNode.key && propertyNode.key.type === 'PrivateIdentifier'
    };

    // Try to extract the type if available (TypeScript)
    if (propertyNode.typeAnnotation) {
      propertyInfo.type = this.extractTypeAnnotation(propertyNode.typeAnnotation);
    }

    // Try to extract default value if available
    if (propertyNode.value) {
      propertyInfo.hasDefaultValue = true;
    }

    return propertyInfo;
  }

  /**
   * Gets the name of a property from its node
   * 
   * @param {Object} propertyNode - The property definition node
   * @returns {string} - The property name
   */
  getPropertyName(propertyNode) {
    if (!propertyNode.key) return 'unknown';
    
    if (propertyNode.key.type === 'Identifier') {
      return propertyNode.key.name;
    } else if (propertyNode.key.type === 'PrivateIdentifier') {
      return `#${propertyNode.key.name}`;
    } else if (propertyNode.key.type === 'Literal') {
      return String(propertyNode.key.value);
    }
    
    return 'unknown';
  }

  /**
   * Extracts type information from a TypeScript type annotation
   * 
   * @param {Object} typeAnnotation - The type annotation node
   * @returns {string} - String representation of the type
   */
  extractTypeAnnotation(typeAnnotation) {
    if (!typeAnnotation || !typeAnnotation.typeAnnotation) {
      return 'any';
    }
    
    const type = typeAnnotation.typeAnnotation;
    
    if (type.type === 'TSStringKeyword') return 'string';
    if (type.type === 'TSNumberKeyword') return 'number';
    if (type.type === 'TSBooleanKeyword') return 'boolean';
    if (type.type === 'TSAnyKeyword') return 'any';
    if (type.type === 'TSVoidKeyword') return 'void';
    if (type.type === 'TSNullKeyword') return 'null';
    if (type.type === 'TSUndefinedKeyword') return 'undefined';
    if (type.type === 'TSTypeLiteral') return 'object';
    if (type.type === 'TSArrayType') return 'array';
    
    return 'unknown';
  }
}