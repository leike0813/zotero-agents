import Graph from "graphology";
import Sigma from "sigma";
import { drawDiscNodeHover } from "sigma/rendering";

// The installed browser vendors are assembled once at page entry boundaries.
export const synthesisGraphVendors = { Graph, Sigma, drawDiscNodeHover };
