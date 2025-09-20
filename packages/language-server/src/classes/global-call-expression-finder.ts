import type * as ets from 'ohos-typescript'

export interface GlobalRCallInfo {
  /** 函数调用的开始位置 */
  start: number
  /** 函数调用的结束位置 */
  end: number
  /** 第一个参数（资源引用字符串）的开始位置 */
  resourceStart: number
  /** 第一个参数（资源引用字符串）的结束位置 */
  resourceEnd: number
  /** 资源引用字符串的值 */
  resourceValue: string
  /** 行号（从0开始） */
  line: number
  /** 列号（从0开始） */
  character: number
}

/**
 * 全局$rawfile函数调用信息接口（与$r调用信息相同结构）
 */
export interface GlobalRawfileCallInfo {
  /** 函数调用的开始位置 */
  start: number
  /** 函数调用的结束位置 */
  end: number
  /** 第一个参数（rawfile路径字符串）的开始位置 */
  resourceStart: number
  /** 第一个参数（rawfile路径字符串）的结束位置 */
  resourceEnd: number
  /** rawfile路径字符串的值 */
  resourceValue: string
  /** 行号（从0开始） */
  line: number
  /** 列号（从0开始） */
  character: number
}

/**
 * 全局$r函数调用查找器
 * 用于在TypeScript/ArkTS源文件中查找所有全局$r函数和$rawfile函数的调用位置
 */
export class GlobalRCallFinder {
  private checker?: ets.TypeChecker

  constructor(
    private readonly ets: typeof import('ohos-typescript'),
    private readonly program?: ets.Program,
  ) {
    this.checker = program?.getTypeChecker()
  }

  /**
   * 查找所有全局$r函数调用（混合方案：语法分析+符号解析）
   * @param sourceFile 源文件
   * @returns 全局$r函数调用信息数组
   */
  findGlobalRCalls(sourceFile: ets.SourceFile): GlobalRCallInfo[] {
    if (!this.checker) {
      throw new Error('TypeChecker is required for accurate global $r call detection')
    }

    const globalRCalls: GlobalRCallInfo[] = []
    const localRDeclarations = new Set<string>()

    // 第一遍：收集本地$r声明（语法分析）
    const collectLocalDeclarations = (node: ets.Node): void => {
      // Import声明
      if (this.ets.isImportDeclaration(node) && node.importClause) {
        if (node.importClause.namedBindings && this.ets.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            if (element.name.text === '$r') {
              localRDeclarations.add('$r')
            }
          }
        }
        if (node.importClause.name && node.importClause.name.text === '$r') {
          localRDeclarations.add('$r')
        }
      }

      // 变量声明
      if (this.ets.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (this.ets.isIdentifier(declaration.name) && declaration.name.text === '$r') {
            localRDeclarations.add('$r')
          }
        }
      }

      // 函数声明
      if (this.ets.isFunctionDeclaration(node) && node.name && node.name.text === '$r') {
        localRDeclarations.add('$r')
      }

      // 类声明
      if (this.ets.isClassDeclaration(node) && node.name && node.name.text === '$r') {
        localRDeclarations.add('$r')
      }

