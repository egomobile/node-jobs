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

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import scheduler from 'node-schedule';
import { CheckIfShouldTickPredicate, DebugAction, IJob, IJobConfig, IJobExecutionContext, JobAction, Nilable } from '../types';
import { asAsync, getDebugActionSafe, toCheckIfShouldTickPredicateSafe } from './internal';

interface ICreateJobObjectOptions {
    config: IJobConfig;
    debug: DebugAction;
    file: string;
    timezone: Nilable<string>;
}

interface IJobConfigOptions {
    debug: DebugAction;
    filter: LoadAndStartJobsFileFilter;
    fullPath: string;
    stats: fs.Stats;
}

/**
 * Options for 'loadAndStartJobs()' and 'loadAndStartJobsSync()' functiona.
 */
export interface ILoadAndStartJobsOptions {
    /**
     * A callback, which can be used to receive debug messages.
     */
    debug?: Nilable<DebugAction>;
    /**
     * The directory, where the script files are stored. Default: Current working directory.
     */
    dir?: Nilable<string>;
    /**
     * The custom file filter to use.
     *
     * If a string: It is used to check the extension of a file path.
     * If a function: Takes file, if truely.
     *
     * By default, the file extension is checked.
     */
    filter?: Nilable<string | LoadAndStartJobsFileFilter>;
    /**
     * The name of the custom timezone. Default: 'UTC'
     */
    timezone?: Nilable<string>;
}

/**
 * A file filter for 'ILoadAndStartJobsOptions' options.
 *
 * @param {string} name The base name of the file.
 * @param {string} fullPath The full path of the file to check.
 *
 * @returns {boolean} Import file or not.
 */
export type LoadAndStartJobsFileFilter = (name: string, fullPath: string) => boolean;

/**
 * Loads an starts the jobs from script files of a directory.
 *
 * @param {Nilable<ILoadAndStartJobsOptions>} [options] The custom options.
 *
 * @returns {Promise<IJob[]>} The promise with the loaded and started jobs.
 */
export async function loadAndStartJobs(options?: Nilable<ILoadAndStartJobsOptions>): Promise<IJob[]> {
    const { debug, dir, filter, timezone } = getLoadAndStartJobsOptions(options);

    const jobs: IJob[] = [];

    debug(`Searching for job modules in ${dir} ...`, '🐞', 'loadAndStartJobs()');
    for (const item of await fs.promises.readdir(dir)) {
        const fullPath = path.join(dir, item);
        debug(`Found module in ${fullPath}`, '🐞', 'loadAndStartJobs()');

        const stats = await fs.promises.stat(fullPath);

        const config = loadJobConfig({ debug, filter, fullPath, stats });
        if (config) {
            debug(`Found following config in ${fullPath}: ${dumpJobConfig(config)}`, '🐞', 'loadAndStartJobs()');

            jobs.push(
                createJobObject({ config, debug, file: fullPath, timezone })
            );
        } else {
            debug(`Found no config in ${fullPath}`, '⚠️', 'loadAndStartJobs()');
        }
    }

    debug(`Found ${String(jobs.length)} job module(s)`, '🐞', 'loadAndStartJobs()');
    return jobs;
}

/**
 * Loads an starts the jobs from script files of a directory synchronious.
 *
 * @param {Nilable<ILoadAndStartJobsOptions>} [options] The custom options.
 *
 * @returns {IJob[]} The loaded and started jobs.
 */
export function loadAndStartJobsSync(options?: Nilable<ILoadAndStartJobsOptions>): IJob[] {
    const { debug, dir, filter, timezone } = getLoadAndStartJobsOptions(options);

    const jobs: IJob[] = [];

    debug(`Searching for job modules in ${dir} ...`, '🐞', 'loadAndStartJobsSync()');
    for (const item of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, item);
        debug(`Found module in ${fullPath}`, '🐞', 'loadAndStartJobsSync()');

        const stats = fs.statSync(fullPath);

        const config = loadJobConfig({ debug, filter, fullPath, stats });
        if (config) {
            debug(`Found following config in ${fullPath}: ${dumpJobConfig(config)}`, '🐞', 'loadAndStartJobsSync()');

            jobs.push(
                createJobObject({ config, debug, file: fullPath, timezone })
            );
        } else {
            debug(`Found no config in ${fullPath}`, '⚠️', 'loadAndStartJobsSync()');
        }
    }

    debug(`Found ${String(jobs.length)} job module(s)`, '🐞', 'loadAndStartJobsSync()');
    return jobs;
}

