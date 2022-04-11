// This file is part of the @egomobile/jobs distribution.
// Copyright (c) Next.e.GO Mobile SE, Aachen, Germany (https://e-go-mobile.com/)
//
// @egomobile/jobs is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as
// published by the Free Software Foundation, version 3.
//
// @egomobile/jobs is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.

import type { CheckIfShouldTickPredicate, DebugAction } from '../types';
import { Nilable } from '../types/internal';

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

export function isNil(val: unknown): val is (null | undefined) {
    return typeof val === 'undefined' ||
        val === null;
}

export function toCheckIfShouldTickPredicateSafe(predicate: Nilable<CheckIfShouldTickPredicate>): CheckIfShouldTickPredicate {
    if (predicate) {
        return predicate;
    } else {
        return () => true;
    }
}
