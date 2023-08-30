import type { Unsubscriber, Writable } from "svelte/store";

/** `.` separated string or string array 
 * pointing to a value in an object */
export type NavigatePath = string | string[];

function getPath(path: NavigatePath): string[] {
    if (typeof path === "string") {
        return path.split(".");
    }
    return path;
}

const exports = {
    getPath,
    /** 
     * Gets the value at the given path in the object.
     * @param object The object to navigate.
     * @param path The path to navigate.
     * @returns The value at the given path, or undefined if the path does not exist.
     * @example
     * const obj = {a: { b: {c: 5}}};
     * 
     * navigate.get(obj, "a.b.c"); // 5
     * navigate.get(obj, "a.b"); // { c: 5 }
     * navigate.get(obj, "a.b.d"); // undefined
     */
    get: function (object: Object, path: NavigatePath): any {
        const keys = getPath(path);

        let current = object;
        for (const key of keys) {
            if (current === undefined) {
                return undefined;
            }
            current = current[key];
        }
        return current;
    },
    /**
     * Sets the value at the given path in the object.
     * @param object The object to navigate.
     * @param path The path to navigate.
     * @param value The value to set.
     * @example
     * const obj = {a: {b: {c: 5}}};
     * 
     * navigate.set(obj, "a.b.c", 10);
     * console.log(obj.a.b.c); // 10
    */
    set: function (object: Object, path: NavigatePath, value: any) {
        const keys = getPath(path);

        let current = object;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (current[key] === undefined) {
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
    },
    /**
     * Updates the value at the given path in the object.
     * @param object The object to navigate.
     * @param path The path to navigate.
     * @param updater The updater function.
     * @example
     * const obj = {a: {b: {c: 5}}};
     * 
     * navigate.update(obj, "a.b.c", (value) => value + 5);
     * console.log(obj.a.b.c); // 10
     * 
    */
    update: function (object: Object, path: NavigatePath, updater: (value: any) => any) {
        const keys = getPath(path);

        let current = object;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (current[key] === undefined) {
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = updater(current[keys[keys.length - 1]]);
    },
    /**
     * Checks if the given path exists in the object.
     * @param object The object to navigate.
     * @param path The path to navigate.
     * @returns True if the path exists, false otherwise.
     * @example
     * const obj = {a: {b: {c: 5}}};
     * 
     * navigate.has(obj, "a.b.c"); // true
     * navigate.has(obj, "a.b"); // true
     * navigate.has(obj, "a.b.d"); // false
     * navigate.has(obj, "a.b.c.d"); // false
    */
    has: function (object: Object, path: NavigatePath) {
        const keys = getPath(path);

        let current = object;
        for (const key of keys) {
            if (current === undefined) {
                return false;
            }
            current = current[key];
        }
        return true;
    },
    /**
     * Sets the value at the given path in the store.
     * @param store The store to navigate.
     * @param path The path to navigate.
     * @param value The value to set.
     * @example
     * const store = writable({a: {b: {c: 5}}});
     * 
     * navigate.setStore(store, "a.b.c", 10);
     * console.log($store.a.b.c); // 10
    */
    setStore: function (store: Writable<any>, path: NavigatePath, value: any) {
        store.update(obj => {
            exports.set(obj, path, value);
            return obj;
        });
    },
    /**
     * Gets the value at the given path in the store, without subscribing to changes.
     * @param store The store to navigate.
     * @param path The path to navigate.
     * 
     * @example
     * const store = writable({a: {b: {c: 5}}});
     * 
     * navigate.getStore(store, "a.b.c"); // 5
     * navigate.getStore(store, "a.b"); // { c: 5 }
     * navigate.getStore(store, "a.b.d"); // undefined
     * navigate.getStore(store, "a.b.c.d"); // undefined
    */
    getStore: function (store: Writable<any>, path: NavigatePath) {
        let result: any;
        store.subscribe(obj => {
            result = exports.get(obj, path);
        })();
        return result;
    }
};

export default exports;