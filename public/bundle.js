var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
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
    function empty() {
        return text('');
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
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }
    class HtmlTag {
        constructor() {
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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
            set_current_component(null);
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
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function createMapStore(initial) {
      const store = writable(initial);
      const results = derived(store, (s) => ({
        keys: Object.keys(s),
        values: Object.values(s),
        entries: Object.entries(s),
        set(k, v) {
          store.update((s) => Object.assign({}, s, { [k]: v }));
        },
        remove(k) {
          store.update((s) => {
            delete s[k];
            return s;
          });
        }
      }));
      return {
        subscribe: results.subscribe,
        set: store.set
      };
    }

    const abbrv = createMapStore({
      ml: 'ml',
      mc: 'mc',
      ms: 'ms',
      // 'demi-b': 'demi-b.',
      bs: 'bs',
      db: 'db',
      aug: 'aug',
      dim: 'dim'
    });
    const colors = createMapStore({
      grape: "#bf4f8e",
      eggplant: "#91457a",
      raspberry: "#c63061",
      chili: "#872723",
      cherry: "#cd2a3c",
      tomato: "#d1372e",
      cottoncandy: "#e26180",
      peach: "#ed9878",
      mango: "#e98055",
      melon: "#f38e12",
      curry: "#edb125",
      banana: "#fad16a",
      almond: "#f5e3a9",
      pear: "#e0e073",
      pistachio: "#a0c65c",
      mint: "#b4dab5",
      spinach: "#0a8247",
      watermelon: "#18a076",
      "unamed1": "#09927c",
      curacao: "#37bbd6",
      "unamed2": "#0c85bb",
      "unamed3": "#318cc9",
      "unamed4": "#8aa7ca",
      "unamed5": "#bbd3e5",
      "unamed6": "#d7eaeb",
      sage: "#70a49d",
      "unamed7": "#345a61",
      "unamed8": "#c4ccc5",
      "unamed9": "#948d82",
      "unamed10": "#595248",
      "unamed11": "#2b3449",
      blueberry: "#353e75",
      charcoal: "#312f2b",
      chocolate: "#5a2e12",
      gingerbread: "#cd8849",
      oatmeal: "#d0ac8c",
      toffee: "#a78b55",
      "unamed12": "#c9a21f"
    });

    /* components\Preferences\Abbrv.svelte generated by Svelte v3.43.1 */
    const file = "components\\Preferences\\Abbrv.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i][0];
    	child_ctx[3] = list[i][1];
    	child_ctx[5] = i;
    	return child_ctx;
    }

    // (17:4) {#each $abbrv.entries as [key, value], i}
    function create_each_block(ctx) {
    	let tr;
    	let label;
    	let t0_value = /*key*/ ctx[2] + "";
    	let t0;
    	let label_for_value;
    	let t1;
    	let input;
    	let input_id_value;
    	let input_name_value;
    	let input_value_value;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			label = element("label");
    			t0 = text(t0_value);
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			attr_dev(label, "for", label_for_value = /*i*/ ctx[5]);
    			add_location(label, file, 18, 8, 535);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", input_id_value = /*i*/ ctx[5]);
    			attr_dev(input, "name", input_name_value = /*key*/ ctx[2]);
    			input.value = input_value_value = /*value*/ ctx[3];
    			add_location(input, file, 19, 8, 573);
    			add_location(tr, file, 17, 6, 521);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, label);
    			append_dev(label, t0);
    			append_dev(tr, t1);
    			append_dev(tr, input);
    			append_dev(tr, t2);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*set_abbrv*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$abbrv*/ 1 && t0_value !== (t0_value = /*key*/ ctx[2] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*$abbrv*/ 1 && input_name_value !== (input_name_value = /*key*/ ctx[2])) {
    				attr_dev(input, "name", input_name_value);
    			}

    			if (dirty & /*$abbrv*/ 1 && input_value_value !== (input_value_value = /*value*/ ctx[3]) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(17:4) {#each $abbrv.entries as [key, value], i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let section;
    	let p;
    	let t1;
    	let img;
    	let t2;
    	let div;
    	let select;
    	let option;
    	let t4;
    	let table;
    	let each_value = /*$abbrv*/ ctx[0].entries;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			p = element("p");
    			p.textContent = "Here are the standard abbreviations used by the app, but feel free to  input your own.";
    			t1 = space();
    			img = element("img");
    			t2 = space();
    			div = element("div");
    			select = element("select");
    			option = element("option");
    			option.textContent = "--Use standard notation--";
    			t4 = space();
    			table = element("table");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(p, "class", "svelte-xte8ct");
    			add_location(p, file, 9, 2, 226);
    			attr_dev(img, "alt", "");
    			add_location(img, file, 10, 2, 324);
    			option.__value = "";
    			option.value = option.__value;
    			add_location(option, file, 13, 6, 387);
    			attr_dev(select, "name", "conventions");
    			add_location(select, file, 12, 4, 352);
    			add_location(table, file, 15, 4, 459);
    			add_location(div, file, 11, 2, 341);
    			attr_dev(section, "class", "svelte-xte8ct");
    			add_location(section, file, 8, 0, 213);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, p);
    			append_dev(section, t1);
    			append_dev(section, img);
    			append_dev(section, t2);
    			append_dev(section, div);
    			append_dev(div, select);
    			append_dev(select, option);
    			append_dev(div, t4);
    			append_dev(div, table);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$abbrv, set_abbrv*/ 3) {
    				each_value = /*$abbrv*/ ctx[0].entries;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(table, null);
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $abbrv;
    	validate_store(abbrv, 'abbrv');
    	component_subscribe($$self, abbrv, $$value => $$invalidate(0, $abbrv = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Abbrv', slots, []);

    	const set_abbrv = evt => {
    		//TODO :sanitize input, check for duplicates;
    		$abbrv.set(evt.target.name, evt.target.value);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Abbrv> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ abbrv, set_abbrv, $abbrv });
    	return [$abbrv, set_abbrv];
    }

    class Abbrv extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Abbrv",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const hsv2rgb = (
      { h, s, v },
      _s = s / 100,
      _v = v / 100,
      f = (n, k = (n + h / 60) % 6) =>
        Math.round((_v - _v * _s * Math.max(Math.min(k, 4 - k, 1), 0)) * 255)
    ) => ({
      r: f(5),
      g: f(3),
      b: f(1)
    });

    const rgb2hsv = (
      { r, g, b },
      _r = r / 255,
      _g = g / 255,
      _b = b / 255
    ) => {
      let v = Math.max(_r, _g, _b);
      let c = v - Math.min(_r, _g, _b);
      let h =
        c &&
        (v === _r
          ? (_g - _b) / c
          : v === _g
          ? 2 + (_b - _r) / c
          : 4 + (_r - _g) / c);
      return {
        h: Math.round(60 * (h < 0 ? h + 6 : h)),
        s: Math.round((v && c / v) * 100),
        v: Math.round(v * 100)
      };
    };

    const rgb2hex = (
      { r, g, b },
      f = (x, s = x.toString(16)) => (s.length === 1 ? "0" + s : s)
    ) => `#${f(r)}${f(g)}${f(b)}`;

    const hex2rgb = (hex, i = parseInt(hex.toString().replace('#',''), 16)) => ({
      r: (i >> 16) & 255,
      g: (i >> 8) & 255,
      b: i & 255
    });

    const hsv2hex = (hsv) => rgb2hex(hsv2rgb(hsv));
    const hex2hsv = (hex) => rgb2hsv(hex2rgb(hex));

    /* components\Inputs\ColorPicker.svelte generated by Svelte v3.43.1 */
    const file$1 = "components\\Inputs\\ColorPicker.svelte";

    function create_fragment$1(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let input0;
    	let t1;
    	let br;
    	let label;
    	let t2;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			input0 = element("input");
    			t1 = space();
    			br = element("br");
    			label = element("label");
    			t2 = text("HEX: ");
    			input1 = element("input");
    			attr_dev(div0, "class", "shades svelte-ocapyz");
    			add_location(div0, file$1, 27, 2, 782);
    			attr_dev(input0, "class", "hues svelte-ocapyz");
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "orient", "vertical");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "360");
    			add_location(input0, file$1, 28, 2, 838);
    			add_location(br, file$1, 29, 2, 945);
    			attr_dev(input1, "class", "hex");
    			attr_dev(input1, "type", "text");
    			add_location(input1, file$1, 29, 19, 962);
    			add_location(label, file$1, 29, 7, 950);
    			attr_dev(div1, "class", "picker svelte-ocapyz");
    			set_style(div1, "--hex", /*hex*/ ctx[0]);
    			set_style(div1, "--hue", /*hsv*/ ctx[1].h);
    			set_style(div1, "--saturation", /*hsv*/ ctx[1].s + "%");
    			set_style(div1, "--value", 100 - /*hsv*/ ctx[1].v + "%");
    			add_location(div1, file$1, 26, 0, 680);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			append_dev(div1, input0);
    			set_input_value(input0, /*hsv*/ ctx[1].h);
    			append_dev(div1, t1);
    			append_dev(div1, br);
    			append_dev(div1, label);
    			append_dev(label, t2);
    			append_dev(label, input1);
    			set_input_value(input1, /*hex*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "mousemove", /*move_drag*/ ctx[3], false, false, false),
    					listen_dev(window, "mouseup", /*stop_drag*/ ctx[4], false, false, false),
    					listen_dev(window, "mouseleave", /*stop_drag*/ ctx[4], false, false, false),
    					listen_dev(div0, "mousedown", /*start_drag*/ ctx[2], false, false, false),
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[6]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[6]),
    					listen_dev(input0, "input", /*update*/ ctx[5], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[7])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*hsv*/ 2) {
    				set_input_value(input0, /*hsv*/ ctx[1].h);
    			}

    			if (dirty & /*hex*/ 1 && input1.value !== /*hex*/ ctx[0]) {
    				set_input_value(input1, /*hex*/ ctx[0]);
    			}

    			if (dirty & /*hex*/ 1) {
    				set_style(div1, "--hex", /*hex*/ ctx[0]);
    			}

    			if (dirty & /*hsv*/ 2) {
    				set_style(div1, "--hue", /*hsv*/ ctx[1].h);
    			}

    			if (dirty & /*hsv*/ 2) {
    				set_style(div1, "--saturation", /*hsv*/ ctx[1].s + "%");
    			}

    			if (dirty & /*hsv*/ 2) {
    				set_style(div1, "--value", 100 - /*hsv*/ ctx[1].v + "%");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ColorPicker', slots, []);
    	let hsv = { h: 0, s: 0, v: 100 };
    	let hex = hsv2hex(hsv);
    	let rect;

    	const start_drag = evt => {
    		rect = evt.target.getBoundingClientRect();
    	};

    	const move_drag = evt => {
    		if (!rect) return;
    		$$invalidate(1, hsv.s = Math.round(Math.max(Math.min((evt.clientX - rect.left) * 100 / rect.width, 100), 0)), hsv);
    		$$invalidate(1, hsv.v = 100 - Math.round(Math.max(Math.min((evt.clientY - rect.top) * 100 / rect.height, 100), 0)), hsv);
    	}; // update();

    	const stop_drag = evt => {
    		rect = null;
    	};

    	const update = _ => {
    		$$invalidate(0, hex = hsv2hex(hsv));
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ColorPicker> was created with unknown prop '${key}'`);
    	});

    	function input0_change_input_handler() {
    		hsv.h = to_number(this.value);
    		($$invalidate(1, hsv), $$invalidate(0, hex));
    	}

    	function input1_input_handler() {
    		hex = this.value;
    		$$invalidate(0, hex);
    	}

    	$$self.$capture_state = () => ({
    		hsv2hex,
    		hex2hsv,
    		hsv,
    		hex,
    		rect,
    		start_drag,
    		move_drag,
    		stop_drag,
    		update
    	});

    	$$self.$inject_state = $$props => {
    		if ('hsv' in $$props) $$invalidate(1, hsv = $$props.hsv);
    		if ('hex' in $$props) $$invalidate(0, hex = $$props.hex);
    		if ('rect' in $$props) rect = $$props.rect;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*hex*/ 1) {
    			 $$invalidate(1, hsv = hex2hsv(hex));
    		}
    	};

    	return [
    		hex,
    		hsv,
    		start_drag,
    		move_drag,
    		stop_drag,
    		update,
    		input0_change_input_handler,
    		input1_input_handler
    	];
    }

    class ColorPicker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ColorPicker",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* components\Preferences\Colors.svelte generated by Svelte v3.43.1 */

    const { console: console_1 } = globals;
    const file$2 = "components\\Preferences\\Colors.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i][0];
    	child_ctx[6] = list[i][1];
    	child_ctx[8] = i;
    	return child_ctx;
    }

    // (16:4) {#each $colors.entries as [key, value], i}
    function create_each_block$1(ctx) {
    	let button;
    	let t_value = /*key*/ ctx[5] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[2](/*key*/ ctx[5]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			set_style(button, "background", /*value*/ ctx[6]);
    			attr_dev(button, "class", "svelte-g0wp7e");
    			add_location(button, file$2, 16, 6, 397);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*$colors*/ 2 && t_value !== (t_value = /*key*/ ctx[5] + "")) set_data_dev(t, t_value);

    			if (dirty & /*$colors*/ 2) {
    				set_style(button, "background", /*value*/ ctx[6]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(16:4) {#each $colors.entries as [key, value], i}",
    		ctx
    	});

    	return block;
    }

    // (22:4) {#if currentswatch}
    function create_if_block(ctx) {
    	let colorpicker;
    	let t;
    	let input;
    	let current;
    	colorpicker = new ColorPicker({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(colorpicker.$$.fragment);
    			t = space();
    			input = element("input");
    			attr_dev(input, "type", "text");
    			input.value = /*currentswatch*/ ctx[0];
    			add_location(input, file$2, 23, 6, 596);
    		},
    		m: function mount(target, anchor) {
    			mount_component(colorpicker, target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, input, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*currentswatch*/ 1 && input.value !== /*currentswatch*/ ctx[0]) {
    				prop_dev(input, "value", /*currentswatch*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(colorpicker.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(colorpicker.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(colorpicker, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(22:4) {#if currentswatch}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let section;
    	let div0;
    	let t0;
    	let button;
    	let t2;
    	let div1;
    	let current;
    	let each_value = /*$colors*/ ctx[1].entries;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	let if_block = /*currentswatch*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			button = element("button");
    			button.textContent = "+";
    			t2 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			attr_dev(button, "class", "svelte-g0wp7e");
    			add_location(button, file$2, 18, 6, 504);
    			add_location(div0, file$2, 14, 2, 336);
    			add_location(div1, file$2, 20, 2, 536);
    			attr_dev(section, "class", "svelte-g0wp7e");
    			add_location(section, file$2, 13, 0, 323);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div0, t0);
    			append_dev(div0, button);
    			append_dev(section, t2);
    			append_dev(section, div1);
    			if (if_block) if_block.m(div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$colors, currentswatch*/ 3) {
    				each_value = /*$colors*/ ctx[1].entries;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*currentswatch*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*currentswatch*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $colors;
    	validate_store(colors, 'colors');
    	component_subscribe($$self, colors, $$value => $$invalidate(1, $colors = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Colors', slots, []);
    	let show_picker;
    	let currentswatch;

    	const set_color = evt => {
    		//TODO :sanitize input, check for duplicates;
    		console.log("foo");
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Colors> was created with unknown prop '${key}'`);
    	});

    	const click_handler = key => $$invalidate(0, currentswatch = key);

    	$$self.$capture_state = () => ({
    		colors,
    		ColorPicker,
    		show_picker,
    		currentswatch,
    		set_color,
    		$colors
    	});

    	$$self.$inject_state = $$props => {
    		if ('show_picker' in $$props) show_picker = $$props.show_picker;
    		if ('currentswatch' in $$props) $$invalidate(0, currentswatch = $$props.currentswatch);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentswatch, $colors, click_handler];
    }

    class Colors extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Colors",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* components\Preferences.svelte generated by Svelte v3.43.1 */
    const file$3 = "components\\Preferences.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (14:0) {#if is_visible}
    function create_if_block$1(ctx) {
    	let section;
    	let header;
    	let t0;
    	let button;
    	let t2;
    	let div;
    	let switch_instance;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*tabs*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	var switch_value = /*selected*/ ctx[1].component;

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			header = element("header");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			button = element("button");
    			button.textContent = "×";
    			t2 = space();
    			div = element("div");
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			attr_dev(button, "class", "svelte-1sudvj");
    			add_location(button, file$3, 19, 8, 508);
    			attr_dev(header, "class", "svelte-1sudvj");
    			add_location(header, file$3, 15, 6, 339);
    			add_location(div, file$3, 21, 6, 587);
    			attr_dev(section, "class", "svelte-1sudvj");
    			add_location(section, file$3, 14, 2, 322);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, header);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(header, null);
    			}

    			append_dev(header, t0);
    			append_dev(header, button);
    			append_dev(section, t2);
    			append_dev(section, div);

    			if (switch_instance) {
    				mount_component(switch_instance, div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected, tabs*/ 6) {
    				each_value = /*tabs*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(header, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (switch_value !== (switch_value = /*selected*/ ctx[1].component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, div, null);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    			if (switch_instance) destroy_component(switch_instance);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(14:0) {#if is_visible}",
    		ctx
    	});

    	return block;
    }

    // (17:8) {#each tabs as tab}
    function create_each_block$2(ctx) {
    	let button;
    	let t_value = /*tab*/ ctx[6].label + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[3](/*tab*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "svelte-1sudvj");
    			toggle_class(button, "selected", /*selected*/ ctx[1] === /*tab*/ ctx[6]);
    			add_location(button, file$3, 17, 10, 388);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*selected, tabs*/ 6) {
    				toggle_class(button, "selected", /*selected*/ ctx[1] === /*tab*/ ctx[6]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(17:8) {#each tabs as tab}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let t0;
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*is_visible*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			button = element("button");
    			button.textContent = "Settings";
    			add_location(button, file$3, 26, 0, 684);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*is_visible*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*is_visible*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Preferences', slots, []);
    	let tabs = [{ label: "abbrv.", component: Abbrv }, { label: "colors", component: Colors }];
    	let selected = tabs[0];
    	let { is_visible = false } = $$props;
    	const writable_props = ['is_visible'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Preferences> was created with unknown prop '${key}'`);
    	});

    	const click_handler = tab => $$invalidate(1, selected = tab);
    	const click_handler_1 = () => $$invalidate(0, is_visible = false);
    	const click_handler_2 = () => $$invalidate(0, is_visible = true);

    	$$self.$$set = $$props => {
    		if ('is_visible' in $$props) $$invalidate(0, is_visible = $$props.is_visible);
    	};

    	$$self.$capture_state = () => ({
    		Abbrv,
    		Colors,
    		tabs,
    		selected,
    		is_visible
    	});

    	$$self.$inject_state = $$props => {
    		if ('tabs' in $$props) $$invalidate(2, tabs = $$props.tabs);
    		if ('selected' in $$props) $$invalidate(1, selected = $$props.selected);
    		if ('is_visible' in $$props) $$invalidate(0, is_visible = $$props.is_visible);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [is_visible, selected, tabs, click_handler, click_handler_1, click_handler_2];
    }

    class Preferences extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { is_visible: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Preferences",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get is_visible() {
    		throw new Error("<Preferences>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set is_visible(value) {
    		throw new Error("<Preferences>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* components\View\Stitch.svelte generated by Svelte v3.43.1 */

    const file$4 = "components\\View\\Stitch.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	child_ctx[3] = i;
    	return child_ctx;
    }

    // (5:0) {#each {length:stitch.times} as _, i}
    function create_each_block$3(ctx) {
    	let i_1;
    	let i_1_class_value;

    	const block = {
    		c: function create() {
    			i_1 = element("i");
    			attr_dev(i_1, "class", i_1_class_value = "icon-" + /*stitch*/ ctx[0].value);
    			add_location(i_1, file$4, 5, 2, 86);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i_1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*stitch*/ 1 && i_1_class_value !== (i_1_class_value = "icon-" + /*stitch*/ ctx[0].value)) {
    				attr_dev(i_1, "class", i_1_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(5:0) {#each {length:stitch.times} as _, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let each_1_anchor;
    	let each_value = { length: /*stitch*/ ctx[0].times };
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*stitch*/ 1) {
    				each_value = { length: /*stitch*/ ctx[0].times };
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
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
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Stitch', slots, []);
    	let { stitch } = $$props;
    	const writable_props = ['stitch'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Stitch> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('stitch' in $$props) $$invalidate(0, stitch = $$props.stitch);
    	};

    	$$self.$capture_state = () => ({ stitch });

    	$$self.$inject_state = $$props => {
    		if ('stitch' in $$props) $$invalidate(0, stitch = $$props.stitch);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [stitch];
    }

    class Stitch extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { stitch: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Stitch",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*stitch*/ ctx[0] === undefined && !('stitch' in props)) {
    			console.warn("<Stitch> was created without expected prop 'stitch'");
    		}
    	}

    	get stitch() {
    		throw new Error("<Stitch>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set stitch(value) {
    		throw new Error("<Stitch>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* components\View\Repeat.svelte generated by Svelte v3.43.1 */

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	child_ctx[3] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (6:2) {#each repeat.stitches as step}
    function create_each_block_1(ctx) {
    	let stitch;
    	let t;
    	let current;

    	stitch = new Stitch({
    			props: { stitch: /*step*/ ctx[4] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(stitch.$$.fragment);
    			t = text(".");
    		},
    		m: function mount(target, anchor) {
    			mount_component(stitch, target, anchor);
    			insert_dev(target, t, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const stitch_changes = {};
    			if (dirty & /*repeat*/ 1) stitch_changes.stitch = /*step*/ ctx[4];
    			stitch.$set(stitch_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(stitch.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(stitch.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(stitch, detaching);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(6:2) {#each repeat.stitches as step}",
    		ctx
    	});

    	return block;
    }

    // (5:0) {#each {length:repeat.times} as _, i}
    function create_each_block$4(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*repeat*/ ctx[0].stitches;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*repeat*/ 1) {
    				each_value_1 = /*repeat*/ ctx[0].stitches;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(5:0) {#each {length:repeat.times} as _, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = { length: /*repeat*/ ctx[0].times };
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*repeat*/ 1) {
    				each_value = { length: /*repeat*/ ctx[0].times };
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Repeat', slots, []);
    	let { repeat } = $$props;
    	const writable_props = ['repeat'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Repeat> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('repeat' in $$props) $$invalidate(0, repeat = $$props.repeat);
    	};

    	$$self.$capture_state = () => ({ Stitch, repeat });

    	$$self.$inject_state = $$props => {
    		if ('repeat' in $$props) $$invalidate(0, repeat = $$props.repeat);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [repeat];
    }

    class Repeat extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { repeat: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Repeat",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*repeat*/ ctx[0] === undefined && !('repeat' in props)) {
    			console.warn("<Repeat> was created without expected prop 'repeat'");
    		}
    	}

    	get repeat() {
    		throw new Error("<Repeat>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set repeat(value) {
    		throw new Error("<Repeat>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* components\View.svelte generated by Svelte v3.43.1 */
    const file$5 = "components\\View.svelte";

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	child_ctx[6] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	child_ctx[11] = i;
    	return child_ctx;
    }

    // (13:4) {:else}
    function create_else_block_1(ctx) {
    	let t0;
    	let repeat;
    	let t1;
    	let current;

    	repeat = new Repeat({
    			props: { repeat: /*step*/ ctx[1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			t0 = text("|");
    			create_component(repeat.$$.fragment);
    			t1 = text("|");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			mount_component(repeat, target, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const repeat_changes = {};
    			if (dirty & /*pattern*/ 1) repeat_changes.repeat = /*step*/ ctx[1];
    			repeat.$set(repeat_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(repeat.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(repeat.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			destroy_component(repeat, detaching);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(13:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (11:4) {#if step.type === 'stitch'}
    function create_if_block_1(ctx) {
    	let t0;
    	let stitch;
    	let t1;
    	let current;

    	stitch = new Stitch({
    			props: { stitch: /*step*/ ctx[1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			t0 = text(".");
    			create_component(stitch.$$.fragment);
    			t1 = text(".");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			mount_component(stitch, target, anchor);
    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const stitch_changes = {};
    			if (dirty & /*pattern*/ 1) stitch_changes.stitch = /*step*/ ctx[1];
    			stitch.$set(stitch_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(stitch.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(stitch.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			destroy_component(stitch, detaching);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(11:4) {#if step.type === 'stitch'}",
    		ctx
    	});

    	return block;
    }

    // (23:6) {:else}
    function create_else_block(ctx) {
    	let i;
    	let i_class_value;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", i_class_value = "icon-" + /*step*/ ctx[1].value);
    			add_location(i, file$5, 23, 8, 568);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pattern*/ 1 && i_class_value !== (i_class_value = "icon-" + /*step*/ ctx[1].value)) {
    				attr_dev(i, "class", i_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(23:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (17:6) {#if step.type === 'repeat'}
    function create_if_block$2(ctx) {
    	let each_1_anchor;
    	let each_value_2 = /*step*/ ctx[1].stitches;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pattern*/ 1) {
    				each_value_2 = /*step*/ ctx[1].stitches;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(17:6) {#if step.type === 'repeat'}",
    		ctx
    	});

    	return block;
    }

    // (19:10) {#each {length:st.times} as _, j}
    function create_each_block_3(ctx) {
    	let i;
    	let i_class_value;

    	const block = {
    		c: function create() {
    			i = element("i");
    			attr_dev(i, "class", i_class_value = "icon-" + /*st*/ ctx[7].value);
    			add_location(i, file$5, 19, 12, 476);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pattern*/ 1 && i_class_value !== (i_class_value = "icon-" + /*st*/ ctx[7].value)) {
    				attr_dev(i, "class", i_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(i);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(19:10) {#each {length:st.times} as _, j}",
    		ctx
    	});

    	return block;
    }

    // (18:8) {#each step.stitches as st}
    function create_each_block_2(ctx) {
    	let each_1_anchor;
    	let each_value_3 = { length: /*st*/ ctx[7].times };
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pattern*/ 1) {
    				each_value_3 = { length: /*st*/ ctx[7].times };
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(18:8) {#each step.stitches as st}",
    		ctx
    	});

    	return block;
    }

    // (16:4) {#each {length:step.times} as _, i}
    function create_each_block_1$1(ctx) {
    	let t;

    	function select_block_type_1(ctx, dirty) {
    		if (/*step*/ ctx[1].type === 'repeat') return create_if_block$2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			t = space();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(16:4) {#each {length:step.times} as _, i}",
    		ctx
    	});

    	return block;
    }

    // (10:2) {#each pattern as step}
    function create_each_block$5(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let t0;
    	let t1;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*step*/ ctx[1].type === 'stitch') return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let each_value_1 = { length: /*step*/ ctx[1].times };
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			if_block.c();
    			t0 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = text("|");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, t0, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(t0.parentNode, t0);
    			}

    			if (dirty & /*pattern*/ 1) {
    				each_value_1 = { length: /*step*/ ctx[1].times };
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t1.parentNode, t1);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(t0);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$5.name,
    		type: "each",
    		source: "(10:2) {#each pattern as step}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let section;
    	let current;
    	let each_value = /*pattern*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			section = element("section");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(section, file$5, 8, 0, 143);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*pattern*/ 1) {
    				each_value = /*pattern*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(section, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('View', slots, []);
    	let { pattern } = $$props;
    	const writable_props = ['pattern'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<View> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('pattern' in $$props) $$invalidate(0, pattern = $$props.pattern);
    	};

    	$$self.$capture_state = () => ({ Stitch, Repeat, pattern });

    	$$self.$inject_state = $$props => {
    		if ('pattern' in $$props) $$invalidate(0, pattern = $$props.pattern);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pattern];
    }

    class View extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { pattern: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "View",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pattern*/ ctx[0] === undefined && !('pattern' in props)) {
    			console.warn("<View> was created without expected prop 'pattern'");
    		}
    	}

    	get pattern() {
    		throw new Error("<View>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pattern(value) {
    		throw new Error("<View>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var nearley = createCommonjsModule(function (module) {
    (function(root, factory) {
        if ( module.exports) {
            module.exports = factory();
        } else {
            root.nearley = factory();
        }
    }(commonjsGlobal, function() {

        function Rule(name, symbols, postprocess) {
            this.id = ++Rule.highestId;
            this.name = name;
            this.symbols = symbols;        // a list of literal | regex class | nonterminal
            this.postprocess = postprocess;
            return this;
        }
        Rule.highestId = 0;

        Rule.prototype.toString = function(withCursorAt) {
            var symbolSequence = (typeof withCursorAt === "undefined")
                                 ? this.symbols.map(getSymbolShortDisplay).join(' ')
                                 : (   this.symbols.slice(0, withCursorAt).map(getSymbolShortDisplay).join(' ')
                                     + " ● "
                                     + this.symbols.slice(withCursorAt).map(getSymbolShortDisplay).join(' ')     );
            return this.name + " → " + symbolSequence;
        };


        // a State is a rule at a position from a given starting point in the input stream (reference)
        function State(rule, dot, reference, wantedBy) {
            this.rule = rule;
            this.dot = dot;
            this.reference = reference;
            this.data = [];
            this.wantedBy = wantedBy;
            this.isComplete = this.dot === rule.symbols.length;
        }

        State.prototype.toString = function() {
            return "{" + this.rule.toString(this.dot) + "}, from: " + (this.reference || 0);
        };

        State.prototype.nextState = function(child) {
            var state = new State(this.rule, this.dot + 1, this.reference, this.wantedBy);
            state.left = this;
            state.right = child;
            if (state.isComplete) {
                state.data = state.build();
                // Having right set here will prevent the right state and its children
                // form being garbage collected
                state.right = undefined;
            }
            return state;
        };

        State.prototype.build = function() {
            var children = [];
            var node = this;
            do {
                children.push(node.right.data);
                node = node.left;
            } while (node.left);
            children.reverse();
            return children;
        };

        State.prototype.finish = function() {
            if (this.rule.postprocess) {
                this.data = this.rule.postprocess(this.data, this.reference, Parser.fail);
            }
        };


        function Column(grammar, index) {
            this.grammar = grammar;
            this.index = index;
            this.states = [];
            this.wants = {}; // states indexed by the non-terminal they expect
            this.scannable = []; // list of states that expect a token
            this.completed = {}; // states that are nullable
        }


        Column.prototype.process = function(nextColumn) {
            var states = this.states;
            var wants = this.wants;
            var completed = this.completed;

            for (var w = 0; w < states.length; w++) { // nb. we push() during iteration
                var state = states[w];

                if (state.isComplete) {
                    state.finish();
                    if (state.data !== Parser.fail) {
                        // complete
                        var wantedBy = state.wantedBy;
                        for (var i = wantedBy.length; i--; ) { // this line is hot
                            var left = wantedBy[i];
                            this.complete(left, state);
                        }

                        // special-case nullables
                        if (state.reference === this.index) {
                            // make sure future predictors of this rule get completed.
                            var exp = state.rule.name;
                            (this.completed[exp] = this.completed[exp] || []).push(state);
                        }
                    }

                } else {
                    // queue scannable states
                    var exp = state.rule.symbols[state.dot];
                    if (typeof exp !== 'string') {
                        this.scannable.push(state);
                        continue;
                    }

                    // predict
                    if (wants[exp]) {
                        wants[exp].push(state);

                        if (completed.hasOwnProperty(exp)) {
                            var nulls = completed[exp];
                            for (var i = 0; i < nulls.length; i++) {
                                var right = nulls[i];
                                this.complete(state, right);
                            }
                        }
                    } else {
                        wants[exp] = [state];
                        this.predict(exp);
                    }
                }
            }
        };

        Column.prototype.predict = function(exp) {
            var rules = this.grammar.byName[exp] || [];

            for (var i = 0; i < rules.length; i++) {
                var r = rules[i];
                var wantedBy = this.wants[exp];
                var s = new State(r, 0, this.index, wantedBy);
                this.states.push(s);
            }
        };

        Column.prototype.complete = function(left, right) {
            var copy = left.nextState(right);
            this.states.push(copy);
        };


        function Grammar(rules, start) {
            this.rules = rules;
            this.start = start || this.rules[0].name;
            var byName = this.byName = {};
            this.rules.forEach(function(rule) {
                if (!byName.hasOwnProperty(rule.name)) {
                    byName[rule.name] = [];
                }
                byName[rule.name].push(rule);
            });
        }

        // So we can allow passing (rules, start) directly to Parser for backwards compatibility
        Grammar.fromCompiled = function(rules, start) {
            var lexer = rules.Lexer;
            if (rules.ParserStart) {
              start = rules.ParserStart;
              rules = rules.ParserRules;
            }
            var rules = rules.map(function (r) { return (new Rule(r.name, r.symbols, r.postprocess)); });
            var g = new Grammar(rules, start);
            g.lexer = lexer; // nb. storing lexer on Grammar is iffy, but unavoidable
            return g;
        };


        function StreamLexer() {
          this.reset("");
        }

        StreamLexer.prototype.reset = function(data, state) {
            this.buffer = data;
            this.index = 0;
            this.line = state ? state.line : 1;
            this.lastLineBreak = state ? -state.col : 0;
        };

        StreamLexer.prototype.next = function() {
            if (this.index < this.buffer.length) {
                var ch = this.buffer[this.index++];
                if (ch === '\n') {
                  this.line += 1;
                  this.lastLineBreak = this.index;
                }
                return {value: ch};
            }
        };

        StreamLexer.prototype.save = function() {
          return {
            line: this.line,
            col: this.index - this.lastLineBreak,
          }
        };

        StreamLexer.prototype.formatError = function(token, message) {
            // nb. this gets called after consuming the offending token,
            // so the culprit is index-1
            var buffer = this.buffer;
            if (typeof buffer === 'string') {
                var lines = buffer
                    .split("\n")
                    .slice(
                        Math.max(0, this.line - 5), 
                        this.line
                    );

                var nextLineBreak = buffer.indexOf('\n', this.index);
                if (nextLineBreak === -1) nextLineBreak = buffer.length;
                var col = this.index - this.lastLineBreak;
                var lastLineDigits = String(this.line).length;
                message += " at line " + this.line + " col " + col + ":\n\n";
                message += lines
                    .map(function(line, i) {
                        return pad(this.line - lines.length + i + 1, lastLineDigits) + " " + line;
                    }, this)
                    .join("\n");
                message += "\n" + pad("", lastLineDigits + col) + "^\n";
                return message;
            } else {
                return message + " at index " + (this.index - 1);
            }

            function pad(n, length) {
                var s = String(n);
                return Array(length - s.length + 1).join(" ") + s;
            }
        };

        function Parser(rules, start, options) {
            if (rules instanceof Grammar) {
                var grammar = rules;
                var options = start;
            } else {
                var grammar = Grammar.fromCompiled(rules, start);
            }
            this.grammar = grammar;

            // Read options
            this.options = {
                keepHistory: false,
                lexer: grammar.lexer || new StreamLexer,
            };
            for (var key in (options || {})) {
                this.options[key] = options[key];
            }

            // Setup lexer
            this.lexer = this.options.lexer;
            this.lexerState = undefined;

            // Setup a table
            var column = new Column(grammar, 0);
            var table = this.table = [column];

            // I could be expecting anything.
            column.wants[grammar.start] = [];
            column.predict(grammar.start);
            // TODO what if start rule is nullable?
            column.process();
            this.current = 0; // token index
        }

        // create a reserved token for indicating a parse fail
        Parser.fail = {};

        Parser.prototype.feed = function(chunk) {
            var lexer = this.lexer;
            lexer.reset(chunk, this.lexerState);

            var token;
            while (true) {
                try {
                    token = lexer.next();
                    if (!token) {
                        break;
                    }
                } catch (e) {
                    // Create the next column so that the error reporter
                    // can display the correctly predicted states.
                    var nextColumn = new Column(this.grammar, this.current + 1);
                    this.table.push(nextColumn);
                    var err = new Error(this.reportLexerError(e));
                    err.offset = this.current;
                    err.token = e.token;
                    throw err;
                }
                // We add new states to table[current+1]
                var column = this.table[this.current];

                // GC unused states
                if (!this.options.keepHistory) {
                    delete this.table[this.current - 1];
                }

                var n = this.current + 1;
                var nextColumn = new Column(this.grammar, n);
                this.table.push(nextColumn);

                // Advance all tokens that expect the symbol
                var literal = token.text !== undefined ? token.text : token.value;
                var value = lexer.constructor === StreamLexer ? token.value : token;
                var scannable = column.scannable;
                for (var w = scannable.length; w--; ) {
                    var state = scannable[w];
                    var expect = state.rule.symbols[state.dot];
                    // Try to consume the token
                    // either regex or literal
                    if (expect.test ? expect.test(value) :
                        expect.type ? expect.type === token.type
                                    : expect.literal === literal) {
                        // Add it
                        var next = state.nextState({data: value, token: token, isToken: true, reference: n - 1});
                        nextColumn.states.push(next);
                    }
                }

                // Next, for each of the rules, we either
                // (a) complete it, and try to see if the reference row expected that
                //     rule
                // (b) predict the next nonterminal it expects by adding that
                //     nonterminal's start state
                // To prevent duplication, we also keep track of rules we have already
                // added

                nextColumn.process();

                // If needed, throw an error:
                if (nextColumn.states.length === 0) {
                    // No states at all! This is not good.
                    var err = new Error(this.reportError(token));
                    err.offset = this.current;
                    err.token = token;
                    throw err;
                }

                // maybe save lexer state
                if (this.options.keepHistory) {
                  column.lexerState = lexer.save();
                }

                this.current++;
            }
            if (column) {
              this.lexerState = lexer.save();
            }

            // Incrementally keep track of results
            this.results = this.finish();

            // Allow chaining, for whatever it's worth
            return this;
        };

        Parser.prototype.reportLexerError = function(lexerError) {
            var tokenDisplay, lexerMessage;
            // Planning to add a token property to moo's thrown error
            // even on erroring tokens to be used in error display below
            var token = lexerError.token;
            if (token) {
                tokenDisplay = "input " + JSON.stringify(token.text[0]) + " (lexer error)";
                lexerMessage = this.lexer.formatError(token, "Syntax error");
            } else {
                tokenDisplay = "input (lexer error)";
                lexerMessage = lexerError.message;
            }
            return this.reportErrorCommon(lexerMessage, tokenDisplay);
        };

        Parser.prototype.reportError = function(token) {
            var tokenDisplay = (token.type ? token.type + " token: " : "") + JSON.stringify(token.value !== undefined ? token.value : token);
            var lexerMessage = this.lexer.formatError(token, "Syntax error");
            return this.reportErrorCommon(lexerMessage, tokenDisplay);
        };

        Parser.prototype.reportErrorCommon = function(lexerMessage, tokenDisplay) {
            var lines = [];
            lines.push(lexerMessage);
            var lastColumnIndex = this.table.length - 2;
            var lastColumn = this.table[lastColumnIndex];
            var expectantStates = lastColumn.states
                .filter(function(state) {
                    var nextSymbol = state.rule.symbols[state.dot];
                    return nextSymbol && typeof nextSymbol !== "string";
                });

            if (expectantStates.length === 0) {
                lines.push('Unexpected ' + tokenDisplay + '. I did not expect any more input. Here is the state of my parse table:\n');
                this.displayStateStack(lastColumn.states, lines);
            } else {
                lines.push('Unexpected ' + tokenDisplay + '. Instead, I was expecting to see one of the following:\n');
                // Display a "state stack" for each expectant state
                // - which shows you how this state came to be, step by step.
                // If there is more than one derivation, we only display the first one.
                var stateStacks = expectantStates
                    .map(function(state) {
                        return this.buildFirstStateStack(state, []) || [state];
                    }, this);
                // Display each state that is expecting a terminal symbol next.
                stateStacks.forEach(function(stateStack) {
                    var state = stateStack[0];
                    var nextSymbol = state.rule.symbols[state.dot];
                    var symbolDisplay = this.getSymbolDisplay(nextSymbol);
                    lines.push('A ' + symbolDisplay + ' based on:');
                    this.displayStateStack(stateStack, lines);
                }, this);
            }
            lines.push("");
            return lines.join("\n");
        };
        
        Parser.prototype.displayStateStack = function(stateStack, lines) {
            var lastDisplay;
            var sameDisplayCount = 0;
            for (var j = 0; j < stateStack.length; j++) {
                var state = stateStack[j];
                var display = state.rule.toString(state.dot);
                if (display === lastDisplay) {
                    sameDisplayCount++;
                } else {
                    if (sameDisplayCount > 0) {
                        lines.push('    ^ ' + sameDisplayCount + ' more lines identical to this');
                    }
                    sameDisplayCount = 0;
                    lines.push('    ' + display);
                }
                lastDisplay = display;
            }
        };

        Parser.prototype.getSymbolDisplay = function(symbol) {
            return getSymbolLongDisplay(symbol);
        };

        /*
        Builds a the first state stack. You can think of a state stack as the call stack
        of the recursive-descent parser which the Nearley parse algorithm simulates.
        A state stack is represented as an array of state objects. Within a
        state stack, the first item of the array will be the starting
        state, with each successive item in the array going further back into history.

        This function needs to be given a starting state and an empty array representing
        the visited states, and it returns an single state stack.

        */
        Parser.prototype.buildFirstStateStack = function(state, visited) {
            if (visited.indexOf(state) !== -1) {
                // Found cycle, return null
                // to eliminate this path from the results, because
                // we don't know how to display it meaningfully
                return null;
            }
            if (state.wantedBy.length === 0) {
                return [state];
            }
            var prevState = state.wantedBy[0];
            var childVisited = [state].concat(visited);
            var childResult = this.buildFirstStateStack(prevState, childVisited);
            if (childResult === null) {
                return null;
            }
            return [state].concat(childResult);
        };

        Parser.prototype.save = function() {
            var column = this.table[this.current];
            column.lexerState = this.lexerState;
            return column;
        };

        Parser.prototype.restore = function(column) {
            var index = column.index;
            this.current = index;
            this.table[index] = column;
            this.table.splice(index + 1);
            this.lexerState = column.lexerState;

            // Incrementally keep track of results
            this.results = this.finish();
        };

        // nb. deprecated: use save/restore instead!
        Parser.prototype.rewind = function(index) {
            if (!this.options.keepHistory) {
                throw new Error('set option `keepHistory` to enable rewinding')
            }
            // nb. recall column (table) indicies fall between token indicies.
            //        col 0   --   token 0   --   col 1
            this.restore(this.table[index]);
        };

        Parser.prototype.finish = function() {
            // Return the possible parsings
            var considerations = [];
            var start = this.grammar.start;
            var column = this.table[this.table.length - 1];
            column.states.forEach(function (t) {
                if (t.rule.name === start
                        && t.dot === t.rule.symbols.length
                        && t.reference === 0
                        && t.data !== Parser.fail) {
                    considerations.push(t);
                }
            });
            return considerations.map(function(c) {return c.data; });
        };

        function getSymbolLongDisplay(symbol) {
            var type = typeof symbol;
            if (type === "string") {
                return symbol;
            } else if (type === "object") {
                if (symbol.literal) {
                    return JSON.stringify(symbol.literal);
                } else if (symbol instanceof RegExp) {
                    return 'character matching ' + symbol;
                } else if (symbol.type) {
                    return symbol.type + ' token';
                } else if (symbol.test) {
                    return 'token matching ' + String(symbol.test);
                } else {
                    throw new Error('Unknown symbol type: ' + symbol);
                }
            }
        }

        function getSymbolShortDisplay(symbol) {
            var type = typeof symbol;
            if (type === "string") {
                return symbol;
            } else if (type === "object") {
                if (symbol.literal) {
                    return JSON.stringify(symbol.literal);
                } else if (symbol instanceof RegExp) {
                    return symbol.toString();
                } else if (symbol.type) {
                    return '%' + symbol.type;
                } else if (symbol.test) {
                    return '<' + String(symbol.test) + '>';
                } else {
                    throw new Error('Unknown symbol type: ' + symbol);
                }
            }
        }

        return {
            Parser: Parser,
            Grammar: Grammar,
            Rule: Rule,
        };

    }));
    });

    var moo = createCommonjsModule(function (module) {
    (function(root, factory) {
      if ( module.exports) {
        module.exports = factory();
      } else {
        root.moo = factory();
      }
    }(commonjsGlobal, function() {

      var hasOwnProperty = Object.prototype.hasOwnProperty;
      var toString = Object.prototype.toString;
      var hasSticky = typeof new RegExp().sticky === 'boolean';

      /***************************************************************************/

      function isRegExp(o) { return o && toString.call(o) === '[object RegExp]' }
      function isObject(o) { return o && typeof o === 'object' && !isRegExp(o) && !Array.isArray(o) }

      function reEscape(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      }
      function reGroups(s) {
        var re = new RegExp('|' + s);
        return re.exec('').length - 1
      }
      function reCapture(s) {
        return '(' + s + ')'
      }
      function reUnion(regexps) {
        if (!regexps.length) return '(?!)'
        var source =  regexps.map(function(s) {
          return "(?:" + s + ")"
        }).join('|');
        return "(?:" + source + ")"
      }

      function regexpOrLiteral(obj) {
        if (typeof obj === 'string') {
          return '(?:' + reEscape(obj) + ')'

        } else if (isRegExp(obj)) {
          // TODO: consider /u support
          if (obj.ignoreCase) throw new Error('RegExp /i flag not allowed')
          if (obj.global) throw new Error('RegExp /g flag is implied')
          if (obj.sticky) throw new Error('RegExp /y flag is implied')
          if (obj.multiline) throw new Error('RegExp /m flag is implied')
          return obj.source

        } else {
          throw new Error('Not a pattern: ' + obj)
        }
      }

      function objectToRules(object) {
        var keys = Object.getOwnPropertyNames(object);
        var result = [];
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var thing = object[key];
          var rules = [].concat(thing);
          if (key === 'include') {
            for (var j = 0; j < rules.length; j++) {
              result.push({include: rules[j]});
            }
            continue
          }
          var match = [];
          rules.forEach(function(rule) {
            if (isObject(rule)) {
              if (match.length) result.push(ruleOptions(key, match));
              result.push(ruleOptions(key, rule));
              match = [];
            } else {
              match.push(rule);
            }
          });
          if (match.length) result.push(ruleOptions(key, match));
        }
        return result
      }

      function arrayToRules(array) {
        var result = [];
        for (var i = 0; i < array.length; i++) {
          var obj = array[i];
          if (obj.include) {
            var include = [].concat(obj.include);
            for (var j = 0; j < include.length; j++) {
              result.push({include: include[j]});
            }
            continue
          }
          if (!obj.type) {
            throw new Error('Rule has no type: ' + JSON.stringify(obj))
          }
          result.push(ruleOptions(obj.type, obj));
        }
        return result
      }

      function ruleOptions(type, obj) {
        if (!isObject(obj)) {
          obj = { match: obj };
        }
        if (obj.include) {
          throw new Error('Matching rules cannot also include states')
        }

        // nb. error and fallback imply lineBreaks
        var options = {
          defaultType: type,
          lineBreaks: !!obj.error || !!obj.fallback,
          pop: false,
          next: null,
          push: null,
          error: false,
          fallback: false,
          value: null,
          type: null,
          shouldThrow: false,
        };

        // Avoid Object.assign(), so we support IE9+
        for (var key in obj) {
          if (hasOwnProperty.call(obj, key)) {
            options[key] = obj[key];
          }
        }

        // type transform cannot be a string
        if (typeof options.type === 'string' && type !== options.type) {
          throw new Error("Type transform cannot be a string (type '" + options.type + "' for token '" + type + "')")
        }

        // convert to array
        var match = options.match;
        options.match = Array.isArray(match) ? match : match ? [match] : [];
        options.match.sort(function(a, b) {
          return isRegExp(a) && isRegExp(b) ? 0
               : isRegExp(b) ? -1 : isRegExp(a) ? +1 : b.length - a.length
        });
        return options
      }

      function toRules(spec) {
        return Array.isArray(spec) ? arrayToRules(spec) : objectToRules(spec)
      }

      var defaultErrorRule = ruleOptions('error', {lineBreaks: true, shouldThrow: true});
      function compileRules(rules, hasStates) {
        var errorRule = null;
        var fast = Object.create(null);
        var fastAllowed = true;
        var unicodeFlag = null;
        var groups = [];
        var parts = [];

        // If there is a fallback rule, then disable fast matching
        for (var i = 0; i < rules.length; i++) {
          if (rules[i].fallback) {
            fastAllowed = false;
          }
        }

        for (var i = 0; i < rules.length; i++) {
          var options = rules[i];

          if (options.include) {
            // all valid inclusions are removed by states() preprocessor
            throw new Error('Inheritance is not allowed in stateless lexers')
          }

          if (options.error || options.fallback) {
            // errorRule can only be set once
            if (errorRule) {
              if (!options.fallback === !errorRule.fallback) {
                throw new Error("Multiple " + (options.fallback ? "fallback" : "error") + " rules not allowed (for token '" + options.defaultType + "')")
              } else {
                throw new Error("fallback and error are mutually exclusive (for token '" + options.defaultType + "')")
              }
            }
            errorRule = options;
          }

          var match = options.match.slice();
          if (fastAllowed) {
            while (match.length && typeof match[0] === 'string' && match[0].length === 1) {
              var word = match.shift();
              fast[word.charCodeAt(0)] = options;
            }
          }

          // Warn about inappropriate state-switching options
          if (options.pop || options.push || options.next) {
            if (!hasStates) {
              throw new Error("State-switching options are not allowed in stateless lexers (for token '" + options.defaultType + "')")
            }
            if (options.fallback) {
              throw new Error("State-switching options are not allowed on fallback tokens (for token '" + options.defaultType + "')")
            }
          }

          // Only rules with a .match are included in the RegExp
          if (match.length === 0) {
            continue
          }
          fastAllowed = false;

          groups.push(options);

          // Check unicode flag is used everywhere or nowhere
          for (var j = 0; j < match.length; j++) {
            var obj = match[j];
            if (!isRegExp(obj)) {
              continue
            }

            if (unicodeFlag === null) {
              unicodeFlag = obj.unicode;
            } else if (unicodeFlag !== obj.unicode && options.fallback === false) {
              throw new Error('If one rule is /u then all must be')
            }
          }

          // convert to RegExp
          var pat = reUnion(match.map(regexpOrLiteral));

          // validate
          var regexp = new RegExp(pat);
          if (regexp.test("")) {
            throw new Error("RegExp matches empty string: " + regexp)
          }
          var groupCount = reGroups(pat);
          if (groupCount > 0) {
            throw new Error("RegExp has capture groups: " + regexp + "\nUse (?: … ) instead")
          }

          // try and detect rules matching newlines
          if (!options.lineBreaks && regexp.test('\n')) {
            throw new Error('Rule should declare lineBreaks: ' + regexp)
          }

          // store regex
          parts.push(reCapture(pat));
        }


        // If there's no fallback rule, use the sticky flag so we only look for
        // matches at the current index.
        //
        // If we don't support the sticky flag, then fake it using an irrefutable
        // match (i.e. an empty pattern).
        var fallbackRule = errorRule && errorRule.fallback;
        var flags = hasSticky && !fallbackRule ? 'ym' : 'gm';
        var suffix = hasSticky || fallbackRule ? '' : '|';

        if (unicodeFlag === true) flags += "u";
        var combined = new RegExp(reUnion(parts) + suffix, flags);
        return {regexp: combined, groups: groups, fast: fast, error: errorRule || defaultErrorRule}
      }

      function compile(rules) {
        var result = compileRules(toRules(rules));
        return new Lexer({start: result}, 'start')
      }

      function checkStateGroup(g, name, map) {
        var state = g && (g.push || g.next);
        if (state && !map[state]) {
          throw new Error("Missing state '" + state + "' (in token '" + g.defaultType + "' of state '" + name + "')")
        }
        if (g && g.pop && +g.pop !== 1) {
          throw new Error("pop must be 1 (in token '" + g.defaultType + "' of state '" + name + "')")
        }
      }
      function compileStates(states, start) {
        var all = states.$all ? toRules(states.$all) : [];
        delete states.$all;

        var keys = Object.getOwnPropertyNames(states);
        if (!start) start = keys[0];

        var ruleMap = Object.create(null);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          ruleMap[key] = toRules(states[key]).concat(all);
        }
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var rules = ruleMap[key];
          var included = Object.create(null);
          for (var j = 0; j < rules.length; j++) {
            var rule = rules[j];
            if (!rule.include) continue
            var splice = [j, 1];
            if (rule.include !== key && !included[rule.include]) {
              included[rule.include] = true;
              var newRules = ruleMap[rule.include];
              if (!newRules) {
                throw new Error("Cannot include nonexistent state '" + rule.include + "' (in state '" + key + "')")
              }
              for (var k = 0; k < newRules.length; k++) {
                var newRule = newRules[k];
                if (rules.indexOf(newRule) !== -1) continue
                splice.push(newRule);
              }
            }
            rules.splice.apply(rules, splice);
            j--;
          }
        }

        var map = Object.create(null);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          map[key] = compileRules(ruleMap[key], true);
        }

        for (var i = 0; i < keys.length; i++) {
          var name = keys[i];
          var state = map[name];
          var groups = state.groups;
          for (var j = 0; j < groups.length; j++) {
            checkStateGroup(groups[j], name, map);
          }
          var fastKeys = Object.getOwnPropertyNames(state.fast);
          for (var j = 0; j < fastKeys.length; j++) {
            checkStateGroup(state.fast[fastKeys[j]], name, map);
          }
        }

        return new Lexer(map, start)
      }

      function keywordTransform(map) {
        var reverseMap = Object.create(null);
        var byLength = Object.create(null);
        var types = Object.getOwnPropertyNames(map);
        for (var i = 0; i < types.length; i++) {
          var tokenType = types[i];
          var item = map[tokenType];
          var keywordList = Array.isArray(item) ? item : [item];
          keywordList.forEach(function(keyword) {
            (byLength[keyword.length] = byLength[keyword.length] || []).push(keyword);
            if (typeof keyword !== 'string') {
              throw new Error("keyword must be string (in keyword '" + tokenType + "')")
            }
            reverseMap[keyword] = tokenType;
          });
        }

        // fast string lookup
        // https://jsperf.com/string-lookups
        function str(x) { return JSON.stringify(x) }
        var source = '';
        source += 'switch (value.length) {\n';
        for (var length in byLength) {
          var keywords = byLength[length];
          source += 'case ' + length + ':\n';
          source += 'switch (value) {\n';
          keywords.forEach(function(keyword) {
            var tokenType = reverseMap[keyword];
            source += 'case ' + str(keyword) + ': return ' + str(tokenType) + '\n';
          });
          source += '}\n';
        }
        source += '}\n';
        return Function('value', source) // type
      }

      /***************************************************************************/

      var Lexer = function(states, state) {
        this.startState = state;
        this.states = states;
        this.buffer = '';
        this.stack = [];
        this.reset();
      };

      Lexer.prototype.reset = function(data, info) {
        this.buffer = data || '';
        this.index = 0;
        this.line = info ? info.line : 1;
        this.col = info ? info.col : 1;
        this.queuedToken = info ? info.queuedToken : null;
        this.queuedThrow = info ? info.queuedThrow : null;
        this.setState(info ? info.state : this.startState);
        this.stack = info && info.stack ? info.stack.slice() : [];
        return this
      };

      Lexer.prototype.save = function() {
        return {
          line: this.line,
          col: this.col,
          state: this.state,
          stack: this.stack.slice(),
          queuedToken: this.queuedToken,
          queuedThrow: this.queuedThrow,
        }
      };

      Lexer.prototype.setState = function(state) {
        if (!state || this.state === state) return
        this.state = state;
        var info = this.states[state];
        this.groups = info.groups;
        this.error = info.error;
        this.re = info.regexp;
        this.fast = info.fast;
      };

      Lexer.prototype.popState = function() {
        this.setState(this.stack.pop());
      };

      Lexer.prototype.pushState = function(state) {
        this.stack.push(this.state);
        this.setState(state);
      };

      var eat = hasSticky ? function(re, buffer) { // assume re is /y
        return re.exec(buffer)
      } : function(re, buffer) { // assume re is /g
        var match = re.exec(buffer);
        // will always match, since we used the |(?:) trick
        if (match[0].length === 0) {
          return null
        }
        return match
      };

      Lexer.prototype._getGroup = function(match) {
        var groupCount = this.groups.length;
        for (var i = 0; i < groupCount; i++) {
          if (match[i + 1] !== undefined) {
            return this.groups[i]
          }
        }
        throw new Error('Cannot find token type for matched text')
      };

      function tokenToString() {
        return this.value
      }

      Lexer.prototype.next = function() {
        var index = this.index;

        // If a fallback token matched, we don't need to re-run the RegExp
        if (this.queuedGroup) {
          var token = this._token(this.queuedGroup, this.queuedText, index);
          this.queuedGroup = null;
          this.queuedText = "";
          return token
        }

        var buffer = this.buffer;
        if (index === buffer.length) {
          return // EOF
        }

        // Fast matching for single characters
        var group = this.fast[buffer.charCodeAt(index)];
        if (group) {
          return this._token(group, buffer.charAt(index), index)
        }

        // Execute RegExp
        var re = this.re;
        re.lastIndex = index;
        var match = eat(re, buffer);

        // Error tokens match the remaining buffer
        var error = this.error;
        if (match == null) {
          return this._token(error, buffer.slice(index, buffer.length), index)
        }

        var group = this._getGroup(match);
        var text = match[0];

        if (error.fallback && match.index !== index) {
          this.queuedGroup = group;
          this.queuedText = text;

          // Fallback tokens contain the unmatched portion of the buffer
          return this._token(error, buffer.slice(index, match.index), index)
        }

        return this._token(group, text, index)
      };

      Lexer.prototype._token = function(group, text, offset) {
        // count line breaks
        var lineBreaks = 0;
        if (group.lineBreaks) {
          var matchNL = /\n/g;
          var nl = 1;
          if (text === '\n') {
            lineBreaks = 1;
          } else {
            while (matchNL.exec(text)) { lineBreaks++; nl = matchNL.lastIndex; }
          }
        }

        var token = {
          type: (typeof group.type === 'function' && group.type(text)) || group.defaultType,
          value: typeof group.value === 'function' ? group.value(text) : text,
          text: text,
          toString: tokenToString,
          offset: offset,
          lineBreaks: lineBreaks,
          line: this.line,
          col: this.col,
        };
        // nb. adding more props to token object will make V8 sad!

        var size = text.length;
        this.index += size;
        this.line += lineBreaks;
        if (lineBreaks !== 0) {
          this.col = size - nl + 1;
        } else {
          this.col += size;
        }

        // throw, if no rule with {error: true}
        if (group.shouldThrow) {
          throw new Error(this.formatError(token, "invalid syntax"))
        }

        if (group.pop) this.popState();
        else if (group.push) this.pushState(group.push);
        else if (group.next) this.setState(group.next);

        return token
      };

      if (typeof Symbol !== 'undefined' && Symbol.iterator) {
        var LexerIterator = function(lexer) {
          this.lexer = lexer;
        };

        LexerIterator.prototype.next = function() {
          var token = this.lexer.next();
          return {value: token, done: !token}
        };

        LexerIterator.prototype[Symbol.iterator] = function() {
          return this
        };

        Lexer.prototype[Symbol.iterator] = function() {
          return new LexerIterator(this)
        };
      }

      Lexer.prototype.formatError = function(token, message) {
        if (token == null) {
          // An undefined token indicates EOF
          var text = this.buffer.slice(this.index);
          var token = {
            text: text,
            offset: this.index,
            lineBreaks: text.indexOf('\n') === -1 ? 0 : 1,
            line: this.line,
            col: this.col,
          };
        }
        var start = Math.max(0, token.offset - token.col + 1);
        var eol = token.lineBreaks ? token.text.indexOf('\n') : token.text.length;
        var firstLine = this.buffer.substring(start, token.offset + eol);
        message += " at line " + token.line + " col " + token.col + ":\n\n";
        message += "  " + firstLine + "\n";
        message += "  " + Array(token.col).join(" ") + "^";
        return message
      };

      Lexer.prototype.clone = function() {
        return new Lexer(this.states, this.state)
      };

      Lexer.prototype.has = function(tokenType) {
        return true
      };


      return {
        compile: compile,
        states: compileStates,
        error: Object.freeze({error: true}),
        fallback: Object.freeze({fallback: true}),
        keywords: keywordTransform,
      }

    }));
    });

    var grammar = createCommonjsModule(function (module) {
    // Generated automatically by nearley, version 2.20.1
    // http://github.com/Hardmath123/nearley
    (function () {
    function id(x) { return x[0]; }

    	const moo$1 = moo;
    	const lexer = moo$1.compile({
    		number: 				{ match: /[0-9]+/, value: str => Number(str) },
    		lparen:  				"(",
    		rparen:  				")",
    		identifier:			/[a-z][a-z-.]*/,
    		separator:			/[,+]/,
    		multiplicator:	/[xX×*]/,
    		ws:     				/[ \t]+/
    	});
    var grammar = {
        Lexer: lexer,
        ParserRules: [
        {"name": "PATTERN", "symbols": ["ROW"], "postprocess": id},
        {"name": "ROW$subexpression$1", "symbols": ["STITCH"]},
        {"name": "ROW$subexpression$1", "symbols": ["REPEAT"]},
        {"name": "ROW$ebnf$1", "symbols": []},
        {"name": "ROW$ebnf$1$subexpression$1$subexpression$1", "symbols": ["STITCH"]},
        {"name": "ROW$ebnf$1$subexpression$1$subexpression$1", "symbols": ["REPEAT"]},
        {"name": "ROW$ebnf$1$subexpression$1", "symbols": ["separator", "ROW$ebnf$1$subexpression$1$subexpression$1"]},
        {"name": "ROW$ebnf$1", "symbols": ["ROW$ebnf$1", "ROW$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
        {"name": "ROW", "symbols": ["ROW$subexpression$1", "ROW$ebnf$1"], "postprocess": 
            data => [
            	...data[0],  //mandatory step
            	...data[1].map(x => x[1][0]) //optional additional steps [[separator [STEP]].map( _ => STEP)
            ]
            },
        {"name": "REPEAT$ebnf$1", "symbols": []},
        {"name": "REPEAT$ebnf$1$subexpression$1", "symbols": ["separator", "STITCH"]},
        {"name": "REPEAT$ebnf$1", "symbols": ["REPEAT$ebnf$1", "REPEAT$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
        {"name": "REPEAT", "symbols": [{"literal":"("}, "_", "STITCH", "REPEAT$ebnf$1", "_", {"literal":")"}, "_", (lexer.has("multiplicator") ? {type: "multiplicator"} : multiplicator), "_", (lexer.has("number") ? {type: "number"} : number)], "postprocess": 
            data => {
            	return {
            		type: "repeat",
            		stitches: [
            			data[2], //mandatory stitch
            			...data[3].map(x => x[1]) //optional additional stitches [[separator STITCH]].map( _ => STITCH)
            		],
            		times: data[9].value, //%number
            		col: data[0].col,
            		offset: data[9].col - data[0].col + data[9].text.length
            	}
            }
            },
        {"name": "STITCH", "symbols": [(lexer.has("number") ? {type: "number"} : number), "_", (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": 
            data => {
            	return {
            		type: "stitch",
            		times: data[0].value, //%number
            		value: data[2].value,  //%identifier
            		col: data[0].col,
            		offset: data[2].col - data[0].col + data[2].text.length
            	}
            }},
        {"name": "separator", "symbols": ["__"]},
        {"name": "separator", "symbols": ["_", (lexer.has("separator") ? {type: "separator"} : separator), "_"], "postprocess": () => null},
        {"name": "_$ebnf$1", "symbols": []},
        {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
        {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": () => null},
        {"name": "__$ebnf$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
        {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
        {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": () => null}
    ]
      , ParserStart: "PATTERN"
    };
    {
       module.exports = grammar;
    }
    })();
    });

    let $abbrv = get_store_value(abbrv);

    const interpret = async data => {
      console.log("start transpile");
      if (!data || !data.length) return []; //Return if array is empty

      const validate = arr => arr.reduce((all,obj) => {
        if (obj.type === 'stitch') {
          let value = $abbrv.values[$abbrv.keys.indexOf(obj.value)]; // Compare stitch value to store and return if valid
          if (value) return [...all, {...obj, value: value}]
        }
        else if (obj.type === 'repeat') {
          return [...all, {...obj, stitches: validate(obj.stitches)}];
        }
        return all
      },[]);

      return validate(data);
    };

    /* components\Inputs\TextArea.svelte generated by Svelte v3.43.1 */

    const file$6 = "components\\Inputs\\TextArea.svelte";

    function create_fragment$7(ctx) {
    	let article;
    	let output_1;
    	let html_tag;
    	let br;
    	let t;
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			article = element("article");
    			output_1 = element("output");
    			html_tag = new HtmlTag();
    			br = element("br");
    			t = space();
    			textarea = element("textarea");
    			html_tag.a = br;
    			add_location(br, file$6, 12, 43, 251);
    			attr_dev(output_1, "class", "svelte-xgbm1r");
    			add_location(output_1, file$6, 12, 2, 210);
    			attr_dev(textarea, "spellcheck", "false");
    			attr_dev(textarea, "class", "svelte-xgbm1r");
    			add_location(textarea, file$6, 13, 2, 269);
    			attr_dev(article, "class", "svelte-xgbm1r");
    			add_location(article, file$6, 11, 0, 197);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, output_1);
    			html_tag.m(/*styled*/ ctx[1], output_1);
    			append_dev(output_1, br);
    			/*output_1_binding*/ ctx[5](output_1);
    			append_dev(article, t);
    			append_dev(article, textarea);
    			set_input_value(textarea, /*raw*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[6]),
    					listen_dev(textarea, "scroll", /*update_scroll*/ ctx[3], false, false, false),
    					listen_dev(textarea, "change", /*update_scroll*/ ctx[3], false, false, false),
    					listen_dev(textarea, "blur", /*blur_handler*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*styled*/ 2) html_tag.p(/*styled*/ ctx[1]);

    			if (dirty & /*raw*/ 1) {
    				set_input_value(textarea, /*raw*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(article);
    			/*output_1_binding*/ ctx[5](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TextArea', slots, []);
    	let { raw = '' } = $$props;
    	let { styled = '' } = $$props;
    	let output;

    	const update_scroll = evt => {
    		output.scrollTo(evt.target.scrollLeft, evt.target.scrollTop);
    	};

    	const writable_props = ['raw', 'styled'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TextArea> was created with unknown prop '${key}'`);
    	});

    	function blur_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function output_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			output = $$value;
    			$$invalidate(2, output);
    		});
    	}

    	function textarea_input_handler() {
    		raw = this.value;
    		$$invalidate(0, raw);
    	}

    	$$self.$$set = $$props => {
    		if ('raw' in $$props) $$invalidate(0, raw = $$props.raw);
    		if ('styled' in $$props) $$invalidate(1, styled = $$props.styled);
    	};

    	$$self.$capture_state = () => ({ raw, styled, output, update_scroll });

    	$$self.$inject_state = $$props => {
    		if ('raw' in $$props) $$invalidate(0, raw = $$props.raw);
    		if ('styled' in $$props) $$invalidate(1, styled = $$props.styled);
    		if ('output' in $$props) $$invalidate(2, output = $$props.output);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		raw,
    		styled,
    		output,
    		update_scroll,
    		blur_handler,
    		output_1_binding,
    		textarea_input_handler
    	];
    }

    class TextArea extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { raw: 0, styled: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TextArea",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get raw() {
    		throw new Error("<TextArea>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set raw(value) {
    		throw new Error("<TextArea>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styled() {
    		throw new Error("<TextArea>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styled(value) {
    		throw new Error("<TextArea>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* components\Editor.svelte generated by Svelte v3.43.1 */

    const { console: console_1$1 } = globals;
    const file$7 = "components\\Editor.svelte";

    function create_fragment$8(ctx) {
    	let section;
    	let html_tag;
    	let t0;
    	let textarea;
    	let updating_raw;
    	let updating_styled;
    	let t1;
    	let current;

    	function textarea_raw_binding(value) {
    		/*textarea_raw_binding*/ ctx[4](value);
    	}

    	function textarea_styled_binding(value) {
    		/*textarea_styled_binding*/ ctx[5](value);
    	}

    	let textarea_props = {};

    	if (/*input_raw*/ ctx[0] !== void 0) {
    		textarea_props.raw = /*input_raw*/ ctx[0];
    	}

    	if (/*input_styled*/ ctx[1] !== void 0) {
    		textarea_props.styled = /*input_styled*/ ctx[1];
    	}

    	textarea = new TextArea({ props: textarea_props, $$inline: true });
    	binding_callbacks.push(() => bind(textarea, 'raw', textarea_raw_binding));
    	binding_callbacks.push(() => bind(textarea, 'styled', textarea_styled_binding));
    	textarea.$on("blur", /*parse*/ ctx[2]);

    	const block = {
    		c: function create() {
    			section = element("section");
    			html_tag = new HtmlTag();
    			t0 = space();
    			create_component(textarea.$$.fragment);
    			t1 = text("\r\n  ** Only highlighted text will be taken into account **");
    			html_tag.a = t0;
    			attr_dev(section, "class", "svelte-10izwjw");
    			add_location(section, file$7, 76, 0, 2821);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			html_tag.m(/*input_styled*/ ctx[1], section);
    			append_dev(section, t0);
    			mount_component(textarea, section, null);
    			append_dev(section, t1);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*input_styled*/ 2) html_tag.p(/*input_styled*/ ctx[1]);
    			const textarea_changes = {};

    			if (!updating_raw && dirty & /*input_raw*/ 1) {
    				updating_raw = true;
    				textarea_changes.raw = /*input_raw*/ ctx[0];
    				add_flush_callback(() => updating_raw = false);
    			}

    			if (!updating_styled && dirty & /*input_styled*/ 2) {
    				updating_styled = true;
    				textarea_changes.styled = /*input_styled*/ ctx[1];
    				add_flush_callback(() => updating_styled = false);
    			}

    			textarea.$set(textarea_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(textarea.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(textarea.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(textarea);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Editor', slots, []);
    	let { pattern } = $$props;
    	let input_raw = '6ms 6aug (1ms 1aug) * 12 13 ms 12ms';
    	let input_styled = '';

    	//Plan:
    	// On input => async feed to the parser
    	// parser results sent to prettify, which marks and recompose into input_styled
    	//parser results sent to view
    	// const highlight = str => {
    	//   return str.replace(/[^\w\s.-]/gi, ' ') //prevent user accidently creating tags
    	//             .replace(/[\d]+[ \t]*[a-z][a-z-.]*/gi, x => {
    	//               //1) check if valid abbrv
    	//               //2) mark
    	//               return `<mark class='stitch'>${x}</mark>`
    	//             });
    	// }
    	//
    	// $: input_styled = highlight(input_raw);
    	// const foo = ptrn => {
    	//   let lines = input_raw.split(/\n/);
    	//   for (let obj of ptrn.reverse()) {
    	//     lines[0] = `${lines[0].substring(0,obj.col-1||0)}<mark>${lines[0].substring(obj.col,obj.col+obj.offset)}</mark>${lines[0].substring(obj.col+obj.offset,lines[0].length)}`
    	//   // const mark = sts => sts.map(obj => {
    	//     // if (obj.type === 'stitch') {
    	//     //   let regxp = new RegExp(`/(?:(?:^.*$\n){0}(?:^.{${obj.col}}))(.{1})/`, 'm')
    	//     //   console.log("I'm  a stitch !", obj.col, input_styled.replace(/\d(.)/, 'HEY!'));
    	//     //   // input_styled = input_styled.replace(`/(?:^.*$\n){0}(?:^.{${obj.col}})(.{${obj.offset}})/m`, x => `<mark class='stitch'>${x}</mark>`);
    	//     //
    	//     // }
    	//   //   return obj;
    	//   // })
    	//   }
    	//   // mark(ptrn);
    	//   input_styled = lines.join(`\n`);
    	// }
    	const syntax = _ => {
    		const mark = (txt, _pattern = pattern) => {
    			for (let obj of _pattern.reverse()) {
    				let regxp = new RegExp(`(?<=(?:^.*$\n){${obj.line | 0}}(?:^.{${obj.col - 1}}))(.{${obj.offset}})`, 'm');

    				if (obj.type === 'repeat') {
    					console.log(obj.col, obj.offset, obj.times.length);

    					txt = txt.replace(regxp, match => {
    						let str = mark(match, obj.stitches.map(st => {
    							return { ...st, col: st.col - obj.col + 1 };
    						}));

    						return `<mark class='${obj.type}'>${str}</mark>`;
    					});
    				} else txt = txt.replace(regxp, match => `<mark class='${obj.type}'>${match}</mark>`);

    				console.log(txt);
    			}

    			return txt;
    		};

    		$$invalidate(1, input_styled = mark(input_raw));
    	};

    	const parse = async _ => {
    		console.log("start parse");
    		let parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    		parser.feed(input_raw);
    		$$invalidate(3, pattern = await interpret(parser.results[0]));
    		syntax();
    	}; // console.log(pattern);

    	const writable_props = ['pattern'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Editor> was created with unknown prop '${key}'`);
    	});

    	function textarea_raw_binding(value) {
    		input_raw = value;
    		$$invalidate(0, input_raw);
    	}

    	function textarea_styled_binding(value) {
    		input_styled = value;
    		$$invalidate(1, input_styled);
    	}

    	$$self.$$set = $$props => {
    		if ('pattern' in $$props) $$invalidate(3, pattern = $$props.pattern);
    	};

    	$$self.$capture_state = () => ({
    		nearley,
    		grammar,
    		interpret,
    		TextArea,
    		pattern,
    		input_raw,
    		input_styled,
    		syntax,
    		parse
    	});

    	$$self.$inject_state = $$props => {
    		if ('pattern' in $$props) $$invalidate(3, pattern = $$props.pattern);
    		if ('input_raw' in $$props) $$invalidate(0, input_raw = $$props.input_raw);
    		if ('input_styled' in $$props) $$invalidate(1, input_styled = $$props.input_styled);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		input_raw,
    		input_styled,
    		parse,
    		pattern,
    		textarea_raw_binding,
    		textarea_styled_binding
    	];
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { pattern: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editor",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pattern*/ ctx[3] === undefined && !('pattern' in props)) {
    			console_1$1.warn("<Editor> was created without expected prop 'pattern'");
    		}
    	}

    	get pattern() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pattern(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* App.svelte generated by Svelte v3.43.1 */
    const file$8 = "App.svelte";

    function create_fragment$9(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let view;
    	let updating_pattern;
    	let t2;
    	let editor;
    	let updating_pattern_1;
    	let t3;
    	let menu;
    	let preferences;
    	let current;

    	function view_pattern_binding(value) {
    		/*view_pattern_binding*/ ctx[1](value);
    	}

    	let view_props = {};

    	if (/*pattern*/ ctx[0] !== void 0) {
    		view_props.pattern = /*pattern*/ ctx[0];
    	}

    	view = new View({ props: view_props, $$inline: true });
    	binding_callbacks.push(() => bind(view, 'pattern', view_pattern_binding));

    	function editor_pattern_binding(value) {
    		/*editor_pattern_binding*/ ctx[2](value);
    	}

    	let editor_props = {};

    	if (/*pattern*/ ctx[0] !== void 0) {
    		editor_props.pattern = /*pattern*/ ctx[0];
    	}

    	editor = new Editor({ props: editor_props, $$inline: true });
    	binding_callbacks.push(() => bind(editor, 'pattern', editor_pattern_binding));
    	preferences = new Preferences({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Gurumi !";
    			t1 = space();
    			create_component(view.$$.fragment);
    			t2 = space();
    			create_component(editor.$$.fragment);
    			t3 = space();
    			menu = element("menu");
    			create_component(preferences.$$.fragment);
    			add_location(h1, file$8, 11, 2, 252);
    			add_location(menu, file$8, 14, 2, 327);
    			add_location(main, file$8, 10, 0, 242);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			mount_component(view, main, null);
    			append_dev(main, t2);
    			mount_component(editor, main, null);
    			append_dev(main, t3);
    			append_dev(main, menu);
    			mount_component(preferences, menu, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const view_changes = {};

    			if (!updating_pattern && dirty & /*pattern*/ 1) {
    				updating_pattern = true;
    				view_changes.pattern = /*pattern*/ ctx[0];
    				add_flush_callback(() => updating_pattern = false);
    			}

    			view.$set(view_changes);
    			const editor_changes = {};

    			if (!updating_pattern_1 && dirty & /*pattern*/ 1) {
    				updating_pattern_1 = true;
    				editor_changes.pattern = /*pattern*/ ctx[0];
    				add_flush_callback(() => updating_pattern_1 = false);
    			}

    			editor.$set(editor_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(view.$$.fragment, local);
    			transition_in(editor.$$.fragment, local);
    			transition_in(preferences.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(view.$$.fragment, local);
    			transition_out(editor.$$.fragment, local);
    			transition_out(preferences.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(view);
    			destroy_component(editor);
    			destroy_component(preferences);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let pattern = [];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function view_pattern_binding(value) {
    		pattern = value;
    		$$invalidate(0, pattern);
    	}

    	function editor_pattern_binding(value) {
    		pattern = value;
    		$$invalidate(0, pattern);
    	}

    	$$self.$capture_state = () => ({ Preferences, View, Editor, pattern });

    	$$self.$inject_state = $$props => {
    		if ('pattern' in $$props) $$invalidate(0, pattern = $$props.pattern);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pattern, view_pattern_binding, editor_pattern_binding];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
