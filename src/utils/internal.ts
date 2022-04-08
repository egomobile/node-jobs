import type { CheckIfShouldTickPredicate, DebugAction, Nilable } from '../types';

export function asAsync<TFunc extends Function = Function>(func: Function): TFunc {
    if (func.constructor.name === 'AsyncFunction') {
        return func as TFunc;
    }

    return (async function (...args: any[]) {
        return func(...args);
    }) as any;
}

export function getDebugActionSafe(debug: Nilable<DebugAction>): DebugAction {
    debug = debug || (() => { });
    if (typeof debug !== 'function') {
        throw new TypeError('debug must be a function');
    }

    return debug;
}

export function toCheckIfShouldTickPredicateSafe(predicate: Nilable<CheckIfShouldTickPredicate>): CheckIfShouldTickPredicate {
    if (predicate) {
        return predicate;
    } else {
        return () => true;
    }
}
