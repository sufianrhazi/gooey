import { Graph } from './graph';
import { suite, test, beforeEach, assert } from '@srhazi/gooey-test';

suite('Graph', () => {
    const a = { name: 'a', $__id: 0 };
    const b = { name: 'b', $__id: 1 };
    const c = { name: 'c', $__id: 2 };
    const d = { name: 'd', $__id: 3 };
    const e = { name: 'e', $__id: 4 };

    interface TNode {
        name: string;
    }

    test('cycles can be identified', () => {
        const graph = new Graph<TNode>();
        graph.addNode(a);
        graph.addNode(b);
        graph.addNode(c);
        graph.addNode(d);
        graph.addNode(e);

        graph.addEdge(a, b, Graph.EDGE_HARD);
        graph.addEdge(b, c, Graph.EDGE_HARD);
        graph.addEdge(c, d, Graph.EDGE_HARD);
        graph.addEdge(d, b, Graph.EDGE_HARD);
        graph.addEdge(c, e, Graph.EDGE_HARD);
        graph.retain(e);
        graph.markNodeDirty(a);

        const actionsPerNode: Record<string, string[]> = {
            a: [],
            b: [],
            c: [],
            d: [],
            e: [],
        };

        graph.process((node, action) => {
            if (action !== 'invalidate') {
                actionsPerNode[node.name].push(action);
            }
            return true;
        });

        assert.deepEqual(
            {
                a: ['recalculate'],
                b: ['cycle'],
                c: ['cycle'],
                d: ['cycle'],
                e: ['recalculate'],
            },
            actionsPerNode
        );
    });
});

