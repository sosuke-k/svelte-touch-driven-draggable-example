<script>
  /*!
  * Draggable.svelte
  *
  * Copyright (c) 2020 Sosuke Kato
  *
  * Released under the MIT license.
  * see https://opensource.org/licenses/MIT
  */

  // svelte
  import {
    onMount
  } from 'svelte';

  export let drop_nodes = [];
  export let dragstart;
  export let drop;
  let _dataTransfer;
  let _container;

  onMount(async () => {
    console.log("Draggable#onMount");
    _dataTransfer = new DataTransfer();
  });

  export function touchstart(e, target, ...args) {
    console.log("Draggable#touchstart");
    set_position(target, e);
    _container.innerHTML = target.cloneNode(true).outerHTML;
    let dragevent = new DragEvent("dragstart", {dataTransfer: _dataTransfer});
    dragstart(dragevent, target, ...args);
  }

  export function touchmove(e, target, ...args) {
    set_position(target, e);
  }

  export function touchend(e, target, ...args) {
    console.log("Draggable#touchend");
    _container.innerHTML = "";
    let drop_node = which_drop_nodes(e);
    if (!drop_node) return;
    let dropevent = new DragEvent("drop", {dataTransfer: _dataTransfer});
    drop(dropevent, drop_node, ...args);
  }

  function get_position_from_touchevent(e) {
    let p = {}
    if (!!event.changedTouches && e.changedTouches.length > 0) {
      p.x = e.changedTouches[0].clientX;
      p.y = e.changedTouches[0].clientY;
    } else if (!!event.touches && e.touches.length > 0) {
      p.x = e.touches[0].clientX;
      p.y = e.touches[0].clientY;
    }

    if (!p.x || !p.y) return null;

    return p;
  }

  function set_position(target, event) {
    let p = get_position_from_touchevent(event);
    if (!p) return;
    _container.style.left = (p.x - target.clientWidth / 2) + "px";
    _container.style.top = (p.y - target.clientHeight / 2) + "px";
  }

  export function which_drop_nodes(e) {
    let p = get_position_from_touchevent(e);
    if (!p) return null;

    for (let [node_i, node] of Object.entries(drop_nodes)) {
      let rect = node.getBoundingClientRect();
      if (rect.left <= p.x && p.x <= rect.right && rect.top <= p.y && p.y <= rect.bottom) {
        console.log("node i", node_i);
        return node;
      }
    }
    return null;
  }
</script>

<div bind:this={_container} style="position: absolute;">
</div>
