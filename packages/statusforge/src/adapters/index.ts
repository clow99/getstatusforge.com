import type { ErrorAdapter } from "../types";
import { apolloAdapter } from "./apollo";
import { axiosAdapter } from "./axios";
import { fetchAdapter } from "./fetch";
import { genericAdapter } from "./generic";
import { kyAdapter } from "./ky";
import { nodeHttpAdapter } from "./nodeHttp";

export const defaultAdapters: ErrorAdapter[] = [
  axiosAdapter,
  kyAdapter,
  fetchAdapter,
  apolloAdapter,
  nodeHttpAdapter,
  genericAdapter
];

export {
  apolloAdapter,
  axiosAdapter,
  fetchAdapter,
  genericAdapter,
  kyAdapter,
  nodeHttpAdapter
};
