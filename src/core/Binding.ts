import { err, ERROR } from "../errors";
import { Component } from "./Component";
import { tt } from "./I18nService";
import { ManagedList } from "./ManagedList";
import { logUnhandledException } from "./UnhandledErrorEmitter";
import * as util from "./util";

/** Running ID for new `Binding` instances */
let _nextBindingUID = 16;

/** Definition of a reader instance that provides a bound value */
interface BoundReader {
  readonly boundParent: Component;
  getValue(hint?: any): any;
}

/**
 * Component property binding base class.
 * Bindings should be created using the `bind` and `bindf` functions, and used as a property of the object passed to `Component.with`.
 */
export class Binding {
  /** Returns true if given value is an instance of `Binding` */
  static isBinding(value: any): value is Binding {
    return !!(value && value.isComponentBinding && value instanceof Binding);
  }

  /** Create a new binding for given property and default value. See `bind`. */
  constructor(source?: string, defaultValue?: any) {
    let path: string[] | undefined;
    let propertyName = source !== undefined ? String(source) : undefined;

    // parse property name, path, and filters
    if (propertyName !== undefined) {
      let parts = String(propertyName).split("|");
      path = parts.shift()!.split(".");
      propertyName = path.shift()!;
      while (propertyName[0] === "!") {
        propertyName = propertyName.slice(1);
        this.addFilter("!");
      }
      if (!path.length) path = undefined;
      for (let part of parts) this.addFilter(part);
    }
    this.propertyName = propertyName;

    // create a reader class that provides a value getter
    let self = this;
    this.Reader = class {
      /** Create a new reader, linked to given bound parent */
      constructor(public readonly boundParent: Component) {}

      /** The current (filtered) value for this binding */
      getValue(propertyHint?: any) {
        let result =
          arguments.length > 0
            ? propertyHint
            : propertyName !== undefined
            ? (this.boundParent as any)[propertyName]
            : undefined;

        // find nested properties
        if (path) {
          for (let i = 0; i < path.length && result != undefined; i++) {
            let p = path[i];
            if (!(p in result) && typeof result.get === "function") {
              result = result.get(p);
            } else {
              result = result[p];
            }
          }
        }

        // return filtered result
        if (self._filter) {
          result = self._filter(result, this.boundParent);
        }
        return result === undefined && defaultValue !== undefined ? defaultValue : result;
      }
    };
  }

  /** Method for duck typing, always returns true */
  isComponentBinding(): true {
    return true;
  }

  /** Unique ID for this binding */
  readonly id = util.BINDING_ID_PREFIX + _nextBindingUID++;

  /** @internal Constructor for a reader, that reads current bound and filtered values */
  Reader: new (boundParent: Component) => BoundReader;

  /** Name of the property that should be observed for this binding (highest level only, does not include names of nested properties or keys) */
  readonly propertyName?: string;

  /** Nested bindings, if any (e.g. for string format bindings, see `bindf`) */
  get bindings() {
    return this._bindings as ReadonlyArray<Binding>;
  }

  /** @internal */
  protected _bindings?: Binding[];

  /** Parent binding, if any (e.g. for nested bindings in string format bindings) */
  parent?: Binding;

  /** Apply translation or internationalization formatting to the resulting value. If the parameter is omitted, the (string) value is translated using the current locale (see `I18nService`); otherwise the value is formatted using the `tt(type)` function using the given type name, e.g. `currency`, `date:short`, `datetime:long`, etc. */
  i18n(type?: string) {
    let oldFilter = this._filter;
    this._filter = (v, boundParent) => {
      if (oldFilter) v = oldFilter(v, boundParent);
      return tt(v, type);
    };
    return this;
  }

  /**
   * Add a filter to this binding, which transforms values to a specific type or format. These can be chained by adding multiple filters in order of execution.
   * Filters can also be specified after the `|` (pipe) separator in string argument given to the `Binding` constructor, or `bind` function.
   * Available bindings include:
   * - `s`, `str`, or `string`: convert non-undefined values to a string using the `String(...)` function.
   * - `n`, `num`, or `number`: convert non-undefined values to a floating-point number using the `parseFloat(...)` function.
   * - `i`, `int`, or `integer`: convert values to whole numbers using the `Math.round(...)` function. Undefined values are converted to `0`.
   * - `dec(1)`, `dec(2)`, `dec(3)` etc.: convert values to decimal numbers as strings, with given number of fixed decimals.
   * - `tt` or `tt(type)`: translate text and/or other values using the `tt` function (i18n).
   * - `?` or `!!`, `not?` or `!`: convert values to boolean, applying boolean NOT for `!` and `not?`, and NOT-NOT for `?` and `!!`.
   * - `or(...)`: use given string if value is undefined or a blank string; the string cannot contain a `}` character.
   * - `then(...)`: use given string if value is NOT undefined or a blank string, otherwise `undefined`; the string cannot contain a `}` character.
   * - `uniq`: leave only unique values in an array, and discard undefined values
   * - `pluck(...)`: take given property from all elements of an array
   * - `blank` or `_`: output an empty string, but make the unfiltered value available for the #{...} pattern in `bindf`.
   */
  addFilter(fmt: string) {
    fmt = String(fmt).trim();

    // split format into ID and arguments
    let argIdx = fmt.indexOf("(");
    let arg: string | undefined;
    if (argIdx > 0 && fmt.slice(-1) === ")") {
      arg = fmt.slice(argIdx + 1, -1).trim();
      fmt = fmt.slice(0, argIdx).trim();
    }

    // select a filter by ID
    let filter = Binding.filters[fmt];
    if (!filter) throw err(ERROR.Binding_UnknownFilter, fmt);

    // store new chained filter
    let oldFilter = this._filter;
    this._filter = (v, boundParent) => {
      if (oldFilter) v = oldFilter(v, boundParent);
      return filter(v, arg);
    };
    return this;
  }

