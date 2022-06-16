type Vertex = {
    nodeId: number;
    index?: number;
    lowlink?: number;
    onStack?: boolean;
};

export function tarjanStronglyConnected(
    reverseAdjacency: Readonly<Record<number, readonly number[]>>,
    topologicalIndexById: readonly number[],
    lowerBound: number,
    upperBound: number,
    fromNodes: Iterable<number>
): number[][] {
    let index = 0;
    const nodeVertex: Record<number, Vertex> = {};
    const stack: Vertex[] = [];
    const reverseTopoSort: number[][] = [];

    function* getDepenencies(nodeId: number) {
        for (const toId of reverseAdjacency[nodeId]) {
            const toIndex = topologicalIndexById[toId];
            if (lowerBound <= toIndex && toIndex <= upperBound) {
                yield toId;
            }
        }
    }

    const strongconnect = (vertex: Vertex) => {
        vertex.index = index;
        vertex.lowlink = index;
        index = index + 1;
        stack.push(vertex);
        vertex.onStack = true;

        // Consider successors of v
        for (const toId of getDepenencies(vertex.nodeId)) {
            if (!nodeVertex[toId]) {
                nodeVertex[toId] = {
                    nodeId: toId,
                };
            }
            const toVertex = nodeVertex[toId];
            if (toVertex.index === undefined) {
                // Successor toVertex has not yet been visited; recurse on it
                strongconnect(toVertex);
                vertex.lowlink = Math.min(
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    vertex.lowlink!,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    toVertex.lowlink!
                );
            } else if (toVertex.onStack) {
                // Successor toVertex is in stack S and hence in the current SCC
                // If toVertex is not on stack, then (vertex, toVertex) is an edge pointing to an SCC already found and must be ignored
                // Note: The next line may look odd - but is correct.
                // It says toVertex.index not toVertex.lowlink; that is deliberate and from the original paper
                vertex.lowlink = Math.min(
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    vertex.lowlink!,
                    toVertex.index
                );
            }
        }

        // If vertex is a root node, pop the stack and generate an SCC
        if (vertex.lowlink === vertex.index) {
            // start a new strongly connected component
            const component: number[] = [];
            for (;;) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const toVertex = stack.pop()!;
                toVertex.onStack = false;
                // add toVertex to current strongly connected component
                component.push(toVertex.nodeId);
                if (toVertex === vertex) {
                    break;
                }
            }
            // output the current strongly connected component
            reverseTopoSort.push(component);
        }
    };

    for (const nodeId of fromNodes) {
        if (!nodeVertex[nodeId]) {
            nodeVertex[nodeId] = {
                nodeId,
            };
            strongconnect(nodeVertex[nodeId]);
        }
    }

    return reverseTopoSort;
}
