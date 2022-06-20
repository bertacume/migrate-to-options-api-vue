const fs = require('fs');

const lifecyleEvents = [
  'head', // Nuxt
  'asyncData', // Nuxt
  'beforeCreate', // Vue
  'created', // Vue
  'fetch', // Nuxt
  'beforeMount', // Vue
  'mounted', // Vue
  'beforeUpdate', // Vue
  'updated', // Vue
  'activated', // Vue
  'deactivated', // Vue
  'beforeDestroy', // Vue
  'destroyed', // Vue
];

fs.readFile('./inputComponent.vue', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  const [templateCode, rest] = data.split('</template>', 2);
  const [scriptCode, styleCode] = rest.split('</script>', 2);
  fs.readFile('./componentTemplate.vue', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    const [rawImports, compontentCode] = scriptCode.split('@Component(', 2);
    const delimiter = 'import';
    const imports = rawImports.split(delimiter)
      .slice(1)
      .filter((importLine) => !importLine.includes('nuxt-property-decorator'))
      .map((importLine) => delimiter + importLine);

    const [componentDecoratorStrObj, componentClassStr] = compontentCode.split(')\nexport');
    const componentDecoratorStr = componentDecoratorStrObj.slice(1,  -1);
    let cleanedComponentDecoratorStr = cleanString(componentDecoratorStr);
    const isLastCharAComa = cleanedComponentDecoratorStr[cleanedComponentDecoratorStr.length - 1] === ',';
    if (!isLastCharAComa) cleanedComponentDecoratorStr += ',';
    let replacedVueComponent = data.replace('{{{ component }}}', () => cleanedComponentDecoratorStr);
    
    const name = componentClassStr.substring(
      componentClassStr.indexOf('class') + 6,
      componentClassStr.indexOf('extends') -1
    );
    replacedVueComponent = replacedVueComponent.replace('{{{ name }}}', () => `'${name}'`)

    const componentConentStr = componentClassStr.split('Vue {', 2)[1];
    const lines = componentConentStr.split('\n');

    const joinedCodeSections = [];
    let i = 0;
    while (i < lines.length) {
      let group = { lines: [], type: null };
      const rawLine = lines[i];
      let lineCleaned = cleanString(rawLine);
      let nextLine = i + 1;

      if (!lineCleaned.startsWith('//')) {
        // WATCH
        if (lineCleaned.startsWith('@Watch(')) {
          const [indentation, rawWatchedProperty] = rawLine.split('@Watch(');
          const watchedProperty = cleanString(rawWatchedProperty).slice(1, -2);
          const indexStartMethodName = i + 1;
          const { endIndex, joinedLines } = joinedUntilSameIndentation(lines, indentation, indexStartMethodName);
          group.type = 'WATCH';
          const methodName = `${indentation}${watchedProperty}() {`;
          const methodLinesWithoutName = joinedLines.slice(1);
          const methodLines = [methodName, ...methodLinesWithoutName]
          group.lines = methodLines;
          nextLine = endIndex + 1;
          joinedCodeSections.push(group);
          // PROP
        } else if (lineCleaned.startsWith('@Prop(')) {
          const { endIndex, joinedLines } = joinUntilSemicolon(lines, i);
          group.type = 'PROP';
          group.lines = joinedLines;
          nextLine = endIndex + 1;
          joinedCodeSections.push(group);

        // ACTION
        } else if (lineCleaned.startsWith('@Action(')) {
            const { endIndex, joinedLines } = joinUntilSemicolon(lines, i);
            group.type = 'ACTION';
            group.lines = joinedLines;
            nextLine = endIndex + 1;
            joinedCodeSections.push(group);

        // GETTER
        } else if (lineCleaned.startsWith('@Getter(')) {
            const { endIndex, joinedLines } = joinUntilSemicolon(lines, i);
            group.type = 'GETTER';
            group.lines = joinedLines;
            nextLine = endIndex + 1;
            joinedCodeSections.push(group);
        } else {
  
          const [beforeGet, afterGet] = rawLine.split('get '); // first line
          // COMPUTED
          if (afterGet) {
            const indentation = beforeGet;
            const { endIndex, joinedLines } = joinedUntilSameIndentation(lines, indentation, i);
            group.type = 'COMPUTED';
            group.lines = joinedLines;
            nextLine = endIndex + 1;
            joinedCodeSections.push(group);
          } else {

            const [beforeParentesis] = lineCleaned.split('(');
            const beforeParentesisWithoutSpaces = cleanString(beforeParentesis);
            const ASYNC_WORD = 'async ';
            const isAsyncMethod = beforeParentesisWithoutSpaces.includes(ASYNC_WORD);
            let methodName = beforeParentesisWithoutSpaces;
            if (isAsyncMethod) {
              methodName = methodName.substr(methodName.indexOf(ASYNC_WORD) + ASYNC_WORD.length);
            }
            // METHOD
            if (onlyLettersAndNumbers(methodName) &&  lineCleaned[lineCleaned.length - 1] === '{') {
              const { endIndex, joinedLines } = joinedUntilSameIndentation(lines, '  ', i);

              group.type = lifecyleEvents.includes(methodName) ? 'LIFECYCLE_EVENT' : 'METHOD';
              group.lines = joinedLines;
              group.method = methodName;
              nextLine = endIndex + 1;
              joinedCodeSections.push(group);
            } else {

              const [beforeEqual, rest] = rawLine.split(' = ');
              // DATA
              if (beforeEqual, rest) {
                const { endIndex, joinedLines } = joinUntilSemicolon(lines, i);
                group.type = 'DATA';
                group.lines = joinedLines;
                nextLine = endIndex + 1;
                joinedCodeSections.push(group);
              }
            }
          }
        }
      }

      i = nextLine;
    }

    const parsedWatchLines = [];
    const parsedPropLines = [];
    const parsedActionLines = [];
    const parsedGetterLines = [];
    const parsedDataLines = [];
    const parsedComputedLines = [];
    const parsedLifecycleEventsObjects = [];
    const parsedMethodLines = [];
    
    for (let i = 0; i < joinedCodeSections.length; i++) {
      const codeSection = joinedCodeSections[i];
      const parsed = parseCode(codeSection);
      if (codeSection.type === 'WATCH') {
        parsedWatchLines.push(parsed);
      } else if (codeSection.type === 'PROP') {
        parsedPropLines.push(parsed);
      } else if (codeSection.type === 'DATA') {
        parsedDataLines.push(parsed);
      } else if (codeSection.type === 'ACTION') {
        parsedActionLines.push(parsed);
      } else if (codeSection.type === 'GETTER') {
        parsedGetterLines.push(parsed);
      } else if (codeSection.type === 'COMPUTED') {
        parsedComputedLines.push(parsed);
      } else if (codeSection.type === 'LIFECYCLE_EVENT') {
        parsedLifecycleEventsObjects.push({ lines: parsed, name: codeSection.method });
      } else if (codeSection.type === 'METHOD') {
        parsedMethodLines.push(parsed);
      }
    }
    
    parsedLifecycleEventsObjects.sort((a, b) => lifecyleEvents.indexOf(a.name) < lifecyleEvents.indexOf(b.name) ? -1 : 1);
    const parsedLifecycleEventsLines = parsedLifecycleEventsObjects.map(({ lines }) => lines);

    const defaultText = '// ------> REMOVE SECTION <------';

    replacedVueComponent = replacedVueComponent.replace('{{{ template }}}', () => `${templateCode}</template>`);
    replacedVueComponent = replacedVueComponent.replace('{{{ style }}}', () => styleCode);

    replacedVueComponent = replacedVueComponent.replace('{{{ imports }}}', () => imports.join('') || defaultText);
    replacedVueComponent = replacedVueComponent.replace('{{{ props }}}', () => parsedPropLines.join('\n') || defaultText);
    replacedVueComponent = replacedVueComponent.replace('{{{ data }}}', () => parsedDataLines.join('\n') || defaultText);
    replacedVueComponent = replacedVueComponent.replace('{{{ mapActions }}}', () => parsedActionLines.join('\n') || defaultText);
    replacedVueComponent = replacedVueComponent.replace('{{{ mapGetters }}}', () => parsedGetterLines.join('\n') || defaultText);
    replacedVueComponent = replacedVueComponent.replace('{{{ computed }}}', () => parsedComputedLines.join('\n') || defaultText);
    replacedVueComponent = replacedVueComponent.replace('{{{ watchers }}}', () => parsedWatchLines.join('\n') || defaultText);
    replacedVueComponent = replacedVueComponent.replace('{{{ lifecycleEvents }}}', () => parsedLifecycleEventsLines.join('\n') || defaultText);
    replacedVueComponent = replacedVueComponent.replace('{{{ methods }}}', () => parsedMethodLines.join('\n') || defaultText);

    console.log(replacedVueComponent)
      
    fs.writeFile('./outputComponent.vue', replacedVueComponent, 'utf8', (err) => {
      if (err) {
        console.error(err);
        return;
      }
    });
  })
});

