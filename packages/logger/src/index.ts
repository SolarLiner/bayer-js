import { EventEmitter } from "events";

export interface ILogEvent {
  level: number;
  message: string;
  timestamp: Date;
  loggerName: string;
}

export interface ILogErrorEvent extends ILogEvent {
  level: typeof Logger.ERROR | typeof Logger.FATAL,
  err: Error;
}

export default class Logger extends EventEmitter {
  public static readonly DEBUG = 0;
  public static readonly INFO = 10;
  public static readonly WARN = 20;
  public static readonly ERROR = 30;
  public static readonly FATAL = 40;

  public static getLogger(name: string, parent: Logger) {
    const logger = new Logger(parent);
    logger._name = name;
  }

  // tslint:disable-next-line:variable-name
  private _name: string;

  public get name() {
    let parent = ".";
    if (this.parent) {
      parent = this.parent.name + ".";
    }
    return parent + this._name;
  }

  constructor(private parent?: Logger) {
    super();
    this._name = "main";
    this.on("message", (e) => {
      const { level } = e;
      if (level >= Logger.DEBUG) this.emit("debug", e);
      if (level >= Logger.INFO) this.emit("info", e);
      if(level >= Logger.WARN) this.emit("warn", e)
      if (level >= Logger.ERROR) this.emit("error", e);
      if (level >= Logger.FATAL) this.emit("fatal", e);
    });
  }

  public log(level: number, message: string) {
    const event: ILogEvent = {
      level,
      message,
      loggerName: this.name,
      timestamp: new Date()
    }
    this.emit("message", event);
    if (this.parent) this.parent.emit("message", event);
  }

  public error(err: Error, fatal = false) {
    const event: ILogErrorEvent = {
      level: fatal ? Logger.FATAL : Logger.ERROR,
      message: `${err.name}: ${err.message}`,
      loggerName: this.name,
      timestamp: new Date(),
      err
    }
    if (fatal) this.emit("fatal", event);
    this.emit("error", event);
  }
}

const rootLogger = new Logger();

export function getRootLogger() {
  return rootLogger;
}

export * from "./handlers";
