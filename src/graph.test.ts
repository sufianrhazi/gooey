import { Graph, ProcessAction } from './graph';
import { suite, test, beforeEach, assert } from '@srhazi/gooey-test';

suite('Graph', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };
    const c = { name: 'c' };
    const d = { name: 'd' };
    const e = { name: 'e' };
    const f = { name: 'f' };
    const g = { name: 'g' };
    const h = { name: 'h' };
    const i = { name: 'i' };

    interface TNode {
        name: string;
    }

    test('addVertex returns whether or not node added', () => {
        const graph = new Graph<TNode>(() => false);
        graph.addVertex(a);
        assert.throwsMatching(/double vertex addition/, () =>
            graph.addVertex(a)
        );
    });

    test('addEdge fails if nodes not added', () => {
        const graph = new Graph<TNode>(() => false);
        assert.throwsMatching(/vertex not found/, () => {
            graph.addEdge(a, b, Graph.EDGE_HARD);
        });
    });

    test('removeVertex removes vertices', () => {
        const graph = new Graph<TNode>(() => false);

        graph.addVertex(a);
        graph.removeVertex(a);
        graph.addVertex(b);
        graph.removeVertex(b);

        graph.addVertex(b);
        graph.addVertex(a);
    });

    test('id issuance: ids can be reused', () => {
        const graph = new Graph<TNode>(() => false);

        graph.addVertex(a);
        graph.addVertex(b);

        const aInfo = graph._test_getVertexInfo(a);
        const bInfo = graph._test_getVertexInfo(b);

        graph.removeVertex(a);
        graph.addVertex(c);

        const cInfo = graph._test_getVertexInfo(c);

        assert.isTruthy(aInfo);
        assert.isTruthy(bInfo);
        assert.isTruthy(cInfo);

        assert.isNot(aInfo?.id, bInfo?.id);
        assert.isNot(bInfo?.id, cInfo?.id);
        assert.is(aInfo?.id, cInfo?.id);

        assert.isNot(aInfo?.index, bInfo?.index);
        assert.isNot(bInfo?.index, cInfo?.index);
        assert.is(aInfo?.index, cInfo?.index);
    });

    test('index issuance with respect to reordering', () => {
        const graph = new Graph<TNode>(() => false);

        graph.addVertex(c);
        graph.addVertex(b);
        graph.addVertex(a);

        // initial order: [c, b, a]
        assert.is(0, graph._test_getVertexInfo(c)?.index);
        assert.is(1, graph._test_getVertexInfo(b)?.index);
        assert.is(2, graph._test_getVertexInfo(a)?.index);

        graph.addEdge(a, b, Graph.EDGE_HARD);
        graph.addEdge(b, c, Graph.EDGE_HARD);
        graph.process(); // trigger reorder

        // reordered: [a, b, c]
        assert.is(2, graph._test_getVertexInfo(c)?.index);
        assert.is(1, graph._test_getVertexInfo(b)?.index);
        assert.is(0, graph._test_getVertexInfo(a)?.index);

        graph.removeEdge(a, b, Graph.EDGE_HARD);
        graph.process(); // trigger reorder

        // no changes, despite a->b edge removal: [a, b, c]
        assert.is(2, graph._test_getVertexInfo(c)?.index);
        assert.is(1, graph._test_getVertexInfo(b)?.index);
        assert.is(0, graph._test_getVertexInfo(a)?.index);

        graph.removeVertex(a);
        // Order now is: [undefined, b, c]

        graph.addVertex(d);
        graph.addVertex(e);

        // vertices issued in "holes" in order [d, b, c, e]
        assert.is(undefined, graph._test_getVertexInfo(a));
        assert.is(1, graph._test_getVertexInfo(b)?.index);
        assert.is(2, graph._test_getVertexInfo(c)?.index);
        assert.is(0, graph._test_getVertexInfo(d)?.index);
        assert.is(3, graph._test_getVertexInfo(e)?.index);

        // reordering can work as expected after reissuance
        graph.addEdge(d, c, Graph.EDGE_HARD);
        graph.addEdge(e, d, Graph.EDGE_HARD);
        graph.process(); // trigger reorder

        assert.lessThan(
            graph._test_getVertexInfo(d)!.index,
            graph._test_getVertexInfo(c)!.index
        );
        assert.lessThan(
            graph._test_getVertexInfo(e)!.index,
            graph._test_getVertexInfo(d)!.index
        );
    });

    test('_test_getDependencies gets dependencies', () => {
        const graph = new Graph<TNode>(() => false);
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addVertex(c);
        graph.addVertex(d);

        graph.addEdge(a, b, Graph.EDGE_HARD);
        graph.addEdge(b, c, Graph.EDGE_HARD);
        graph.addEdge(b, d, Graph.EDGE_HARD);
        graph.addEdge(c, d, Graph.EDGE_HARD);

        assert.arrayIs([b], graph._test_getDependencies(a));
        assert.arrayIs([c, d], graph._test_getDependencies(b));
        assert.arrayIs([d], graph._test_getDependencies(c));
        assert.arrayIs([], graph._test_getDependencies(d));
        assert.throwsMatching(/nonexistent vertex/, () =>
            graph._test_getDependencies(e)
        );
    });

    suite('complex graph', () => {
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

        const setup = (
            processor: (item: TNode, action: ProcessAction) => boolean
        ) => {
            const graph = new Graph<TNode>(processor);

            graph.addVertex(a);
            graph.addVertex(b);
            graph.addVertex(c);
            graph.addVertex(d);
            graph.addVertex(e);
            graph.addVertex(f);
            graph.addVertex(g);
            graph.addVertex(h);
            graph.addVertex(i);

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

            graph.markVertexRoot(i); // the almost end node is root
            return graph;
        };

        suite('process', () => {
            test('nothing visited if nothing dirty', () => {
                const items: TNode[] = [];
                const graph = setup((item) => {
                    items.push(item);
                    return false;
                });

                graph.process();

                assert.arrayIs([], items);
            });

            test('all nodes visited starting from dirty nodes', () => {
                const items: TNode[] = [];
                const graph = setup((item) => {
                    items.push(item);
                    return true;
                });
                graph.markVertexDirty(a);

                graph.process();

                // we visit all nodes
                assert.arrayEqualsUnsorted([a, b, c, d, e, f, g, h, i], items);
            });

            test('nodes that do not lead to root nodes are not visited', () => {
                const actionsPerNode: Record<string, ProcessAction[]> = {
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

                const graph = setup((node, action) => {
                    actionsPerNode[node.name].push(action);
                    return true;
                });
                graph.clearVertexRoot(i); // no nodes are root now
                graph.markVertexRoot(e);
                graph.markVertexRoot(f);

                graph.markVertexDirty(a);
                graph.markVertexDirty(i);

                graph.process();

                // TODO: we invalidate upon dirtying... but can we avoid double-invalidating non reaches root vertices?
                assert.deepEqual(
                    {
                        a: [
                            ProcessAction.INVALIDATE,
                            ProcessAction.RECALCULATE,
                        ],
                        b: [
                            ProcessAction.INVALIDATE,
                            ProcessAction.RECALCULATE,
                        ],
                        c: [
                            ProcessAction.INVALIDATE,
                            ProcessAction.RECALCULATE,
                        ],
                        d: [
                            ProcessAction.INVALIDATE,
                            ProcessAction.RECALCULATE,
                        ],
                        e: [
                            ProcessAction.INVALIDATE,
                            ProcessAction.RECALCULATE,
                        ],
                        f: [
                            ProcessAction.INVALIDATE,
                            ProcessAction.RECALCULATE,
                        ],
                        // non-root nodes that become dirtied are flushed, but not recalculated
                        g: [ProcessAction.INVALIDATE, ProcessAction.INVALIDATE],
                        h: [ProcessAction.INVALIDATE, ProcessAction.INVALIDATE],
                        i: [ProcessAction.INVALIDATE, ProcessAction.INVALIDATE],
                    },
                    actionsPerNode
                );
            });

            test('nodes can stop traversal by returning true', () => {
                const items: { item: TNode; action: ProcessAction }[] = [];
                const graph = setup((item, action) => {
                    items.push({ item, action });
                    return false;
                });

                graph.markVertexDirty(a);

                graph.process();

                // we only visit A nodes
                assert.deepEqual(
                    [
                        { item: a, action: ProcessAction.INVALIDATE },
                        { item: a, action: ProcessAction.RECALCULATE },
                    ],
                    items
                );
            });

            test('given c -> e; d -> e, and visiting c returns true but visiting d returns false, we still visit e and all dependencies', () => {
                const items: TNode[] = [];
                const graph = setup((item, action) => {
                    if (action === ProcessAction.RECALCULATE) {
                        items.push(item);
                    }
                    if (item === c) return false;
                    return true;
                });

                graph.markVertexDirty(c);
                graph.markVertexDirty(d);

                graph.process();

                // The order of d and c may change
                assert.arrayEqualsUnsorted([d, c], items.slice(0, 2));
                // But the order of the remaining nodes is guaranteed
                assert.arrayIs([e, h, i], items.slice(2));
            });

            test('given c -> e; d -> e, and visiting c returns true but visiting d returns false, we still visit e and all dependencies', () => {
                const items: TNode[] = [];
                const graph = setup((item, action) => {
                    if (action === ProcessAction.RECALCULATE) {
                        items.push(item);
                    }
                    if (item === c) return false;
                    return true;
                });

                graph.markVertexDirty(b);

                graph.process();

                // The first item visited is the dirty root
                assert.arrayIs([b], items.slice(0, 1));
                // The order of d and c may change
                assert.arrayEqualsUnsorted([d, c], items.slice(1, 3));
                // But the order of the remaining nodes is guaranteed
                assert.arrayIs([e, h, i], items.slice(3));
            });

            test('dirty nodes visited in topological order', () => {
                const items: TNode[] = [];

                const graph = setup((item, action) => {
                    if (action === ProcessAction.RECALCULATE) {
                        items.push(item);
                    }
                    return true;
                });
                graph.markVertexDirty(a);

                graph.process();

                function assertBefore(fromNode: TNode, toNode: TNode) {
                    const fromIndex = items.indexOf(fromNode);
                    const toIndex = items.indexOf(toNode);
                    assert.isNot(-1, fromIndex, 'fromNode not found');
                    assert.isNot(-1, toIndex, 'toNode not found');
                    assert.lessThan(fromIndex, toIndex);
                }

                function visit(root: TNode) {
                    graph._test_getDependencies(root).forEach((dependency) => {
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

        const setup = (
            processor: (item: TNode, action: ProcessAction) => boolean
        ) => {
            const graph = new Graph<TNode>(processor);

            graph.addVertex(a);
            graph.addVertex(b);
            graph.addVertex(c);
            graph.addVertex(d);
            graph.addVertex(e);
            graph.addVertex(f);
            graph.addVertex(g);
            graph.addVertex(h);
            graph.addVertex(i);

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

            graph.markVertexRoot(i);
            return graph;
        };

        suite('process', () => {
            test('nothing visited if nothing dirty', () => {
                const items: TNode[] = [];
                const graph = setup((item) => {
                    items.push(item);
                    return false;
                });

                graph.process();

                assert.arrayIs([], items);
            });

            test('all nodes reachable from hard edges visited', () => {
                const invalidated: TNode[] = [];
                const recalculated: TNode[] = [];

                const graph = setup((item, action) => {
                    if (action === ProcessAction.INVALIDATE) {
                        invalidated.push(item);
                    }
                    if (action === ProcessAction.RECALCULATE) {
                        recalculated.push(item);
                    }
                    return true;
                });
                graph.markVertexDirty(a);

                graph.process();

                assert.arrayEqualsUnsorted([a, b, c, d, e], invalidated);
                assert.arrayEqualsUnsorted([a, b, c, d, e], recalculated);
            });

            test('soft edges, despite not being visited dictate topological order', () => {
                const items: TNode[] = [];
                const graph = setup((item, action) => {
                    if (action === ProcessAction.RECALCULATE) {
                        items.push(item);
                    }
                    return true;
                });

                graph.markVertexDirty(a);
                graph.markVertexDirty(f);

                graph.process();

                function assertBefore(fromNode: TNode, toNode: TNode) {
                    const fromIndex = items.indexOf(fromNode);
                    const toIndex = items.indexOf(toNode);
                    assert.isNot(
                        -1,
                        fromIndex,
                        `fromNode not found (${fromNode.name})`
                    );
                    assert.isNot(
                        -1,
                        toIndex,
                        `toNode not found (${toNode.name})`
                    );
                    assert.lessThan(fromIndex, toIndex);
                }

                function visit(root: TNode) {
                    graph._test_getDependencies(root).forEach((dependency) => {
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

    if (DEBUG) {
        // TODO: fix this test
        test('graphviz representation', () => {});
    }
});

suite('Graph Cycles', () => {
    const a = { name: 'a' };
    const b = { name: 'b' };
    const c = { name: 'c' };
    const d = { name: 'd' };
    const e = { name: 'e' };
    const f = { name: 'f' };

    interface TNode {
        name: string;
    }

    const setup = () => {
        const actionsPerNode: Record<string, ProcessAction[]> = {};
        const graph = new Graph<TNode>((node: TNode, action: ProcessAction) => {
            if (!actionsPerNode[node.name]) {
                actionsPerNode[node.name] = [];
            }
            actionsPerNode[node.name].push(action);
            return true;
        });
        const process = () => {
            Object.keys(actionsPerNode).forEach((key) => {
                delete actionsPerNode[key];
            });
            graph.process();
            return actionsPerNode;
        };
        return { graph, process };
    };

    test('cycles can be identified', () => {
        const { graph, process } = setup();
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addVertex(c);
        graph.addVertex(d);
        graph.addVertex(e);

        graph.addEdge(a, b, Graph.EDGE_HARD);
        graph.addEdge(b, c, Graph.EDGE_HARD);
        graph.addEdge(c, d, Graph.EDGE_HARD);
        graph.addEdge(d, b, Graph.EDGE_HARD);
        graph.addEdge(c, e, Graph.EDGE_HARD);
        process(); // allow cycle to be detected here
        graph.markVertexRoot(e);
        graph.markVertexDirty(a);

        assert.deepEqual(
            {
                // A: Only recalculated, it was invalidated when dirtied
                a: [ProcessAction.RECALCULATE],
                // B, C, and D: invalidated when dirtied by A, recalculated because cycles that are dirtied need to be recalculated to determine if they have been broken, and cycle as the cycle was not broken
                b: [
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                c: [
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                d: [
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                // E: invalidated when dirtied by BCD cycle then recalculated as normal
                e: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            },
            process()
        );
    });

    test('cycles that are broken are notified as normal', () => {
        const { graph, process } = setup();
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addVertex(c);
        graph.addVertex(d);
        graph.addVertex(e);

        // Before:
        //    a
        //    |
        // +->b
        // |  |
        // |  c -> [e]
        // |  |
        // +--d
        graph.addEdge(a, b, Graph.EDGE_HARD);
        graph.addEdge(b, c, Graph.EDGE_HARD);
        graph.addEdge(c, d, Graph.EDGE_HARD);
        graph.addEdge(d, b, Graph.EDGE_HARD);
        graph.addEdge(c, e, Graph.EDGE_HARD);
        process(); // allow cycle to be detected
        graph.markVertexRoot(e);
        graph.markVertexDirty(a);

        assert.deepEqual(
            {
                a: [ProcessAction.RECALCULATE],
                b: [
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                c: [
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                d: [
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                e: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            },
            process()
        );

        // After:
        //    a
        //    |
        //    b
        //    |
        //    c -> [e]
        //    |
        //    d
        graph.removeEdge(d, b, Graph.EDGE_HARD);
        graph.markVertexDirty(a);

        assert.deepEqual(
            {
                a: [ProcessAction.RECALCULATE],
                b: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
                c: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
                d: [ProcessAction.INVALIDATE, ProcessAction.INVALIDATE], // invalidated and not recalculated since it is no longer root
                e: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            },
            process()
        );
    });

    test('cycles that are reduced in size are notified as normal', () => {
        const { graph, process } = setup();
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addVertex(c);
        graph.addVertex(d);
        graph.addVertex(e);
        graph.addVertex(f);

        // Before:
        //    a
        //    |
        // +->b
        // |  |
        // +--c -> [e]
        // |  |
        // +--d -> [f]
        graph.addEdge(a, b, Graph.EDGE_HARD);
        graph.addEdge(b, c, Graph.EDGE_HARD);
        graph.addEdge(c, b, Graph.EDGE_HARD);
        graph.addEdge(c, d, Graph.EDGE_HARD);
        graph.addEdge(c, e, Graph.EDGE_HARD);
        graph.addEdge(d, b, Graph.EDGE_HARD);
        graph.addEdge(d, f, Graph.EDGE_HARD);
        process();
        graph.markVertexRoot(e);
        graph.markVertexRoot(f);
        graph.markVertexDirty(a);

        assert.deepEqual(
            {
                a: [ProcessAction.RECALCULATE],
                b: [
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                c: [
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                d: [
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                e: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
                f: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            },
            process()
        );

        // After:
        //    a
        //    |
        // +->b
        // |  |
        // +--c -> [e]
        //    |
        //    d -> [f]
        graph.removeEdge(d, b, Graph.EDGE_HARD);
        graph.markVertexDirty(a);

        assert.deepEqual(
            {
                a: [ProcessAction.RECALCULATE],
                b: [
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ], // recalculate-cycle as it has already been notified
                c: [
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ], // recalculate-cycle as it has already been notified
                d: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
                e: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
                f: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            },
            process()
        );
    });

    test('cycle type: ring', () => {
        const { graph, process } = setup();
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addVertex(c);
        graph.addVertex(d);
        graph.addVertex(e);

        graph.addEdge(a, b, Graph.EDGE_HARD);

        graph.addEdge(b, c, Graph.EDGE_HARD);
        graph.addEdge(c, d, Graph.EDGE_HARD);
        graph.addEdge(d, b, Graph.EDGE_HARD);

        graph.addEdge(c, e, Graph.EDGE_HARD);

        assert.deepEqual(
            {
                b: [ProcessAction.CYCLE],
                c: [ProcessAction.CYCLE],
                d: [ProcessAction.CYCLE],
            },
            process()
        );
    });

    test('cycle type: single loop', () => {
        const { graph, process } = setup();
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addVertex(c);
        graph.addVertex(d);

        graph.addEdge(a, b, Graph.EDGE_HARD);

        graph.addEdge(b, c, Graph.EDGE_HARD);
        graph.addEdge(c, b, Graph.EDGE_HARD);

        graph.addEdge(c, d, Graph.EDGE_HARD);

        assert.deepEqual(
            {
                b: [ProcessAction.CYCLE],
                c: [ProcessAction.CYCLE],
            },
            process()
        );
    });

    test('cycle type: joined double loop', () => {
        const { graph, process } = setup();
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addVertex(c);
        graph.addVertex(d);
        graph.addVertex(e);
        graph.addVertex(f);

        // Edges added (in specific order)
        //
        // Setup (no cycles yet)
        // - a -> b
        // - b -> c -> d
        // - b -> e -> d
        // - d -> f
        graph.addEdge(a, b, Graph.EDGE_HARD);

        graph.addEdge(b, c, Graph.EDGE_HARD);
        graph.addEdge(c, d, Graph.EDGE_HARD);

        graph.addEdge(b, e, Graph.EDGE_HARD);
        graph.addEdge(e, d, Graph.EDGE_HARD);

        graph.addEdge(d, f, Graph.EDGE_HARD);

        graph.markVertexRoot(f);
        graph.markVertexDirty(a);

        assert.deepEqual(
            {
                a: [ProcessAction.RECALCULATE],
                b: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
                c: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
                d: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
                e: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
                f: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            },
            process()
        );

        // Introduce edge which contains two separate cycles
        // - d -> b
        // Now we have:
        // - b -> c -> d (-> b)
        // - b -> e -> d (-> b)
        // Strongly connected component:
        // - { b,c,d,e }
        graph.addEdge(d, b, Graph.EDGE_HARD);
        graph.markVertexDirty(a);

        assert.deepEqual(
            {
                a: [ProcessAction.RECALCULATE],
                b: [
                    ProcessAction.CYCLE,
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                c: [
                    ProcessAction.CYCLE,
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                d: [
                    ProcessAction.CYCLE,
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                e: [
                    ProcessAction.CYCLE,
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                f: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            },
            process()
        );
    });

    test('cycle type: joined double loop without preflush', () => {
        const { graph, process } = setup();
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addVertex(c);
        graph.addVertex(d);
        graph.addVertex(e);
        graph.addVertex(f);

        // Graph:
        //      a
        //      |
        //      b <-+
        //     / \  |
        //    c   e |
        //     \ /  |
        //      d --+
        //      |
        //      f

        graph.addEdge(a, b, Graph.EDGE_HARD);
        graph.addEdge(b, c, Graph.EDGE_HARD);
        graph.addEdge(b, e, Graph.EDGE_HARD);
        graph.addEdge(c, d, Graph.EDGE_HARD);
        graph.addEdge(d, b, Graph.EDGE_HARD);
        graph.addEdge(d, f, Graph.EDGE_HARD);
        graph.addEdge(e, d, Graph.EDGE_HARD);

        assert.deepEqual(
            {
                b: [ProcessAction.CYCLE],
                c: [ProcessAction.CYCLE],
                d: [ProcessAction.CYCLE],
                e: [ProcessAction.CYCLE],
            },
            process()
        );
    });

    test('cycle type: separate double loop', () => {
        const { graph, process } = setup();
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addVertex(c);
        graph.addVertex(d);
        graph.addVertex(e);
        graph.addVertex(f);

        graph.addEdge(a, b, Graph.EDGE_HARD);

        graph.addEdge(b, c, Graph.EDGE_HARD);
        graph.addEdge(c, b, Graph.EDGE_HARD);

        graph.addEdge(c, d, Graph.EDGE_HARD);

        graph.addEdge(d, e, Graph.EDGE_HARD);
        graph.addEdge(e, d, Graph.EDGE_HARD);

        graph.addEdge(e, f, Graph.EDGE_HARD);

        assert.deepEqual(
            {
                b: [ProcessAction.CYCLE],
                c: [ProcessAction.CYCLE],
                d: [ProcessAction.CYCLE],
                e: [ProcessAction.CYCLE],
            },
            process()
        );
    });

    test('cycle type: self cycle', () => {
        const { graph, process } = setup();
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addVertex(c);

        graph.addEdge(a, b, Graph.EDGE_HARD);
        graph.addEdge(b, b, Graph.EDGE_HARD);
        graph.addEdge(b, c, Graph.EDGE_HARD);

        graph.markVertexRoot(c);
        graph.markVertexDirty(a);
        graph.markVertexDirty(a);

        assert.deepEqual(
            {
                a: [ProcessAction.RECALCULATE],
                b: [
                    ProcessAction.INVALIDATE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                c: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            },
            process()
        );
    });
});