      this.ets.forEachChild(node, collectLocalDeclarations)
    }

    // 第二遍：查找全局调用
    const findGlobalCalls = (node: ets.Node): void => {
      if (this.ets.isCallExpression(node)) {
        const expression = node.expression

        if (this.ets.isIdentifier(expression) && expression.text === '$r') {
          // 如果语法分析发现本地声明，直接跳过
          if (localRDeclarations.has('$r')) {
            return
          }

          // 否则使用符号解析进一步验证
          if (this.isGlobalCall(expression, sourceFile)) {
            const callInfo = this.extractCallInfo(node, sourceFile)
            if (callInfo) {
              globalRCalls.push(callInfo)
            }
          }
        }
      }

      this.ets.forEachChild(node, findGlobalCalls)
    }

    collectLocalDeclarations(sourceFile)
    findGlobalCalls(sourceFile)
    return globalRCalls
  }

  /**
   * 通过符号解析判断是否为全局调用
   * 这是最准确和高效的方法
   */
  private isGlobalCall(identifier: ets.Identifier, sourceFile: ets.SourceFile): boolean {
    try {
      const symbol = this.checker!.getSymbolAtLocation(identifier)

      // 如果没有找到符号，可能是全局的（未声明的全局变量）
      if (!symbol) {
        return true
      }

      // 获取符号的声明
      const declarations = symbol.getDeclarations()
      if (!declarations || declarations.length === 0) {
        // 没有声明，可能是全局的
        return true
      }

      // 检查所有声明是否都来自当前文件
      const currentFile = sourceFile
      const currentFileName = currentFile.fileName

      // 检查是否有来自当前文件的声明
      const hasLocalDeclaration = declarations.some((decl) => {
        const declSourceFile = decl.getSourceFile()
        return declSourceFile.fileName === currentFileName
      })

      // 如果当前文件中有声明，则不是全局的
      if (hasLocalDeclaration) {
        return false
      }

      // 检查是否来自外部模块或全局类型定义
      return declarations.every((decl) => {
        const declSourceFile = decl.getSourceFile()
        const fileName = declSourceFile.fileName

        // 如果是来自以下类型的文件，认为是全局的：
        // 1. node_modules 中的文件
        // 2. 类型定义文件 (.d.ts)
        // 3. 全局库文件 (lib.d.ts)
        // 4. 其他不是当前文件的外部文件
        return fileName.includes('node_modules')
          || fileName.endsWith('.d.ts')
          || fileName.includes('lib.d.ts')
          || fileName.includes('global')
          || declSourceFile !== currentFile
      })
    }
    catch {
      // 符号解析失败时，假设是全局的
      // 这种情况通常发生在语法错误或复杂的类型推断场景
      return true
    }
  }

  /**
   * 查找所有全局$r函数调用（简化版本，不需要类型检查器）
   * 基于语法分析来判断是否为全局$r调用
   * @param sourceFile 源文件
   * @returns 全局$r函数调用信息数组
   */
  findGlobalRCallsSimple(sourceFile: ets.SourceFile): GlobalRCallInfo[] {
    const globalRCalls: GlobalRCallInfo[] = []
    const localRDeclarations = new Set<string>()

    // 第一遍：收集本地$r声明
    const collectLocalDeclarations = (node: ets.Node): void => {
      // Import声明
      if (this.ets.isImportDeclaration(node)) {
        const importClause = node.importClause
        if (importClause) {
          if (importClause.namedBindings && this.ets.isNamedImports(importClause.namedBindings)) {
            for (const element of importClause.namedBindings.elements) {
              if (element.name.text === '$r') {
                localRDeclarations.add('$r')
              }
            }
          }
          if (importClause.name && importClause.name.text === '$r') {
            localRDeclarations.add('$r')
          }
        }
      }

      // 变量声明
      if (this.ets.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (this.ets.isIdentifier(declaration.name) && declaration.name.text === '$r') {
            localRDeclarations.add('$r')
          }
        }
      }

      // 函数声明
      if (this.ets.isFunctionDeclaration(node) && node.name && node.name.text === '$r') {
        localRDeclarations.add('$r')
      }

      // 类声明
      if (this.ets.isClassDeclaration(node) && node.name && node.name.text === '$r') {
        localRDeclarations.add('$r')
      }

      this.ets.forEachChild(node, collectLocalDeclarations)
    }

    // 第二遍：查找全局调用
    const findGlobalCalls = (node: ets.Node): void => {
      if (this.ets.isCallExpression(node)) {
        const expression = node.expression

        if (this.ets.isIdentifier(expression)
          && expression.text === '$r'
          && !localRDeclarations.has('$r')) {
          const callInfo = this.extractCallInfo(node, sourceFile)
          if (callInfo) {
            globalRCalls.push(callInfo)
          }
        }
      }

      this.ets.forEachChild(node, findGlobalCalls)
    }

    collectLocalDeclarations(sourceFile)
    findGlobalCalls(sourceFile)

    return globalRCalls
  }

  /**
   * 从函数调用节点中提取调用信息
   * @param callExpression 函数调用表达式节点
   * @param sourceFile 源文件
   * @returns 调用信息，如果不是有效的$r调用则返回null
   */
  private extractCallInfo(callExpression: ets.CallExpression, sourceFile: ets.SourceFile): GlobalRCallInfo | null {
    // 获取位置信息
    const start = callExpression.getStart(sourceFile)
    const end = callExpression.getEnd()
    const sourcePos = sourceFile.getLineAndCharacterOfPosition(start)

    // 获取第一个参数（资源引用字符串）
    let resourceValue = ''
    let resourceStart = start
    let resourceEnd = end

    if (callExpression.arguments.length > 0) {
      const firstArg = callExpression.arguments[0]
      if (this.ets.isStringLiteral(firstArg)) {
        resourceValue = firstArg.text || ''
        resourceStart = firstArg.getStart(sourceFile)
        resourceEnd = firstArg.getEnd()
      }
      else if (this.ets.isTemplateLiteral(firstArg)) {
        // 只处理简单的模板字符串（没有插值的）
        if (this.ets.isNoSubstitutionTemplateLiteral(firstArg)) {
          resourceValue = firstArg.text || ''
          resourceStart = firstArg.getStart(sourceFile)
          resourceEnd = firstArg.getEnd()
        }
        // 对于有插值的模板字符串，我们不提取资源值
      }
    }

    return {
      start,
      end,
      resourceStart,
      resourceEnd,
      resourceValue,
      line: sourcePos.line,
      character: sourcePos.character,
    }
  }

  /**
   * 分析源文件并返回全局$r调用信息
   * @param filePath 文件路径
   * @param sourceCode 源代码内容
   * @param useTypeChecker 是否使用类型检查器（默认为true）
   * @returns 全局$r函数调用信息数组
   */
  analyzeSourceFile(filePath: string, sourceCode: string, useTypeChecker = true): GlobalRCallInfo[] {
    // 创建源文件
    const sourceFile = this.ets.createSourceFile(
      filePath,
      sourceCode,
      this.ets.ScriptTarget.ES2015,
      true,
    )

    if (useTypeChecker && this.program) {
      // 使用带类型检查的版本（更准确）
      return this.findGlobalRCalls(sourceFile)
    }
    else {
      // 使用简化版本（更快，但可能不够准确）
      return this.findGlobalRCallsSimple(sourceFile)
    }
  }

  /**
   * 查找所有全局$rawfile函数调用（简化版本）
   * @param sourceFile 源文件
   * @returns 全局$rawfile函数调用信息数组
   */
  findGlobalRawfileCalls(sourceFile: ets.SourceFile): GlobalRawfileCallInfo[] {
    const globalRawfileCalls: GlobalRawfileCallInfo[] = []
    const localRawfileDeclarations = new Set<string>()

    // 第一遍：收集本地$rawfile声明
    const collectLocalDeclarations = (node: ets.Node): void => {
      // Import声明
      if (this.ets.isImportDeclaration(node)) {
        const importClause = node.importClause
        if (importClause) {
          if (importClause.namedBindings && this.ets.isNamedImports(importClause.namedBindings)) {
            for (const element of importClause.namedBindings.elements) {
              if (element.name.text === '$rawfile') {
                localRawfileDeclarations.add('$rawfile')
              }
            }
          }
          if (importClause.name && importClause.name.text === '$rawfile') {
            localRawfileDeclarations.add('$rawfile')
          }
        }
      }

      // 变量声明
      if (this.ets.isVariableStatement(node)) {
        for (const declaration of node.declarationList.declarations) {
          if (this.ets.isIdentifier(declaration.name) && declaration.name.text === '$rawfile') {
            localRawfileDeclarations.add('$rawfile')
          }
        }
      }

      // 函数声明
      if (this.ets.isFunctionDeclaration(node) && node.name && node.name.text === '$rawfile') {
        localRawfileDeclarations.add('$rawfile')
      }

      // 类声明
      if (this.ets.isClassDeclaration(node) && node.name && node.name.text === '$rawfile') {
        localRawfileDeclarations.add('$rawfile')
      }

      this.ets.forEachChild(node, collectLocalDeclarations)
    }

    // 第二遍：查找全局调用
    const findGlobalCalls = (node: ets.Node): void => {
      if (this.ets.isCallExpression(node)) {
        const expression = node.expression

        if (this.ets.isIdentifier(expression)
          && expression.text === '$rawfile'
          && !localRawfileDeclarations.has('$rawfile')) {
          const callInfo = this.extractRawfileCallInfo(node, sourceFile)
          if (callInfo) {
            globalRawfileCalls.push(callInfo)
          }
        }
      }

      this.ets.forEachChild(node, findGlobalCalls)
    }

    collectLocalDeclarations(sourceFile)
    findGlobalCalls(sourceFile)

    return globalRawfileCalls
  }

  /**
   * 从$rawfile函数调用节点中提取调用信息
   * @param callExpression 函数调用表达式节点
   * @param sourceFile 源文件
   * @returns 调用信息，如果不是有效的$rawfile调用则返回null
   */
  private extractRawfileCallInfo(callExpression: ets.CallExpression, sourceFile: ets.SourceFile): GlobalRawfileCallInfo | null {
    // 获取位置信息
    const start = callExpression.getStart(sourceFile)
    const end = callExpression.getEnd()
    const sourcePos = sourceFile.getLineAndCharacterOfPosition(start)

    // 获取第一个参数（rawfile路径字符串）
    let resourceValue = ''
    let resourceStart = start
    let resourceEnd = end

    if (callExpression.arguments.length > 0) {
      const firstArg = callExpression.arguments[0]
      if (this.ets.isStringLiteral(firstArg)) {
        resourceValue = firstArg.text || ''
        resourceStart = firstArg.getStart(sourceFile)
        resourceEnd = firstArg.getEnd()
      }
      else if (this.ets.isTemplateLiteral(firstArg)) {
        // 只处理简单的模板字符串（没有插值的）
        if (this.ets.isNoSubstitutionTemplateLiteral(firstArg)) {
          resourceValue = firstArg.text || ''
          resourceStart = firstArg.getStart(sourceFile)
          resourceEnd = firstArg.getEnd()
        }
        // 对于有插值的模板字符串，我们不提取资源值
      }
    }

    return {
      start,
      end,
      resourceStart,
      resourceEnd,
      resourceValue,
      line: sourcePos.line,
      character: sourcePos.character,
    }
  }
}
