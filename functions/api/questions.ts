import { handleQuestions } from '../../src/server/catalog';
import type { PagesContext } from '../../src/server/env';

export const onRequest = (context: PagesContext) => handleQuestions(context.request, context.env);
