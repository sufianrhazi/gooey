import { DAG } from './dag';
import { suite, test, beforeEach, assert } from './test';

suite('DAG', () => {
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
        const dag = new DAG<TNode>();
        assert.is(true, dag.addNode(a));
        assert.is(false, dag.addNode(a));
    });

    test('addEdge fails if nodes not added', () => {
        const dag = new DAG<TNode>();
        assert.throwsMatching(
            /cannot add edge from node that does not exist/,
            () => {
                dag.addEdge(a, b, DAG.EDGE_HARD);
            }
        );
    });

    test('getDependencies gets dependencies', () => {
        const dag = new DAG<TNode>();
        dag.addNode(a);
        dag.addNode(b);
        dag.addNode(c);
        dag.addNode(d);

        dag.addEdge(a, b, DAG.EDGE_HARD);
        dag.addEdge(b, c, DAG.EDGE_HARD);
        dag.addEdge(b, d, DAG.EDGE_HARD);
        dag.addEdge(c, d, DAG.EDGE_HARD);

        assert.arrayIs([b], dag.getDependencies(a));
        assert.arrayIs([c, d], dag.getDependencies(b));
        assert.arrayIs([d], dag.getDependencies(c));
        assert.arrayIs([], dag.getDependencies(d));
        assert.arrayIs([], dag.getDependencies(e));
    });

    suite('complex graph', () => {
        let dag = new DAG<TNode>();

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
            dag = new DAG<TNode>();

            dag.addNode(a);
            dag.addNode(b);
            dag.addNode(c);
            dag.addNode(d);
            dag.addNode(e);
            dag.addNode(f);
            dag.addNode(g);
            dag.addNode(h);
            dag.addNode(i);

            dag.addEdge(a, b, DAG.EDGE_HARD);
            dag.addEdge(b, c, DAG.EDGE_HARD);
            dag.addEdge(b, d, DAG.EDGE_HARD);
            dag.addEdge(c, e, DAG.EDGE_HARD);
            dag.addEdge(d, e, DAG.EDGE_HARD);
            dag.addEdge(a, e, DAG.EDGE_HARD);
            dag.addEdge(a, f, DAG.EDGE_HARD);
            dag.addEdge(f, g, DAG.EDGE_HARD);
            dag.addEdge(e, h, DAG.EDGE_HARD);
            dag.addEdge(h, i, DAG.EDGE_HARD);
            dag.addEdge(f, h, DAG.EDGE_HARD);
            dag.addEdge(g, i, DAG.EDGE_HARD);

            dag.retain(i); // the end node is retained
        });

        suite('process', () => {
            test('nothing visited if nothing dirty', () => {
                const items: TNode[] = [];

                dag.process((item) => {
                    items.push(item);
                    return true;
                });

                assert.arrayIs([], items);
            });

            test('all nodes visited starting from dirty nodes', () => {
                dag.markNodeDirty(a);

                const items: TNode[] = [];

                dag.process((item) => {
                    items.push(item);
                    return false;
                });

                // we visit all nodes
                assert.arrayEqualsUnsorted([a, b, c, d, e, f, g, h, i], items);
            });

            test('nodes that do not lead to reatined nodes are not visited', () => {
                dag.release(i); // no nodes are retained now
                dag.retain(e);
                dag.retain(f);

                dag.markNodeDirty(a);
                dag.markNodeDirty(i);

                const items: TNode[] = [];

                dag.process((item) => {
                    items.push(item);
                    return false;
                });

                // we visit only nodes up to e and f
                assert.arrayEqualsUnsorted([a, b, c, d, e, f], items);
            });

            test('nodes reached that are not retained are removed', () => {
                dag.release(i); // no nodes are retained now
                dag.retain(e);
                dag.retain(f);

                dag.markNodeDirty(a);
                dag.markNodeDirty(i);

                dag.process((item) => {
                    return false;
                });

                assert.is(false, dag.hasNode(g));
                assert.is(false, dag.hasNode(h));
                assert.is(false, dag.hasNode(i));
            });

            test('nodes can stop traversal by returning true', () => {
                dag.markNodeDirty(a);

                const items: TNode[] = [];

                dag.process((item) => {
                    items.push(item);
                    return true;
                });

                // we only visit a nodes
                assert.arrayIs([a], items);
            });

            test('given c -> e; d -> e, and visiting c returns true but visiting d returns false, we still visit e and all dependencies', () => {
                dag.markNodeDirty(c);
                dag.markNodeDirty(d);

                const items: TNode[] = [];

                dag.process((item) => {
                    items.push(item);
                    if (item === c) return true;
                    return false;
                });

                // The order of d and c may change
                assert.arrayEqualsUnsorted([d, c], items.slice(0, 2));
                // But the order of the remaining nodes is guaranteed
                assert.arrayIs([e, h, i], items.slice(2));
            });

            test('given c -> e; d -> e, and visiting c returns true but visiting d returns false, we still visit e and all dependencies', () => {
                dag.markNodeDirty(b);

                const items: TNode[] = [];

                dag.process((item) => {
                    items.push(item);
                    if (item === c) return true;
                    return false;
                });

                // The first item visited is the dirty root
                assert.arrayIs([b], items.slice(0, 1));
                // The order of d and c may change
                assert.arrayEqualsUnsorted([d, c], items.slice(1, 3));
                // But the order of the remaining nodes is guaranteed
                assert.arrayIs([e, h, i], items.slice(3));
            });

            test('dirty nodes visited in topological order', () => {
                dag.markNodeDirty(a);

                const items: TNode[] = [];

                dag.process((item) => {
                    items.push(item);
                    return false;
                });

                function assertBefore(fromNode: TNode, toNode: TNode) {
                    const fromIndex = items.indexOf(fromNode);
                    const toIndex = items.indexOf(toNode);
                    assert.isNot(-1, fromIndex, 'fromNode not found');
                    assert.isNot(-1, toIndex, 'toNode not found');
                    assert.lessThan(fromIndex, toIndex);
                }

                function visit(root: TNode) {
                    dag.getDependencies(root).forEach((dependency) => {
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
        let dag = new DAG<TNode>();

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
            dag = new DAG<TNode>();

            dag.addNode(a);
            dag.addNode(b);
            dag.addNode(c);
            dag.addNode(d);
            dag.addNode(e);
            dag.addNode(f);
            dag.addNode(g);
            dag.addNode(h);
            dag.addNode(i);

            dag.addEdge(a, b, DAG.EDGE_HARD);
            dag.addEdge(b, c, DAG.EDGE_HARD);
            dag.addEdge(b, d, DAG.EDGE_HARD);
            dag.addEdge(c, e, DAG.EDGE_HARD);
            dag.addEdge(d, e, DAG.EDGE_HARD);
            dag.addEdge(a, e, DAG.EDGE_HARD);
            dag.addEdge(a, f, DAG.EDGE_SOFT);
            dag.addEdge(f, g, DAG.EDGE_SOFT);
            dag.addEdge(e, h, DAG.EDGE_SOFT);
            dag.addEdge(h, i, DAG.EDGE_HARD);
            dag.addEdge(f, h, DAG.EDGE_HARD);
            dag.addEdge(g, i, DAG.EDGE_HARD);

            dag.retain(i);
        });

        suite('process', () => {
            test('nothing visited if nothing dirty', () => {
                const items: TNode[] = [];

                dag.process((item) => {
                    items.push(item);
                    return true;
                });

                assert.arrayIs([], items);
            });

            test('all nodes reachable from hard edges visited', () => {
                dag.markNodeDirty(a);

                const items: TNode[] = [];

                dag.process((item) => {
                    items.push(item);
                    return false;
                });

                // we visit all nodes reachable for those with soft edges
                assert.arrayEqualsUnsorted([a, b, c, d, e], items);
            });

            test('soft edges, despite not being visited dictate topological order', () => {
                dag.markNodeDirty(a);
                dag.markNodeDirty(f);

                const items: TNode[] = [];

                dag.process((item) => {
                    items.push(item);
                    return false;
                });

                function assertBefore(fromNode: TNode, toNode: TNode) {
                    const fromIndex = items.indexOf(fromNode);
                    const toIndex = items.indexOf(toNode);
                    assert.isNot(-1, fromIndex, 'fromNode not found');
                    assert.isNot(-1, toIndex, 'toNode not found');
                    assert.lessThan(fromIndex, toIndex);
                }

                function visit(root: TNode) {
                    dag.getDependencies(root).forEach((dependency) => {
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
