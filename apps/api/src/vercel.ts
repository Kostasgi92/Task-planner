// Entry for the Vercel serverless function (bundled by scripts/build-vercel.mjs).
// Created once per function instance and reused across requests.
import { createProductionApp } from './production';

export default createProductionApp();
