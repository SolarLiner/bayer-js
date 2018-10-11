import { Server, IncomingMessage, ServerResponse } from "http";
import { Observable } from "rxjs";

type RequestCallback = (req: IncomingMessage, res: ServerResponse) => void;

function observableServer(port: number) {
  return new Observable(sub => {
    const server = new Server(sub.next);
    server.on("close", sub.complete);
    server.listen(port);
  });
}

observableServer(3000).subscribe(console.log, console.error, () =>
  console.log("Done")
);
