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
import type { IJob, IJobConfig, JobAction, Nilable } from '../types';
import { asAsync } from './internal';

/**
 * Options for 'loadAndStartJobs()' function.
 */
export interface ILoadAndStartJobsOptions {
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
 * A file filter for 'ILoadNatsListenersOptions' options.
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
    const { dir, filter, timezone } = getLoadAndStartJobsOptions(options);

    const jobs: IJob[] = [];

    for (const item of await fs.promises.readdir(dir)) {
        const fullPath = path.join(dir, item);

        const stats = await fs.promises.stat(fullPath);

        const config = loadJobConfig(fullPath, stats, filter);
        if (config) {
            jobs.push(
                createJobObject(config, fullPath, timezone)
            );
        }
    }

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
    const { dir, filter, timezone } = getLoadAndStartJobsOptions(options);

    const jobs: IJob[] = [];

    for (const item of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, item);

        const stats = fs.statSync(fullPath);

        const config = loadJobConfig(fullPath, stats, filter);
        if (config) {
            jobs.push(
                createJobObject(config, fullPath, timezone)
            );
        }
    }

    return jobs;
}


function createJobObject(config: IJobConfig, file: string, timezone: Nilable<string>): IJob {
    const onTick = asAsync<JobAction>(config.onTick);

    let id: Nilable<string> = null;

    const callback: scheduler.JobCallback = (time) => {
        if (id !== null) {
            return;
        }

        id = undefined;  // keep sure we have a non-null value now

        (async () => {
            id = `${time.valueOf()}-${crypto.randomBytes(16).toString('hex')}`;

            await onTick({
                file,
                id,
                time
            });
        })().catch((error) => {
            console.error('[ERROR]', '@egomobile/jobs', error);
        }).finally(() => {
            id = null;  // make job now available for next execution
        });
    };

    if (config.runOnInit) {
        callback(new Date());
    }

    let baseJob: Nilable<scheduler.Job> = scheduler.scheduleJob({
        rule: config.time,
        tz: (config.timezone || timezone) || 'UTC'
    }, callback);

    const newJob: IJob = {
        baseJob: undefined!,
        dispose: () => {
            baseJob.cancel();

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

    return {
        dir,
        filter,
        timezone
    };
}

function loadJobConfig(fullPath: string, stats: fs.Stats, filter: LoadAndStartJobsFileFilter): Nilable<IJobConfig> | void {
    if (!stats.isFile()) {
        return; // no file
    }

    const name = path.basename(fullPath);

    if (!filter(name, fullPath)) {
        return;  // filter criteria does not match
    }

    // load module
    const moduleOrObject = require(fullPath);

    // first try 'default' export
    let config: Nilable<IJobConfig> = moduleOrObject.default;
    if (!config) {
        config = moduleOrObject;  // now try CommonJS
    }

    return typeof config === 'object' ?
        config :
        null;
}
