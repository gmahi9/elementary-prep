import { handleSession } from '../../../src/server/handlers';
import type { PagesContext } from '../../../src/server/env';

export const onRequestGet = (context: PagesContext) => handleSession(context.request, context.env);
