# svelte-touch-driven-draggable-example
A Svelte example that enables D'n'D API to work with Touch Event

Please see demos in the follwing table.

|  Touchable  |  Demo  |  Source  |
| ---- | ---- | ---- |
|  no  |  [demo](https://sosuke-k.github.io/svelte-touch-driven-draggable-example/not)  |  [App.svelte](./src/App.svelte)  |
|  yes  |  [demo](https://sosuke-k.github.io/svelte-touch-driven-draggable-example/touchable)  |  [TouchableApp.svelte](./src/TouchableApp.svelte)  |

## How to enable D'n'D API to work with Touch Event

### 1. Put [Draggable.svelte](./src/Draggable.svelte)

### 2. Import it

```js
import Draggable from './Draggable.svelte';
```

### 3. Define these variables

```js
let drag;
let drop_nodes = [];
```

### 4. Change `dragstart` and `drop` functions to be writable

```diff
- function dragstart(e, target, i) {
+ let dragstart = function(e, target, i) {
```

```diff
- function drop(e, target) {
+ let drop = function(e, target) {
```

### 5. Insert Draggable tag into the bottom

```html
<Draggable bind:this={drag} bind:drop_nodes bind:dragstart bind:drop />
```

### 6. Set touch event listeners

```js
on:touchstart={e => drag.touchstart(e, e.target, card_i)}
on:touchmove={e => drag.touchmove(e, e.target, card_i)}
on:touchend={e => drag.touchend(e, e.target, card_i)}
```

Change arguments in your case

### 7. Bind `drop_nodes`

```js
bind:this={drop_nodes[0]}
```

```js
bind:this={drop_nodes[1]}
```

### All differences

```diff
$ diff src/App.svelte src/TouchableApp.svelte
6a7,8
>   import Draggable from './Draggable.svelte';
>
11a14,17
>   // Touchable
>   let drag;
>   let drop_nodes = [];
>
16c22
<   function dragstart(e, target, i) {
---
>   let dragstart = function(e, target, i) {
27c33
<   function drop(e, target) {
---
>   let drop = function(e, target) {
109a116,118
>       on:touchstart={e => drag.touchstart(e, e.target, card_i)}
>       on:touchmove={e => drag.touchmove(e, e.target, card_i)}
>       on:touchend={e => drag.touchend(e, e.target, card_i)}
116a126
>       bind:this={drop_nodes[0]}
123a134
>       bind:this={drop_nodes[1]}
131a143,144
>
> <Draggable bind:this={drag} bind:drop_nodes bind:dragstart bind:drop />
```

## Dependencies

- [Svelte](https://svelte.dev/)
- [Rollup](https://github.com/rollup/rollup)


## License

Copyright 2020 Sosuke Kato

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
