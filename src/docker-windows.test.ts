import { exec } from "node:child_process";
import { jest } from "@jest/globals";

import type { InputOptions } from "@actions/core";
import type { Mock } from "jest-mock";

import type { Util } from "../types/aliases.js";
import type { execBashCommand } from "./util.js";

jest.unstable_mockModule("node:timers/promises", () => ({
  setTimeout: jest.fn((): Promise<void> => Promise.resolve()),
}));
jest.unstable_mockModule("node:util", () => ({ promisify: jest.fn() }));
jest.unstable_mockModule("@actions/cache", () => ({
  restoreCache: jest.fn(),
  saveCache: jest.fn(),
}));
jest.unstable_mockModule("@actions/core", () => ({
  getInput: jest.fn(),
  getState: jest.fn(),
  info: jest.fn(),
  saveState: jest.fn(),
  setOutput: jest.fn(),
}));

jest.unstable_mockModule(
  "./util.js",
  (): Util => ({ execBashCommand: jest.fn<typeof execBashCommand>() }),
);

const nodeUtil = jest.mocked(await import("node:util"));
const timers = jest.mocked(await import("node:timers/promises"));
const cache = jest.mocked(await import("@actions/cache"));
const core = jest.mocked(await import("@actions/core"));
const util = jest.mocked(await import("./util.js"));
const docker = await import("./docker.js");

describe("Docker Windows readiness", (): void => {
  const DOCKER_READY_COMMAND = "docker version --format '{{.Server.Version}}'";
  const LIST_COMMAND =
    "docker image list --format '" +
    '{{ if ne .Repository "<none>" }}{{ .Repository }}' +
    `{{ if ne .Tag "<none>" }}:{{ .Tag }}{{ end }}{{ else }}{{ .ID }}{{ end }}'`;
  const WINDOWS_SHELL = "C:\\Program Files\\Git\\bin\\bash.exe";

  let dockerReadyMock: Mock<(command: string) => Promise<unknown>>;

  beforeEach((): void => {
    jest.clearAllMocks();
    dockerReadyMock = jest.fn<(command: string) => Promise<unknown>>();
    nodeUtil.promisify.mockReturnValue(dockerReadyMock as never);
  });

  test("waits for Docker before listing images on Windows", async (): Promise<void> => {
    core.getInput.mockReturnValue("my-key");
    cache.restoreCache.mockResolvedValueOnce(undefined);
    dockerReadyMock.mockRejectedValueOnce(new Error("Docker is not ready yet."));
    dockerReadyMock.mockResolvedValueOnce({ stdout: "27.0.1", stderr: "" });
    util.execBashCommand.mockResolvedValueOnce("existing-image");

    await docker.loadDockerImages("win32");

    expect(core.getInput).lastCalledWith("key", {
      required: true,
    } satisfies InputOptions);
    expect(nodeUtil.promisify).lastCalledWith(exec);
    expect(dockerReadyMock).toHaveBeenNthCalledWith(1, DOCKER_READY_COMMAND, {
      shell: WINDOWS_SHELL,
    });
    expect(dockerReadyMock).toHaveBeenNthCalledWith(2, DOCKER_READY_COMMAND, {
      shell: WINDOWS_SHELL,
    });
    expect(timers.setTimeout).lastCalledWith(2_000);
    expect(core.info).toHaveBeenCalledWith(
      "Docker is not ready yet on Windows. Retrying in 2 seconds (1/30).",
    );
    expect(core.info).toHaveBeenCalledWith("Docker is ready on Windows.");
    expect(util.execBashCommand).lastCalledWith(LIST_COMMAND);
    expect(core.saveState).lastCalledWith(docker.DOCKER_IMAGES_LIST, "existing-image");
  });

  test("preserves current behavior on Linux", async (): Promise<void> => {
    core.getInput.mockReturnValue("my-key");
    cache.restoreCache.mockResolvedValueOnce(undefined);
    util.execBashCommand.mockResolvedValueOnce("existing-image");

    await docker.loadDockerImages("linux");

    expect(nodeUtil.promisify).not.toHaveBeenCalled();
    expect(timers.setTimeout).not.toHaveBeenCalled();
    expect(util.execBashCommand).lastCalledWith(LIST_COMMAND);
  });
});
