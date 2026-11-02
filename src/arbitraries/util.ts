import { constantFrom, record, string, tuple, uniqueArray } from "fast-check";

import type { Arbitrary } from "fast-check";

import type { ConsoleOutput } from "../util.js";

export const consoleOutput = (): Arbitrary<ConsoleOutput> =>
  record({
    stdout: string({ unit: "binary" }),
    stderr: string({ unit: "binary" }),
  });

export const dockerImages = (): Arbitrary<string[]> =>
  uniqueArray(
    string({ unit: "binary", minLength: 1 }).filter(
      (image: string): boolean => !image.includes("\n"),
    ),
  );

export const platform = (): Arbitrary<NodeJS.Platform> =>
  constantFrom("linux", "win32");

/**
 * @template T
 * @param arrArbA an arbitrary that generates an array of T
 * @param arrArbB an arbitrary that generates an array of T
 * @returns an arbitrary that generates a 2-tuple of arrays of T with no overlap
 */
export const uniquePair = <T>(
  arrArbA: Arbitrary<T[]>,
  arrArbB: Arbitrary<T[]>,
): Arbitrary<[T[], T[]]> =>
  tuple(arrArbA, arrArbB).map(([arrayA, arrayB]: [T[], T[]]): [T[], T[]] => {
    const setA = new Set(arrayA);
    arrayB = arrayB.filter((elem: T): boolean => !setA.has(elem));
    return [arrayA, arrayB];
  });
