# The Design of Gooey

There are a few concepts in Gooey that are “core” to its behavior and function: the directed graph, the data/calculation
layer, and the render node. Each of these are somewhat independent from one another, yet together form a cohesive system
that allows for building applications with ease.

Taking a 3,000 ft view of the system, Gooey can best be thought of as a directed graph of dependencies which triggers
the calculation and recalculation of data that feeds both back into the internal structure of the directed graph and a
tree of visual representation. 


## The Directed Graph

The directed graph is a fully dynamic directed graph: vertices and edges may be added and removed at any time. This
poses a main challenge: maintaining the topological ordering after each batch of vertex/edge additions/removals.

Nodes in the graph represent either calculations, pieces of atomic data, fan-out subscriptions, fan-in triggers, or
topological ordering constraints. All vertices in the graph have a “dirty” bit, which is set when the vertex’s
underlying data is modified/invalidated. When a dirty vertex is processed, it’s dirtiness is cleared and depending on
the result of the process, causes destination vertices to have their dirty bit set. All vertices in the graph also have
a “root” bit and a “reaches root” bit, which represents whether or not a vertex represents a value that is actively used
by the system or reaches a vertex that is “root”. More on this “root” bit later.

Importantly, calculations that are vertices in the graph are treated as if they are pure calculations: computing their
value multiple times will not produce different results. This property means that we can cache and reuse the result of a
calculation when accessed until it is dirtied.

Edges in the graph have two colors: “hard” edges, which represent data dependencies that propagate; and “soft” edges,
which exist solely to maintain topological ordering.


### Topological Ordering

When producing a graph of dependencies, one needs to choose a direction of the edge’s arrow. Does an arrow go from a
dependent vertex that relies on a source vertex’s data? Or does an arrow go “in the direction of the flow of data,”
where a source vertex will point to all of the vertices that consume its data? Gooey chooses the latter: arrows go in
the direction of the flow of data.

For example, consider the calculations:
* a = b + c + e
* b = c + d

The graph of this would look like:
* d -> b
* c -> b
* e -> a
* c -> a
* b -> a

And a topological ordering of this graph would be: d, c, b, e, a. Note that every arrow in the list above goes from left
to right in this ordering.

This ordering is important, and represents a valid ordering of recalculation. For example, if both e and c were to
change, we would want to recalculate b before recalculating a. Visually, given a linear topological ordering, arrows
will always go from left to right.

Given that arrows flow in the direction of the topological order, and that propagation of dirtiness also goes in the
same direction, we can sweep through the vertices in the graph, process dirty vertices, propagate dirtiness, and (in
case of no added edges while processing) proceed to the end of the graph in a linear fashion.

Four cases need to be considered when processing a node:
1. A new node is added to the graph
2. An existing node is removed from the graph
3. A new edge is added to the graph
4. An existing edge is removed from the graph

