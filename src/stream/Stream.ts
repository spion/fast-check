function* flatMapHelper<T, U>(g: IterableIterator<T>, f: (t: T) => IterableIterator<U>): IterableIterator<U> {
  for (const v of g) {
    yield* f(v);
  }
}

function* joinHelper<T>(first: IterableIterator<T>, other: IterableIterator<T>): IterableIterator<T> {
  yield* first;
  yield* other;
}

function* mapHelper<T, U>(g: IterableIterator<T>, f: (t: T) => U): IterableIterator<U> {
  for (const v of g) {
    yield f(v);
  }
}

function* nilHelper<T>(): IterableIterator<T> {
  // nil has no value
}

export default class Stream<T> implements IterableIterator<T> {
  /**
   * Create an empty stream of T
   */
  static nil<T>() {
    return new Stream<T>(nilHelper<T>());
  }

  // /*DEBUG*/ // no double iteration
  // /*DEBUG*/ private isLive: boolean;

  /**
   * Create a Stream based on `g`
   * @param g Underlying data of the Stream
   */
  constructor(private readonly g: IterableIterator<T>) {
    // /*DEBUG*/ this.isLive = true;
  }

  // /*DEBUG*/ private closeCurrentStream() {
  // /*DEBUG*/   if (! this.isLive) throw new Error('Stream has already been closed');
  // /*DEBUG*/   this.isLive = false;
  // /*DEBUG*/ }

  next(): IteratorResult<T> {
    return this.g.next();
  }
  [Symbol.iterator](): IterableIterator<T> {
    // /*DEBUG*/ this.closeCurrentStream();
    return this.g;
  }

  /**
   * Map all elements of the Stream using `f`
   *
   * WARNING: It closes the current stream
   *
   * @param f Mapper function
   */
  map<U>(f: (v: T) => U): Stream<U> {
    return new Stream(mapHelper(this.g, f));
  }
  /**
   * Flat map all elements of the Stream using `f`
   *
   * WARNING: It closes the current stream
   *
   * @param f Mapper function
   */
  flatMap<U>(f: (v: T) => IterableIterator<U>): Stream<U> {
    // /*DEBUG*/ this.closeCurrentStream();

    return new Stream(flatMapHelper(this.g, f));
  }

  /**
   * Drop elements from the Stream while `f(element) === true`
   *
   * WARNING: It closes the current stream
   *
   * @param f Drop condition
   */
  dropWhile(f: (v: T) => boolean): Stream<T> {
    let foundEligible: boolean = false;
    function* helper(v: T): IterableIterator<T> {
      if (foundEligible || !f(v)) {
        foundEligible = true;
        yield v;
      }
    }
    return this.flatMap(helper);
  }
  /**
   * Drop `n` first elements of the Stream
   *
   * WARNING: It closes the current stream
   *
   * @param n Number of elements to drop
   */
  drop(n: number): Stream<T> {
    let idx = 0;
    function helper(v: T): boolean {
      return idx++ < n;
    }
    return this.dropWhile(helper);
  }
  /**
   * Take elements from the Stream while `f(element) === true`
   *
   * WARNING: It closes the current stream
   *
   * @param f Take condition
   */
  takeWhile(f: (v: T) => boolean): Stream<T> {
    // /*DEBUG*/ this.closeCurrentStream();
    function* helper(g: IterableIterator<T>): IterableIterator<T> {
      let cur = g.next();
      while (!cur.done && f(cur.value)) {
        yield cur.value;
        cur = g.next();
      }
    }
    return new Stream<T>(helper(this.g));
  }
  /**
   * Take `n` first elements of the Stream
   *
   * WARNING: It closes the current stream
   *
   * @param n Number of elements to take
   */
  take(n: number): Stream<T> {
    let idx = 0;
    function helper(v: T): boolean {
      return idx++ < n;
    }
    return this.takeWhile(helper);
  }

  /**
   * Filter elements of the Stream
   *
   * WARNING: It closes the current stream
   *
   * @param f Elements to keep
   */
  filter(f: (v: T) => boolean): Stream<T> {
    function* helper(v: T) {
      if (f(v)) {
        yield v;
      }
    }
    return this.flatMap(helper);
  }

  /**
   * Check whether all elements of the Stream are successful for `f`
   *
   * WARNING: It closes the current stream
   *
   * @param f Condition to check
   */
  every(f: (v: T) => boolean): boolean {
    // /*DEBUG*/ this.closeCurrentStream();
    for (const v of this.g) {
      if (!f(v)) {
        return false;
      }
    }
    return true;
  }
  /**
   * Check whether one of the elements of the Stream is successful for `f`
   *
   * WARNING: It closes the current stream
   *
   * @param f Condition to check
   */
  has(f: (v: T) => boolean): [boolean, T | null] {
    // /*DEBUG*/ this.closeCurrentStream();
    for (const v of this.g) {
      if (f(v)) {
        return [true, v];
      }
    }
    return [false, null];
  }

  /**
   * Join `others` Stream to the current Stream
   *
   * WARNING: It closes the current stream and the other ones (as soon as it iterates over them)
   *
   * @param others Streams to join to the current Stream
   */
  join(other: IterableIterator<T>): Stream<T> {
    return new Stream<T>(joinHelper(this.g, other));
  }

  /**
   * Take the `nth` element of the Stream of the last (if it does not exist)
   *
   * WARNING: It closes the current stream
   *
   * @param nth Position of the element to extract
   */
  getNthOrLast(nth: number): T | null {
    // /*DEBUG*/ this.closeCurrentStream();
    let remaining = nth;
    let last: T | null = null;
    for (const v of this.g) {
      if (remaining-- === 0) return v;
      last = v;
    }
    return last;
  }
}

/**
 * Create a Stream based on `g`
 * @param g Underlying data of the Stream
 */
function stream<T>(g: IterableIterator<T>): Stream<T> {
  return new Stream<T>(g);
}

export { stream, Stream };
