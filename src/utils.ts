import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";

export function isCommandAvailable(command: string): boolean {
  if (os.platform().indexOf("win") === 0) {
    try {
      cp.execSync(`where ${command}`);
      return true;
    } catch (err) {
      return false;
    }
  } else {
    try {
      cp.execSync(`which ${command}`);
      return true;
    } catch (err) {
      return false;
    }
  }
}

export function isExecutableFileAvailable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK | fs.constants.X_OK);
    return true;
  } catch (err) {
    return false;
  }
}
