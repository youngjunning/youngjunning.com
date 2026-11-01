import {getContent} from '@/lib/content';
import {favoriteGraph} from '@/lib/favorite-tracking.mjs';
export function GET(){return Response.json(favoriteGraph(getContent().favorites));}
