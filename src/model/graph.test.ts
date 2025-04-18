import { assert, suite, test } from '@srhazi/gooey-test';

import { Graph, ProcessAction } from './graph';

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
            graph.addEdge(a, b);
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

        graph.addEdge(a, b);
        graph.addEdge(b, c);
        graph.process(); // trigger reorder

        // reordered: [a, b, c]
        assert.is(2, graph._test_getVertexInfo(c)?.index);
        assert.is(1, graph._test_getVertexInfo(b)?.index);
        assert.is(0, graph._test_getVertexInfo(a)?.index);

        graph.removeEdge(a, b);
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
        graph.addEdge(d, c);
        graph.addEdge(e, d);
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

        graph.addEdge(a, b);
        graph.addEdge(b, c);
        graph.addEdge(b, d);
        graph.addEdge(c, d);

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
            processor: (vertexGroup: Set<TNode>, action: ProcessAction) => void
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

            graph.addEdge(a, b);
            graph.addEdge(b, c);
            graph.addEdge(b, d);
            graph.addEdge(c, e);
            graph.addEdge(d, e);
            graph.addEdge(a, e);
            graph.addEdge(a, f);
            graph.addEdge(f, g);
            graph.addEdge(e, h);
            graph.addEdge(h, i);
            graph.addEdge(f, h);
            graph.addEdge(g, i);

            return graph;
        };

        suite('process', () => {
            test('nothing visited if nothing dirty', () => {
                const items: TNode[] = [];
                const graph = setup((vertexGroup) => {
                    for (const item of vertexGroup) {
                        items.push(item);
                    }
                });

                graph.process();

                assert.arrayIs([], items);
            });

            test('all nodes visited starting from dirty nodes', () => {
                const items: TNode[] = [];
                const graph = setup((vertexGroup) => {
                    const toPropagate = new Set<TNode>();
                    for (const vertex of vertexGroup) {
                        items.push(vertex);
                        for (const forward of graph.getForwardDependencies(
                            vertex
                        )) {
                            toPropagate.add(forward);
                        }
                    }
                    for (const vertex of toPropagate) {
                        if (!vertexGroup.has(vertex)) {
                            graph.markVertexDirty(vertex);
                        }
                    }
                });
                graph.markVertexDirty(a);

                graph.process();

                // we visit all nodes
                assert.arrayEqualsUnsorted([a, b, c, d, e, f, g, h, i], items);
            });

            test('nodes do not need to propagate', () => {
                const items: { item: TNode; action: ProcessAction }[] = [];
                const graph = setup((vertexGroup, action) => {
                    for (const item of vertexGroup) {
                        items.push({ item, action });
                    }
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

            test('propagation can be determined by callback (given c -> e; d -> e, and visiting c propagates but visiting d does not, we still visit e and all dependencies)', () => {
                const items: TNode[] = [];
                const graph = setup((vertexGroup, action) => {
                    const toPropagate = new Set<TNode>();
                    for (const item of vertexGroup) {
                        if (action === ProcessAction.RECALCULATE) {
                            items.push(item);
                        }
                        if (item !== c) {
                            for (const forward of graph.getForwardDependencies(
                                item
                            )) {
                                toPropagate.add(forward);
                            }
                        }
                    }
                    for (const item of toPropagate) {
                        if (!vertexGroup.has(item)) {
                            graph.markVertexDirty(item);
                        }
                    }
                });

                graph.markVertexDirty(c);
                graph.markVertexDirty(d);

                graph.process();

                // The order of d and c may change
                assert.arrayEqualsUnsorted([d, c], items.slice(0, 2));
                // But the order of the remaining nodes is guaranteed
                assert.arrayIs([e, h, i], items.slice(2));
            });

            test('propagation can be determined by callback (given c -> e; d -> e, and visiting c propagates but visiting d does not, we still visit e and all dependencies)', () => {
                const items: TNode[] = [];
                const graph = setup((vertexGroup, action) => {
                    const toPropagate = new Set<TNode>();
                    for (const item of vertexGroup) {
                        if (action === ProcessAction.RECALCULATE) {
                            items.push(item);
                        }
                        if (item !== c) {
                            for (const forward of graph.getForwardDependencies(
                                item
                            )) {
                                toPropagate.add(forward);
                            }
                        }
                    }
                    for (const item of toPropagate) {
                        if (!vertexGroup.has(item)) {
                            graph.markVertexDirty(item);
                        }
                    }
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

                const graph = setup((vertexGroup, action) => {
                    const toPropagate = new Set<TNode>();
                    for (const item of vertexGroup) {
                        if (action === ProcessAction.RECALCULATE) {
                            items.push(item);
                        }
                        for (const forward of graph.getForwardDependencies(
                            item
                        )) {
                            toPropagate.add(forward);
                        }
                    }
                    for (const item of toPropagate) {
                        if (!vertexGroup.has(item)) {
                            graph.markVertexDirty(item);
                        }
                    }
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

    suite('Processing behavior', () => {
        const a = { name: 'a' };
        const b = { name: 'b' };
        const c = { name: 'c' };
        const d = { name: 'd' };
        const e = { name: 'e' };

        interface TNode {
            name: string;
        }

        test('unrelated dirtied nodes created while processing are themselves processed', () => {
            const actions: { name: string; action: ProcessAction }[] = [];
            const graph = new Graph<TNode>(
                (vertexGroup: Set<TNode>, action: ProcessAction) => {
                    for (const node of vertexGroup) {
                        actions.push({ name: node.name, action });
                        if (
                            node === d &&
                            action === ProcessAction.RECALCULATE
                        ) {
                            graph.markVertexDirty(a);
                        }
                        if (action === ProcessAction.RECALCULATE) {
                            for (const forward of graph.getForwardDependencies(
                                node
                            )) {
                                graph.markVertexDirty(forward);
                            }
                        }
                    }
                }
            );
            graph.addVertex(a);
            graph.addVertex(b);
            graph.addEdge(a, b);
            graph.addVertex(c);
            graph.addVertex(d);
            graph.addVertex(e);
            graph.addEdge(c, d);
            graph.markVertexDirty(c);
            actions.splice(0, actions.length);
            graph.process();
            assert.deepEqual(
                [
                    { name: 'c', action: ProcessAction.RECALCULATE },
                    { name: 'd', action: ProcessAction.INVALIDATE },
                    { name: 'd', action: ProcessAction.RECALCULATE },
                    { name: 'a', action: ProcessAction.INVALIDATE },
                    { name: 'a', action: ProcessAction.RECALCULATE },
                    { name: 'b', action: ProcessAction.INVALIDATE },
                    { name: 'b', action: ProcessAction.RECALCULATE },
                ],
                actions
            );
        });
    });
});

suite('Graph Cycles', () => {
    const a = { name: 'a', __debugName: 'a' };
    const b = { name: 'b', __debugName: 'b' };
    const c = { name: 'c', __debugName: 'c' };
    const d = { name: 'd', __debugName: 'd' };
    const e = { name: 'e', __debugName: 'e' };
    const f = { name: 'f', __debugName: 'f' };

    interface TNode {
        name: string;
    }

    const setup = () => {
        let actionsPerNode: Record<string, ProcessAction[]> = {};
        const graph = new Graph<TNode>(
            (vertexGroup: Set<TNode>, action: ProcessAction) => {
                const toPropagate = new Set<TNode>();
                for (const node of vertexGroup) {
                    if (!actionsPerNode[node.name]) {
                        actionsPerNode[node.name] = [];
                    }
                    actionsPerNode[node.name].push(action);
                    if (
                        action === ProcessAction.RECALCULATE ||
                        action === ProcessAction.CYCLE
                    ) {
                        for (const forward of graph.getForwardDependencies(
                            node
                        )) {
                            toPropagate.add(forward);
                        }
                    }
                }
                for (const node of toPropagate) {
                    if (!vertexGroup.has(node)) {
                        graph.markVertexDirty(node);
                    }
                }
            }
        );
        const process = () => {
            actionsPerNode = {};
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

        graph.addEdge(a, b);
        graph.addEdge(b, c);
        graph.addEdge(c, d);
        graph.addEdge(d, b);
        graph.addEdge(c, e);
        // CYCLE actions are triggered by the engine once edges are added
        assert.deepEqual(
            {
                b: [ProcessAction.CYCLE],
                c: [ProcessAction.CYCLE],
                d: [ProcessAction.CYCLE],
                e: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            },
            process()
        );
        graph.markVertexDirty(a);

        // Subsequent invalidations treat cycle groups as individual units (b,c,d) are INVALIDATE and RECALCULATE as one unit
        assert.deepEqual(
            {
                // A: Only recalculated, it was invalidated when dirtied
                a: [ProcessAction.RECALCULATE],
                // B, C, and D: invalidated when dirtied by A, recalculated because cycles that are dirtied need to be recalculated to determine if they have been broken; no re-CYCLE is triggered (TODO: is this correct?)
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
        graph.addEdge(a, b);
        graph.addEdge(b, c);
        graph.addEdge(c, d);
        graph.addEdge(d, b);
        graph.addEdge(c, e);
        process(); // allow cycle to be detected
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
        graph.removeEdge(d, b);
        graph.markVertexDirty(a);

        assert.deepEqual(
            {
                a: [ProcessAction.RECALCULATE],
                b: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
                c: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
                d: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE], // although no longer root, recalculated as it was a broken cycle
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
        //    v
        // +->b
        // |  |
        // |  v
        // +--c -> [e]
        // |  |
        // |  v
        // +--d -> [f]
        graph.addEdge(a, b);
        graph.addEdge(b, c);
        graph.addEdge(c, b);
        graph.addEdge(c, d);
        graph.addEdge(c, e);
        graph.addEdge(d, b);
        graph.addEdge(d, f);
        process();
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
        //    v
        // +->b
        // |  |
        // |  v
        // +--c -> [e]
        //    |
        //    v
        //    d -> [f]
        graph.removeEdge(d, b);
        graph.markVertexDirty(a);

        const results = process();
        assert.deepEqual([ProcessAction.RECALCULATE], results.a);
        assert.deepEqual(
            [
                ProcessAction.INVALIDATE,
                ProcessAction.RECALCULATE,
                ProcessAction.CYCLE, // recalculate-cycle as it has already been notified
            ],
            results.b
        );
        assert.deepEqual(
            [
                ProcessAction.INVALIDATE,
                ProcessAction.RECALCULATE,
                ProcessAction.CYCLE, // recalculate-cycle as it has already been notified
            ],
            results.c
        );
        assert.deepEqual(
            [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            results.d
        );
        assert.deepEqual(
            [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            results.e
        );
        assert.deepEqual(
            [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            results.f
        );
    });

    test('cycle type: ring', () => {
        const { graph, process } = setup();
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addVertex(c);
        graph.addVertex(d);
        graph.addVertex(e);

        graph.addEdge(a, b);

        graph.addEdge(b, c);
        graph.addEdge(c, d);
        graph.addEdge(d, b);

        graph.addEdge(c, e);

        assert.deepEqual(
            {
                b: [ProcessAction.CYCLE],
                c: [ProcessAction.CYCLE],
                d: [ProcessAction.CYCLE],
                e: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
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

        graph.addEdge(a, b);

        graph.addEdge(b, c);
        graph.addEdge(c, b);

        graph.addEdge(c, d);

        assert.deepEqual(
            {
                b: [ProcessAction.CYCLE],
                c: [ProcessAction.CYCLE],
                d: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
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
        graph.addEdge(a, b);

        graph.addEdge(b, c);
        graph.addEdge(c, d);

        graph.addEdge(b, e);
        graph.addEdge(e, d);

        graph.addEdge(d, f);

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
        graph.addEdge(d, b);
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

        graph.addEdge(a, b);
        graph.addEdge(b, c);
        graph.addEdge(b, e);
        graph.addEdge(c, d);
        graph.addEdge(d, b);
        graph.addEdge(d, f);
        graph.addEdge(e, d);

        assert.deepEqual(
            {
                b: [ProcessAction.CYCLE],
                c: [ProcessAction.CYCLE],
                d: [ProcessAction.CYCLE],
                e: [ProcessAction.CYCLE],
                f: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
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

        graph.addEdge(a, b);

        graph.addEdge(b, c);
        graph.addEdge(c, b);

        graph.addEdge(c, d);

        graph.addEdge(d, e);
        graph.addEdge(e, d);

        graph.addEdge(e, f);

        assert.deepEqual(
            {
                b: [ProcessAction.CYCLE],
                c: [ProcessAction.CYCLE],
                d: [
                    ProcessAction.INVALIDATE, // b<->c cycle points to d, so we get invalidated after that is processed
                    ProcessAction.CYCLE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                e: [
                    ProcessAction.INVALIDATE, // b<->c cycle points to d, so we get invalidated after that is processed
                    ProcessAction.CYCLE,
                    ProcessAction.RECALCULATE,
                    ProcessAction.CYCLE,
                ],
                f: [ProcessAction.INVALIDATE, ProcessAction.RECALCULATE],
            },
            process()
        );
    });

    test('cycle type: self cycle', () => {
        const { graph, process } = setup();
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addVertex(c);

        graph.addEdge(a, b);
        graph.addEdge(b, b);
        graph.addEdge(b, c);

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

    test('cycle type: self cycle after dependency change', () => {
        let log: any[] = [];
        let addSelfEdge = false;
        const graph = new Graph<TNode>(
            (vertexGroup: Set<TNode>, action: ProcessAction) => {
                const toPropagate = new Set<TNode>();
                for (const node of vertexGroup) {
                    log.push({ node, action });
                    if (
                        node === b &&
                        action === ProcessAction.RECALCULATE &&
                        addSelfEdge
                    ) {
                        graph.addEdge(b, b);
                    }
                    if (action === ProcessAction.RECALCULATE) {
                        for (const forward of graph.getForwardDependencies(
                            node
                        )) {
                            toPropagate.add(forward);
                        }
                    }
                }
                for (const node of toPropagate) {
                    if (!vertexGroup.has(node)) {
                        graph.markVertexDirty(node);
                    }
                }
            }
        );
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addEdge(a, b);

        graph.markVertexDirty(a);
        graph.process();

        assert.deepEqual(
            [
                { node: a, action: ProcessAction.INVALIDATE },
                { node: a, action: ProcessAction.RECALCULATE },
                { node: b, action: ProcessAction.INVALIDATE },
                { node: b, action: ProcessAction.RECALCULATE },
            ],
            log
        );

        log = [];
        addSelfEdge = true;
        graph.markVertexDirty(a);
        graph.process();

        assert.deepEqual(
            [
                { node: a, action: ProcessAction.INVALIDATE },
                { node: a, action: ProcessAction.RECALCULATE },
                { node: b, action: ProcessAction.INVALIDATE },
                { node: b, action: ProcessAction.RECALCULATE },
                { node: b, action: ProcessAction.CYCLE },
                { node: b, action: ProcessAction.CYCLE },
            ],
            log
        );
    });

    test('cycle type: self cycle after dependency change that gets fixed', () => {
        let log: any[] = [];
        let addSelfEdge = false;
        let removeSelfEdge = false;
        const graph = new Graph<TNode>(
            (vertexGroup: Set<TNode>, action: ProcessAction) => {
                const toPropagate = new Set<TNode>();
                for (const node of vertexGroup) {
                    log.push({ node, action });
                    if (node === b && action === ProcessAction.RECALCULATE) {
                        if (removeSelfEdge) {
                            graph.removeEdge(b, b);
                        }
                        if (addSelfEdge) {
                            graph.addEdge(b, b);
                        }
                    }
                    if (action === ProcessAction.RECALCULATE) {
                        for (const forward of graph.getForwardDependencies(
                            node
                        )) {
                            toPropagate.add(forward);
                        }
                    }
                }
                for (const node of toPropagate) {
                    if (!vertexGroup.has(node)) {
                        graph.markVertexDirty(node);
                    }
                }
            }
        );
        graph.addVertex(a);
        graph.addVertex(b);
        graph.addEdge(a, b);

        graph.markVertexDirty(a);
        graph.process();

        assert.deepEqual(
            [
                { node: a, action: ProcessAction.INVALIDATE },
                { node: a, action: ProcessAction.RECALCULATE },
                { node: b, action: ProcessAction.INVALIDATE },
                { node: b, action: ProcessAction.RECALCULATE },
            ],
            log
        );

        log = [];
        addSelfEdge = true;
        graph.markVertexDirty(a);
        graph.process();

        assert.deepEqual(
            [
                { node: a, action: ProcessAction.INVALIDATE },
                { node: a, action: ProcessAction.RECALCULATE },
                { node: b, action: ProcessAction.INVALIDATE },
                { node: b, action: ProcessAction.RECALCULATE },
                { node: b, action: ProcessAction.CYCLE },
                { node: b, action: ProcessAction.CYCLE }, // Note: this redundant CYCLE notification is probably fixable, but I don't care.
            ],
            log
        );

        log = [];
        addSelfEdge = false;
        removeSelfEdge = true;
        graph.markVertexDirty(a);
        graph.process();

        assert.deepEqual(
            [
                { node: a, action: ProcessAction.INVALIDATE },
                { node: a, action: ProcessAction.RECALCULATE },
                { node: b, action: ProcessAction.INVALIDATE },
                { node: b, action: ProcessAction.RECALCULATE },
            ],
            log
        );
    });
});
