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

/**
 * A function, which checks if a job should be executed.
 *
 * @param {IJobExecutionContext} context The context.
 *
 * @returns {any} A result which indicates if job should be executed or not.
 */
export type CheckIfShouldTickPredicate = (context: IJobExecutionContext) => any;

/**
 * A debug action.
 *
 * @param {any} message The message.
 * @param {DebugIcon} icon The icon.
 * @param {Nilable<string>} [source] A string, which describes the source.
 */
export type DebugAction = (message: any, icon: DebugIcon, source?: Nilable<string>) => any;

/**
 * A possible value for a known debug icon.
 *
 * 🐞: debug
 * ✅: success
 * ℹ️: info
 * ❌: error
 * ⚠️: warning
 */
export type DebugIcon = '🐞' | '✅' | 'ℹ️' | '❌' | '⚠️';

/**
 * An object that can be disposed.
 */
export interface IDisposable {
    /**
     * Frees all resources of that object.
     */
    dispose(): any;
}

/**
 * A job instance.
 */
export interface IJob extends IDisposable {
    /**
     * The base object that represents the job.
     */
    readonly baseJob: any;
}

/**
 * Configuration data for a job.
 */
export interface IJobConfig {
    /**
     * Checks if 'onTick()' should be executed or not.
     */
    checkIfShouldTick?: Nilable<CheckIfShouldTickPredicate>;
    /**
     * The action, that is executed on a 'tick'.
     */
    onTick: JobAction;
    /**
     * Run on init / start or not.
     */
    runOnInit?: Nilable<boolean>;
    /**
     * The cron string, that describes the interval, the job schould be executed.
     *
     * @see https://github.com/node-schedule/node-schedule#cron-style-scheduling
     */
    time: string;
    /**
     * The name of the custom timezone.
     */
    timezone?: Nilable<string>;
}

/**
 * A job execution context.
 */
export interface IJobExecutionContext {
    /**
     * The full path of the file, that is executed.
     */
    readonly file: string;
    /**
     * The ID.
     */
    readonly id: string;
    /**
     * The time, the job has been executed.
     */
    readonly time: Date;
}

/**
 * A job action.
 *
 * @param {IJobExecutionContext} context The execution context.
 */
export type JobAction = (context: IJobExecutionContext) => any;

/**
 * A type, that can also be (null) or (undefined).
 */
export type Nilable<T extends any = any> = Nullable<T> | Optional<T>;

/**
 * A type, that can also be (null).
 */
export type Nullable<T extends any = any> = T | null;

/**
 * A type, that can also be (undefined).
 */
export type Optional<T extends any = any> = T | undefined;
