import SyntaxError from '.SyntaxError';
import RangeError from '.RangeError';
import TypeError from '.TypeError';
import Error from '.Error';
import isSafeInteger from '.Number.isSafeInteger';
import Proxy from '.Proxy';
import WeakMap from '.WeakMap';
import { Table, OrderedTable } from '../types/Table';
import { BigIntInteger, NumberInteger, DependInteger } from '../types/Integer';
import * as iterator from './iterator';

/* options */

export let useWhatToJoinMultiLineString :string;
export let IntegerDepends :Function, IntegerMin :number, IntegerMax :number;

/* xOptions */

type as = (array :any[]) => any[];

export let moreDatetime :boolean;
export let ctrl7F :boolean;
export let nonEmptyKey :boolean;
export let xob :boolean;
export let sFloat :boolean;
export let TableDepends :Table;
export let openable :boolean;
export let allowLonger :boolean;
export let enableNull :boolean;
export let allowInlineTableMultiLineAndTrailingCommaEvenNoComma :boolean;
export let enableInterpolationString :boolean;
export let asNulls :as, asStrings :as, asTables :as, asArrays :as, asBooleans :as, asFloats :as, asIntegers :as;
export let asOffsetDateTimes :as, asLocalDateTimes :as, asLocalDates :as, asLocalTimes :as;
let processor :Function | null;

/* xOptions.mix */

export const unType = (array :any[]) :any[] => array;
export const {
	asInlineArrayOfNulls,
	asInlineArrayOfStrings,
	asInlineArrayOfTables,
	asInlineArrayOfArrays,
	asInlineArrayOfBooleans,
	asInlineArrayOfFloats,
	asInlineArrayOfIntegers,
	asInlineArrayOfOffsetDateTimes,
	asInlineArrayOfLocalDateTimes,
	asInlineArrayOfLocalDates,
	asInlineArrayOfLocalTimes,
} = <{ [each :string] :as }><object>new Proxy(new WeakMap, {
	get: (arrayTypes) => function typify (array :any[]) :any[] {
		if ( arrayTypes.has(array) ) {
			arrayTypes.get(array)===typify
			|| iterator.throws(TypeError('Types in array must be same. Check '+iterator.where()));
		}
		else { arrayTypes.set(array, typify); }
		return array;
	}
});

/* xOptions.new */

type each = { table :object, key :string, tag :string } | { array :any[], index :number, tag :string } | { table :object, key :string, array :object[], index :number, tag :string };
let collection :each[] = [];
function collect_on (each :each) :void { collection.push(each); }
function collect_off (each :each) :never { throw iterator.throws(SyntaxError(iterator.where())); }
export let collect :typeof collect_off | typeof collect_on = collect_off;
export function process () {
	let index = collection.length;
	if ( index ) {
		iterator.done();
		const process = <Function>processor;
		const queue = collection;
		processor = null;
		collection = [];
		while ( index-- ) { process(<each>queue.pop()); }
	}
}

/* use & clear */

export function clear () :void {
	processor = null;
	collection.length = 0;
}

export function use (specificationVersion, useWhatToJoinMultiLineString_notUsingForSplitTheSourceLines :string, useBigInt_forInteger :boolean | number, extensionOptions) :void {
	if ( specificationVersion!==0.5 && specificationVersion!==0.4 ) { throw new Error('TOML.parse(,specificationVersion)'); }
	if ( typeof <unknown>useWhatToJoinMultiLineString_notUsingForSplitTheSourceLines!=='string' ) { throw new TypeError('TOML.parse(,,multiLineJoiner)'); }
	if ( useBigInt_forInteger===true ) { IntegerDepends = BigIntInteger; }
	else if ( useBigInt_forInteger===false ) { IntegerDepends = NumberInteger; }
	else {
		if ( typeof useBigInt_forInteger!=='number' ) { throw new TypeError('TOML.parse(,,,useBigInt)'); }
		if ( !isSafeInteger(useBigInt_forInteger) ) { throw new RangeError('TOML.parse(...useBigInt)'); }
		IntegerDepends = DependInteger;
		if ( useBigInt_forInteger>=0 ) {
			IntegerMax = useBigInt_forInteger;
			IntegerMin = -useBigInt_forInteger;
		}
		else {
			IntegerMin = useBigInt_forInteger;
			IntegerMax = -useBigInt_forInteger-1;
		}
	}
	useWhatToJoinMultiLineString = useWhatToJoinMultiLineString_notUsingForSplitTheSourceLines;
	moreDatetime = ctrl7F = xob = sFloat = specificationVersion===0.5;
	nonEmptyKey = openable = specificationVersion===0.4;
	let typify :boolean;
	if ( extensionOptions===null ) {
		TableDepends = Table;
		allowLonger = enableNull = allowInlineTableMultiLineAndTrailingCommaEvenNoComma = enableInterpolationString = false;
		processor = null;
		typify = true;
	}
	else {
		TableDepends = extensionOptions.order ? OrderedTable : Table;
		allowLonger = !!extensionOptions.longer;
		enableNull = !!extensionOptions.null;
		allowInlineTableMultiLineAndTrailingCommaEvenNoComma = !!extensionOptions.multi;
		enableInterpolationString = !!extensionOptions.ins;
		typify = !extensionOptions.mix;
		processor = extensionOptions.new || null;
		if ( processor ) {
			if ( typeof processor!=='function' ) { throw new TypeError('TOML.parse(,,,,xOptions.tag)'); }
			if ( typify ) { throw new Error('TOML.parse(,,,,xOptions) xOptions.tag needs xOptions.mix to be true'); }
			collect = collect_on;
		}
		else { collect = collect_off; }
	}
	if ( typify ) {
		asNulls = asInlineArrayOfNulls;
		asStrings = asInlineArrayOfStrings;
		asTables = asInlineArrayOfTables;
		asArrays = asInlineArrayOfArrays;
		asBooleans = asInlineArrayOfBooleans;
		asFloats = asInlineArrayOfFloats;
		asIntegers = asInlineArrayOfIntegers;
		asOffsetDateTimes = asInlineArrayOfOffsetDateTimes;
		asLocalDateTimes = asInlineArrayOfLocalDateTimes;
		asLocalDates = asInlineArrayOfLocalDates;
		asLocalTimes = asInlineArrayOfLocalTimes;
	}
	else {
		asNulls = asStrings = asTables = asArrays = asBooleans = asFloats = asIntegers = asOffsetDateTimes = asLocalDateTimes = asLocalDates = asLocalTimes = unType;
	}
}
