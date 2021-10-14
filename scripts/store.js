import { writable, derived, get } from "svelte/store";

function createMapStore(initial) {
  const store = writable(initial);
  const set = (key, value) =>
    store.update((m) => Object.assign({}, m, { [key]: value }));
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

export const abbrv = createMapStore({
});
export const colors = createMapStore({
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
});
