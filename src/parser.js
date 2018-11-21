import { WeakSet, WeakMap, Error, TypeError, Infinity, NaN, isArray, Symbol_for, Map, RegExp, getOwnPropertyNames, create } from './global.js';
import { from, next, rest, done, mark, must, throwSyntaxError, throwTypeError, throwError, where } from './iterator.js';
import { unEscapeSingleLine, String, Integer, Float, Datetime, Table } from './types.js';

const BOM = /^\uFEFF/;
const EOL = /\r?\n/;
const PRE_WHITESPACE = /^[ \t]*/;
const TABLE_DEFINITION = /^\[(\[?)[ \t]*((?:[\w-]+|"(?:[^\\"\x00-\x09\x0B-\x1F\x7F]+|\\(?:[btnfr"\\]|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}))*"|'[^'\x00-\x08\x0B-\x1F\x7F]*')(?:[ \t]*\.[ \t]*(?:[\w-]+|"(?:[^\\"\x00-\x09\x0B-\x1F\x7F]+|\\(?:[btnfr"\\]|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}))*"|'[^'\x00-\x08\x0B-\x1F\x7F]*'))*)[ \t]*](]?)[ \t]*(?:#[^]*)?$/;
const KEY_VALUE_PAIR = /^((?:[\w-]+|"(?:[^\\"\x00-\x09\x0B-\x1F\x7F]+|\\(?:[btnfr"\\]|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}))*"|'[^'\x00-\x08\x0B-\x1F\x7F]*')(?:[ \t]*\.[ \t]*(?:[\w-]+|"(?:[^\\"\x00-\x09\x0B-\x1F\x7F]+|\\(?:[btnfr"\\]|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}))*"|'[^'\x00-\x08\x0B-\x1F\x7F]*'))*)[ \t]*=[ \t]*(!!([\w-]*)[ \t]+)?([^ \t#][^]*)$/;
const KEYS = /[\w-]+|"(?:[^\\"]+|\\[^])*"|'[^']*'/g;
const VALUE_REST = /^((?:\d\d\d\d-\d\d-\d\d \d)?[\w\-+.:]+)[ \t]*([^]*)$/;
const LITERAL_STRING = /^'([^'\x00-\x08\x0B-\x1F\x7F]*)'[ \t]*([^]*)/;
const MULTI_LINE_LITERAL_STRING_LONE = /^'''([^]*?)'''[ \t]*([^]*)/;
const MULTI_LINE_LITERAL_STRING_REST = /^([^]*?)'''[ \t]*([^]*)/;
const CONTROL_CHARACTER_EXCLUDE_TAB = /[\x00-\x08\x0B-\x1F\x7F]/;
const BASIC_STRING = /^"((?:[^\\"\x00-\x09\x0B-\x1F\x7F]+|\\(?:[btnfr"\\]|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}))*)"[ \t]*([^]*)/;
const MULTI_LINE_BASIC_STRING_LONE = /^"""((?:[^\\]+|\\[^])*?)"""[ \t]*([^]*)/;
const MULTI_LINE_BASIC_STRING_REST = /^((?:[^\\]+|\\[^])*?)"""[ \t]*([^]*)/;
const ESCAPED_EXCLUDE_CONTROL_CHARACTER = /^(?:[^\\\x00-\x09\x0B-\x1F\x7F]+|\\(?:[btnfr"\\ \n]|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8}))*$/;
const ESCAPED_IN_MULTI_LINE = /\n|\\(?:([ \n]+)|([\\"])|([btnfr])|u(.{4})|U(.{4})(.{4}))/g;
const SYM_WHITESPACE = /^[^][ \t]*/;

const DELIMITER_CHECK = /[^`]/;
const INTERPOLATIONS = /^(?:\([ \t]*(?:\/(?:[^\\[/]+|\[(?:[^\\\]]|\\[^])*]|\\[^])+\/[a-z]*[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*"|{[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*(?:,[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*)*}|\[[ \t]+(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*(?:,[ \t]*(?:{[ \t]*}|{[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*(?:,[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*)*})[ \t]*)+])[ \t]*|(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*(?:,[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*)*)\)[ \t]*)*[ \t]*([^]*)$/;
const INTERPOLATION = /\([ \t]*(?:\/(?:[^\\[/]+|\[(?:[^\\\]]|\\[^])*]|\\[^])+\/[a-z]*[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*"|{[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*(?:,[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*)*}|\[[ \t]+(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*(?:,[ \t]*(?:{[ \t]*}|{[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*(?:,[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*)*})[ \t]*)+])[ \t]*|(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*(?:,[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*)*)\)/g;
const INTERPOLATION_TOKEN = /'[^']*'|"(?:[^\\"]+|\\[^])*"/g;
const REGEXP_MODE = /^\([ \t]*\//;
const PATTERN_FLAGS_REPLACER = /\/((?:[^\\[/]+|\[(?:[^\\\]]|\\[^])*]|\\[^])+)\/([a-z]*)[ \t]*=[ \t]*('[^']*'|"(?:[^\\"]+|\\[^])*"|{[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*(?:,[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*)*}|\[[ \t]+(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*(?:,[ \t]*(?:{[ \t]*}|{[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*(?:,[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*)*})[ \t]*)+])/;
const WHOLE_AND_SUBS = /('[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*([^]*)/;
const SUB = /{[ \t]*}|{[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*(?:,[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*=[ \t]*(?:'[^']*'|"(?:[^\\"]+|\\[^])*")[ \t]*)*}/g;
const DOLLAR = /\$(?:[1-9]\d?|\$)/g;

const isTable = value => value instanceof Table;
const StaticObjects = new WeakSet;
const TypedArrays = new WeakMap;
const ArrayOfNulls = -1;
const ArrayOfStrings = 1;
const ArrayOfInlineTables = 2;
const ArrayOfInlineArrays = 3;
const ArrayOfBooleans = 4;
const ArrayOfFloats = 5;
const ArrayOfDatetimes = 6;
const ArrayOfIntegers = 7;
const reallyTypify = (array, type) => {
	if ( TypedArrays.has(array) ) {
		if ( TypedArrays.get(array)===type ) { return array; }
		throwTypeError('Types in array must be same.');
	}
	TypedArrays.set(array, type);
	return array;
};
const unlimitedType = array => array;

let useWhatToJoinMultiLineString = '';
let useBigInt = true;
let keepComment = false;
let enableNull = false;
let enableNil = false;
let allowInlineTableMultiLineAndTrailingCommaEvenNoComma = false;
let typify = reallyTypify;
let enableInterpolationString = false;
let customConstructors = null;

export default function parse (toml_source, toml_version, useWhatToJoinMultiLineString_notUsingForSplitTheSourceLines, useBigInt_forInteger = true, extensionOptions) {
	if ( typeof toml_source!=='string' ) { throw new TypeError('TOML.parse(source)'); }
	if ( toml_version!==0.5 ) { throw new Error('TOML.parse(,version)'); }
	if ( typeof useWhatToJoinMultiLineString_notUsingForSplitTheSourceLines!=='string' ) { throw new TypeError('TOML.parse(,,multiLineJoiner)'); }
	if ( typeof useBigInt_forInteger!=='boolean' ) { throw new TypeError('TOML.parse(,,,useBigInt)'); }
	useWhatToJoinMultiLineString = useWhatToJoinMultiLineString_notUsingForSplitTheSourceLines;
	useBigInt = useBigInt_forInteger;
	keepComment = !!( extensionOptions && extensionOptions.hash );
	enableNull = !!( extensionOptions && extensionOptions.null );
	enableNil = !!( extensionOptions && extensionOptions.nil );
	allowInlineTableMultiLineAndTrailingCommaEvenNoComma = !!( extensionOptions && extensionOptions.multi );
	typify = extensionOptions && extensionOptions.mix ? unlimitedType : reallyTypify;
	enableInterpolationString = !!( extensionOptions && extensionOptions.ins );
	customConstructors = extensionOptions && extensionOptions.new || null;
	if ( customConstructors!==null && typeof customConstructors!=='function' ) {
		if ( typeof customConstructors!=='object' ) { throw new TypeError; }
		const origin = customConstructors;
		customConstructors = create(null);
		for ( const name of getOwnPropertyNames(origin) ) {
			const customConstructor = origin[name];
			if ( typeof customConstructor!=='function' ) {
				customConstructors = null;
				throw new TypeError;
			}
			customConstructors[name] = customConstructor;
		}
	}
	const rootTable = new Table;
	try {
		from(toml_source.replace(BOM, '').split(EOL));
		let lastSectionTable = rootTable;
		while ( rest() ) {
			const line = next().replace(PRE_WHITESPACE, '');
			if ( line==='' || line.startsWith('#') ) { }
			else if ( line.startsWith('[') ) {
				const { 1: $_asArrayItem$$, 2: keys, 3: $$asArrayItem$_, 4: hash = '' } = TABLE_DEFINITION.exec(line) || throwSyntaxError(where());
				( $_asArrayItem$$==='[' )===( $$asArrayItem$_===']' ) || throwSyntaxError('Square brackets of table define statement not match at '+where());
				lastSectionTable = appendTable(rootTable, keys, $_asArrayItem$$==='[', hash);
			}
			else {
				const rest = assignInline(lastSectionTable, line);
				rest==='' || rest.startsWith('#') || throwSyntaxError(where());
			}
		}
	}
	finally {
		customConstructors = null;
		done();
	}
	return rootTable;
};

function appendTable (table, key_key, asArrayItem, hash) {
	const leadingKeys = parseKeys(key_key);
	const finalKey = leadingKeys.pop();
	table = prepareTable(table, leadingKeys);
	const lastTable = new Table;
	if ( asArrayItem ) {
		let arrayOfTables;
		if ( finalKey in table ) { StaticObjects.has(arrayOfTables = table[finalKey]) && throwError('Trying to push Table to non-ArrayOfTables value at '+where()); }
		else { arrayOfTables = table[finalKey] = []; }
		arrayOfTables.push(lastTable);
	}
	else {
		finalKey in table && throwError('Duplicate Table definition at '+where());
		table[finalKey] = lastTable;
	}
	if ( keepComment && hash ) { table[Symbol_for(finalKey)] = hash; }
	return lastTable;
}

function parseKeys (key_key) {
	const keys = key_key.match(KEYS);
	for ( let index = keys.length; index--; ) {
		const key = keys[index];
		if ( key.startsWith("'") ) { keys[index] = keys.slice(1, -1); }
		else if ( key.startsWith('"') ) {
			keys[index] = String(keys.slice(1, -1));
		}
	}
	return keys;
}

function prepareTable (table, keys) {
	const { length } = keys;
	let index = 0;
	while ( index<length ) {
		const key = keys[index++];
		if ( key in table ) {
			table = table[key];
			if ( isTable(table) ) {
				StaticObjects.has(table) && throwError('Trying to define table through static Inline Object at '+where());
			}
			else if ( isArray(table) ) {
				StaticObjects.has(table) && throwError('Trying to append value to static Inline Array at '+where());
				table = table[table.length-1];
			}
			else { throwError('Trying to define table through non-Table value at '+where()); }
		}
		else {
			table = table[key] = new Table;
			while ( index<length ) { table = table[keys[index++]] = new Table; }
			return table;
		}
	}
	return table;
}

function prepareInlineTable (table, keys) {
	const { length } = keys;
	let index = 0;
	while ( index<length ) {
		const key = keys[index++];
		if ( key in table ) {
			table = table[key];
			isTable(table) || throwError('Trying to assign property through non-Table value at '+where());
			StaticObjects.has(table) && throwError('Trying to assign property through static Inline Object at '+where());
		}
		else {
			table = table[key] = new Table;
			while ( index<length ) { table = table[keys[index++]] = new Table; }
			return table;
		}
	}
	return table;
}

function assignInline (lastInlineTable, lineRest) {
	const { 1: left, 2: custom, 3: name, 4: right } = KEY_VALUE_PAIR.exec(lineRest) || throwSyntaxError(where());
	let customConstructor;
	if ( custom ) {
		customConstructors || throwSyntaxError(where());
		if ( typeof customConstructors==='function' ) { customConstructor = value => customConstructors(name, value); }
		else {
			name in customConstructors || throwError(where());
			customConstructor = customConstructors[name];
		}
	}
	const leadingKeys = parseKeys(left);
	const finalKey = leadingKeys.pop();
	const table = prepareInlineTable(lastInlineTable, leadingKeys);
	finalKey in table && throwError('Duplicate property definition at '+where());
	switch ( right[0] ) {
		case "'":
			lineRest = assignLiteralString(table, finalKey, right);
			break;
		case '"':
			lineRest = assignBasicString(table, finalKey, right);
			break;
		case '{':
			lineRest = assignInlineTable(table, finalKey, right);
			break;
		case '[':
			lineRest = assignInlineArray(table, finalKey, right);
			break;
		case '`':
			lineRest = assignInterpolationString(table, finalKey, right);
			break;
		default:
			let literal;
			( { 1: literal, 2: lineRest } = VALUE_REST.exec(right) || throwSyntaxError(where()) );
			table[finalKey] =
				literal==='true' ? true : literal==='false' ? false :
					literal==='inf' || literal==='+inf' ? Infinity : literal==='-inf' ? -Infinity :
						literal==='nan' || literal==='+nan' || literal==='-nan' ? NaN :
							literal.includes(':') || literal.indexOf('-')!==literal.lastIndexOf('-') ? new Datetime(literal) :
								literal.includes('.') || literal.includes('e') || literal.includes('E') ? Float(literal) :
									enableNull && literal==='null' || enableNil && literal==='nil' ? null :
										Integer(literal, useBigInt);
			break;
	}
	if ( custom ) { table[finalKey] = customConstructor(table[finalKey]); }
	if ( keepComment && lineRest.startsWith('#') ) {
		table[Symbol_for(finalKey)] = lineRest;
		return '';
	}
	return lineRest;
}

function assignLiteralString (table, finalKey, literal) {
	let $;
	if ( literal.charAt(1)!=="'" || literal.charAt(2)!=="'" ) {
		$ = LITERAL_STRING.exec(literal) || throwSyntaxError(where());
		table[finalKey] = $[1];
		return $[2];
	}
	$ = MULTI_LINE_LITERAL_STRING_LONE.exec(literal);
	if ( $ ) {
		CONTROL_CHARACTER_EXCLUDE_TAB.test($[1]) && throwSyntaxError('Control characters other than tab are not permitted in a Literal String, which was found at '+where());
		table[finalKey] = $[1];
		return $[2];
	}
	literal = literal.slice(3);
	if ( literal ) {
		CONTROL_CHARACTER_EXCLUDE_TAB.test(literal) && throwSyntaxError('Control characters other than tab are not permitted in a Literal String, which was found at '+where());
		literal += useWhatToJoinMultiLineString;
	}
	const start = mark();
	for ( ; ; ) {
		const line = must('Literal String', start);
		$ = MULTI_LINE_LITERAL_STRING_REST.exec(line);
		if ( $ ) {
			CONTROL_CHARACTER_EXCLUDE_TAB.test($[1]) && throwSyntaxError('Control characters other than tab are not permitted in a Literal String, which was found at '+where());
			table[finalKey] = literal+$[1];
			return $[2];
		}
		literal += line+useWhatToJoinMultiLineString;
	}
}

function assignBasicString (table, finalKey, literal) {
	let $;
	if ( literal.charAt(1)!=='"' || literal.charAt(2)!=='"' ) {
		$ = BASIC_STRING.exec(literal) || throwSyntaxError(where());
		table[finalKey] = String($[1]);
		return $[2];
	}
	$ = MULTI_LINE_BASIC_STRING_LONE.exec(literal);
	if ( $ ) {
		ESCAPED_EXCLUDE_CONTROL_CHARACTER.test($[1]) || throwSyntaxError(where());
		table[finalKey] = String($[1]);
		return $[2];
	}
	literal = literal.slice(3);
	if ( literal ) {
		literal += '\n';
		ESCAPED_EXCLUDE_CONTROL_CHARACTER.test(literal) || throwSyntaxError(where());
	}
	const start = mark();
	for ( ; ; ) {
		let line = must('Basic String', start);
		$ = MULTI_LINE_BASIC_STRING_REST.exec(line);
		if ( $ ) {
			ESCAPED_EXCLUDE_CONTROL_CHARACTER.test($[1]) || throwSyntaxError(where());
			table[finalKey] = ( literal+$[1] ).replace(ESCAPED_IN_MULTI_LINE, ($0, $1, $2, $3, $4, $5, $6) => {
				if ( $0==='\n' ) { return useWhatToJoinMultiLineString; }
				if ( $1 ) {
					$1.includes('\n') || throwSyntaxError('Back slash leading whitespaces can only appear at the end of a line, but see '+where());
					return '';
				}
				return unEscapeSingleLine('', $2, $3, $4, $5, $6);
			});
			return $[2];
		}
		line += '\n';
		ESCAPED_EXCLUDE_CONTROL_CHARACTER.test(line) || throwSyntaxError(where());
		literal += line;
	}
}

function assignInlineTable (table, finalKey, lineRest) {
	const inlineTable = table[finalKey] = new Table;
	StaticObjects.add(inlineTable);
	lineRest = lineRest.replace(SYM_WHITESPACE, '');
	if ( allowInlineTableMultiLineAndTrailingCommaEvenNoComma ) {
		const start = mark();
		for ( ; ; ) {
			while ( lineRest==='' || lineRest.startsWith('#') ) {
				lineRest = must('Inline Table', start).replace(PRE_WHITESPACE, '');
			}
			if ( lineRest.startsWith('}') ) { return lineRest.replace(SYM_WHITESPACE, ''); }
			lineRest = assignInline(inlineTable, lineRest);
			while ( lineRest==='' || lineRest.startsWith('#') ) {
				lineRest = must('Inline Table', start).replace(PRE_WHITESPACE, '');
			}
			if ( lineRest.startsWith(',') ) { lineRest = lineRest.replace(SYM_WHITESPACE, ''); }
		}
	}
	else {
		if ( lineRest.startsWith('}') ) { return lineRest.replace(SYM_WHITESPACE, ''); }
		( lineRest==='' || lineRest.startsWith('#') ) && throwSyntaxError('Inline Table is intended to appear on a single line, which broken at '+where());
		for ( ; ; ) {
			lineRest = assignInline(inlineTable, lineRest);
			if ( lineRest.startsWith('}') ) { return lineRest.replace(SYM_WHITESPACE, ''); }
			if ( lineRest.startsWith(',') ) {
				lineRest = lineRest.replace(SYM_WHITESPACE, '');
				lineRest.startsWith('}') && throwSyntaxError('The last property of an Inline Table can not have a trailing comma, which was found at '+where());
			}
			( lineRest==='' || lineRest.startsWith('#') ) && throwSyntaxError('Inline Table is intended to appear on a single line, which broken at '+where());
		}
	}
}

function assignInlineArray (table, finalKey, lineRest) {
	const inlineArray = table[finalKey] = [];
	StaticObjects.add(inlineArray);
	const start = mark();
	lineRest = lineRest.replace(SYM_WHITESPACE, '');
	while ( lineRest==='' || lineRest.startsWith('#') ) {
		lineRest = must('Inline Array', start).replace(PRE_WHITESPACE, '');
	}
	if ( lineRest.startsWith(']') ) { return lineRest.replace(SYM_WHITESPACE, ''); }
	for ( ; ; ) {
		lineRest = pushInline(inlineArray, lineRest);
		while ( lineRest==='' || lineRest.startsWith('#') ) {
			lineRest = must('Inline Array', start).replace(PRE_WHITESPACE, '');
		}
		if ( lineRest.startsWith(',') ) {
			lineRest = lineRest.replace(SYM_WHITESPACE, '');
			if ( keepComment && lineRest.startsWith('#') ) {
				inlineArray[Symbol_for(inlineArray.length-1+'')] = lineRest;
				lineRest = '';
			}
			while ( lineRest==='' || lineRest.startsWith('#') ) {
				lineRest = must('Inline Array', start).replace(PRE_WHITESPACE, '');
			}
			if ( lineRest.startsWith(']') ) { return lineRest.replace(SYM_WHITESPACE, ''); }
		}
		else {
			if ( lineRest.startsWith(']') ) { return lineRest.replace(SYM_WHITESPACE, ''); }
			throwSyntaxError(where());
		}
	}
}

function pushInline (array, right) {
	switch ( right[0] ) {
		case "'":
			return assignLiteralString(typify(array, ArrayOfStrings), ''+array.length, right);
		case '"':
			return assignBasicString(typify(array, ArrayOfStrings), ''+array.length, right);
		case '{':
			return assignInlineTable(typify(array, ArrayOfInlineTables), ''+array.length, right);
		case '[':
			return assignInlineArray(typify(array, ArrayOfInlineArrays), ''+array.length, right);
		case '`':
			return assignInterpolationString(typify(array, ArrayOfStrings), ''+array.length, right);
	}
	const { 1: literal, 2: lineRest } = VALUE_REST.exec(right) || throwSyntaxError(where());
	if ( literal==='true' ) { typify(array, ArrayOfBooleans).push(true); }
	else if ( literal==='false' ) { typify(array, ArrayOfBooleans).push(false); }
	else if ( literal==='inf' || literal==='+inf' ) { typify(array, ArrayOfFloats).push(Infinity); }
	else if ( literal==='-inf' ) { typify(array, ArrayOfFloats).push(-Infinity); }
	else if ( literal==='nan' || literal==='+nan' || literal==='-nan' ) {
		typify(array, ArrayOfFloats).push(NaN);
	}
	else if ( literal.includes(':') || literal.indexOf('-')!==literal.lastIndexOf('-') ) {
		typify(array, ArrayOfDatetimes).push(new Datetime(literal));
	}
	else if ( literal.includes('.') || literal.includes('e') || literal.includes('E') ) {
		typify(array, ArrayOfFloats).push(Float(literal));
	}
	else if ( enableNull && literal==='null' || enableNil && literal==='nil' ) {
		typify(array, ArrayOfNulls).push(null);
	}
	else { typify(array, ArrayOfIntegers).push(Integer(literal, useBigInt)); }
	return lineRest;
}

function assignInterpolationString (table, finalKey, lineRest) {
	enableInterpolationString || throwSyntaxError(where());
	DELIMITER_CHECK.test(lineRest) && throwSyntaxError('Interpolation String opening tag incorrect at '+where());
	const literals = [];
	for ( const start = mark(); ; ) {
		const literal = must('Interpolation String', start);
		if ( literal.startsWith(lineRest) ) {
			lineRest = lineRest.slice(lineRest.length).replace(PRE_WHITESPACE, '');
			break;
		}
		literals.push(literal);
	}
	let string = literals.join('\n');
	if ( lineRest.startsWith('(') ) {
		const interpolations_rest = INTERPOLATIONS.exec(lineRest) || throwSyntaxError(where());
		lineRest = interpolations_rest[2];
		for ( const interpolation of interpolations_rest[1].match(INTERPOLATION) ) {
			if ( REGEXP_MODE.test(interpolation) ) {
				const { 1: pattern, 2: flags, 3: Replacer } = PATTERN_FLAGS_REPLACER.exec(interpolation);
				const search = newRegExp(pattern, flags) || throwSyntaxError('Invalid regExp at '+where());
				let replacer;
				switch ( Replacer[0] ) {
					case "'":
						replacer = Replacer.slice(1, -1);
						break;
					case '"':
						replacer = String(Replacer.slice(1, -1));
						break;
					case '{':
						const map = newMap(Replacer, true);
						replacer = $0 => map.has($0) ? map.get($0) : $0;
						break;
					case '[':
						const { 1: whole, 2: subs } = WHOLE_AND_SUBS.exec(Replacer);
						const maps = [null];
						for ( const sub of subs.match(SUB) ) { maps.push(newMap(sub, true)); }
						replacer = (...args) => whole.replace(DOLLAR, $n => {
							if ( $n==='$$' ) { return '$'; }
							const n = $n.slice(1);
							const map = maps[n];
							const arg = args[n];
							return map && map.has(arg) ? map.get(arg) : arg;
						});
						break;
				}
				string = string.replace(search, replacer);
			}
			else {
				const map = newMap(interpolation, false);
				let round = '';
				outer: for ( let length = string.length, index = 0; index<length; ) {
					for ( const { 0: search, 1: replacer } of map ) {
						if ( string.startsWith(search, index) ) {
							round += replacer;
							index += search.length;
							continue outer;
						}
					}
					round += string[index];
					++index;
				}
				string = round;
			}
		}
	}
	table[finalKey] = string;
	return lineRest;
}

function newMap (interpolation, usedForRegExp) {
	const map = new Map;
	const tokens = interpolation.match(INTERPOLATION_TOKEN);
	for ( let length = tokens.length, index = 0; index<length; ) {
		let search = tokens[index++];
		search = search[0]==="'" ? search.slice(1, -1) : String(search.slice(1, -1));
		usedForRegExp || search || throwSyntaxError('Characters to replace can not be empty, which was found at '+where());
		map.has(search) && throwSyntaxError('Duplicate '+( usedForRegExp ? 'replacer' : 'characters to replace' )+' at '+where());
		let replacer = tokens[index++];
		replacer = replacer[0]==="'" ? replacer.slice(1, -1) : String(replacer.slice(1, -1));
		map.set(search, replacer);
	}
	return map;
}

function newRegExp (pattern, flags) {
	try { return new RegExp(pattern, flags); }
	catch (error) { return null; }
}
