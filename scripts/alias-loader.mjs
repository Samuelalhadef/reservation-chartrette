// Résout les imports "@/..." pour exécuter du code de src/ hors de Next.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./alias-resolver.mjs', pathToFileURL('./scripts/'));
