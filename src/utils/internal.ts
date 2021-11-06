
export function asAsync<TFunc extends Function = Function>(func: Function): TFunc {
    if (func.constructor.name === 'AsyncFunction') {
        return func as TFunc;
    }

    return (async function (...args: any[]) {
        return func(...args);
    }) as any;
}
