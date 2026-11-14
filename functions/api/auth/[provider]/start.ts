import { handleAuthStart } from '../../../../src/server/handlers';
import type { PagesContext } from '../../../../src/server/env';

export const onRequestGet = (context: PagesContext) => handleAuthStart(context.request, context.env, context.params.provider);
