import chalk from "chalk";
import minimist from "minimist";

import Bayer from "@bayerjs/core";
import { staticFiles } from "@bayerjs/middleware";
import { join } from "path";
import { cwd } from "process";

const DEFAULT_PORT = 8080;

main(process.argv);

async function main(argv: string[]) {
  const args = minimist(argv.slice(2));
  // tslint:disable-next-line:prefer-const
  let port = normalizePort(args.port || args.p);

  const [path] = args._;
  let serveFolder: string;
  if (path) {
    if (path.startsWith("/")) serveFolder = path;
    else serveFolder = join(cwd(), path);
  } else {
    serveFolder = cwd();
  }

  const app = new Bayer();
  app.use(staticFiles(serveFolder));

  app.listen(port).then(() => {
    process.stdout.write(chalk.gray("Server ready! "));
    process.stdout.write(chalk.greenBright(`Serving ${chalk.white(serveFolder)} on `));
    process.stdout.write(chalk.magenta(`http://localhost:${port}`));
    process.stdout.write("\n");
  });
}

function normalizePort(port?: string) {
  if (!port) return DEFAULT_PORT;
  try {
    const normPort = Number.parseInt(port, 10);
    if (normPort < 0) return DEFAULT_PORT;
    return normPort;
  } catch {
    return DEFAULT_PORT;
  }
}
