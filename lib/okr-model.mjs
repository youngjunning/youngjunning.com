import { validateOkr as validate } from './okr-schema.mjs';
import { assertPublicText } from './model.mjs';
export function validateOkr(store) { assertPublicText(JSON.stringify(store)); return validate(store); }
