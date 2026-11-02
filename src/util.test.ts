import { exec } from "node:child_process";
import { test } from "@fast-check/jest";
import { jest } from "@jest/globals";
import { string } from "fast-check";

import { consoleOutput, platform } from "./arbitraries/util.js";
import { utilFactory } from "./mocks/util.js";

import type { ConsoleOutput } from "./util.js";

jest.unstable_mockModule("node:util", utilFactory);
jest.unstable_mockModule("@actions/core", () => ({
  getInput: jest.fn(),
  getState: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  setFailed: jest.fn(),
  saveState: jest.fn(),
  setOutput: jest.fn(),
}));

const nodeUtil = jest.mocked(await import("node:util"));
const core = jest.mocked(await import("@actions/core"));
const util = await import("./util.js");

describe("Util", (): void => {
  describe("execBashCommand", (): void => {
    const mockedExec = async (
      command: string,
      error: Error | null,
      platform: NodeJS.Platform,
      output: ConsoleOutput,
    ): Promise<string> => {
      const execMock = jest.fn(
        (): Promise<ConsoleOutput> =>
          error ? Promise.reject(error) : Promise.resolve(output),
      );

      nodeUtil.promisify.mockReturnValueOnce(execMock);

      const stdout = await util.execBashCommand(command, platform);

      expect(core.info).toHaveBeenNthCalledWith<[string]>(1, command);
      expect(nodeUtil.promisify).toHaveBeenLastCalledWith(exec);
      const shell =
        platform === "win32"
          ? "C:\\Program Files\\Git\\bin\\bash.exe"
          : "/usr/bin/bash";
      expect(execMock).toHaveBeenLastCalledWith(command, { shell });
      return stdout;
    };

    test.prop([string({ unit: "binary" }), platform(), consoleOutput()], {
      examples: [
        ["sample Linux command", "linux", { stdout: "", stderr: "" }],
        ["sample Windows command", "win32", { stdout: "", stderr: "" }],
      ],
    })(
      "ferries command output to GitHub Actions on success",
      async (
        command: string,
        platform: NodeJS.Platform,
        output: ConsoleOutput,
      ): Promise<void> => {
        jest.clearAllMocks();
        const stdout = await mockedExec(command, null, platform, output);

        expect(stdout).toBe(output.stdout);
        expect(core.info).toHaveBeenLastCalledWith(output.stdout);
        expect(core.error).toHaveBeenLastCalledWith(output.stderr);
      },
    );

    test.prop(
      [
        string({ unit: "binary" }),
        string({ unit: "binary" }),
        platform(),
        consoleOutput(),
      ],
      {
        examples: [
          ["sample Linux command", "", "linux", { stdout: "", stderr: "" }],
          ["sample Windows command", "", "win32", { stdout: "", stderr: "" }],
        ],
      },
    )(
      "ferries failure to GitHub Actions",
      async (
        command: string,
        errorMessage: string,
        platform: NodeJS.Platform,
        output: ConsoleOutput,
      ): Promise<void> => {
        jest.clearAllMocks();
        const error = new Error(errorMessage);
        const stdout = await mockedExec(command, error, platform, output);

        expect(stdout).toBe("");
        expect(core.info).toHaveBeenCalledTimes(1);
        expect(core.error).not.toHaveBeenCalled();
        expect(core.setFailed).toHaveBeenLastCalledWith(error);
      },
    );
  });
});
