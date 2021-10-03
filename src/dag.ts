import { array as toposort } from 'toposort';

export class DAG<FromType extends object, ToType extends object> {
    private maxId: number;
    private idMap: WeakMap<FromType | ToType, string>;

    public nodes: Record<string, FromType | ToType>;
    public edges: [string, string][];
    public edgeMap: Record<string, Record<string, ToType>>;
    public entryNodes: Record<string, boolean>;
    public exitNodes: Record<string, boolean>;
    public reverseEdgeMap: Record<string, Record<string, FromType | ToType>>;

    constructor() {
        this.maxId = 0;
        this.idMap = new WeakMap();
        this.nodes = {};
        this.edges = [];
        this.edgeMap = {};
        this.entryNodes = {};
        this.exitNodes = {};
        this.reverseEdgeMap = {};
    }

    getItemId(item: FromType | ToType): string {
        let id;
        if ((id = this.idMap.get(item)) === undefined) {
            id = this.maxId.toString();
            this.maxId += 1;
            this.idMap.set(item, id);
        }
        return id;
    }

    addNode(node: FromType | ToType): boolean {
        const itemId = this.getItemId(node);
        if (!this.nodes[itemId]) {
            this.entryNodes[itemId] = true;
            this.exitNodes[itemId] = true;
            this.nodes[itemId] = node;
            return true;
        }
        return false;
    }

    hasNode(node: FromType | ToType) {
        return !!this.nodes[this.getItemId(node)];
    }

    /**
     * Indicate that toNode needs to be updated if fromNode has changed
     */
    addEdge(fromNode: FromType | ToType, toNode: ToType): boolean {
        const fromId = this.getItemId(fromNode);
        const toId = this.getItemId(toNode);
        if (!this.edgeMap[fromId]) {
            this.edgeMap[fromId] = {};
        }
        if (this.edgeMap[fromId][toId]) {
            // already exists
            return false;
        }
        delete this.entryNodes[toId];
        delete this.exitNodes[fromId];
        this.edgeMap[fromId][toId] = toNode;
        this.edges.push([fromId, toId]);

        // upkeeping
        if (!this.reverseEdgeMap[toId]) {
            this.reverseEdgeMap[toId] = {};
        }
        this.reverseEdgeMap[toId][fromId] = fromNode;
        return true;
    }

    private rebuildEdges() {
        this.edges = []; // TODO: make this faster
        Object.keys(this.edgeMap).forEach((fromId) => {
            Object.keys(this.edgeMap[fromId]).forEach((toId) => {
                this.edges.push([fromId, toId]);
            });
        });
    }

    removeEdges(edges: [FromType | ToType, ToType][]) {
        edges.forEach(([fromNode, toNode]) => {
            const fromId = this.getItemId(fromNode);
            const toId = this.getItemId(toNode);
            if (this.edgeMap[fromId]) {
                delete this.edgeMap[fromId][toId];
                if (Object.keys(this.edgeMap[fromId]).length === 0) {
                    this.exitNodes[fromId] = true;
                }
            }
            if (this.reverseEdgeMap[toId]) {
                delete this.reverseEdgeMap[toId][fromId];
                if (Object.keys(this.reverseEdgeMap[toId]).length === 0) {
                    this.entryNodes[toId] = true;
                }
            }
        });
        this.rebuildEdges();
    }

    removeExitsRetaining(items: (FromType | ToType)[]) {
        const toKeep: Record<string, true> = {};
        items.forEach((item) => {
            toKeep[this.getItemId(item)] = true;
        });
        const toRemove: string[] = [];
        Object.keys(this.exitNodes).forEach((fromNodeId) => {
            if (!toKeep[fromNodeId]) {
                toRemove.push(fromNodeId);
            }
        });
        this.removeReverseSubgraphs(toRemove);
    }