  /** Add a filter to this binding to compare the bound value to the given value(s), the result is always either `true` (at least one match) or `false` (none match) */
  match(...values: any[]) {
    let oldFilter = this._filter;
    this._filter = (v, boundParent) => {
      if (oldFilter) v = oldFilter(v, boundParent);
      return values.some(w => w === v);
    };
    return this;
  }

  /** Add a filter to this binding to compare the bound value to the given value(s), the result is always either `true` (none match) or `false` (at least one match) */
  nonMatch(...values: any[]) {
    let oldFilter = this._filter;
    this._filter = (v, boundParent) => {
      if (oldFilter) v = oldFilter(v, boundParent);
      return !values.some(w => w === v);
    };
    return this;
  }

  /**
   * Add an 'and' term to this binding (i.e. logical and, like `&&` operator); the argument(s) are used to construct another binding using the `bind()` function.
   * @note The combined binding can only be bound to a single component, e.g. within a list view cell, bindings targeting both the list element and the activity can **not** be combined using this method.
   */
  and(source: string, defaultValue?: any) {
    let binding = new Binding(source, defaultValue);
    binding.parent = this;
    if (!this._bindings) this._bindings = [];
    this._bindings.push(binding);

    // add filter to get value from binding and AND together
    let oldFilter = this._filter;
    this._filter = (v, boundParent) => {
      if (oldFilter) v = oldFilter(v, boundParent);
      let bound = boundParent.getBoundBinding(binding);
      if (!bound) throw err(ERROR.Binding_NotFound, source);
      return v && bound.value;
    };
    return this;
  }

  /**
   * Add an 'or' term to this binding (i.e. logical or, like `||` operator); the argument(s) are used to construct another binding using the `bind()` function.
   * @note The combined binding can only be bound to a single component, e.g. within a list view cell, bindings targeting both the list element and the activity can **not** be combined using this method.
   */
  or(source: string, defaultValue?: any) {
    let binding = new Binding(source, defaultValue);
    binding.parent = this;
    if (!this._bindings) this._bindings = [];
    this._bindings.push(binding);

    // add filter to get value from binding and AND together
    let oldFilter = this._filter;
    this._filter = (v, boundParent) => {
      if (oldFilter) v = oldFilter(v, boundParent);
      let bound = boundParent.getBoundBinding(binding);
      if (!bound) throw err(ERROR.Binding_NotFound, source);
      return v || bound.value;
    };
    return this;
  }

  /** Chained filter function, if any */
  private _filter?: (v: any, boundParent: Component) => any;

  /** List of applicable filters, new filters may be added here */
  static readonly filters: { [id: string]: (v: any, ...args: any[]) => any } = {
    "!": v => !v,
    "not?": v => !v,
    "?": v => !!v,
    "!!": v => !!v,
    "or": (v, alt) => v || alt,
    "then": (v, str) => (v && str) || undefined,
    "tt": tt,
    "s": _stringFormatter,
    "str": _stringFormatter,
    "string": _stringFormatter,
    "uc": _ucFormatter,
    "lc": _lcFormatter,
    "blank": _blankFormatter,
    "_": _blankFormatter,
    "n": _floatFormatter,
    "num": _floatFormatter,
    "number": _floatFormatter,
    "i": _intFormatter,
    "int": _intFormatter,
    "integer": _intFormatter,
    "dec": _decimalFormatter,
    "uniq": _uniqueFormatter,
    "pluck": _pluckFormatter,
  };
}

/**
 * Represents a set of bindings (see `Binding`) that are compiled into a single string value.
 * String format bindings should be created using the `bindf` function.
 */
