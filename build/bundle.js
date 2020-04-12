var app = (function () {
  'use strict';

  function noop() { }
  function run(fn) {
      return fn();
  }
  function blank_object() {
      return Object.create(null);
  }
  function run_all(fns) {
      fns.forEach(run);
  }
  function is_function(thing) {
      return typeof thing === 'function';
  }
  function safe_not_equal(a, b) {
      return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
  }

  function append(target, node) {
      target.appendChild(node);
  }
  function insert(target, node, anchor) {
      target.insertBefore(node, anchor || null);
  }
  function detach(node) {
      node.parentNode.removeChild(node);
  }
  function destroy_each(iterations, detaching) {
      for (let i = 0; i < iterations.length; i += 1) {
          if (iterations[i])
              iterations[i].d(detaching);
      }
  }
  function element(name) {
      return document.createElement(name);
  }
  function text(data) {
      return document.createTextNode(data);
  }
  function space() {
      return text(' ');
  }
  function listen(node, event, handler, options) {
      node.addEventListener(event, handler, options);
      return () => node.removeEventListener(event, handler, options);
  }
  function attr(node, attribute, value) {
      if (value == null)
          node.removeAttribute(attribute);
      else if (node.getAttribute(attribute) !== value)
          node.setAttribute(attribute, value);
  }
  function children(element) {
      return Array.from(element.childNodes);
  }
  function set_data(text, data) {
      data = '' + data;
      if (text.data !== data)
          text.data = data;
  }

  let current_component;
  function set_current_component(component) {
      current_component = component;
  }
  function get_current_component() {
      if (!current_component)
          throw new Error(`Function called outside component initialization`);
      return current_component;
  }
  function onMount(fn) {
      get_current_component().$$.on_mount.push(fn);
  }

  const dirty_components = [];
  const binding_callbacks = [];
  const render_callbacks = [];
  const flush_callbacks = [];
  const resolved_promise = Promise.resolve();
  let update_scheduled = false;
  function schedule_update() {
      if (!update_scheduled) {
          update_scheduled = true;
          resolved_promise.then(flush);
      }
  }
  function add_render_callback(fn) {
      render_callbacks.push(fn);
  }
  let flushing = false;
  const seen_callbacks = new Set();
  function flush() {
      if (flushing)
          return;
      flushing = true;
      do {
          // first, call beforeUpdate functions
          // and update components
          for (let i = 0; i < dirty_components.length; i += 1) {
              const component = dirty_components[i];
              set_current_component(component);
              update(component.$$);
          }
          dirty_components.length = 0;
          while (binding_callbacks.length)
              binding_callbacks.pop()();
          // then, once components are updated, call
          // afterUpdate functions. This may cause
          // subsequent updates...
          for (let i = 0; i < render_callbacks.length; i += 1) {
              const callback = render_callbacks[i];
              if (!seen_callbacks.has(callback)) {
                  // ...so guard against infinite loops
                  seen_callbacks.add(callback);
                  callback();
              }
          }
          render_callbacks.length = 0;
      } while (dirty_components.length);
      while (flush_callbacks.length) {
          flush_callbacks.pop()();
      }
      update_scheduled = false;
      flushing = false;
      seen_callbacks.clear();
  }
  function update($$) {
      if ($$.fragment !== null) {
          $$.update();
          run_all($$.before_update);
          const dirty = $$.dirty;
          $$.dirty = [-1];
          $$.fragment && $$.fragment.p($$.ctx, dirty);
          $$.after_update.forEach(add_render_callback);
      }
  }
  const outroing = new Set();
  function transition_in(block, local) {
      if (block && block.i) {
          outroing.delete(block);
          block.i(local);
      }
  }
  function mount_component(component, target, anchor) {
      const { fragment, on_mount, on_destroy, after_update } = component.$$;
      fragment && fragment.m(target, anchor);
      // onMount happens before the initial afterUpdate
      add_render_callback(() => {
          const new_on_destroy = on_mount.map(run).filter(is_function);
          if (on_destroy) {
              on_destroy.push(...new_on_destroy);
          }
          else {
              // Edge case - component was destroyed immediately,
              // most likely as a result of a binding initialising
              run_all(new_on_destroy);
          }
          component.$$.on_mount = [];
      });
      after_update.forEach(add_render_callback);
  }
  function destroy_component(component, detaching) {
      const $$ = component.$$;
      if ($$.fragment !== null) {
          run_all($$.on_destroy);
          $$.fragment && $$.fragment.d(detaching);
          // TODO null out other refs, including component.$$ (but need to
          // preserve final state?)
          $$.on_destroy = $$.fragment = null;
          $$.ctx = [];
      }
  }
  function make_dirty(component, i) {
      if (component.$$.dirty[0] === -1) {
          dirty_components.push(component);
          schedule_update();
          component.$$.dirty.fill(0);
      }
      component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
  }
  function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
      const parent_component = current_component;
      set_current_component(component);
      const prop_values = options.props || {};
      const $$ = component.$$ = {
          fragment: null,
          ctx: null,
          // state
          props,
          update: noop,
          not_equal,
          bound: blank_object(),
          // lifecycle
          on_mount: [],
          on_destroy: [],
          before_update: [],
          after_update: [],
          context: new Map(parent_component ? parent_component.$$.context : []),
          // everything else
          callbacks: blank_object(),
          dirty
      };
      let ready = false;
      $$.ctx = instance
          ? instance(component, prop_values, (i, ret, ...rest) => {
              const value = rest.length ? rest[0] : ret;
              if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                  if ($$.bound[i])
                      $$.bound[i](value);
                  if (ready)
                      make_dirty(component, i);
              }
              return ret;
          })
          : [];
      $$.update();
      ready = true;
      run_all($$.before_update);
      // `false` as a special case of no DOM component
      $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
      if (options.target) {
          if (options.hydrate) {
              const nodes = children(options.target);
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              $$.fragment && $$.fragment.l(nodes);
              nodes.forEach(detach);
          }
          else {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              $$.fragment && $$.fragment.c();
          }
          if (options.intro)
              transition_in(component.$$.fragment);
          mount_component(component, options.target, options.anchor);
          flush();
      }
      set_current_component(parent_component);
  }
  class SvelteComponent {
      $destroy() {
          destroy_component(this, 1);
          this.$destroy = noop;
      }
      $on(type, callback) {
          const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
          callbacks.push(callback);
          return () => {
              const index = callbacks.indexOf(callback);
              if (index !== -1)
                  callbacks.splice(index, 1);
          };
      }
      $set() {
          // overridden by instance, if it has props
      }
  }

  /* src/App.svelte generated by Svelte v3.20.1 */

  function get_each_context(ctx, list, i) {
  	const child_ctx = ctx.slice();
  	child_ctx[7] = list[i];
  	child_ctx[9] = i;
  	return child_ctx;
  }

  function get_each_context_1(ctx, list, i) {
  	const child_ctx = ctx.slice();
  	child_ctx[7] = list[i];
  	child_ctx[9] = i;
  	return child_ctx;
  }

  function get_each_context_2(ctx, list, i) {
  	const child_ctx = ctx.slice();
  	child_ctx[7] = list[i];
  	child_ctx[9] = i;
  	return child_ctx;
  }

  // (108:4) {#each cards as card, card_i}
  function create_each_block_2(ctx) {
  	let div;
  	let t0_value = /*card*/ ctx[7] + "";
  	let t0;
  	let t1;
  	let div_index_value;
  	let div_draggable_value;
  	let dispose;

  	function dragstart_handler(...args) {
  		return /*dragstart_handler*/ ctx[4](/*card_i*/ ctx[9], ...args);
  	}

  	return {
  		c() {
  			div = element("div");
  			t0 = text(t0_value);
  			t1 = space();
  			attr(div, "class", "card border gray flex center svelte-1rsmmuc");
  			attr(div, "index", div_index_value = /*card_i*/ ctx[9]);
  			attr(div, "draggable", div_draggable_value = true);
  		},
  		m(target, anchor, remount) {
  			insert(target, div, anchor);
  			append(div, t0);
  			append(div, t1);
  			if (remount) dispose();
  			dispose = listen(div, "dragstart", dragstart_handler);
  		},
  		p(new_ctx, dirty) {
  			ctx = new_ctx;
  			if (dirty & /*cards*/ 1 && t0_value !== (t0_value = /*card*/ ctx[7] + "")) set_data(t0, t0_value);
  		},
  		d(detaching) {
  			if (detaching) detach(div);
  			dispose();
  		}
  	};
  }

  // (119:6) {#each reds as card, card_i}
  function create_each_block_1(ctx) {
  	let div;
  	let t_value = /*card*/ ctx[7] + "";
  	let t;
  	let div_index_value;

  	return {
  		c() {
  			div = element("div");
  			t = text(t_value);
  			attr(div, "class", "card border gray flex center svelte-1rsmmuc");
  			attr(div, "index", div_index_value = /*card_i*/ ctx[9]);
  		},
  		m(target, anchor) {
  			insert(target, div, anchor);
  			append(div, t);
  		},
  		p(ctx, dirty) {
  			if (dirty & /*reds*/ 2 && t_value !== (t_value = /*card*/ ctx[7] + "")) set_data(t, t_value);
  		},
  		d(detaching) {
  			if (detaching) detach(div);
  		}
  	};
  }

  // (126:6) {#each blues as card, card_i}
  function create_each_block(ctx) {
  	let div;
  	let t_value = /*card*/ ctx[7] + "";
  	let t;
  	let div_index_value;

  	return {
  		c() {
  			div = element("div");
  			t = text(t_value);
  			attr(div, "class", "card border gray flex center svelte-1rsmmuc");
  			attr(div, "index", div_index_value = /*card_i*/ ctx[9]);
  		},
  		m(target, anchor) {
  			insert(target, div, anchor);
  			append(div, t);
  		},
  		p(ctx, dirty) {
  			if (dirty & /*blues*/ 4 && t_value !== (t_value = /*card*/ ctx[7] + "")) set_data(t, t_value);
  		},
  		d(detaching) {
  			if (detaching) detach(div);
  		}
  	};
  }

  function create_fragment(ctx) {
  	let div4;
  	let div0;
  	let t0;
  	let div3;
  	let div1;
  	let t1;
  	let div2;
  	let dispose;
  	let each_value_2 = /*cards*/ ctx[0];
  	let each_blocks_2 = [];

  	for (let i = 0; i < each_value_2.length; i += 1) {
  		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
  	}

  	let each_value_1 = /*reds*/ ctx[1];
  	let each_blocks_1 = [];

  	for (let i = 0; i < each_value_1.length; i += 1) {
  		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
  	}

  	let each_value = /*blues*/ ctx[2];
  	let each_blocks = [];

  	for (let i = 0; i < each_value.length; i += 1) {
  		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
  	}

  	return {
  		c() {
  			div4 = element("div");
  			div0 = element("div");

  			for (let i = 0; i < each_blocks_2.length; i += 1) {
  				each_blocks_2[i].c();
  			}

  			t0 = space();
  			div3 = element("div");
  			div1 = element("div");

  			for (let i = 0; i < each_blocks_1.length; i += 1) {
  				each_blocks_1[i].c();
  			}

  			t1 = space();
  			div2 = element("div");

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].c();
  			}

  			attr(div0, "class", "half flex horizontal wrap svelte-1rsmmuc");
  			attr(div1, "class", "half red flex horizontal wrap svelte-1rsmmuc");
  			attr(div2, "class", "half blue flex horizontal wrap svelte-1rsmmuc");
  			attr(div3, "class", "half flex horizontal svelte-1rsmmuc");
  			attr(div4, "class", "container flex vertical svelte-1rsmmuc");
  		},
  		m(target, anchor, remount) {
  			insert(target, div4, anchor);
  			append(div4, div0);

  			for (let i = 0; i < each_blocks_2.length; i += 1) {
  				each_blocks_2[i].m(div0, null);
  			}

  			append(div4, t0);
  			append(div4, div3);
  			append(div3, div1);

  			for (let i = 0; i < each_blocks_1.length; i += 1) {
  				each_blocks_1[i].m(div1, null);
  			}

  			append(div3, t1);
  			append(div3, div2);

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].m(div2, null);
  			}

  			if (remount) run_all(dispose);

  			dispose = [
  				listen(div1, "dragover", dragover),
  				listen(div1, "drop", /*drop_handler*/ ctx[5]),
  				listen(div2, "dragover", dragover),
  				listen(div2, "drop", /*drop_handler_1*/ ctx[6])
  			];
  		},
  		p(ctx, [dirty]) {
  			if (dirty & /*dragstart, cards*/ 1) {
  				each_value_2 = /*cards*/ ctx[0];
  				let i;

  				for (i = 0; i < each_value_2.length; i += 1) {
  					const child_ctx = get_each_context_2(ctx, each_value_2, i);

  					if (each_blocks_2[i]) {
  						each_blocks_2[i].p(child_ctx, dirty);
  					} else {
  						each_blocks_2[i] = create_each_block_2(child_ctx);
  						each_blocks_2[i].c();
  						each_blocks_2[i].m(div0, null);
  					}
  				}

  				for (; i < each_blocks_2.length; i += 1) {
  					each_blocks_2[i].d(1);
  				}

  				each_blocks_2.length = each_value_2.length;
  			}

  			if (dirty & /*reds*/ 2) {
  				each_value_1 = /*reds*/ ctx[1];
  				let i;

  				for (i = 0; i < each_value_1.length; i += 1) {
  					const child_ctx = get_each_context_1(ctx, each_value_1, i);

  					if (each_blocks_1[i]) {
  						each_blocks_1[i].p(child_ctx, dirty);
  					} else {
  						each_blocks_1[i] = create_each_block_1(child_ctx);
  						each_blocks_1[i].c();
  						each_blocks_1[i].m(div1, null);
  					}
  				}

  				for (; i < each_blocks_1.length; i += 1) {
  					each_blocks_1[i].d(1);
  				}

  				each_blocks_1.length = each_value_1.length;
  			}

  			if (dirty & /*blues*/ 4) {
  				each_value = /*blues*/ ctx[2];
  				let i;

  				for (i = 0; i < each_value.length; i += 1) {
  					const child_ctx = get_each_context(ctx, each_value, i);

  					if (each_blocks[i]) {
  						each_blocks[i].p(child_ctx, dirty);
  					} else {
  						each_blocks[i] = create_each_block(child_ctx);
  						each_blocks[i].c();
  						each_blocks[i].m(div2, null);
  					}
  				}

  				for (; i < each_blocks.length; i += 1) {
  					each_blocks[i].d(1);
  				}

  				each_blocks.length = each_value.length;
  			}
  		},
  		i: noop,
  		o: noop,
  		d(detaching) {
  			if (detaching) detach(div4);
  			destroy_each(each_blocks_2, detaching);
  			destroy_each(each_blocks_1, detaching);
  			destroy_each(each_blocks, detaching);
  			run_all(dispose);
  		}
  	};
  }

  const N = 30;

  function dragstart(e, target, i) {
  	console.log("dragstart", i);
  	let index = parseInt(target.getAttribute("index"));
  	e.dataTransfer.setData("index", index);
  }

  function dragover(e) {
  	e.preventDefault();
  	e.dataTransfer.dropEffect = "move";
  }

  function instance($$self, $$props, $$invalidate) {
  	let cards = [...Array(N).keys()].map(i => ("000" + (i + 1)).slice(-3));
  	let reds = [];
  	let blues = [];

  	onMount(async () => {
  		console.log("onMount");
  	});

  	function drop(e, target) {
  		console.log("drop");
  		e.preventDefault();
  		let index = e.dataTransfer.getData("index");
  		let moved = cards.splice(index, 1)[0];
  		 $$invalidate(0, cards);

  		if (target.classList.contains("red")) {
  			reds.push(moved);
  			 $$invalidate(1, reds);
  		} else if (target.classList.contains("blue")) {
  			blues.push(moved);
  			 $$invalidate(2, blues);
  		}
  	}

  	const dragstart_handler = (card_i, e) => dragstart(e, e.target, card_i);
  	const drop_handler = e => drop(e, e.target);
  	const drop_handler_1 = e => drop(e, e.target);
  	return [cards, reds, blues, drop, dragstart_handler, drop_handler, drop_handler_1];
  }

  class App extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance, create_fragment, safe_not_equal, {});
  	}
  }

  const app = new App({
    target: document.body
  });

  return app;

}());
