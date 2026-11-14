import { handleProviders } from '../../../src/server/handlers';
import type { PagesContext } from '../../../src/server/env';

export const onRequestGet = (context: PagesContext) => handleProviders(context.env);