export class StringFormatBinding extends Binding {
  /** Creates a new binding for given format string (or any object that can be converted to a string). See `bindf`. */
  constructor(text: any, ...rest: Binding[]) {
    super(undefined);

    // prepare bindings for all tags in given format string
    let bindings: Array<Binding> = [];
    let bindSources: string[] = [];
    let indexBySource: { [s: string]: number } = Object.create(null);
    let match = String(text).match(/\$\{([^\}]+)\}/g);
    if (match) {
      for (let s of match) {
        let binding: Binding;
        let inner = s.slice(2, -1).trim();
        if (inner[0] === "%" && /\%\d+/.test(inner)) {
          let i = parseInt(inner.slice(1));
          binding = rest[i - 1];
          if (!(binding instanceof Binding)) {
            throw err(ERROR.Binding_NotABinding, s);
          }
          if (!binding.parent) binding.parent = this;
        } else {
          binding = new Binding(inner, "");
          binding.parent = this;
        }
        indexBySource[s] = bindings.length;
        bindings.push(binding);
        if (binding.bindings) bindings.push(...binding.bindings);
        bindSources.push(s);
      }
    }

    // store bindings for use by component constructor
    this._bindings = bindings;

    // amend reader to get values from bindings and compile text
    this.Reader = class extends this.Reader {
      constructor(boundParent: Component) {
        super(boundParent);
        this.text = String(text);
      }
      text: string;
      getValue() {
        // take values for all bindings first
        let values = bindings.map((binding, i) => {
          let bound = this.boundParent.getBoundBinding(binding);
          if (!bound) throw err(ERROR.Binding_NotFound, bindSources[i]);
          return bound.value;
        });

        // replace all tags for bindings and pluralizers in format string
        let lastIndex = 0;
        let result = this.text.replace(/[\$\#]\{(?:(\d+)\:)?([^\}]+)\}/g, (tag, idx, s) => {
          if (tag[0] === "$") {
            // replace with plain binding value
            lastIndex = indexBySource[tag];
            return lastIndex >= 0 ? _stringFormatter(values[lastIndex]) : "";
          } else {
            // replace with pluralization option
            let bindingIndex = idx ? Number(idx) - 1 : lastIndex;
            return tt.getPlural(values[bindingIndex], s.split("/"));
          }
        });
        return super.getValue(result);
      }
    };
  }
}

export namespace Binding {
  /** Binding type (duck typed) */
  export interface Type {
    isComponentBinding(): true;
  }

  /**
   * @internal A list of components that are actively bound to a specific binding. Also includes a method to update the value on all components, using the `Component.updateBoundValue` method.
   */
  export class Bound extends ManagedList<Component> {
    /** Create a new bound instance for given binding and its currently bound parent component */
    constructor(public binding: Binding, boundParent: Component) {
      super();
      if (binding.parent) {
        // find bound parent first
        let parent = boundParent.getBoundBinding(binding.parent);
        if (!parent) throw err(ERROR.Binding_ParentNotFound);
        this.parent = parent;
      }

      // set own properties
      this.propertyName = binding.propertyName;
      this._reader = new binding.Reader(boundParent);
    }

    /** Bound parent binding */
    readonly parent?: Bound;

    /** Bound property name (highest level only, same as `Binding.propertyName`) */
    readonly propertyName?: string;

    /** Returns true if there already is an actively bound value */
    hasValue() {
      return !!this._updatedValue;
    }

    /** The current bound value, taken from the bound parent component (or cached) */
    get value() {
      // use existing value, or get a value from the reader
      return this._updatedValue ? this._lastValue : this._reader.getValue();
    }

    /** Update all components in the list with a new value. The current value of the source property (i.e. using `Binding.propertyName`) may be passed in if it is already known. */
    updateComponents(_v?: any) {
      if (!this.count && !this.parent) {
        // do not update, invalidate stored value
        this._updatedValue = false;
        return;
      }

      // get a new value and check if an update is even necessary
      let value = this._reader.getValue(...arguments); // _v if given
      if (!this._updatedValue || this._lastValue !== value) {
        this._updatedValue = true;
        this._lastValue = value;
        if (this.parent) {
          // update parent instead
          this.parent.updateComponents();
          return;
        }

        // go through all components and update the bound value
        let id = this.binding.id;
        this.forEach((component: any) => {
          try {
            if (typeof component[id] !== "function") {
              throw err(ERROR.Binding_NoComponent);
            }
            component[id](value);
          } catch (err) {
            logUnhandledException(err);
          }
        });
      }
    }

    /** True if stored value is up to date */
    private _updatedValue?: boolean;

    private _reader: InstanceType<Binding["Reader"]>;
    private _lastValue: any;
  }
}

