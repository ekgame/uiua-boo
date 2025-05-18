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