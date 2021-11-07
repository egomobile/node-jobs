[![npm](https://img.shields.io/npm/v/@egomobile/jobs.svg)](https://www.npmjs.com/package/@egomobile/jobs)
[![last build](https://img.shields.io/github/workflow/status/egomobile/node-jobs/Publish)](https://github.com/egomobile/node-jobs/actions?query=workflow%3APublish)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/egomobile/node-jobs/pulls)

# @egomobile/jobs

> Easy to use job scheduler helpers, which are compatible with
> [Node.js 12](https://nodejs.org/en/blog/release/v12.0.0/) or later.

## Install

Execute the following command from your project folder, where your
`package.json` file is stored:

```bash
npm install --save @egomobile/jobs
```

## Usage

### Quick example

First make a sub directory, lets say `/jobs`, where your job script files will
be stored.

The create a file, called `myJob.ts`, and start with the following skeleton:

```typescript
import { IJobConfig, IJobExecutionContext, JobAction } from "@egomobile/jobs";

// the action that is executed on every tick
const onTick: JobAction = async ({ file, time }: IJobExecutionContext) => {
  console.log("Job in file", file, "is executed on", time);
};

const config: IJobConfig = {
  onTick,

  // run the job directly, after it has been initialized
  runOnInit: true,
  // s. https://github.com/node-schedule/node-schedule#cron-style-scheduling
  time: "42 * * * * *",
};

export default config;
```

In the entry point of your application, lets say `/index.ts`, use one of the
functions `loadAndStartJobs()` or `loadAndStartJobsSync()` to load, init and
start all jobs in the directory:

```typescript
import path from "path";
import { loadAndStartJobs } from "@egomobile/jobs";

async function main() {
  const jobs = await loadAndStartJobs({
    // all script files are stored in
    // /jobs sub folder
    dir: path.join(__dirname, "jobs"),

    // only use TypeScript files
    filter: ".ts",

    // custom timezone
    timezone: "Europe/Berlin",
  });

  console.log(
    String(jobs.length),
    "jobs have been loaded, initialized and started",
  );
}

main().catch(console.error);
```

## Credits

The module makes use of:

- [node-schedule](https://github.com/node-schedule/node-schedule)

## Documentation

The API documentation can be found
[here](https://egomobile.github.io/node-jobs/).
