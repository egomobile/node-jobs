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

import path from 'path';
import { Worker } from 'worker_threads';
import type { DebugAction, JobAction, Nilable, Optional } from '../types';
import { getDebugActionSafe } from '../utils/internal';

/**
 * Options for 'withWorker()' function.
 */
export interface IWithWorkerOptions {
    /**
     * The data for the worker script.
     */
    data?: Nilable;
    /**
     * The optional debug action.
     */
    debug?: Nilable<DebugAction>;
    /**
     * Custom environment variables for the worker thread.
     */
    env?: Nilable<Record<string, Optional<string>>>;
    /**
     * The path of the worker script.
     */
    filename: string;
    /**
     * A custom name for the worker script.
     */
    name?: Nilable<string>;
    /**
     * Directly resolve the promise, even if job has not been finished, yet.
     */
    noWait?: Nilable<boolean>;
}

/**
 * Creates a job action, which runs a script, in a separate worker thread.
 *
 * @param {IWithWorkerOptions} options The options.
 *
 * @returns {JobAction} The new job action.
 *
 * @see https://nodejs.org/dist./v12.12.0/docs/api/worker_threads.html
 */
export function withWorker(options: IWithWorkerOptions): JobAction {
    const { data, env } = options;

    let { filename } = options;
    if (typeof filename !== 'string') {
        throw new TypeError('options.filename must be a string');
    }
    if (!path.isAbsolute(filename)) {
        filename = path.join(process.cwd(), filename);
    }

    const debug = getDebugActionSafe(options.debug);
    const name = String(options.name || filename);
    const shouldNotWait = !!options.noWait;

    return () => new Promise<void>((resolve, reject) => {
        const worker = new Worker(filename, {
            workerData: data,
            env: env || process.env
        });

        worker.once('error', (ex) => {
            debug(`[ERROR] Worker ${name} failed: ${ex}`);

            reject(ex);
        });

        worker.once('online', () => {
            debug(`[ONLINE] Worker ${name} is running`);
        });

        worker.once('exit', (exitCode) => {
            debug(`[EXIT] Worker ${name} exit with code ${exitCode}`);

            if (exitCode === 0) {
                if (!shouldNotWait) {
                    resolve();
                }
            } else {
                if (!shouldNotWait) {
                    reject(new Error(`Worker ${name} exit with code ${exitCode}`));
                }
            }
        });

        if (shouldNotWait) {
            resolve();
        }
    });
}
