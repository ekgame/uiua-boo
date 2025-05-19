import { VineValidator } from "@vinejs/vine";
import { Infer } from "@vinejs/vine/types";

export async function parseJsonValidated<T extends VineValidator<any,any>>(schema: T, json: string): Promise<Infer<T>> {
  let parsed: any;

  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error}`);
  }

  return await schema.validate(parsed);
}

function concatRegexPair(first: RegExp, second: RegExp) {
  let flags = first.flags + second.flags;
  flags = Array.from(new Set(flags.split(''))).join();
  return new RegExp(first.source + second.source, flags);
}

export function concatRegex(...regexes: RegExp[]) {
  return regexes.reduce((acc, regex) => concatRegexPair(acc, regex));
}