function onlyLettersAndNumbers(str) {
  return /^[A-Za-z0-9]*$/.test(str);
}

function joinUntilSemicolon(lines, startIndex = 0) {
  const joinedLines = [];
  let endIndex = startIndex;
  let isSemicolonFound = false;
  while (!isSemicolonFound && endIndex < lines.length) {
    joinedLines.push(lines[startIndex]);
    let lineJCleanedEnd = removeEmptySpacesFrom(lines[startIndex], 'end');
    isSemicolonFound = lineJCleanedEnd[lineJCleanedEnd.length - 1] === ';';
    if (!isSemicolonFound) {
      startIndex++;
    }
  }
  return { endIndex, joinedLines }
}

function joinedUntilSameIndentation(lines, indentation, startIndex) {
  const joinedLines = [];
  joinedLines.push(lines[startIndex]);

  let currentIndex = startIndex + 1;
  let isMoreIndented = true;
  while (isMoreIndented && currentIndex < lines.length) {
    joinedLines.push(lines[currentIndex]);
    const lineSplittedSpaces = lines[currentIndex].split(indentation + ' ');
    isMoreIndented = lineSplittedSpaces[0] === '';
    if (isMoreIndented) {
      currentIndex++;
    }
  }
  return { endIndex: currentIndex, joinedLines }
}