function createJobObject({ config, debug, file, timezone }: ICreateJobObjectOptions): IJob {
    const checkIfShouldTick = asAsync<CheckIfShouldTickPredicate>(
        toCheckIfShouldTickPredicateSafe(config.checkIfShouldTick)
    );
    const onTick = asAsync<JobAction>(config.onTick);

    let id: Nilable<string> = null;

    const callback: scheduler.JobCallback = (time) => {
        if (id !== null) {
            return;
        }

        id = undefined;  // keep sure we have a non-null value now

        (async () => {
            id = `${time.valueOf()}-${crypto.randomBytes(16).toString('hex')}`;

            const context: IJobExecutionContext = {
                file,
                id,
                time
            };

            if (await checkIfShouldTick(context)) {
                await onTick(context);
            }
        })().catch((error) => {
            console.error('[ERROR]', '@egomobile/jobs', error);
        }).finally(() => {
            id = null;  // make job now available for next execution
        });
    };

    if (config.runOnInit) {
        debug(`Run job in ${file} on init ...`, '🐞', 'createJobObject()');

        callback(new Date());

        debug(`Job in ${file} executed on init`, '🐞', 'createJobObject()');
    }

    let baseJob: Nilable<scheduler.Job> = scheduler.scheduleJob({
        rule: config.time,
        tz: (config.timezone || timezone) || 'UTC'
    }, callback);

    const newJob: IJob = {
        baseJob: undefined!,
        dispose: () => {
            baseJob?.cancel();

            baseJob = null;
        }
    };

    // newJob.baseJob
    Object.defineProperty(newJob, 'baseJob', {
        get: () => baseJob,
        configurable: true,
        enumerable: true
    });

    return newJob;
}

function dumpJobConfig(config: IJobConfig) {
    return `runOnInit: ${config.runOnInit}, time: ${config.time}, timezone: ${config.timezone}`;
}

function getLoadAndStartJobsOptions(options: Nilable<ILoadAndStartJobsOptions>) {
    let dir = options?.dir;
    if (!dir) {
        dir = path.join(process.cwd());
    }

    if (typeof dir !== 'string') {
        throw new TypeError('dir must be a string');
    }

    let filter = options?.filter;
    if (filter) {
        if (typeof filter === 'string') {
            const fileExt = filter;

            filter = (f) => f.endsWith(fileExt);
        }
    } else {
        filter = (f) => f.endsWith('.js');
    }

    if (typeof filter !== 'function') {
        throw new TypeError('filter must be a string or function');
    }

    let timezone = options?.timezone;
    if (!timezone) {
        timezone = 'UTC';
    }

    if (typeof timezone !== 'string') {
        throw new TypeError('timezone must be a string');
    }

    const debug = getDebugActionSafe(options?.debug);

    return {
        debug,
        dir,
        filter,
        timezone
    };
}

function loadJobConfig({ debug, filter, fullPath, stats }: IJobConfigOptions): Nilable<IJobConfig> | void {
    if (!stats.isFile()) {
        debug(`${fullPath} is no file`, '🐞', 'loadJobConfig()');
        return; // no file
    }

    const name = path.basename(fullPath);

    if (!filter(name, fullPath)) {
        debug(`Filter does not match criteria for ${fullPath} (${name})`, '🐞', 'loadJobConfig()');
        return;  // filter criteria does not match
    }

    // load module
    const moduleOrObject = require(fullPath);

    // first try 'default' export
    let config: Nilable<IJobConfig> = moduleOrObject.default;
    if (config) {
        debug(`Found config in 'default' of ${fullPath}`, '🐞', 'loadJobConfig()');
    } else {
        debug(`Try CommonJS to find config in ${fullPath} ...`, '🐞', 'loadJobConfig()');

        config = moduleOrObject;  // now try CommonJS
    }

    return typeof config === 'object' ?
        config :
        null;
}