/**
 * Returns a new binding, which can be used as a component preset (see `Component.with`) to update components dynamically with the value of an observed property on the bound parent component, such as the `Activity` for a view, the `Application` for an activity, or the `ViewComponent` for nested views.
 *
 * The bound property name is specified using the first argument. Nested properties are allowed (e.g. `foo.bar`), but _only_ the first property will be observed. Hence, changes to nested properties are not reflected automatically. To update bound values for nested properties, emit a `ManagedChangeEvent` on the highest level property (using `ManagedObject.emitChange()` or otherwise).
 *
 * If a nested property does not exist, but a `get` method does (e.g. `ManagedMap.get()`), then this method is called with the property name as its only argument, and the resulting value used as the bound value.
 *
 * The property name may be appended with a `|` (pipe) character and a *filter* name: see `Binding.addFilter` for available filters. Multiple filters may be chained together if their names are separated with more pipe characters.
 *
 * For convenience, `!property` is automatically rewritten as `property|!` to negate property values, and `!!property` to convert any value to a boolean value.
 *
 * A default value may also be specified. This value is used when the bound value itself is undefined.
 */
export function bind(propertyName?: string, defaultValue?: any) {
  return new Binding(propertyName, defaultValue);
}

/**
 * Returns a new binding, which can be used as a component preset (see `Component.with`) to update components dynamically with a string that includes property values from the bound parent component, such as the `Activity` for a view, the `Application` for an activity, or the `ViewComponent` for nested views.
 *
 * A format string should be passed as a first argument. The text is bound as-is, with the following types of tags replaced:
 *
 * - `${binding.foo|filter}`: inserts a bound value, as if the tag content was used as a parameter to `bind`. This may include one or more filters (see Binding.addFilter).
 * - `${%1}`: inserts a bound value, using a `Binding` instance that is taken from the 'rest' parameters, starting with 1 for the first argument after the format text.
 * - `#{one/two}`: inserts one of the given options, based on the value of the previous (or first) binding as an absolute number _or_ length of an array or managed list. The order of given options is 1/other, 0/1/other, 0/1/2/other, etc., unless handled differently by the current language service. Within the options, `#_` is replaced with the value of the relevant binding (clipped to an integer value).
 * - `#{2:one/two}`: as above, but refers to the binding at given index (base 1) instead of the previous binding.
 * - `***{...}***`: removed altogether, this is meant for unique string identifiers or comments to translators.
 *
 * @note To use plurals or number forms based on values that should not be included in the output themselves, use the `_` (blank) filter, e.g. `"There ${n|_}#{are no/is one/are #_} item#{/s}"`.
 */
export function bindf(text: string, ...rest: Binding[]) {
  return new StringFormatBinding(text, ...rest);
}

// formatting helper functions:
function _formatNotUndefined<T extends U, Z, U>(v: T, f: (v: T) => Z, u: U = v) {
  return v != undefined ? f(v) : u;
}
function _blankFormatter(d: any) {
  if (d != undefined && typeof d.valueOf === "function") {
    d = d.valueOf();
  }
  return {
    toString() {
      return "";
    },
    valueOf() {
      return d;
    },
  };
}
function _stringFormatter(d: any): string {
  if (typeof d === "object") {
    if (d.toString === Object.prototype.toString) {
      logUnhandledException(err(ERROR.Binding_ObjectType));
      return "???";
    }
    if (d.toString === Array.prototype.toString && d.map === Array.prototype.map) {
      return (d as any[]).map(_stringFormatter).join(", ");
    }
  }
  return _formatNotUndefined(d, String, "");
}
function _ucFormatter(d: any) {
  let result = _stringFormatter(d);
  return result && result.toLocaleUpperCase();
}
function _lcFormatter(d: any) {
  let result = _stringFormatter(d);
  return result && result.toLocaleLowerCase();
}
function _floatFormatter(d: any) {
  return _formatNotUndefined(d, parseFloat);
}
function _intFormatter(d: any) {
  let result = Math.round(_formatNotUndefined(d, parseFloat, 0 as any));
  return result > 0 ? result : result < 0 ? result : 0;
}
function _decimalFormatter(n: any, decimals: number | string) {
  if (n === undefined || isNaN(n)) return "";
  decimals = +decimals;
  return (+(parseFloat(n).toFixed(decimals + 1) + "1")).toFixed(decimals);
}
function _uniqueFormatter(d: any) {
  if (d instanceof ManagedList) d = d.toArray();
  if (!Array.isArray(d)) return d;
  let values: any[] = [];
  let strings: any = Object.create(null);
  return d.filter(v => {
    if (v == undefined) return false;
    if (typeof v === "string") {
      if (strings[v]) return false;
      return (strings[v] = true);
    }
    if (values.indexOf(v) >= 0) return false;
    values.push(v);
    return true;
  });
}
function _pluckFormatter(d: any, p: string) {
  if (!Array.isArray(d) && !(d instanceof ManagedList)) return d;
  return (d as any[]).map(v => v && v[p]);
}