    /**
     * Remove all nodes reachable from a starting item
     */
    private removeReverseSubgraphs(toIds: string[]) {
        // Mark everything to delete
        const visited: Record<string, true> = {};
        const recurse = (toId: string) => {
            visited[toId] = true;
            if (this.reverseEdgeMap[toId]) {
                Object.keys(this.reverseEdgeMap[toId]).forEach((fromId) =>
                    recurse(fromId)
                );
            }
        };
        toIds.forEach((toId) => recurse(toId));
        // Delete everything
        Object.keys(visited).forEach((nodeId) => {
            delete this.nodes[nodeId];
        });
        this.edges = this.edges.filter(
            ([fromId, toId]) => !visited[fromId] && !visited[toId]
        );
        // Reconstruct metadata
        this.entryNodes = {};
        this.exitNodes = {};
        Object.keys(this.nodes).forEach((nodeId) => {
            this.entryNodes[nodeId] = true;
            this.exitNodes[nodeId] = true;
        });
        this.edgeMap = {};
        this.reverseEdgeMap = {};
        this.edges.forEach(([fromId, toId]) => {
            if (!this.edgeMap[fromId]) this.edgeMap[fromId] = {};
            this.edgeMap[fromId][toId] = this.nodes[toId] as ToType;
            if (!this.reverseEdgeMap[toId]) this.reverseEdgeMap[toId] = {};
            this.reverseEdgeMap[toId][fromId] = this.nodes[fromId];
            delete this.exitNodes[fromId];
            delete this.entryNodes[toId];
        });
    }

    /**
     * Get list of things need to be updated, when fromNode has changed?
     */
    getDependencies(fromNode: FromType): ToType[] {
        const fromId = this.getItemId(fromNode);
        if (!this.edgeMap[fromId]) {
            return [];
        }
        return Object.values(this.edgeMap[fromId]);
    }

    /**
     * Get list of things that cause toNode to updated
     */
    getReverseDependencies(toNode: ToType): (FromType | ToType)[] {
        const toId = this.getItemId(toNode);
        if (!this.reverseEdgeMap[toId]) {
            return [];
        }
        return Object.values(this.reverseEdgeMap[toId]);
    }

    topologicalSort(): (FromType | ToType)[] {
        return toposort(Object.keys(this.nodes), this.edges).map(
            (itemId) => this.nodes[itemId]
        );
    }

    getUnreachableReverse(
        rootItems: (FromType | ToType)[]
    ): (FromType | ToType)[] {
        // mark and sweep
        //
        // Step one: visit all the items from rootItems
        const marked: Record<string, boolean> = {};
        const visit = (itemId: string) => {
            if (marked[itemId]) return;
            marked[itemId] = true;
            if (this.reverseEdgeMap[itemId]) {
                Object.keys(this.reverseEdgeMap[itemId]).forEach((toId) => {
                    visit(toId);
                });
            }
        };
        rootItems.forEach((rootItem) => {
            const itemId = this.getItemId(rootItem);
            visit(itemId);
        });

        // Step two: identify unreachable items
        const unreachable: (FromType | ToType)[] = [];
        Object.keys(this.nodes).forEach((nodeId) => {
            if (!marked[nodeId]) {
                unreachable.push(this.nodes[nodeId]);
            }
        });
        return unreachable;
    }

    graphviz(makeName: (label: string, item: FromType | ToType) => string) {
        const lines = ['digraph dag {'];
        Object.entries(this.nodes).forEach(([nodeId, node]) => {
            const props: Record<string, string> = {
                label: makeName(nodeId, node),
            };
            if (this.entryNodes[nodeId] && this.exitNodes[nodeId]) {
                props.shape = 'tripleoctagon';
            } else if (this.entryNodes[nodeId]) {
                props.shape = 'doubleoctagon';
            } else if (this.exitNodes[nodeId]) {
                props.shape = 'rectangle';
            }
            lines.push(
                `  item_${nodeId} [${Object.entries(props)
                    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                    .join(',')}];`
            );
        });
        this.edges.forEach(([fromId, toId]) => {
            lines.push(`  item_${fromId} -> item_${toId};`);
        });
        lines.push('}');
        return lines.join('\n');
    }
}