function removeEmptySpacesFrom(str, from) {
  if (from === 'start') {
    for (let i = 0; i < str.length; i++) {
      if (str[i] !== '\n' && str[i] !== ' ') return str.slice(i);
    }
  } else if (from === 'end') {
    for (let i = str.length - 1; i > 0; i--) {
      if (str[i] !== '\n' && str[i] !== ' ') return str.slice(0, i + 1);
    }
  }
  return str;
}

function cleanString(str) {
  const cleanedStrFromStart = removeEmptySpacesFrom(str, 'start');
  return removeEmptySpacesFrom(cleanedStrFromStart, 'end');
}

function parseCode(codeSection) {
  const codeLines = codeSection.lines;
  const codeLinesStr = codeLines.join('\n');

  if (codeSection.type === 'WATCH') {
    return formatCode(codeLinesStr + ',', '  ');
  }

  if (codeSection.type === 'PROP') {
    const lastLine = codeLines[codeLines.length - 1];
    const splittedByClosingOpts = lastLine.split('})');
    const rawActionNameAndType = splittedByClosingOpts[splittedByClosingOpts.length - 1];
    const [rawPropNameWithSpaces, rawType] = rawActionNameAndType.split(':');
    const rawPropName = removeEmptySpacesFrom(rawPropNameWithSpaces, 'start');
    const propName = rawPropName[rawPropName.length - 1] === ';' ?  rawPropName.slice(0, -1) : rawPropName;

    const linesWithoutDecorator = removeEmptySpacesFrom(codeLinesStr, 'start').split('@Prop(');
    const rawPropDefinition = linesWithoutDecorator[1].split(`)${rawPropNameWithSpaces}`)[0];
    const propDefinition = removeEmptySpacesFrom(rawPropDefinition, 'start');
    let updatedPropDefinition;
    if (rawType && !propDefinition.includes('type:')) {
      const cleanEndPropDefinition = removeEmptySpacesFrom(propDefinition.slice(0, -1), 'end');
      const rawTypeWithouSpaces = cleanString(rawType);
      const endIndex = rawTypeWithouSpaces[rawTypeWithouSpaces.length - 1] === ';' ? -1 : rawTypeWithouSpaces.length;
      const type = rawTypeWithouSpaces[0].toUpperCase() + rawTypeWithouSpaces.slice(1, endIndex);
      const isEndedWithComa = cleanEndPropDefinition[cleanEndPropDefinition.length - 1] === ',';
      const isPropDefinitionEmpty = cleanEndPropDefinition === '{';
      updatedPropDefinition = `${cleanEndPropDefinition}${isEndedWithComa || isPropDefinitionEmpty ? '' : ','} type: ${type}, }`;
    }
    return formatCode(`  ${propName}: ${updatedPropDefinition || propDefinition},`, '  ');
  }

  if (codeSection.type === 'DATA') {
    const [beforeEqual, rest] = codeLinesStr.split(' = ');
    const [name, type] = beforeEqual.split(':');
    const rawValue = codeLinesStr.split(' = ', 2)[1];
    const value = rawValue.slice(0, -1); // remove semicolon
    const typeToAdd = type ? ` as ${removeEmptySpacesFrom(type, 'start')}` : '';
    return formatCode(`${name}: ${value}${typeToAdd},`, '    ');
  }

  if (codeSection.type === 'ACTION') {
    const cleanCodeLines = removeEmptySpacesFrom(codeLinesStr, 'start');
    const match = cleanCodeLines.match(/^@Action\(.[A-Za-z0-9]*.[/].[A-Za-z0-9]*.[\)]/);
    const [actionPattern] = match;
    const rawActionNameAndType = cleanCodeLines.substr(cleanCodeLines.indexOf(actionPattern) + actionPattern.length);
    const actionNameAndType = cleanString(rawActionNameAndType).slice(0, -1);
    const [name, type] = actionNameAndType.split(':');
    const rawActionLocation = actionPattern.match(/(?<=@Action\().+/)[0].replaceAll(')', '');
    return formatCode(`${name}: ${rawActionLocation},`, '      '); // Maybe add as type if there is one
  }

  if (codeSection.type === 'GETTER') {
    const cleanCodeLines = removeEmptySpacesFrom(codeLinesStr, 'start');
    const match = cleanCodeLines.match(/^@Getter\(.[A-Za-z0-9]*.[/].[A-Za-z0-9]*.[\)]/);
    const [actionPattern] = match;
    const rawActionNameAndType = cleanCodeLines.substr(cleanCodeLines.indexOf(actionPattern) + actionPattern.length);
    const actionNameAndType = cleanString(rawActionNameAndType).slice(0, -1);
    const [name, type] = actionNameAndType.split(':');
    const rawActionLocation = actionPattern.match(/(?<=@Getter\().+/)[0].replaceAll(')', '');
    return formatCode(`${name}: ${rawActionLocation},`, '      '); // Maybe add as type if there is one
  }

  if (codeSection.type === 'COMPUTED') {
    const [_, afterGet] = codeLinesStr.split('get '); // first line
    return formatCode(`  ${afterGet}` + ',', '  ');
  }
 
  if (codeSection.type === 'LIFECYCLE_EVENT') {
    return codeLinesStr + ',';
  }
  
  if (codeSection.type === 'METHOD') {
    return formatCode(codeLinesStr + ',', '  ');
  }

  return;
}

function formatCode(code, defaultIndentaion = '  ') {
  return `${defaultIndentaion}${code.replaceAll('\n', `\n${defaultIndentaion}`)}`;
}