Keeping in mind that a topological ordering means arrows go from left to right, the only thing that could possibly break
a topological ordering is the addition of an edge that goes in the opposite direction. Currently, Gooey uses a minor
variation on the Pearce Kelly algorithm to maintain the topological ordering in this case
(https://whileydave.com/publications/pk07_jea/) while supporting cycles.


### Handling Cycles

One edge case not explicitly handled by the Pearce Kelly algorithm is that of handling cycles/strongly connected
components. Gooey allows for cycles in the directed graph to exist.

Note: The term cycle to mean a set of vertices that can all reach each other. This set may have a size of one.

In this case, for the purposes of the graph, all nodes in a cycle are treated as a single unit:
* If any of the cycle vertices are marked as “dirty” they all are marked as “dirty”
* If any of the cycle vertices are processed, they are all processed (in arbitrary order) and dirtiness is propagated
  only to vertices that are not members of the cycle.

When an edge is added that introduces a cycle, that edge will go from right to left. In every cycle there is at least
one edge that goes in the wrong direction. If an edge that connects two vertices in a cycle is removed there are two
cases to consider:

If the removed edge goes in the correct direction, the cycle may be broken. If broken, there exists at least one edge in
the cycle that goes in the wrong direction. In this case, the topological order of the subgraph reachable/that reaches
the vertices needs to be reordered. Tarjan’s strongly connected components algorithm is used to reorder the reachable
subgraph in this case: identify the subgraph via a DFS traversal forward and backward, then perform the algorithm on the
subgraph.

If the edge goes in the wrong direction, no adjustments to the topological ordering need to be performed. (This is a
bold statement. Can a proof be demonstrated? Does this apply if edges are added to vertices in the middle of a cycle?)

**Open question**: when sorting and assigning vertices in a cycle, do we ever put anything in the middle of a cycle? We
should not.

Given:
* a b c d e
* a->b->d->e->a
* And an addition: c->d
* We should place c before a as in: c a b d e
* This is since the component really “lives” at the first index of a cycle.


### Graph Processing

The goal of graph processing is to visit all of the vertices marked as dirty and get them marked as not dirty.
Processing the graph is a coroutine operation, where a set of actions is produced and in response a Boolean is returned,
which indicates whether or not dirtiness should be propagated.

When visiting a dirty node, one of three things happens:
* If the vertex does not reach a root vertex, it emits an invalidation action.
* If the vertex is part of a cycle, it emits a cycle action.
* Otherwise, a recalculate action is emitted.

While the graph doesn’t concern itself with what these actions perform, in practice:
* Invalidation events clear cached data associated with the vertex. These always propagate dirtiness.
* Cycle events raise an error. These propagate dirtiness if the error is caught and the value produced is equal to the
  prior value.
* Recalculation events cause the calculation associated with the vertex to be re-executed. Propagation occurs if the
  value produced is equal to the prior value.

The naive procedure of processing the graph is to iterate through the dirty vertices in topological order of the graph.
Upon discovering a dirty vertex:
* If it cannot reach a root, emit an invalidation and propagate dirtiness
* If it reaches a root and is part of a cycle, emit a cycle and conditionally propagate dirtiness
* If it reaches a root and is not part of a cycle, emit a recalculation and conditionally propagate dirtiness

After processing a dirty vertex, perform any pending vertex/edge additions and removals caused by processing while
maintaining topological order. Proceed to the dirty vertex with lowest priority order. This ordering of dirty vertices
can be maintained with a priority queue that supports reassigning weights.

It is possible to pre-calculate and maintain the “reaches root” bit on all vertices:
* When a vertex is marked as root, mark the vertex also as reaching root. Mark all vertices reaching this vertex as
  reaching root via reverse DFS (abort if the DFS reaches a vertex that has the “reaches root” bit set)
* When a edge is added to a vertex marked as “reaches root”, perform the same mark as “reaches root” DFS.
* When a vertex is unmarked as root or an edge is removed from a vertex that reaches root. Perform the following:
    * If it is not “root” and none of the vertices it immediately reaches have “reaches root” set, clear the “reaches
      root” state. Repeat this recursively for all vertices that immediately reach that vertex.
* As a precaution, prevent vertices from being removed if they have the “root” bit set.

Once all dirty vertices are processed, the operation is complete.

It is possible for this algorithm to loop indefinitely. To avoid this, a process limit can be imposed (either per-vertex
or globally).


## The Data/Calculation Layer

There exists a layer of abstraction around the directed graph that allows for the system to be used effectively. These
abstractions represent one (or multiple in some cases) vertex in the graph. In total there are:

* calculations: cacheable functions which calculate a value
* fields: cells which hold a value
* models & collections: groups of fields which are related
* ordering nodes: inert vertices that only exist to constrain topological ordering


### Calculations

A calculation exists on the directed graph as a single vertex. They only get dirtied via propagation.

The calculation abstraction represents a “pure” function which takes no arguments and should produce the same value if
the data it reads is unchanged. Calculations may also hold an error handler, which handles error states and cycle
states. A calculation may be in an error state, in which any calls to it raise an exception. A calculation may be a
special “effect” calculation, which means it does not return any value.


#### Calculation Execution

When a calculation’s function is being executed, all calls to other calculations (cached or uncached) or fields are
tracked. The only exception is when a calculation calls an “effect” calculation, which does not return a value and as a
result cannot cause data to flow from effect to callee. These tracked accesses are added to the directed graph as
inbound, “hard” edges: from the item being accessed (either a calculation or a field) and to the calculation performing
the access. Each execution replaces all inbound “hard” edges.

This tracking of access is shallow. That is to say:
* There is a stack of active calculations
* When a calculation starts execution it is added pushed on the top of the stack
* When a calculation finishes execution (either naturally or via exception) it is popped off the top of the stack
* Tracking only impacts the calculation on the top of the stack

For example, if a calculation’s function (A) is called, which calls another calculation’s function (B), which accesses a
field (C), the resulting hard edges added are:
* C -> B
* B -> A

Sometimes it is desirable to avoid this tracking. In this case a sentinel untracked value can be pushed to the stack of
calculations, call a function, and then pop the sentinel off the stack. When accesses occur while this sentinel value is
on top of the stack, no tracking is necessary. This is called executing a function in an “untracked” context.


#### Calculation Caching

All calculations have their results cached. A calculation may be invalidated, which discards the cached result if it
exists.

Additionally, calculations have an equality comparator. By default this comparator is strict reference equality.

If a cached calculation is recalculated, if the recalculated result compares equal to the cached result, the newly
produced result is discarded and the cached result is kept.

When a calculation is called, the calculation is treated as an access with respect to tracking. If the calculation is
cached, the cached value is returned. If the calculation is uncached, the underlying function is executed, it’s result
cached, and that value is returned.


#### Calculation Error Handling

Calculations have an error state, which is initially clear, and an optional error handler which is not set.

The optional error handler is a function that takes one parameter, a value which indicates the error was due to a cycle
or due to an exception.

The error handler is always executed in an “untracked” context.

When a calculation’s function is executed, all exception are caught. If an error handler is present, it is called with a
value that indicates the error was due to an exception and the return value of the error handler is used as if it was
the return value of the function (including equality comparison of the cached value). On completion of an error handler,
the calculation is popped off the global tracking stack, and inbound edge replacement proceeds as normal. This means
that only accesses that occur during the execution of the function (not during the execution of the error handler) are
tracked in the directed graph.

If an exception is caught and there is no error handler present, the error state is set on the calculation so that
further calls raise an exception, the calculation is popped off the global tracking stack, inbound edge replacement
proceeds as normal, and the caught exception is re-thrown. This means that access that occur during the execution of the
function prior to the exception are tracked in the directed graph.

The error state is cleared when the calculation is recalculated or when the calculation is invalidated.

A calculation in a non-error state may be informed that it participates in a cycle. In this case if there is no error
handler the calculation’s cache is cleared and is set to an error state. If there is an error handler, it is called with
a value that indicates the error is due to a cycle and the returned value is set to the cache if unequal to the value in
cache.


#### Calculation Behavior

This strict set of behaviors around caching, data tracking, and error handling are specifically chosen so that the
maintained topological ordering of the directed graph holds the quality that data accesses are placed before all things
doing the access. This allows us to intelligently recalculate functions only when their data dependencies have changed.
In other words, caching should be “perfect” with no need to choose specific cache keys that need to be invalidated for
classes of calculations, or no need to manually invalidate cached calculations.

For example, let’s look at the following function that we’ll call X:

```
calc(() => {
  if (A()) return B();
  if (C()) return D();
  return E();
})
```

There are three possible variations of the directed graph when calling X:
1. If `A()` returns true, then `X` depends on `A` and `B`.
2. If `A()` returns false and `C()` returns true, then `X` depends on `A` and `C` and `D`.
3. If `A()` returns false and `C()` returns false, then `X` depends on `A` and `C` and `E`.

This is to say that in case 2, we know for a fact that the return value does not and cannot depend on `B`, so we do not
need to recalculate/invalidate `X` if `B` were to change. 

Similarly in case 2, if `C` were to throw an exception, the effect of this exception depends on the fact that `A` was
called and returned a value that was true. If `A` were to change, even though the calculation is in an error state, it
could be that `A` now returns a value such that `C` is never called—so we should recalculate `X` if `A` were to change
even if `X` is in the error state.

In other words, we always know what values depend on the result of calculating `X`, so we know exactly when to
recalculate/invalidate `X`.

If you are familiar with React hooks, you may recognize that the list of dependencies that React hooks forces you to
list explicitly when using `useMemo()` is the set of all possible data accesses, not the set of data accesses that
matter for each invocation. This is strikingly different than gooey, which performs the work of automatically tracking
only the values that the function uses.


#### Calculation Processing

While the directed graph is processing, it emits one of three actions: invalidation, recalculation, and cycle.
* On an invalidation event, the calculation’s cache is discarded and the error state is cleared. Propagation occurs if
  the calculation was cached.
* On a recalculation event, the calculation’s underlying function is executed. Propagation occurs if the calculation is
  uncached.
* On a cycle event
    * If there is no error handler for the calculation, the calculation is invalidated and placed in an error state.
      Propagation occurs if the calculation was not in an error state.
    * If there is an error handler, it is called and the result is handled in the same manner as if it was the result of
      a recalculation event. Propagation occurs if the calculation was not cached or the error handler’s return value
      does not equal the prior cached value.


### Fields

A field exists on the digraph as a single vertex. No hard edges point to fields.

Fields are simply a variable cell that holds mutable values.

Internally, fields are never solo items, their reads and writes are managed by the TrackedData structure.

Although fields may be processed by the directed graph, they are effectively inert and do not do anything on any event.


### Models, Collections, and DataViews

Models, Collections, and DataViews are all part of the TrackedData abstraction and share a core implementation.
* A model is a bag of key-field pairs, with an extra “keys” field which holds the set of keys
* A collection is model which has an ordered list of fields (keys are integers starting from “0”), with an extra
  “length” field which holds the size of the list
* A DataView is a derived, read-only collection

A TrackedData structure exists on the graph as zero to two vertices in addition to the fields it owns. The optional
vertices are the Subscription Emitter vertex and the Subscription Consumer vertex.

A TrackedData structure may be observed for changes. A queue of field events is kept internally.

When a new field is added to a TrackedData  structure (which happens on the first access or write to that field) if the
structure is being observed, a soft edge from the field to the Subscription Emitter vertex is added and an “add” event
is queued for the field’s name. If the structure is derived from another TrackedData structure, a soft edge from the
Subscription Consumer vertex to the field is added.

When a field is removed from a TrackedData structure (which is performed explicitly for models, or implicitly when items
are removed from a collection), if the structure is being observed, a soft edge from the field to the Subscription
Emitter vertex is removed and a “remove” event is queued for the field’s name. If the structure is derived from another
TrackedData structure, a soft edge from the Subscription Consumer vertex to the field is removed. The field is released
and removed from the directed graph.

When a field is accessed, the top of stack of active calculations is examined and if present, a hard edge from the field
to the active calculation is added to the directed graph.

When a field is written to, if the new value is unequal to the old value, the field marks its vertex as dirty. If the
TrackedData structure has observers, the Subscription Emitter vertex is marked as dirty and a “set” event is queued. Has
the value set for the field.

Collection and View structures have three additional operations that can occur:
* splice(index: int, count: int, add: T[]) - removes count items from index, then inserts add items at that index. If
  subscribed, this emits a “splice” event with the same arguments. If the length of the list changes, all of the fields
  greater than or equal to the index are dirtied and the “length” field is dirtied. Otherwise only the fields from index
  to index + count are dirtied
* move(fromIdx: int, count: int, toIdx: int) - removes count items from the fromIdx index, then inserts the removed
  items at the toIdx index. If subscribed, this emits a “move” event with the same arguments. All of the affected fields
  are dirtied (fields from fromIdx to fromIdx + count unioned with fields from toIdx to toIdx + count)
* sort(index: int, indexes: int[]) - reorders the indexes starting from index using the provided indexes (not relative).
  If subscribed, this queues a “sort” event with the same arguments. All of the affected fields are dirtied


#### Subscription Emitter Behavior

When a TrackedData structure is observed (for the first time), a new Subscription Emitter vertex is created, a soft edge
from each existing field to the Subscription Emitter vertex is added, and a queue is initialized. Each TrackedData
subscription has an index into the queue starting from the end of the queue (so each subscription can receive the events
queued after the subscription was created).

Subscription Emitter vertices can be processed by the directed graph.

On an invalidation event, nothing occurs. One of the unfortunate consequences is this design is that subscriptions must
“push” their changes to consumers even if those consumers do not lead to a root vertex.

On a cycle event, nothing occurs. This should not happen in practice.

On a recalculate event, the queue is flushed: for each subscription, notify the subscription callback of each item in
the queue starting from the subscription’s index. Then empty the queue and set all subscription indexes to 0.
Propagation occurs if the queue was not empty.


#### Subscription Consumer Behavior

Some TrackedData structures are derived. For these structures they are created with a Subscription Consumer vertex.
These TrackedData structures subscribe to their source TrackedData structure and queue all received events internally.

These Subscription Consumer vertices can be processed by the directed graph.

On an invalidation event, nothing occurs (for similar reasons)

On a cycle event, nothing occurs. This should not happen.

On a recalculate event, the queue of subscribed events is processed. This allows the derived TrackedData structures to
react according to the events received.


#### Types of DataViews

For collections, there are mapped views, filtered views, flat mapped views, and sorted views.

Mapped views are straightforward: each “set” and “splice” added item is transformed by a function prior to being
handled.

Filtered views are a specialization of flatMapped views.

FlatMapped views are tricky. There may be a more efficient representation for this. But if internally an unflattened
list is maintained, it can be scanned to determine the index of the flattened list for a target item.

Sorted views are similarly tricky. Splice events need to be broken into individual delete and insert operations, which
can be performed with binary search. Move and sort events can be ignored.

It seems possible to create additional more “dynamic” versions of this — like a filtered or sorted collection where the
filter or sort function is a calculation. This hasn’t been given much thought.


#### Why Fan In/Fan Out?

The fan in of subscription emitter vertices and fan out of subscription consumer vertices gives us some guarantees:
* Soft orderings give us guarantees that consumers are recalculated before fields, which are recalculated before
  emitters
* Fan in/out allows for limiting the number of edges in the directed graph when multiple subscriptions are created on
  the same TrackedData structure
* Separating emitters from consumers allow for other types of subscriptions: the view layer uses subscriptions without a
  consumer


## The RenderNode

What we have discussed so far is a system that can recalculate calculations efficiently and cache their results
automatically. However the overall goal of Gooey is to have a framework for building user interfaces.

It should be noted that while this system uses the web browser DOM to produce UI, this could be applied to any system.

The DOM is a large tree structure consisting of Text, Element, and other lesser used nodes. Our goal is to produce a
more rich tree structure that allows for:
* Calculation nodes, which bind their calculated and recalculated results to the DOM
* Intrinsic nodes, which can take calculations as properties, which bind their values to the intrinsic DOM node’s
  attributes and/or IDL properties
* Array nodes, which allow for rendering of lists of subtrees
* Collection nodes, which dynamically render lists of subtrees as the collection changes
* Component nodes to abstract around native DOM nodes and can perform actions on mount (when added to the DOM) and
  unmount (when removed from the DOM)
* Contextual state to be shared between sub-trees
* Subtrees to be temporarily removed from the DOM and then added back to the DOM (even in a different location) without
  destroying and recreating the underlying Text and Element nodes
* Subtrees to be monitored for the addition and removal of real DOM nodes

All of this can be accomplished with the RenderNode interface


### The RenderNode Interface

A RenderNode is an abstraction around DOM nodes. It has a lifecycle that is notably different than lifecycles present in
other UI libraries and frameworks:
* It is rendered exactly once
* It may be mounted to the DOM and I mounted from the DOM any number of times
* It is destroyed once, after being unmounted

Additionally, a RenderNode is a consumer of a stream of events that manipulate the DOM. The events are as follows:
* splice(index: int, count: int, add: Node[]) - an event that says a splice operation should occur, removing count items
  starting from index, and then inserting add items starting from index
* move(fromIdx: int, count: int, toIdx: int) - an event that says a move operation should occur, removing count items
  starting from fromIdx, and then inserting those removed items starting from toIdx
* sort(index: int, indexes: int[]) - an event that says a sort should be performed on items starting from index,
  reordered using indexes in indexes

These events may look familiar: they are the same events that allow for subscribing to collections.

The reason for these specific set of events is best demonstrated as follows. Let’s say some UI required a single DOM
node to have a dynamic list of “left” children; followed by a fixed “middle” child; followed by a different dynamic list
of “right” children.

In this case, we could have three abstractions competing for the same surface area: the single DOM node parent. However
if we imagine a tree of filters which take these splice/move/sort events and adjust them based on their behavior, a node
could keep track of the quantity of the “left” collection’s DOM nodes, the “middle” child’s DOM nodes, and the “right”
collection’s DOM nodes. With this information, the intermediate node could rewrite the splice/move/sort events so that
the “left” children events pass through, the “middle” child’s events are shifted over by the “left” child’s current
size, and the “right” child’s events shifted over by the size of the other two. This way the parent DOM node could read
a stream of events on how to add, remove, and move its children in a coherent manner without needing to do any
additional housekeeping.

