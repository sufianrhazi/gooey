type Vertex = {
    nodeId: string;
    index?: number;
    lowlink?: number;
    onStack?: boolean;
};

export function tarjanStronglyConnected(
    graph: Record<string, Record<string, number>>,
    fromNodes: string[]
): Set<string>[] {
    let index = 0;
    const nodeVertex: Record<string, Vertex> = {};
    const stack: Vertex[] = [];
    const reverseTopoSort: Vertex[][] = [];

    function getDepenencies(nodeId: string) {
        const dependencies: string[] = [];
        Object.keys(graph[nodeId] || {}).forEach((toId) => {
            if (graph[nodeId][toId]) {
                dependencies.push(toId);
            }
        });
        return dependencies;
    }

    const strongconnect = (vertex: Vertex) => {
        vertex.index = index;
        vertex.lowlink = index;
        index = index + 1;
        stack.push(vertex);
        vertex.onStack = true;

        // Consider successors of v
        getDepenencies(vertex.nodeId).forEach((toId) => {
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
        });

        // If vertex is a root node, pop the stack and generate an SCC
        if (vertex.lowlink === vertex.index) {
            // start a new strongly connected component
            const component: Vertex[] = [];
            for (;;) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const toVertex = stack.pop()!;
                toVertex.onStack = false;
                // add toVertex to current strongly connected component
                component.push(toVertex);
                if (toVertex === vertex) {
                    break;
                }
            }
            // output the current strongly connected component
            reverseTopoSort.push(component);
        }
    };

    fromNodes.forEach((nodeId) => {
        if (!nodeVertex[nodeId]) {
            nodeVertex[nodeId] = {
                nodeId,
            };
            strongconnect(nodeVertex[nodeId]);
        }
    });

    reverseTopoSort.reverse();

    return reverseTopoSort.map(
        (component) => new Set(component.map((vertex) => vertex.nodeId))
    );
}
