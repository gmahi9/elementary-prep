import { handleSections } from '../../src/server/catalog';
import type { PagesContext } from '../../src/server/env';

export const onRequest = (context: PagesContext) => handleSections(context.request, context.env);
