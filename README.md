# Gooey

Gooey is a new frontend web framework that is focused and flexible.

It works like a spreadsheet: build cells of UI or data that can read other cells of data, and it takes the work of
ensuring the data and UI is always up to date.

It helps deal with the complicated bits of the Model and View in the traditional Model-View-Controller architectural
pattern: ensuring that the DOM and any derived data is up to date.

It’s inspired by build systems, spreadsheets, and Backbone.


See [https://gooey.abstract.properties](https://gooey.abstract.properties) for documentation and guide.


## Simple Example

```typescript
import Gooey, { mount, calc, model, collection } from '@srhazi/gooey';

const state = model({ count: 0 });
const clickTimes = collection<Date>([]);

mount(
  document.body,
  <>
    <h2>Clicker Demo</h2>
    <p>
      <button
        on:click={() => {
          state.count += 1;
          clickTimes.push(new Date());
          // Let's not go overboard, limit to 5 items
          if (clickTimes.length > 5) clickTimes.shift();
        }}
      >
        Clicked {calc(() => state.count)} times
      </button>
    </p>
    {calc(
      () =>
        clickTimes.length > 0 && (
          <ul>
            {clickTimes.mapView((date) => (
              <li>Clicked at {date.toLocaleTimeString()}</li>
            ))}
          </ul>
        )
    )}
  </>
);
```
