import { exec } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { promisify } from "node:util";
import { restoreCache, saveCache } from "@actions/cache";
import { getInput, getState, info, saveState, setOutput } from "@actions/core";

import { execBashCommand } from "./util.js";

const CACHE_HIT = "cache-hit";
const DOCKER_IMAGES_LIST = "docker-images-list";
const DOCKER_IMAGES_PATH = "~/.docker-images.tar";
const DOCKER_READY_COMMAND = "docker version --format '{{.Server.Version}}'";
const LIST_COMMAND =
  "docker image list --format '" +
  '{{ if ne .Repository "<none>" }}{{ .Repository }}' +
  `{{ if ne .Tag "<none>" }}:{{ .Tag }}{{ end }}{{ else }}{{ .ID }}{{ end }}'`;
const WINDOWS_DOCKER_READY_ATTEMPTS = 30;
const WINDOWS_DOCKER_READY_DELAY_MS = 2_000;

const getShell = (platform: NodeJS.Platform): string =>
  platform === "win32"
    ? "C:\\Program Files\\Git\\bin\\bash.exe"
    : "/usr/bin/bash";

const waitForDocker = async (
  platform: NodeJS.Platform = process.platform,
): Promise<void> => {
  if (platform !== "win32") {
    return;
  }

  const execAsPromised = promisify(exec);
  for (
    let attempt = 1;
    attempt <= WINDOWS_DOCKER_READY_ATTEMPTS;
    attempt += 1
  ) {
    try {
      await execAsPromised(DOCKER_READY_COMMAND, { shell: getShell(platform) });
      if (attempt > 1) {
        info("Docker is ready on Windows.");
      }
      return;
    } catch {
      if (attempt < WINDOWS_DOCKER_READY_ATTEMPTS) {
        info(
          "Docker is not ready yet on Windows. Retrying in 2 seconds " +
            `(${attempt}/${WINDOWS_DOCKER_READY_ATTEMPTS}).`,
        );
        await setTimeout(WINDOWS_DOCKER_READY_DELAY_MS);
      }
    }
  }

  info("Docker did not become ready on Windows before timeout.");
};

const loadDockerImages = async (
  platform: NodeJS.Platform = process.platform,
): Promise<void> => {
  const requestedKey = getInput("key", { required: true });
  const restoredKey = await restoreCache([DOCKER_IMAGES_PATH], requestedKey);
  const cacheHit = requestedKey === restoredKey;
  saveState(CACHE_HIT, cacheHit);
  setOutput(CACHE_HIT, cacheHit);
  if (cacheHit) {
    await waitForDocker(platform);
    await execBashCommand(`docker load --input ${DOCKER_IMAGES_PATH}`);
  } else {
    info(
      "Recording preexisting Docker images. These include standard images " +
        "pre-cached by GitHub Actions when Docker is run as root.",
    );
    await waitForDocker(platform);
    const dockerImages = await execBashCommand(LIST_COMMAND);
    saveState(DOCKER_IMAGES_LIST, dockerImages);
  }
};

const saveDockerImages = async (
  platform: NodeJS.Platform = process.platform,
): Promise<void> => {
  const key = getInput("key", { required: true });
  if (getState(CACHE_HIT) === "true") {
    info(`Cache hit occurred on the primary key ${key}, not saving cache.`);
  } else if (getInput("read-only") === "true") {
    info(
      `Cache miss occurred on the primary key ${key}. Not saving cache as ` +
        "read-only option was selected.",
    );
    /* Check if a cache with our key has been saved between when we checked in
     * loadDockerImages and now.
     */
  } else if (
    key === (await restoreCache([""], key, [], { lookupOnly: true }))
  ) {
    info(
      "A cache miss occurred during the initial attempt to load Docker " +
        `images, but subsequently a cache with a matching key, ${key}, was saved. ` +
        "This can occur when run in parallel. Not saving cache.",
    );
  } else {
    const preexistingImages = getState(DOCKER_IMAGES_LIST).split("\n");
    await waitForDocker(platform);
    info("Listing Docker images.");
    const images = await execBashCommand(LIST_COMMAND);
    const imagesList = images.split("\n");
    const newImages = imagesList.filter(
      (image: string): boolean => !preexistingImages.includes(image),
    );
    if (newImages.length === 0) {
      info("No Docker images to save");
    } else {
      info(
        "Images present before restore step will be skipped; only new images " +
          "will be saved.",
      );
      const newImagesArgs = newImages.join(" ");
      const cmd = `docker save --output ${DOCKER_IMAGES_PATH} ${newImagesArgs}`;
      await execBashCommand(cmd);
      await saveCache([DOCKER_IMAGES_PATH], key);
    }
  }
};

export {
  saveDockerImages,
  loadDockerImages,
  CACHE_HIT,
  DOCKER_IMAGES_LIST,
  DOCKER_IMAGES_PATH,
};
