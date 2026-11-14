import { handleProgress } from '../../src/server/handlers';
import type { PagesContext } from '../../src/server/env';

export const onRequest = (context: PagesContext) => handleProgress(context.request, context.env);