suite('Graph', () => {
    const a = { name: 'a', $__id: 0 };
    const b = { name: 'b', $__id: 1 };
    const c = { name: 'c', $__id: 2 };
    const d = { name: 'd', $__id: 3 };
    const e = { name: 'e', $__id: 4 };
    const f = { name: 'f', $__id: 5 };
    const g = { name: 'g', $__id: 6 };
    const h = { name: 'h', $__id: 7 };
    const i = { name: 'i', $__id: 8 };

    interface TNode {
        name: string;
    }

    test('addNode returns whether or not node added', () => {
        const graph = new Graph<TNode>();
        assert.is(true, graph.addNode(a));
        assert.is(false, graph.addNode(a));
    });

    test('addEdge fails if nodes not added', () => {
        const graph = new Graph<TNode>();
        assert.throwsMatching(
            /cannot add edge from node that does not exist/,
            () => {
                graph.addEdge(a, b, Graph.EDGE_HARD);
            }
        );
    });

    test('getDependencies gets dependencies', () => {
        const graph = new Graph<TNode>();
        graph.addNode(a);
        graph.addNode(b);
        graph.addNode(c);
        graph.addNode(d);

        graph.addEdge(a, b, Graph.EDGE_HARD);
        graph.addEdge(b, c, Graph.EDGE_HARD);
        graph.addEdge(b, d, Graph.EDGE_HARD);
        graph.addEdge(c, d, Graph.EDGE_HARD);

        assert.arrayIs([b], graph.getDependencies(a));
        assert.arrayIs([c, d], graph.getDependencies(b));
        assert.arrayIs([d], graph.getDependencies(c));
        assert.arrayIs([], graph.getDependencies(d));
        assert.arrayIs([], graph.getDependencies(e));
    });

    suite('complex graph', () => {
        let graph = new Graph<TNode>();

        /*
         * Graph for reference:
         *
         *             ┌─┐
         *        ┌───►│c├────┐
         *        │    └─┘    │
         *        │           ▼
         * ┌─┐   ┌┴┐   ┌─┐   ┌─┐   ┌─┐   ┌─┐
         * │a├──►│b├──►│d├──►│e├──►│h├──►│i│
         * └┬┘   └─┘   └─┘   └─┘   └─┘   └─┘
         *  │                 ▲     ▲     ▲
         *  ├─────────────────┘     │     │
         *  │           ┌───────────┘     │
         *  │          ┌┴┐   ┌─┐          │
         *  └─────────►│f├──►│g├──────────┘
         *             └─┘   └─┘
         */

        beforeEach(() => {
            graph = new Graph<TNode>();

            graph.addNode(a);
            graph.addNode(b);
            graph.addNode(c);
            graph.addNode(d);
            graph.addNode(e);
            graph.addNode(f);
            graph.addNode(g);
            graph.addNode(h);
            graph.addNode(i);

            graph.addEdge(a, b, Graph.EDGE_HARD);
            graph.addEdge(b, c, Graph.EDGE_HARD);
            graph.addEdge(b, d, Graph.EDGE_HARD);
            graph.addEdge(c, e, Graph.EDGE_HARD);
            graph.addEdge(d, e, Graph.EDGE_HARD);
            graph.addEdge(a, e, Graph.EDGE_HARD);
            graph.addEdge(a, f, Graph.EDGE_HARD);
            graph.addEdge(f, g, Graph.EDGE_HARD);
            graph.addEdge(e, h, Graph.EDGE_HARD);
            graph.addEdge(h, i, Graph.EDGE_HARD);
            graph.addEdge(f, h, Graph.EDGE_HARD);
            graph.addEdge(g, i, Graph.EDGE_HARD);

            graph.retain(i); // the almost end node is retained
        });

        suite('process', () => {
            test('nothing visited if nothing dirty', () => {
                const items: TNode[] = [];

                graph.process((item) => {
                    items.push(item);
                    return false;
                });

                assert.arrayIs([], items);
            });

            test('all nodes visited starting from dirty nodes', () => {
                graph.markNodeDirty(a);

                const items: TNode[] = [];

                graph.process((item) => {
                    items.push(item);
                    return true;
                });

                // we visit all nodes
                assert.arrayEqualsUnsorted([a, b, c, d, e, f, g, h, i], items);
            });

            test('nodes that do not lead to reatined nodes are not visited', () => {
                graph.release(i); // no nodes are retained now
                graph.retain(e);
                graph.retain(f);

                graph.markNodeDirty(a);
                graph.markNodeDirty(i);

                const actionsPerNode: Record<string, string[]> = {
                    a: [],
                    b: [],
                    c: [],
                    d: [],
                    e: [],
                    f: [],
                    g: [],
                    h: [],
                    i: [],
                };

                graph.process((node, action) => {
                    actionsPerNode[node.name].push(action);
                    return true;
                });

                // TODO: many of these redundant 'invalidate' actions could probably be eliminated
                assert.deepEqual(
                    {
                        a: ['invalidate', 'recalculate'],
                        b: ['invalidate', 'recalculate'],
                        c: ['invalidate', 'recalculate'],
                        d: ['invalidate', 'recalculate'],
                        e: [
                            'invalidate',
                            'invalidate',
                            'invalidate',
                            'recalculate',
                        ],
                        f: ['invalidate', 'recalculate'],
                        // unretained nodes that become dirtied are flushed, but not recalculated
                        g: ['invalidate', 'invalidate'],
                        h: ['invalidate', 'invalidate', 'invalidate'],
                        i: ['invalidate', 'invalidate'],
                    },
                    actionsPerNode
                );
            });

            test('nodes can stop traversal by returning true', () => {
                graph.markNodeDirty(a);

                const items: { item: TNode; action: string }[] = [];

                graph.process((item, action) => {
                    items.push({ item, action });
                    return false;
                });

                // we only visit A nodes
                assert.deepEqual(
                    [
                        { item: a, action: 'invalidate' },
                        { item: a, action: 'recalculate' },
                    ],
                    items
                );
            });

            test('given c -> e; d -> e, and visiting c returns true but visiting d returns false, we still visit e and all dependencies', () => {
                graph.markNodeDirty(c);
                graph.markNodeDirty(d);

                const items: TNode[] = [];

                graph.process((item, action) => {
                    if (action === 'recalculate') {
                        items.push(item);
                    }
                    if (item === c) return false;
                    return true;
                });

                // The order of d and c may change
                assert.arrayEqualsUnsorted([d, c], items.slice(0, 2));
                // But the order of the remaining nodes is guaranteed
                assert.arrayIs([e, h, i], items.slice(2));
            });

            test('given c -> e; d -> e, and visiting c returns true but visiting d returns false, we still visit e and all dependencies', () => {
                graph.markNodeDirty(b);

                const items: TNode[] = [];

                graph.process((item, action) => {
                    if (action === 'recalculate') {
                        items.push(item);
                    }
                    if (item === c) return false;
                    return true;
                });

                // The first item visited is the dirty root
                assert.arrayIs([b], items.slice(0, 1));
                // The order of d and c may change
                assert.arrayEqualsUnsorted([d, c], items.slice(1, 3));
                // But the order of the remaining nodes is guaranteed
                assert.arrayIs([e, h, i], items.slice(3));
            });

            test('dirty nodes visited in topological order', () => {
                graph.markNodeDirty(a);

                const items: TNode[] = [];

                graph.process((item, action) => {
                    if (action === 'recalculate') {
                        items.push(item);
                    }
                    return true;
                });

                function assertBefore(fromNode: TNode, toNode: TNode) {
                    const fromIndex = items.indexOf(fromNode);
                    const toIndex = items.indexOf(toNode);
                    assert.isNot(-1, fromIndex, 'fromNode not found');
                    assert.isNot(-1, toIndex, 'toNode not found');
                    assert.lessThan(fromIndex, toIndex);
                }

                function visit(root: TNode) {
                    graph.getDependencies(root).forEach((dependency) => {
                        assertBefore(root, dependency);
                        visit(dependency);
                    });
                }

                // Starting from the root, given a -> b, ensure a is before b
                visit(a);
            });
        });
    });

    suite('complex graph with soft edges', () => {
        let graph = new Graph<TNode>();

        /*
         * Graph for reference: (soft edges are ..>)
         *
         *             ┌─┐
         *        ┌───►│c├────┐
         *        │    └─┘    │
         *        │           ▼
         * ┌─┐   ┌┴┐   ┌─┐   ┌─┐   ┌─┐   ┌─┐
         * │a├──►│b├──►│d├──►│e├..>│h├──►│i│
         * └┬┘   └─┘   └─┘   └─┘   └─┘   └─┘
         *  │                 ▲     ▲     ▲
         *  ├─────────────────┘     │     │
         *  .           ┌───────────┘     │
         *  .          ┌┴┐   ┌─┐          │
         *  ..........>│f├..>│g├──────────┘
         *             └─┘   └─┘
         */

        beforeEach(() => {
            graph = new Graph<TNode>();

            graph.addNode(a);
            graph.addNode(b);
            graph.addNode(c);
            graph.addNode(d);
            graph.addNode(e);
            graph.addNode(f);
            graph.addNode(g);
            graph.addNode(h);
            graph.addNode(i);

            graph.addEdge(a, b, Graph.EDGE_HARD);
            graph.addEdge(b, c, Graph.EDGE_HARD);
            graph.addEdge(b, d, Graph.EDGE_HARD);
            graph.addEdge(c, e, Graph.EDGE_HARD);
            graph.addEdge(d, e, Graph.EDGE_HARD);
            graph.addEdge(a, e, Graph.EDGE_HARD);
            graph.addEdge(a, f, Graph.EDGE_SOFT);
            graph.addEdge(f, g, Graph.EDGE_SOFT);
            graph.addEdge(e, h, Graph.EDGE_SOFT);
            graph.addEdge(h, i, Graph.EDGE_HARD);
            graph.addEdge(f, h, Graph.EDGE_HARD);
            graph.addEdge(g, i, Graph.EDGE_HARD);

            graph.retain(i);
        });

        suite('process', () => {
            test('nothing visited if nothing dirty', () => {
                const items: TNode[] = [];

                graph.process((item) => {
                    items.push(item);
                    return false;
                });

                assert.arrayIs([], items);
            });

            test('all nodes reachable from hard edges visited', () => {
                graph.markNodeDirty(a);

                const items: TNode[] = [];

                graph.process((item) => {
                    items.push(item);
                    return true;
                });

                // we visit all nodes reachable for those with soft edges
                assert.arrayEqualsUnsorted([a, b, c, d, e], items);
            });

            test('soft edges, despite not being visited dictate topological order', () => {
                graph.markNodeDirty(a);
                graph.markNodeDirty(f);

                const items: TNode[] = [];

                graph.process((item, action) => {
                    if (action === 'recalculate') {
                        items.push(item);
                    }
                    return true;
                });

                function assertBefore(fromNode: TNode, toNode: TNode) {
                    const fromIndex = items.indexOf(fromNode);
                    const toIndex = items.indexOf(toNode);
                    assert.isNot(-1, fromIndex, 'fromNode not found');
                    assert.isNot(-1, toIndex, 'toNode not found');
                    assert.lessThan(fromIndex, toIndex);
                }

                function visit(root: TNode) {
                    graph.getDependencies(root).forEach((dependency) => {
                        // Note: 'g' is not visited
                        if (dependency.name !== 'g') {
                            assertBefore(root, dependency);
                            visit(dependency);
                        }
                    });
                }

                // Starting from the root, given a -> b, ensure a is before b
                visit(a);
            });
        });
    });
});
