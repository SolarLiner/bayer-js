#!/usr/bin/env node
import { join } from "path";
import { cwd } from "process";

import chalk from "chalk";
import minimist from "minimist";

import Bayer from "@bayerjs/core";
import staticFiles from "@bayerjs/static";

const DEFAULT_PORT = 8080;

main(process.argv);

function main(argv: string[]) {
  const args = minimist(argv.slice(2));
  const port = normalizePort(args.port || args.p);
  const spaMode = !!args.spa || !!args.s;
  const spaFile = args["spa-file"];
  const indexFile = args["index-file"];
  const useIndexFile = args.index;

  const [path] = args._;
  let localPath: string;
  if (path) {
    if (path.startsWith("/")) localPath = path;
    else localPath = join(cwd(), path);
  } else {
    localPath = cwd();
  }

  const app = new Bayer();
  const staticOptions = { localPath, spaMode, spaFile, useIndexFile, indexFile };
  console.dir(staticOptions);
  app.use(staticFiles(staticOptions));

  app.listen(port).then(() => {
    process.stdout.write(chalk.gray("Server ready! "));
    process.stdout.write(chalk.greenBright(`Serving ${chalk.white(localPath)} on `));
    process.stdout.write(chalk.magenta(`http://localhost:${port}`));
    process.stdout.write("\n");
  });
}

function normalizePort(strPort: any) {
  if (!strPort) return DEFAULT_PORT;
  try {
    const port = Number.parseInt(strPort, 10);
    if (port < 0) return DEFAULT_PORT;
    return port;
  } catch {
    return DEFAULT_PORT;
  }
}
